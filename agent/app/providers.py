"""LLM provider selection + error classification shared by both agent loops.

`LLM_PROVIDER` picks the loop:
  - "gemini" (default) -> app/gemini_agent.py, Google Gemini via the official
    `google-genai` SDK. Works on the FREE tier with a key from
    https://aistudio.google.com/apikey — no billing required.
  - "anthropic"        -> app/anthropic_agent.py (the original Claude loop).

Graceful degradation: when the provider is out of quota / rate-limited /
overloaded / misconfigured *before* the agent has said anything, the loops raise
`ProviderUnavailable`; app/main.py turns that into `503 {"demo": true}` so the
site quietly falls back to its scripted demo replay. If it happens mid-answer,
the loop finishes the stream with a short friendly text instead of a raw error.
"""
from __future__ import annotations

from typing import Any

SUPPORTED_PROVIDERS = ("gemini", "anthropic")

# Verified 2026-10-30 against a fresh AI Studio key: gemini-2.5-flash answers 404
# "no longer available to new users"; gemini-3.5-flash-lite is on the free tier.
DEFAULT_MODELS = {
    "gemini": "gemini-3.5-flash-lite",
    "anthropic": "claude-sonnet-4-5",
}
# Tried in order when the primary model is rate-limited / out of free quota /
# overloaded / not available to this key. Each Gemini model has its own free quota.
DEFAULT_FALLBACK_MODELS = {
    "gemini": "gemini-3.5-flash,gemini-flash-latest",
    "anthropic": "",
}

FRIENDLY_QUOTA_TEXT = (
    "I've hit my free usage limit for the moment, so I can't finish that answer right now. "
    "Please try again in a little while, or use the contact form / booking link to reach Moiz directly."
)
FRIENDLY_ERROR_TEXT = (
    "Something went wrong on my side while answering. "
    "Please try again in a moment, or use the contact form / booking link to reach Moiz directly."
)


class ProviderUnavailable(Exception):
    """The model provider can't serve this request (quota, rate limit, outage, bad key).

    `reason` is one of: "quota", "unavailable", "auth", "error".
    """

    def __init__(self, reason: str, detail: str = ""):
        super().__init__(f"{reason}: {detail}" if detail else reason)
        self.reason = reason
        self.detail = detail


def _status_code(exc: BaseException) -> int | None:
    for attr in ("code", "status_code", "status"):
        v = getattr(exc, attr, None)
        if isinstance(v, int):
            return v
    resp = getattr(exc, "response", None)
    v = getattr(resp, "status_code", None)
    return v if isinstance(v, int) else None


def classify_error(exc: BaseException) -> str:
    """Maps an SDK/network exception to a ProviderUnavailable reason."""
    code = _status_code(exc)
    text = f"{type(exc).__name__} {exc}".upper()
    if code == 429 or "RESOURCE_EXHAUSTED" in text or "QUOTA" in text or "RATELIMIT" in text.replace("_", "").replace(" ", ""):
        return "quota"
    if code == 404 or "NOT_FOUND" in text or "NO LONGER AVAILABLE" in text:
        return "model"
    if code in (401, 403) or "PERMISSION_DENIED" in text or "API_KEY_INVALID" in text or "UNAUTHENTICATED" in text:
        return "auth"
    if code is not None and code >= 500:
        return "unavailable"
    if "OVERLOADED" in text or "UNAVAILABLE" in text or "TIMEOUT" in text or "CONNECT" in text:
        return "unavailable"
    return "error"


def is_retryable_on_fallback(reason: str) -> bool:
    """A lighter fallback model has its own free-tier quota, so retry quota/overload on it."""
    return reason in ("quota", "unavailable", "model")


def friendly_text(reason: str) -> str:
    return FRIENDLY_QUOTA_TEXT if reason == "quota" else FRIENDLY_ERROR_TEXT


_MODEL_LIST_CACHE: dict[str, tuple[float, set[str]]] = {}
_MODEL_LIST_TTL_S = 6 * 3600


def available_gemini_models(client: Any, cache_key: str = "default") -> set[str] | None:
    """Model ids this key can call (from the live `models.list`), cached for 6h.

    Returns None when the list can't be read — callers then just try the configured
    chain as-is (a 404 on one model falls through to the next anyway)."""
    import time

    hit = _MODEL_LIST_CACHE.get(cache_key)
    if hit and time.time() - hit[0] < _MODEL_LIST_TTL_S:
        return hit[1]
    try:
        names: set[str] = set()
        for m in client.models.list():
            name = getattr(m, "name", "") or ""
            actions = getattr(m, "supported_actions", None)
            if actions and "generateContent" not in actions:
                continue
            names.add(name.split("/", 1)[-1])
    except Exception:
        return None
    if not names:
        return None
    _MODEL_LIST_CACHE[cache_key] = (time.time(), names)
    return names


def model_chain(primary: str, fallbacks: list[str], available: set[str] | None) -> list[str]:
    """Primary first, then fallbacks, de-duplicated; models the live list says this key
    can't use are dropped (but the primary is never dropped if the list would be empty)."""
    chain: list[str] = []
    for m in [primary, *fallbacks]:
        if m and m not in chain:
            chain.append(m)
    if available:
        usable = [m for m in chain if m in available]
        if usable:
            return usable
    return chain


def make_llm_client(provider: str, *, gemini_api_key: str | None, anthropic_api_key: str | None, timeout_ms: int = 25_000) -> Any | None:
    """Returns an SDK client for the configured provider, or None (-> demo mode) when no key is set."""
    if provider == "anthropic":
        if not anthropic_api_key:
            return None
        import anthropic

        return anthropic.Anthropic(api_key=anthropic_api_key)
    if not gemini_api_key:
        return None
    from google import genai

    return genai.Client(api_key=gemini_api_key, http_options={"timeout": timeout_ms})
