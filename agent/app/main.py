"""FastAPI app (brief §1/§2/§6) — POST /v1/chat streams the ai-SDK UI message
stream format; GET /healthz for Railway/uptime checks."""
from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Request
from starlette.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from app.anthropic_agent import run_agent_turn
from app.gemini_agent import run_gemini_turn
from app.config import Settings, get_settings
from app.knowledge.bm25 import BM25Index
from app.knowledge.content_loader import load_project_slugs, load_toolbox_names
from app.knowledge.store import load_or_build_index
from app.messages import to_anthropic_messages
from app import protocol as P
from app.providers import ProviderUnavailable, available_gemini_models, friendly_text, make_llm_client, model_chain
from app.protocol import SSE_DONE, UI_MESSAGE_STREAM_HEADERS, encode_sse
from app.ratelimit import Limiter, client_ip, create_limiter
from app.security import AGENT_SECRET_HEADER, GuardrailError, check_shared_secret, validate_request_shape
from app.system_prompt import build_system_prompt
from app.tools import ToolContext, build_server_tools, build_ui_tools

_startup_settings = get_settings()

app = FastAPI(title="moizali.tech agent backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_startup_settings.allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

_index_cache: dict[str, BM25Index] = {}
_limiter_cache: dict[tuple, Limiter] = {}


def get_index(settings: Settings = Depends(get_settings)) -> BM25Index:
    key = str(settings.content_dir)
    index = _index_cache.get(key)
    if index is None:
        index = load_or_build_index(
            settings.content_dir,
            settings.index_path,
            github_token=settings.github_token,
            github_repos=settings.github_readme_repos,
        )
        _index_cache[key] = index
    return index


def get_limiter(settings: Settings = Depends(get_settings)) -> Limiter:
    key = (settings.rate_limit_per_hour, settings.upstash_redis_rest_url, settings.upstash_redis_rest_token)
    limiter = _limiter_cache.get(key)
    if limiter is None:
        limiter = create_limiter(
            limit=settings.rate_limit_per_hour,
            window_seconds=3600,
            upstash_url=settings.upstash_redis_rest_url,
            upstash_token=settings.upstash_redis_rest_token,
        )
        _limiter_cache[key] = limiter
    return limiter


_client_cache: dict[tuple, Any] = {}


def get_llm_client(settings: Settings = Depends(get_settings)) -> Any | None:
    """SDK client for LLM_PROVIDER (gemini by default), or None -> demo mode."""
    if not settings.model_configured:
        return None
    key = (settings.llm_provider, settings.gemini_api_key, settings.anthropic_api_key, settings.llm_timeout_ms)
    client = _client_cache.get(key)
    if client is None:
        client = make_llm_client(
            settings.llm_provider,
            gemini_api_key=settings.gemini_api_key,
            anthropic_api_key=settings.anthropic_api_key,
            timeout_ms=settings.llm_timeout_ms,
        )
        _client_cache[key] = client
    return client


# Backwards-compatible name (tests and older code override this dependency).
get_anthropic_client = get_llm_client


@app.get("/healthz")
def healthz(settings: Settings = Depends(get_settings)) -> dict:
    return {
        "status": "ok",
        "provider": settings.llm_provider,
        "model": settings.model,
        "fallbackModels": settings.fallback_models if settings.llm_provider == "gemini" else [],
        "modelConfigured": settings.model_configured,
    }


# Chunks that only frame the stream; anything else means the model actually produced output.
_FRAMING_CHUNKS = {"start", "start-step"}


@app.post("/v1/chat")
async def chat(
    request: Request,
    settings: Settings = Depends(get_settings),
    index: BM25Index = Depends(get_index),
    limiter: Limiter = Depends(get_limiter),
    llm_client: Any | None = Depends(get_llm_client),
):
    check_shared_secret(request, settings)

    try:
        body = await request.json()
    except ValueError:  # malformed / empty JSON body — a client error, never a 5xx (5xx means "demo")
        return JSONResponse({"error": "invalid-request"}, status_code=400)
    try:
        messages = validate_request_shape(body, settings)
    except GuardrailError as exc:
        return JSONResponse({"error": exc.code}, status_code=exc.status_code)

    headers_lower = {k.lower(): v for k, v in request.headers.items()}
    # check_shared_secret passed above, so a proxy-asserted visitor IP header can be trusted
    # (when no secret is configured the service is open and the header is ignored).
    ip = client_ip(headers_lower, trust_proxy_header=bool(settings.shared_secret))

    # only a new visitor message counts against the rate limit (not the
    # follow-ups a browser sends back after running a ui_* tool) — mirrors
    # app/api/agent/route.ts.
    if messages[-1].get("role") == "user" and not limiter.allow(ip):
        return JSONResponse({"error": "rate-limit"}, status_code=429)

    if llm_client is None:
        return JSONResponse({"demo": True}, status_code=503)

    prompt_state = body.get("promptState") if isinstance(body.get("promptState"), dict) else None
    known_slugs = load_project_slugs(settings.content_dir)
    toolbox_names = load_toolbox_names(settings.content_dir)

    ctx = ToolContext(
        settings=settings,
        index=index,
        known_slugs=known_slugs,
        toolbox_names=toolbox_names,
        prompt_state=prompt_state,
        client_ip=ip,
    )
    server_tools = build_server_tools(ctx)
    ui_tools = build_ui_tools(ctx)
    anthropic_messages = to_anthropic_messages(messages)
    system = build_system_prompt()

    common = dict(
        system=system,
        anthropic_messages=anthropic_messages,
        server_tools=server_tools,
        ui_tools=ui_tools,
        known_slugs=known_slugs,
        toolbox_names=toolbox_names,
        max_steps=settings.max_steps,
        max_output_tokens=settings.max_output_tokens,
        max_cost_usd=settings.max_cost_usd_per_request,
        pricing=settings.model_pricing(),
    )
    if settings.llm_provider == "anthropic":
        chunks = run_agent_turn(llm_client, model=settings.model, **common)
    else:
        available = await run_in_threadpool(available_gemini_models, llm_client, settings.gemini_api_key or "")
        chain = model_chain(settings.model, settings.fallback_models, available)
        chunks = run_gemini_turn(
            llm_client,
            model=chain[0],
            fallback_models=chain[1:],
            thinking_level=settings.thinking_level,
            turn_budget_s=settings.turn_budget_ms / 1000,
            attempt_timeout_s=settings.llm_timeout_ms / 1000,
            **common,
        )

    # Pull chunks until the model has actually produced something. If the provider is
    # out of quota / down before that, answer 503 {"demo": true} so the site falls back
    # to the scripted demo replay instead of showing an error (graceful degradation).
    buffered: list[dict] = []
    _end = object()
    try:
        while True:
            chunk = await run_in_threadpool(next, chunks, _end)
            if chunk is _end:
                break
            buffered.append(chunk)
            if chunk.get("type") not in _FRAMING_CHUNKS:
                break
    except ProviderUnavailable as exc:
        if messages[-1].get("role") != "assistant":
            return JSONResponse({"demo": True, "reason": exc.reason}, status_code=503)
        # A follow-up after a ui_* tool ran in the browser: the visitor already has a
        # live answer on screen, so a transient model hiccup here shouldn't flip the
        # whole session to the demo replay — close the turn with a short apology.
        if not any(c.get("type") == "start-step" for c in buffered):
            buffered.append(P.start_step())
        buffered += [
            P.text_start("text-retry"),
            P.text_delta("text-retry", friendly_text(exc.reason)),
            P.text_end("text-retry"),
            P.finish_step(),
            P.finish("other" if exc.reason == "quota" else "error"),
        ]
        chunks = iter(())

    def generate():
        for chunk in buffered:
            yield encode_sse(chunk)
        try:
            for chunk in chunks:
                yield encode_sse(chunk)
        except ProviderUnavailable:  # defensive — loops only raise this before any output
            yield encode_sse({"type": "finish", "finishReason": "error"})
        yield SSE_DONE

    response_headers = {k: v for k, v in UI_MESSAGE_STREAM_HEADERS.items() if k != "content-type"}
    return StreamingResponse(generate(), media_type="text/event-stream", headers=response_headers)


__all__ = ["app", "AGENT_SECRET_HEADER"]
