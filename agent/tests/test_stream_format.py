"""Full-stack test of POST /v1/chat against a mocked LLM — asserts the SSE
body matches the installed `ai` package's uiMessageChunkSchema shape and the
response headers match UI_MESSAGE_STREAM_HEADERS (brief §2/§8)."""
from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app, get_anthropic_client, get_index, get_limiter
from app.knowledge.bm25 import BM25Index
from app.ratelimit import MemorySlidingWindowLimiter
from conftest import FakeAnthropicClient, text_turn


def _override(settings: Settings, client):
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_index] = lambda: BM25Index()
    app.dependency_overrides[get_limiter] = lambda: MemorySlidingWindowLimiter(limit=1000, window_seconds=3600)
    app.dependency_overrides[get_anthropic_client] = lambda: client


def _clear_overrides():
    app.dependency_overrides.clear()


def _parse_sse(body: str) -> list[dict | None]:
    events: list[dict | None] = []
    for line in body.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: ") :]
        events.append(None if payload == "[DONE]" else json.loads(payload))
    return events


def test_chat_stream_matches_the_ai_sdk_ui_message_stream_format(settings):
    client = FakeAnthropicClient([text_turn("Hello, visitor.")])
    _override(settings, client)
    try:
        with TestClient(app) as tc:
            resp = tc.post(
                "/v1/chat",
                json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "hi"}]}]},
            )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        assert resp.headers["x-vercel-ai-ui-message-stream"] == "v1"
        assert resp.headers["cache-control"] == "no-cache"

        events = _parse_sse(resp.text)
        assert events[-1] is None, "stream must end with the literal `data: [DONE]` line"
        chunks = events[:-1]
        types = [c["type"] for c in chunks]
        assert types == ["start", "start-step", "text-start", "text-delta", "text-end", "finish-step", "finish"]
        assert chunks[types.index("text-delta")]["delta"] == "Hello, visitor."
    finally:
        _clear_overrides()


def test_without_a_configured_model_it_answers_503_demo(settings):
    _override(settings, client=None)
    try:
        with TestClient(app) as tc:
            resp = tc.post(
                "/v1/chat",
                json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "hi"}]}]},
            )
        assert resp.status_code == 503
        assert resp.json() == {"demo": True}
    finally:
        _clear_overrides()


def test_invalid_request_body_is_rejected_before_touching_the_model(settings):
    calls = []

    class ExplodingClient:
        class messages:
            @staticmethod
            def stream(**kwargs):
                calls.append(kwargs)
                raise AssertionError("must not be called")

    _override(settings, ExplodingClient())
    try:
        with TestClient(app) as tc:
            resp = tc.post("/v1/chat", json={"messages": []})
        assert resp.status_code == 400
        assert resp.json() == {"error": "invalid-request"}
        assert not calls
    finally:
        _clear_overrides()
