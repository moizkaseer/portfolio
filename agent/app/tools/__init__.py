"""The agent's tool registry (brief §4). Mirrors lib/server/agent-tools.ts:
server tools execute here and return data; ui_* tools have no `execute` — the
agent loop emits them as client-side tool calls and waits for the browser's
result on the next request.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from app.config import Settings
from app.knowledge.bm25 import BM25Index
from app.protocol import SECTIONS, UI_TOOLS


@dataclass(frozen=True)
class ToolSpec:
    schema: dict[str, Any]
    execute: Callable[[dict[str, Any]], Any] | None = None


@dataclass(frozen=True)
class ToolContext:
    settings: Settings
    index: BM25Index
    known_slugs: list[str]
    toolbox_names: list[str]
    prompt_state: dict[str, Any] | None
    client_ip: str | None


def build_server_tools(ctx: ToolContext) -> dict[str, ToolSpec]:
    from app.tools import intro_email, knowledge, leads, prompt_state as prompt_state_tool, proposal, recruiter, scheduling, toolbox

    tools: dict[str, ToolSpec] = {}
    tools.update(knowledge.build(ctx))
    tools.update(recruiter.build(ctx))
    tools.update(scheduling.build(ctx))
    tools.update(leads.build(ctx))
    tools.update(proposal.build(ctx))
    tools.update(intro_email.build(ctx))
    tools.update(toolbox.build(ctx))
    tools.update(prompt_state_tool.build(ctx))
    return tools


def build_ui_tools(ctx: ToolContext) -> dict[str, ToolSpec]:
    from app.tools import ui_tools

    return ui_tools.build(ctx)


__all__ = ["ToolSpec", "ToolContext", "build_server_tools", "build_ui_tools", "SECTIONS", "UI_TOOLS"]
