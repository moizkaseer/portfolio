"""Resend HTTP API client (brief §4 capture_lead) — no SDK, plain httpx POST."""
from __future__ import annotations

import httpx

RESEND_API_URL = "https://api.resend.com/emails"


def send_email(
    *,
    api_key: str,
    from_email: str,
    to_email: str,
    subject: str,
    text: str,
    timeout: float = 10.0,
) -> bool:
    """Returns True on success. Never raises for a normal API-level failure —
    network/auth problems are degraded gracefully by the caller (capture_lead
    still stores the lead locally even if the email can't be sent)."""
    try:
        resp = httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": from_email, "to": [to_email], "subject": subject, "text": text},
            timeout=timeout,
        )
        return resp.status_code < 300
    except httpx.HTTPError:
        return False
