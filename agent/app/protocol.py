"""UI message stream protocol (brief §2) and the ui_* allow-list (brief C1 / lib/agent/protocol.ts).

Chunk shapes are verified against the installed `ai` package's uiMessageChunkSchema
(node_modules/ai/dist/index.js) rather than recalled from memory:
  - headers: content-type text/event-stream, cache-control no-cache, connection
    keep-alive, x-vercel-ai-ui-message-stream: v1, x-accel-buffering: no
  - SSE body: `data: {json}\\n\\n` per chunk, terminated by `data: [DONE]\\n\\n`
"""
from __future__ import annotations

import json
from typing import Any, Iterable

# ---------------------------------------------------------------------------
# UI tool allow-list — mirrors lib/agent/protocol.ts UI_TOOLS / SECTIONS exactly.
# ---------------------------------------------------------------------------

SECTIONS: tuple[str, ...] = ("your-turn", "work", "process", "agent", "toolbox", "contact")

UI_TOOLS: dict[str, str] = {
    "ui_scroll_to": "ui.scroll_to",
    "ui_highlight_project": "ui.highlight_project",
    "ui_open_project": "ui.open_project",
    "ui_set_theme": "ui.set_theme",
    "ui_highlight_tools": "ui.highlight_tools",
    "ui_prefill_contact": "ui.prefill_contact",
}
UI_TOOL_NAMES: frozenset[str] = frozenset(UI_TOOLS)

MAX_UI_ACTIONS_PER_TURN = 3


def validate_ui_action(
    tool: str, input_: Any, known_slugs: Iterable[str], toolbox_names: Iterable[str]
) -> dict | str:
    """Validates a UI tool call against the allow-list and real slugs/tool names.

    Returns the sanitized {"tool", "input"} dict on success, or an error string —
    same contract as lib/agent/protocol.ts validateUiAction.
    """
    if tool not in UI_TOOLS:
        return f'unknown UI tool "{tool}"'
    i = input_ if isinstance(input_, dict) else {}
    slugs = set(known_slugs)
    names = set(toolbox_names)

    if tool == "ui_scroll_to":
        section = i.get("section")
        if section in SECTIONS:
            return {"tool": "ui_scroll_to", "input": {"section": section}}
        return f'unknown section "{section}"'

    if tool in ("ui_highlight_project", "ui_open_project"):
        slug = str(i.get("slug"))
        if slug in slugs:
            return {"tool": tool, "input": {"slug": slug}}
        return f'unknown project "{slug}"'

    if tool == "ui_set_theme":
        theme = i.get("theme")
        if theme in ("light", "dark"):
            return {"tool": "ui_set_theme", "input": {"theme": theme}}
        return 'theme must be "light" or "dark"'

    if tool == "ui_highlight_tools":
        raw = i.get("names")
        picked = [str(n) for n in raw if str(n) in names] if isinstance(raw, list) else []
        if picked:
            return {"tool": "ui_highlight_tools", "input": {"names": picked[:8]}}
        return "none of those tools are in the toolbox"

    if tool == "ui_prefill_contact":
        summary = i.get("summary")
        if isinstance(summary, str) and summary.strip():
            return {"tool": "ui_prefill_contact", "input": {"summary": summary[:2000]}}
        return "summary is required"

    return f'unknown UI tool "{tool}"'  # pragma: no cover - unreachable, tool already checked


# ---------------------------------------------------------------------------
# UI message stream chunk builders — field names match uiMessageChunkSchema exactly.
# ---------------------------------------------------------------------------


def start(message_id: str | None = None) -> dict:
    c: dict[str, Any] = {"type": "start"}
    if message_id:
        c["messageId"] = message_id
    return c


def start_step() -> dict:
    return {"type": "start-step"}


def finish_step() -> dict:
    return {"type": "finish-step"}


def text_start(id_: str) -> dict:
    return {"type": "text-start", "id": id_}


def text_delta(id_: str, delta: str) -> dict:
    return {"type": "text-delta", "id": id_, "delta": delta}


def text_end(id_: str) -> dict:
    return {"type": "text-end", "id": id_}


def tool_input_start(tool_call_id: str, tool_name: str) -> dict:
    return {"type": "tool-input-start", "toolCallId": tool_call_id, "toolName": tool_name}


def tool_input_available(tool_call_id: str, tool_name: str, input_: Any) -> dict:
    return {"type": "tool-input-available", "toolCallId": tool_call_id, "toolName": tool_name, "input": input_}


def tool_input_error(tool_call_id: str, tool_name: str, input_: Any, error_text: str) -> dict:
    return {
        "type": "tool-input-error",
        "toolCallId": tool_call_id,
        "toolName": tool_name,
        "input": input_,
        "errorText": error_text,
    }


def tool_output_available(tool_call_id: str, output: Any) -> dict:
    return {"type": "tool-output-available", "toolCallId": tool_call_id, "output": output}


def tool_output_error(tool_call_id: str, error_text: str) -> dict:
    return {"type": "tool-output-error", "toolCallId": tool_call_id, "errorText": error_text}


def error(error_text: str) -> dict:
    return {"type": "error", "errorText": error_text}


def finish(finish_reason: str | None = None) -> dict:
    c: dict[str, Any] = {"type": "finish"}
    if finish_reason:
        c["finishReason"] = finish_reason
    return c


# UI_MESSAGE_STREAM_HEADERS mirrors node_modules/ai's ui-message-stream-headers.ts.
UI_MESSAGE_STREAM_HEADERS: dict[str, str] = {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "connection": "keep-alive",
    "x-vercel-ai-ui-message-stream": "v1",
    "x-accel-buffering": "no",
}


def encode_sse(chunk: dict) -> bytes:
    """One `data: {json}\\n\\n` line, matching JsonToSseTransformStream."""
    return f"data: {json.dumps(chunk, separators=(',', ':'))}\n\n".encode("utf-8")


SSE_DONE: bytes = b"data: [DONE]\n\n"
