"""ui_* tool schemas (brief §2/C1) — no `execute`: the browser runs them. Enum
constraints are filled in dynamically from the live content directory (sections,
known slugs, toolbox names) so the model is schema-constrained to real values,
on top of the server-side validate_ui_action re-check in anthropic_agent.py."""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.protocol import SECTIONS

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    slug_enum = ctx.known_slugs or ["placeholder-no-projects-indexed"]
    tool_names_enum = ctx.toolbox_names or ["placeholder-no-tools-indexed"]

    return {
        "ui_scroll_to": ToolSpec(
            schema={
                "name": "ui_scroll_to",
                "description": "Scroll the visitor's page to a home-page section.",
                "input_schema": {
                    "type": "object",
                    "properties": {"section": {"type": "string", "enum": list(SECTIONS)}},
                    "required": ["section"],
                },
            }
        ),
        "ui_highlight_project": ToolSpec(
            schema={
                "name": "ui_highlight_project",
                "description": "Highlight a project's row on the home page.",
                "input_schema": {
                    "type": "object",
                    "properties": {"slug": {"type": "string", "enum": slug_enum}},
                    "required": ["slug"],
                },
            }
        ),
        "ui_open_project": ToolSpec(
            schema={
                "name": "ui_open_project",
                "description": "Open a project's run report page.",
                "input_schema": {
                    "type": "object",
                    "properties": {"slug": {"type": "string", "enum": slug_enum}},
                    "required": ["slug"],
                },
            }
        ),
        "ui_set_theme": ToolSpec(
            schema={
                "name": "ui_set_theme",
                "description": "Switch the site between day shift (light) and night shift (dark).",
                "input_schema": {
                    "type": "object",
                    "properties": {"theme": {"type": "string", "enum": ["light", "dark"]}},
                    "required": ["theme"],
                },
            }
        ),
        "ui_highlight_tools": ToolSpec(
            schema={
                "name": "ui_highlight_tools",
                "description": "Scroll to the toolbox and highlight tools by their exact names from get_toolbox.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "names": {
                            "type": "array",
                            "items": {"type": "string", "enum": tool_names_enum},
                            "minItems": 1,
                            "maxItems": 8,
                        }
                    },
                    "required": ["names"],
                },
            }
        ),
        "ui_prefill_contact": ToolSpec(
            schema={
                "name": "ui_prefill_contact",
                "description": "Fill the contact form's 'What should be automated?' field for the visitor. It never submits the form.",
                "input_schema": {
                    "type": "object",
                    "properties": {"summary": {"type": "string", "maxLength": 2000}},
                    "required": ["summary"],
                },
            }
        ),
    }
