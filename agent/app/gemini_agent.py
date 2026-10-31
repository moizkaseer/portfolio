"""The Gemini agent loop — same contract as app/anthropic_agent.py (same UI message
stream chunks, same tool loop, same step / output-token / cost caps), driven by
Google's official `google-genai` SDK (`client.models.generate_content_stream`)
with manual function calling (automatic function calling is disabled so every
tool call, the ui_* stop condition and the caps stay visible and testable).

Conversation history arrives in the Anthropic-shaped turns app/messages.py
already produces; `to_gemini_contents` maps them onto Gemini `contents`
(text / function_call / function_response parts).
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable, Iterator

from app import protocol as P
from app.protocol import validate_ui_action
from app.providers import (
    ProviderUnavailable,
    classify_error,
    friendly_text,
    is_retryable_on_fallback,
)
from app.tools import ToolSpec

logger = logging.getLogger("agent.gemini")

# Gemini 3+ models require a thought signature on function-call parts in the
# history. Calls replayed from the browser (UIMessage[]) don't carry one, so we
# attach Google's documented placeholder that skips that validation — on every
# replayed call, because which call Gemini treats as "first in a step" depends on
# how the browser grouped the turn (a missing one is a hard 400).
_SKIP_THOUGHT_SIGNATURE = b"skip_thought_signature_validator"

_FINISH_REASON_MAP = {
    "STOP": "stop",
    "MAX_TOKENS": "length",
    "SAFETY": "content-filter",
    "RECITATION": "content-filter",
    "BLOCKLIST": "content-filter",
    "PROHIBITED_CONTENT": "content-filter",
    "SPII": "content-filter",
}


def _is_overloaded(exc: BaseException) -> bool:
    """A transient 503 "model overloaded / high demand" (not a timeout or quota error)."""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    text = str(exc).upper()
    return code == 503 or "HIGH DEMAND" in text or "OVERLOADED" in text


def _needs_thought_signatures(model: str) -> bool:
    m = model.lower()
    return m.startswith("gemini-") and not m.startswith(("gemini-1", "gemini-2"))


def _enum_name(v: Any) -> str | None:
    if v is None:
        return None
    name = getattr(v, "name", None)
    return name if isinstance(name, str) else str(v).split(".")[-1]


def _jsonable(value: Any) -> Any:
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def _response_payload(content: Any, is_error: bool = False) -> dict:
    """Gemini's function_response.response must be an object."""
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
        except (ValueError, TypeError):
            parsed = content
    else:
        parsed = content
    key = "error" if is_error else "result"
    return {key: _jsonable(parsed)}


def to_gemini_contents(anthropic_messages: list[dict], model: str = "") -> list[dict]:
    """Anthropic-shaped turns (app/messages.py) -> Gemini `contents` dicts."""
    sign = _needs_thought_signatures(model)
    contents: list[dict] = []
    names_by_id: dict[str, str] = {}

    for m in anthropic_messages:
        role = m.get("role")
        content = m.get("content")
        parts: list[dict] = []

        if isinstance(content, str):
            if content:
                parts.append({"text": content})
        elif isinstance(content, list):
            for block in content:
                btype = block.get("type")
                if btype == "text" and block.get("text"):
                    parts.append({"text": block["text"]})
                elif btype == "tool_use":
                    call_id = block.get("id") or ""
                    names_by_id[call_id] = block.get("name", "")
                    part: dict[str, Any] = {
                        "function_call": {"id": call_id or None, "name": block.get("name"), "args": block.get("input") or {}}
                    }
                    if sign:
                        part["thought_signature"] = _SKIP_THOUGHT_SIGNATURE
                    parts.append(part)
                elif btype == "tool_result":
                    call_id = block.get("tool_use_id") or ""
                    parts.append(
                        {
                            "function_response": {
                                "id": call_id or None,
                                "name": names_by_id.get(call_id, "tool"),
                                "response": _response_payload(block.get("content"), bool(block.get("is_error"))),
                            }
                        }
                    )

        if not parts:
            continue
        gemini_role = "model" if role == "assistant" else "user"
        # Gemini wants alternating turns; merge consecutive same-role turns.
        if contents and contents[-1]["role"] == gemini_role:
            contents[-1]["parts"].extend(parts)
        else:
            contents.append({"role": gemini_role, "parts": parts})
    return contents


def function_declarations(schemas: list[dict]) -> list[dict]:
    """Anthropic-style tool schemas ({name, description, input_schema}) -> Gemini FunctionDeclarations."""
    decls = []
    for s in schemas:
        params = s.get("input_schema") or {"type": "object", "properties": {}}
        decls.append({"name": s["name"], "description": s.get("description", ""), "parameters_json_schema": params})
    return decls


def build_config(*, model: str, system: str, tool_schemas: list[dict], max_output_tokens: int, thinking_level: str | None) -> dict:
    config: dict[str, Any] = {
        "system_instruction": system,
        "max_output_tokens": max_output_tokens,
        "tools": [{"function_declarations": function_declarations(tool_schemas)}],
        "automatic_function_calling": {"disable": True},
    }
    m = model.lower()
    if m.startswith("gemini-2.5"):
        # 2.5 Flash/Flash-Lite: thinking off — faster, and thinking tokens would eat max_output_tokens.
        if "pro" not in m:
            config["thinking_config"] = {"thinking_budget": 0}
    elif thinking_level:
        config["thinking_config"] = {"thinking_level": thinking_level}
    return config


def _part_to_history(part: Any) -> dict | None:
    """A streamed response Part -> a history dict (keeps thought signatures for Gemini 3+)."""
    if getattr(part, "thought", None):
        return None
    out: dict[str, Any] = {}
    fc = getattr(part, "function_call", None)
    text = getattr(part, "text", None)
    if fc is not None:
        out["function_call"] = {"id": getattr(fc, "id", None), "name": fc.name, "args": dict(getattr(fc, "args", None) or {})}
    elif text:
        out["text"] = text
    else:
        return None
    sig = getattr(part, "thought_signature", None)
    if sig:
        out["thought_signature"] = sig
    return out


def run_gemini_turn(
    client: Any,
    *,
    model: str,
    system: str,
    anthropic_messages: list[dict],
    server_tools: dict[str, ToolSpec],
    ui_tools: dict[str, ToolSpec],
    known_slugs: list[str],
    toolbox_names: list[str],
    max_steps: int = 6,
    max_output_tokens: int = 500,
    max_cost_usd: float = 0.05,
    pricing: tuple[float, float] = (0.0, 0.0),
    fallback_models: list[str] | None = None,
    thinking_level: str | None = None,
    turn_budget_s: float | None = None,
    attempt_timeout_s: float | None = None,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> Iterator[dict]:
    """Yields UI message stream chunks; always ends with exactly one `finish` chunk —
    except when the provider is unavailable before anything was said, in which case it
    raises ProviderUnavailable (after `start`/`start-step`) so the caller can answer
    `503 {"demo": true}` instead.

    `turn_budget_s` bounds the whole turn (all steps and fallback attempts) so it ends
    inside the hosting proxy's time limit; each model call also gets at most
    `attempt_timeout_s` (and never more than the time left), so a hung primary model
    still leaves room to fall back to the next one."""
    tool_schemas = [t.schema for t in server_tools.values()] + [t.schema for t in ui_tools.values()]
    ui_tool_names = set(ui_tools.keys())
    server_tool_names = set(server_tools.keys())

    yield P.start()

    contents = to_gemini_contents(anthropic_messages, model)
    total_cost_usd = 0.0
    step = 0
    finish_reason = "stop"
    said_anything = False  # any text/tool chunk sent to the browser yet?
    chain = [model, *[m for m in (fallback_models or []) if m and m != model]]
    chain_pos = 0
    active_model = chain[0]
    started = clock()

    def time_left() -> float | None:
        return None if turn_budget_s is None else turn_budget_s - (clock() - started)

    while True:
        step += 1
        yield P.start_step()

        text_id: str | None = None
        step_text_emitted = False
        model_parts: list[dict] = []
        calls: list[tuple[str, str, dict]] = []  # (id, name, args)
        gemini_finish: str | None = None
        usage = None
        retried_same_model = False

        while True:  # one attempt, plus at most one retry on the fallback model
            try:
                left = time_left()
                if left is not None and left < 1.0:
                    raise TimeoutError("turn deadline exceeded (TIMEOUT)")
                config = build_config(
                    model=active_model,
                    system=system,
                    tool_schemas=tool_schemas,
                    max_output_tokens=max_output_tokens,
                    thinking_level=thinking_level,
                )
                timeouts = [t for t in (attempt_timeout_s, left) if t is not None]
                if timeouts:
                    config["http_options"] = {"timeout": max(1000, int(min(timeouts) * 1000))}
                stream = client.models.generate_content_stream(model=active_model, contents=contents, config=config)
                for chunk in stream:
                    if getattr(chunk, "usage_metadata", None) is not None:
                        usage = chunk.usage_metadata
                    for cand in (getattr(chunk, "candidates", None) or [])[:1]:
                        if getattr(cand, "finish_reason", None) is not None:
                            gemini_finish = _enum_name(cand.finish_reason)
                        cand_content = getattr(cand, "content", None)
                        for part in getattr(cand_content, "parts", None) or []:
                            hist = _part_to_history(part)
                            if hist is None:
                                continue
                            model_parts.append(hist)
                            if "function_call" in hist:
                                fc = hist["function_call"]
                                call_id = fc.get("id") or f"call-{step}-{len(calls)}"
                                fc["id"] = call_id
                                calls.append((call_id, fc["name"], fc["args"]))
                            else:
                                if text_id is None:
                                    text_id = f"text-{step}-0"
                                    yield P.text_start(text_id)
                                yield P.text_delta(text_id, hist["text"])
                                step_text_emitted = True
                                said_anything = True
                break
            except Exception as exc:
                reason = classify_error(exc)
                # one line per failed attempt so Render logs show *why* a turn degraded
                logger.warning(
                    "gemini attempt failed: model=%s step=%d reason=%s %s: %s",
                    active_model, step, reason, type(exc).__name__, str(exc)[:300],
                )
                left = time_left()
                out_of_time = left is not None and left < 2.0
                can_retry = (
                    not out_of_time
                    and not step_text_emitted
                    and chain_pos + 1 < len(chain)
                    and is_retryable_on_fallback(reason)
                )
                # "high demand" 503s are usually gone a second later: retry the same
                # (fast) model once before falling back to a slower one.
                if (
                    not retried_same_model
                    and not step_text_emitted
                    and _is_overloaded(exc)
                    and (left is None or left >= 3.0)
                ):
                    retried_same_model = True
                    sleep(1.0)
                    model_parts, calls, usage, gemini_finish = [], [], None, None
                    continue
                if can_retry:
                    chain_pos += 1
                    active_model = chain[chain_pos]  # stays on this model for the rest of the turn
                    model_parts, calls, usage, gemini_finish = [], [], None, None
                    continue
                if not said_anything:
                    raise ProviderUnavailable(reason, f"{type(exc).__name__}: {exc}") from exc
                # mid-answer: finish politely instead of surfacing a raw error
                if text_id is None:
                    text_id = f"text-{step}-0"
                    yield P.text_start(text_id)
                yield P.text_delta(text_id, ("\n\n" if step_text_emitted else "") + friendly_text(reason))
                yield P.text_end(text_id)
                yield P.finish_step()
                yield P.finish("error" if reason not in ("quota",) else "other")
                return

        if text_id is not None:
            yield P.text_end(text_id)

        if usage is not None:
            in_tok = getattr(usage, "prompt_token_count", 0) or 0
            out_tok = (getattr(usage, "candidates_token_count", 0) or 0) + (getattr(usage, "thoughts_token_count", 0) or 0)
            total_cost_usd += (in_tok / 1_000_000) * pricing[0] + (out_tok / 1_000_000) * pricing[1]

        ui_blocked = False
        server_calls: list[tuple[str, str, dict]] = []
        for call_id, name, args in calls:
            said_anything = True
            yield P.tool_input_start(call_id, name)
            if name in ui_tool_names:
                validated = validate_ui_action(name, args, known_slugs, toolbox_names)
                if isinstance(validated, str):
                    yield P.tool_input_error(call_id, name, args, validated)
                else:
                    yield P.tool_input_available(call_id, name, validated["input"])
                ui_blocked = True
            elif name in server_tool_names:
                yield P.tool_input_available(call_id, name, args)
                server_calls.append((call_id, name, args))
            else:
                yield P.tool_input_error(call_id, name, args, f'unknown tool "{name}"')

        response_parts: list[dict] = []
        for call_id, name, args in server_calls:
            try:
                output = server_tools[name].execute(args or {})
                yield P.tool_output_available(call_id, output)
                response_parts.append({"function_response": {"id": call_id, "name": name, "response": _response_payload(output)}})
            except Exception as exc:  # a broken tool must not break the stream
                err_text = f"{type(exc).__name__}: {exc}"
                yield P.tool_output_error(call_id, err_text)
                response_parts.append(
                    {"function_response": {"id": call_id, "name": name, "response": _response_payload(err_text, True)}}
                )

        blocked = gemini_finish in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII")
        if not calls and not said_anything and not blocked:
            # Gemini returned nothing at all (e.g. MALFORMED_FUNCTION_CALL) — say something useful.
            fid = f"text-{step}-fallback"
            yield P.text_start(fid)
            yield P.text_delta(fid, friendly_text("error"))
            yield P.text_end(fid)
            said_anything = True

        yield P.finish_step()

        if gemini_finish in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII") and not calls:
            yield P.error("The agent declined to respond.")
            finish_reason = "content-filter"
            break

        if not calls:
            finish_reason = _FINISH_REASON_MAP.get(gemini_finish or "STOP", "other")
            break

        if ui_blocked:
            finish_reason = "tool-calls"  # the browser runs the ui_* action and sends the result back
            break
        if step >= max_steps:
            finish_reason = "length"
            break
        if total_cost_usd >= max_cost_usd:
            finish_reason = "other"
            break

        contents.append({"role": "model", "parts": model_parts})
        if response_parts:
            contents.append({"role": "user", "parts": response_parts})

    yield P.finish(finish_reason)
