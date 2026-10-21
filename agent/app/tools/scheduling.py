"""get_availability / propose_meeting_slots (brief §4) — Calendly v2, read-only.
NEVER books: there is no path here to Calendly's invitee-creation endpoint. The
default behaviour is to share the scheduling link; times are only listed as a
convenience, and the system prompt tells the model to always get the visitor's
explicit confirmation before treating a time as booked (which this agent can't
do anyway — booking happens on Calendly's own page)."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.integrations.calendly import CalendlyError, propose_slots

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec

_FALLBACK_SCHEDULING_URL = "https://calendly.com/moizkaseer/30-min-intro-call"


def _get_availability(ctx: "ToolContext"):
    def execute(_input_: dict[str, Any]) -> Any:
        return {
            "status": "available",
            "email": ctx.settings.resend_to_email,
            "bookingUrl": _FALLBACK_SCHEDULING_URL,
        }

    return execute


def _propose_meeting_slots(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        timezone_ = input_.get("timezone")
        token = ctx.settings.calendly_token
        if not token:
            return {
                "schedulingUrl": _FALLBACK_SCHEDULING_URL,
                "slots": [],
                "note": "No Calendly API token configured — share the scheduling link; the visitor picks a time there.",
            }
        try:
            result = propose_slots(token, event_slug=ctx.settings.calendly_event_slug, visitor_timezone=timezone_)
        except CalendlyError as exc:
            return {"schedulingUrl": _FALLBACK_SCHEDULING_URL, "slots": [], "note": f"Calendly lookup failed: {exc}"}
        result.setdefault("schedulingUrl", _FALLBACK_SCHEDULING_URL)
        result["note"] = (
            "These are open slots, not a booking. Never say a slot is confirmed — the visitor must book it "
            "themselves at the scheduling link, or tell you here that they want it and you can share the link."
        )
        return result

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "get_availability": ToolSpec(
            schema={
                "name": "get_availability",
                "description": "Whether the owner is taking projects, and how to reach them.",
                "input_schema": {"type": "object", "properties": {}},
            },
            execute=_get_availability(ctx),
        ),
        "propose_meeting_slots": ToolSpec(
            schema={
                "name": "propose_meeting_slots",
                "description": (
                    "Look up open 30-minute intro call slots and the scheduling link. Never claim a slot is booked — "
                    "the visitor books it themselves on the link, or by confirming explicitly that they want it."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "timezone": {
                            "type": "string",
                            "description": "the visitor's IANA timezone (e.g. 'America/New_York'), if they gave one",
                        }
                    },
                },
            },
            execute=_propose_meeting_slots(ctx),
        ),
    }
