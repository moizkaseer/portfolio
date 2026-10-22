"""FastAPI app (brief §1/§2/§6) — POST /v1/chat streams the ai-SDK UI message
stream format; GET /healthz for Railway/uptime checks."""
from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from app.anthropic_agent import run_agent_turn
from app.config import Settings, get_settings
from app.knowledge.bm25 import BM25Index
from app.knowledge.content_loader import load_project_slugs, load_toolbox_names
from app.knowledge.store import load_or_build_index
from app.messages import to_anthropic_messages
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


def get_anthropic_client(settings: Settings = Depends(get_settings)) -> Any | None:
    if not settings.anthropic_api_key:
        return None
    import anthropic

    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


@app.get("/healthz")
def healthz(settings: Settings = Depends(get_settings)) -> dict:
    return {"status": "ok", "model": settings.model, "modelConfigured": bool(settings.anthropic_api_key)}


@app.post("/v1/chat")
async def chat(
    request: Request,
    settings: Settings = Depends(get_settings),
    index: BM25Index = Depends(get_index),
    limiter: Limiter = Depends(get_limiter),
    anthropic_client: Any | None = Depends(get_anthropic_client),
):
    check_shared_secret(request, settings)

    body = await request.json()
    try:
        messages = validate_request_shape(body, settings)
    except GuardrailError as exc:
        return JSONResponse({"error": exc.code}, status_code=exc.status_code)

    headers_lower = {k.lower(): v for k, v in request.headers.items()}
    ip = client_ip(headers_lower)

    # only a new visitor message counts against the rate limit (not the
    # follow-ups a browser sends back after running a ui_* tool) — mirrors
    # app/api/agent/route.ts.
    if messages[-1].get("role") == "user" and not limiter.allow(ip):
        return JSONResponse({"error": "rate-limit"}, status_code=429)

    if anthropic_client is None:
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

    def generate():
        for chunk in run_agent_turn(
            anthropic_client,
            model=settings.model,
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
        ):
            yield encode_sse(chunk)
        yield SSE_DONE

    response_headers = {k: v for k, v in UI_MESSAGE_STREAM_HEADERS.items() if k != "content-type"}
    return StreamingResponse(generate(), media_type="text/event-stream", headers=response_headers)


__all__ = ["app", "AGENT_SECRET_HEADER"]
