"""Shared-secret auth and request-shape guardrails (brief §5)."""
from __future__ import annotations

import hmac
from typing import Any

from fastapi import HTTPException, Request

from app.config import Settings

AGENT_SECRET_HEADER = "x-agent-secret"


def check_shared_secret(request: Request, settings: Settings) -> None:
    """Constant-time comparison against AGENT_SHARED_SECRET. If unset, the
    service runs open (documented in the README as a dev-only configuration —
    production deployments must set it)."""
    expected = settings.shared_secret
    if not expected:
        return
    provided = request.headers.get(AGENT_SECRET_HEADER, "")
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="invalid or missing shared secret")


class GuardrailError(Exception):
    def __init__(self, code: str, status_code: int = 400):
        super().__init__(code)
        self.code = code
        self.status_code = status_code


def validate_request_shape(body: Any, settings: Settings) -> list[dict]:
    """Validates the UIMessage[] request body shape and session limits. Returns
    the messages list on success; raises GuardrailError otherwise."""
    from app.messages import text_of_message

    if not isinstance(body, dict):
        raise GuardrailError("invalid-request")

    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        raise GuardrailError("invalid-request")
    if len(messages) > settings.max_messages:
        raise GuardrailError("too-many-messages", status_code=413)

    for m in messages:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant"):
            raise GuardrailError("invalid-request")
        if not isinstance(m.get("parts"), list):
            raise GuardrailError("invalid-request")

    user_messages = [m for m in messages if m.get("role") == "user"]
    if len(user_messages) > settings.max_turns:
        raise GuardrailError("turn-limit", status_code=429)

    for m in user_messages:
        if len(text_of_message(m)) > settings.max_input_chars:
            raise GuardrailError("too-long", status_code=413)

    return messages
