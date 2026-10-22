"""get_toolbox — the tools the owner works with, grouped by category."""
from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec


def _get_toolbox(ctx: "ToolContext"):
    def execute(_input_: dict[str, Any]) -> Any:
        path = ctx.settings.content_dir / "toolbox.json"
        if not path.exists():
            return {"groups": []}
        return json.loads(path.read_text(encoding="utf-8"))

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "get_toolbox": ToolSpec(
            schema={
                "name": "get_toolbox",
                "description": "The tools the owner works with, grouped by category.",
                "input_schema": {"type": "object", "properties": {}},
            },
            execute=_get_toolbox(ctx),
        )
    }
