"""draft_intro_email — unchanged from the TS implementation's intent: text only,
never sent (brief: "Keep the existing capabilities ... where sensible")."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec


def _draft_intro_email(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        summary = str(input_.get("summary", "")).strip()[:1000]
        return {
            "draft": (
                f"Hi Moiz,\n\nWe'd like to automate this: {summary}\n\n"
                "Could we talk about what a first version would look like?\n\nThanks"
            ),
            "note": "Not sent. The visitor can paste it into the contact form or use ui_prefill_contact.",
        }

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "draft_intro_email": ToolSpec(
            schema={
                "name": "draft_intro_email",
                "description": "Draft a short intro email the VISITOR can copy into the contact form. Returns text only — it never sends anything.",
                "input_schema": {
                    "type": "object",
                    "properties": {"summary": {"type": "string", "description": "the visitor's task in their words"}},
                    "required": ["summary"],
                },
            },
            execute=_draft_intro_email(ctx),
        )
    }
