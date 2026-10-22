"""capture_lead (brief §4) — only ever called after the visitor has given
explicit consent and the info to send; stores locally first (so nothing is
lost if email delivery fails), then emails the owner via Resend if configured."""
from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any

from app.integrations.resend import send_email
from app.storage.leads_store import save_lead

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _capture_lead(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        consent = bool(input_.get("consent"))
        email = str(input_.get("email", "")).strip()
        message = str(input_.get("message", "")).strip()[:2000]
        name = (str(input_.get("name", "")).strip() or None)

        if not consent:
            return {"error": "consent_required", "note": "Only call this after the visitor explicitly agrees to be contacted."}
        if not _EMAIL_RE.match(email):
            return {"error": "invalid_email"}
        if not message:
            return {"error": "message_required"}

        lead_id = save_lead(ctx.settings.leads_db_path, name=name, email=email, message=message, client_ip=ctx.client_ip)

        emailed = False
        if ctx.settings.resend_api_key:
            emailed = send_email(
                api_key=ctx.settings.resend_api_key,
                from_email=ctx.settings.resend_from_email,
                to_email=ctx.settings.resend_to_email,
                subject=f"New lead from the site agent{f' — {name}' if name else ''}",
                text=f"Name: {name or '—'}\nEmail: {email}\n\n{message}",
            )

        return {
            "stored": True,
            "leadId": lead_id,
            "emailed": emailed,
            "note": "Stored locally." + ("" if emailed else " Email not sent (no RESEND_API_KEY or delivery failed) — it's still saved."),
        }

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "capture_lead": ToolSpec(
            schema={
                "name": "capture_lead",
                "description": (
                    "Save a visitor's contact details and notify the owner. ONLY call this after the visitor has "
                    "explicitly agreed to be contacted and given their email — never on your own initiative."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                        "message": {"type": "string", "description": "what the visitor wants, in their own words"},
                        "consent": {"type": "boolean", "description": "must be true — the visitor explicitly agreed"},
                    },
                    "required": ["email", "message", "consent"],
                },
            },
            execute=_capture_lead(ctx),
        )
    }
