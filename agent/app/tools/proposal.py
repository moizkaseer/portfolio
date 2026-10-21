"""draft_proposal (brief §4) — a deterministic one-page scope scaffold from the
visitor's described task. No prices (unless AGENT_RATE_INFO is configured), and
always marked as a draft."""
from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec


def _draft_proposal(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        task = str(input_.get("task_description", "")).strip()[:2000]
        if not task:
            return {"error": "task_description is required"}

        relevant = [r for r in ctx.index.search(task, top_k=5) if r["kind"] in ("project", "toolbox")]
        suggested_stack = sorted({w for r in relevant if r["kind"] == "toolbox" for w in r["text"].split(", ")[-1:]})
        related_runs = [{"id": r["id"], "title": r["title"], "url": r["url"]} for r in relevant if r["kind"] == "project"]

        rate_info = os.environ.get("AGENT_RATE_INFO", "").strip()

        return {
            "draft": True,
            "problem": task,
            "approach": (
                "Start from the task as it's done today, build a working pipeline on real inputs, and measure it: "
                "what it costs, how long it takes, and how often it's right. A person stays in the loop wherever a "
                "mistake would matter."
            ),
            "deliverables": [
                "A working first version on real inputs (not a demo on sample data)",
                "Evals / a measured accuracy or cost number for the core step",
                "Guardrails appropriate to the task (human review, rate limits, an off switch)",
                "A short run log / trace so every run can be replayed",
            ],
            "milestones": [
                "Scope confirmed and access to real inputs/tools arranged",
                "First working pipeline on real data, measured",
                "Guardrails and review step added",
                "Handover: docs, logs, and how to turn it off",
            ],
            "assumptions": [
                "The visitor can provide representative real inputs and access to the tools involved",
                "Scope is one well-defined task, not an open-ended platform",
            ],
            "openQuestions": [
                "What does today's manual process actually look like, step by step?",
                "What does a wrong answer cost, and who reviews it today?",
                "What tools/systems does this need to read from or write to?",
            ],
            "relatedRuns": related_runs,
            "suggestedStack": suggested_stack,
            "pricing": rate_info or "Not set — ask the owner directly for a quote.",
            "note": "This is a draft scope only, generated from the visitor's description — not a contract or a quote.",
        }

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "draft_proposal": ToolSpec(
            schema={
                "name": "draft_proposal",
                "description": (
                    "Draft a one-page scope (problem, approach, deliverables, milestones, assumptions, open "
                    "questions) from a visitor's described task. Never includes prices unless the owner configured "
                    "a rate — always present it as a draft, not a quote."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {"task_description": {"type": "string", "description": "the visitor's task, in their words"}},
                    "required": ["task_description"],
                },
            },
            execute=_draft_proposal(ctx),
        )
    }
