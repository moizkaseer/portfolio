"""Converts the request's UIMessage[] (AI SDK shape) into Anthropic Messages API
turns — the same splitting `convertToModelMessages` does in the `ai` package:
a tool call becomes a `tool_use` block on the assistant turn, and its output (if
already present, e.g. a ui_* tool result the browser sent back) becomes a
`tool_result` block on the very next user turn.
"""
from __future__ import annotations

from typing import Any


def _text_of(parts: list[dict]) -> str:
    return "".join(p.get("text", "") for p in parts if p.get("type") == "text")


def _tool_result_content(output: Any) -> str:
    import json

    if isinstance(output, str):
        return output
    try:
        return json.dumps(output)
    except TypeError:
        return str(output)


def to_anthropic_messages(ui_messages: list[dict]) -> list[dict]:
    anthropic_messages: list[dict] = []

    for m in ui_messages:
        role = m.get("role")
        parts = m.get("parts") or []

        if role == "user":
            text = _text_of(parts)
            anthropic_messages.append({"role": "user", "content": text})
            continue

        if role != "assistant":
            continue  # system messages aren't part of UIMessage[]; ignored defensively

        content_blocks: list[dict] = []
        tool_results: list[dict] = []

        for part in parts:
            ptype = part.get("type", "")
            if ptype == "text":
                text = part.get("text", "")
                if text:
                    content_blocks.append({"type": "text", "text": text})
            elif ptype.startswith("tool-"):
                tool_name = ptype[len("tool-") :]
                tool_call_id = part.get("toolCallId")
                tool_input = part.get("input", {})
                content_blocks.append(
                    {"type": "tool_use", "id": tool_call_id, "name": tool_name, "input": tool_input}
                )
                state = part.get("state")
                if state == "output-available":
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_call_id,
                            "content": _tool_result_content(part.get("output")),
                        }
                    )
                elif state == "output-error":
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_call_id,
                            "content": part.get("errorText", "error"),
                            "is_error": True,
                        }
                    )
                # state == "input-available" with no output yet: pending client-side
                # (ui_*) tool call — leave it without a tool_result; this must be the
                # last turn in the conversation.

        if content_blocks:
            anthropic_messages.append({"role": "assistant", "content": content_blocks})
        if tool_results:
            anthropic_messages.append({"role": "user", "content": tool_results})

    return anthropic_messages


def text_of_message(m: dict) -> str:
    """Flattened text of one UIMessage — used for input-length guardrails."""
    return _text_of(m.get("parts") or [])
