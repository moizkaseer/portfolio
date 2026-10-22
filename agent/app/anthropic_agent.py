"""The hand-written agent loop (brief §1/§2) — a manual loop over
`client.messages.stream()` (not the SDK's beta tool_runner, so step count,
cost, and the ui_* client-tool stop condition stay fully visible and testable
with a fake client). Emits UI message stream chunks (app/protocol.py) as it goes.
"""
from __future__ import annotations

import json
from typing import Any, Iterator

from app import protocol as P
from app.protocol import validate_ui_action
from app.tools import ToolSpec

_FINISH_REASON_MAP = {
    "end_turn": "stop",
    "stop_sequence": "stop",
    "max_tokens": "length",
    "tool_use": "tool-calls",
    "refusal": "content-filter",
    "pause_turn": "other",
}


def _finish_reason_for(stop_reason: str | None) -> str:
    return _FINISH_REASON_MAP.get(stop_reason or "", "other")


def _stringify(value: Any) -> str:
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value)
    except TypeError:
        return str(value)


def run_agent_turn(
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
    pricing: tuple[float, float] = (3.0, 15.0),
) -> Iterator[dict]:
    """Yields UI message stream chunks. Always ends with exactly one `finish` chunk."""
    all_tool_schemas = [t.schema for t in server_tools.values()] + [t.schema for t in ui_tools.values()]
    ui_tool_names = set(ui_tools.keys())
    server_tool_names = set(server_tools.keys())

    yield P.start()

    messages = list(anthropic_messages)
    total_cost_usd = 0.0
    step = 0
    finish_reason = "stop"

    try:
        while True:
            step += 1
            yield P.start_step()

            text_ids: dict[int, str] = {}
            stop_reason: str | None = None

            with client.messages.stream(
                model=model,
                max_tokens=max_output_tokens,
                system=system,
                tools=all_tool_schemas,
                messages=messages,
            ) as stream:
                for event in stream:
                    etype = getattr(event, "type", None)
                    if etype == "content_block_start":
                        idx = event.index
                        cb = event.content_block
                        if cb.type == "text":
                            uid = f"text-{step}-{idx}"
                            text_ids[idx] = uid
                            yield P.text_start(uid)
                        elif cb.type == "tool_use":
                            yield P.tool_input_start(cb.id, cb.name)
                        # "thinking"/"redacted_thinking" blocks: not surfaced to the UI stream.
                    elif etype == "content_block_delta":
                        idx = event.index
                        delta = event.delta
                        if getattr(delta, "type", None) == "text_delta" and idx in text_ids:
                            yield P.text_delta(text_ids[idx], delta.text)
                    elif etype == "content_block_stop":
                        idx = event.index
                        if idx in text_ids:
                            yield P.text_end(text_ids.pop(idx))

                final_message = stream.get_final_message()

            stop_reason = getattr(final_message, "stop_reason", None)
            usage = getattr(final_message, "usage", None)
            if usage is not None:
                in_tok = getattr(usage, "input_tokens", 0) or 0
                out_tok = getattr(usage, "output_tokens", 0) or 0
                total_cost_usd += (in_tok / 1_000_000) * pricing[0] + (out_tok / 1_000_000) * pricing[1]

            tool_use_blocks = [b for b in final_message.content if getattr(b, "type", None) == "tool_use"]

            ui_blocked = False
            valid_ui_calls: list[Any] = []
            server_calls: list[Any] = []

            for block in tool_use_blocks:
                if block.name in ui_tool_names:
                    validated = validate_ui_action(block.name, block.input, known_slugs, toolbox_names)
                    if isinstance(validated, str):
                        yield P.tool_input_error(block.id, block.name, block.input, validated)
                    else:
                        yield P.tool_input_available(block.id, block.name, validated["input"])
                        valid_ui_calls.append(block)
                    ui_blocked = True
                elif block.name in server_tool_names:
                    yield P.tool_input_available(block.id, block.name, block.input)
                    server_calls.append(block)
                else:
                    yield P.tool_input_error(block.id, block.name, block.input, f'unknown tool "{block.name}"')

            tool_results: list[dict] = []
            for block in server_calls:
                spec = server_tools[block.name]
                try:
                    output = spec.execute(block.input or {})
                    yield P.tool_output_available(block.id, output)
                    tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": _stringify(output)})
                except Exception as exc:  # defensive — a broken tool must not break the stream
                    err_text = f"{type(exc).__name__}: {exc}"
                    yield P.tool_output_error(block.id, err_text)
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": block.id, "content": err_text, "is_error": True}
                    )

            yield P.finish_step()

            if stop_reason == "refusal":
                yield P.error("The agent declined to respond.")
                finish_reason = "content-filter"
                break

            if not tool_use_blocks or stop_reason != "tool_use":
                finish_reason = _finish_reason_for(stop_reason)
                break

            if ui_blocked:
                # A client-side tool is pending: the step ends here and the browser
                # supplies the result on the visitor's next request (brief §2).
                finish_reason = "tool-calls"
                break

            if step >= max_steps:
                finish_reason = "length"
                break
            if total_cost_usd >= max_cost_usd:
                finish_reason = "other"
                break

            messages.append({"role": "assistant", "content": final_message.content})
            if tool_results:
                messages.append({"role": "user", "content": tool_results})
    except Exception as exc:  # network/API errors surface as a clean error part, not a crash
        yield P.error(f"{type(exc).__name__}: {exc}")
        finish_reason = "error"

    yield P.finish(finish_reason)
