"""get_prompt_state — the system the visitor sketched in the home page's
'What should run itself?' box, passed in on the request body (brief: "keep ...
prompt state if meaningful")."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec


def _get_prompt_state(ctx: "ToolContext"):
    def execute(_input_: dict[str, Any]) -> Any:
        return ctx.prompt_state or {"none": "The visitor hasn't built a system in 'What should run itself?' yet."}

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "get_prompt_state": ToolSpec(
            schema={
                "name": "get_prompt_state",
                "description": (
                    "The system the visitor just sketched in the home page's 'What should run itself?' box: their "
                    "task in their words and the steps (kind + title). Use it when they ask about 'this system', "
                    "'what I built', or whether it could really be built."
                ),
                "input_schema": {"type": "object", "properties": {}},
            },
            execute=_get_prompt_state(ctx),
        )
    }
