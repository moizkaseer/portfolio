"""Gemini agent-loop tests against a scripted fake `google-genai` client — no network calls."""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings, load_settings
from app.gemini_agent import build_config, run_gemini_turn, to_gemini_contents
from app.knowledge.bm25 import BM25Index
from app.main import app, get_index, get_limiter, get_llm_client
from app.providers import ProviderUnavailable, classify_error, model_chain
from app.ratelimit import MemorySlidingWindowLimiter
from app.tools import ToolSpec
from conftest import make_settings


# ---------------------------------------------------------------------------
# Fake google-genai client
# ---------------------------------------------------------------------------


class FakeAPIError(Exception):
    def __init__(self, code: int, status: str, message: str = ""):
        super().__init__(f"{code} {status}. {message}")
        self.code = code
        self.status = status


def _usage(inp=10, out=5):
    return SimpleNamespace(prompt_token_count=inp, candidates_token_count=out, thoughts_token_count=0)


def text_chunks(*texts: str, finish: str = "STOP"):
    chunks = []
    for i, t in enumerate(texts):
        last = i == len(texts) - 1
        cand = SimpleNamespace(
            content=SimpleNamespace(parts=[SimpleNamespace(text=t, function_call=None, thought=None, thought_signature=None)]),
            finish_reason=SimpleNamespace(name=finish) if last else None,
        )
        chunks.append(SimpleNamespace(candidates=[cand], usage_metadata=_usage() if last else None))
    return chunks


def call_chunks(name: str, args: dict, call_id: str | None = "fc-1", sig: bytes | None = None):
    part = SimpleNamespace(
        text=None, thought=None, thought_signature=sig, function_call=SimpleNamespace(id=call_id, name=name, args=args)
    )
    cand = SimpleNamespace(content=SimpleNamespace(parts=[part]), finish_reason=SimpleNamespace(name="STOP"))
    return [SimpleNamespace(candidates=[cand], usage_metadata=_usage())]


class FakeModels:
    def __init__(self, turns: list, available: list[str] | None = None):
        self._turns = list(turns)
        self.calls: list[dict] = []
        self._available = available

    def generate_content_stream(self, *, model, contents, config):
        self.calls.append({"model": model, "contents": json.loads(json.dumps(contents, default=str)), "config": config})
        if not self._turns:
            raise AssertionError("FakeGeminiClient ran out of scripted turns")
        turn = self._turns.pop(0)
        if isinstance(turn, Exception):
            raise turn
        return iter(turn)

    def list(self):
        if self._available is None:
            raise RuntimeError("list not allowed")
        return [SimpleNamespace(name=f"models/{n}", supported_actions=["generateContent"]) for n in self._available]


class FakeGeminiClient:
    def __init__(self, turns: list, available: list[str] | None = None):
        self.models = FakeModels(turns, available)


def collect(gen) -> list[dict]:
    return list(gen)


def _run(client, *, server_tools=None, ui_tools=None, **kw):
    params = dict(
        model="gemini-test",
        system="sys",
        anthropic_messages=[{"role": "user", "content": "hello"}],
        server_tools=server_tools or {},
        ui_tools=ui_tools or {},
        known_slugs=["demo-project"],
        toolbox_names=["Python"],
    )
    params.update(kw)
    return collect(run_gemini_turn(client, **params))


ECHO = {
    "echo": ToolSpec(
        schema={"name": "echo", "description": "echo", "input_schema": {"type": "object", "properties": {"x": {"type": "string"}}}},
        execute=lambda i: {"echo": i.get("x")},
    )
}
UI = {
    "ui_scroll_to": ToolSpec(
        schema={"name": "ui_scroll_to", "description": "scroll", "input_schema": {"type": "object", "properties": {"section": {"type": "string"}}}}
    )
}


# ---------------------------------------------------------------------------
# The loop
# ---------------------------------------------------------------------------


def test_plain_text_answer_streams_the_same_chunk_sequence_as_the_anthropic_loop():
    client = FakeGeminiClient([text_chunks("Hi ", "there!")])
    chunks = _run(client)
    types = [c["type"] for c in chunks]
    assert types == ["start", "start-step", "text-start", "text-delta", "text-delta", "text-end", "finish-step", "finish"]
    assert "".join(c["delta"] for c in chunks if c["type"] == "text-delta") == "Hi there!"
    assert chunks[-1] == {"type": "finish", "finishReason": "stop"}
    cfg = client.models.calls[0]["config"]
    assert cfg["automatic_function_calling"] == {"disable": True}
    assert cfg["system_instruction"] == "sys"


def test_server_tool_call_executes_then_feeds_a_function_response_to_the_next_step():
    client = FakeGeminiClient([call_chunks("echo", {"x": "ping"}), text_chunks("done")])
    chunks = _run(client, server_tools=ECHO)
    types = [c["type"] for c in chunks]
    assert types.count("start-step") == 2
    assert {"type": "tool-output-available", "toolCallId": "fc-1", "output": {"echo": "ping"}} in chunks
    second = client.models.calls[1]["contents"]
    assert second[-2]["role"] == "model" and second[-2]["parts"][0]["function_call"]["name"] == "echo"
    assert second[-1]["role"] == "user"
    assert second[-1]["parts"][0]["function_response"] == {"id": "fc-1", "name": "echo", "response": {"result": {"echo": "ping"}}}


def test_missing_function_call_ids_get_stable_generated_ids():
    client = FakeGeminiClient([call_chunks("echo", {"x": "a"}, call_id=None), text_chunks("ok")])
    chunks = _run(client, server_tools=ECHO)
    ids = {c["toolCallId"] for c in chunks if c["type"].startswith("tool-")}
    assert ids == {"call-1-0"}


def test_ui_tool_call_ends_the_turn_without_a_second_model_call():
    client = FakeGeminiClient([call_chunks("ui_scroll_to", {"section": "work"})])
    chunks = _run(client, ui_tools=UI)
    assert {"type": "tool-input-available", "toolCallId": "fc-1", "toolName": "ui_scroll_to", "input": {"section": "work"}} in chunks
    assert chunks[-1] == {"type": "finish", "finishReason": "tool-calls"}
    assert len(client.models.calls) == 1


def test_invalid_ui_input_is_rejected_server_side():
    client = FakeGeminiClient([call_chunks("ui_scroll_to", {"section": "nope"})])
    chunks = _run(client, ui_tools=UI)
    assert any(c["type"] == "tool-input-error" for c in chunks)


def test_step_cap_stops_the_loop():
    client = FakeGeminiClient([call_chunks("echo", {"x": str(i)}) for i in range(10)])
    chunks = _run(client, server_tools=ECHO, max_steps=3)
    assert len(client.models.calls) == 3
    assert chunks[-1] == {"type": "finish", "finishReason": "length"}


def test_cost_cap_stops_the_loop_when_pricing_is_nonzero():
    client = FakeGeminiClient([call_chunks("echo", {"x": str(i)}) for i in range(10)])
    chunks = _run(client, server_tools=ECHO, max_steps=10, max_cost_usd=0.00001, pricing=(1.0, 1.0))
    assert len(client.models.calls) == 1
    assert chunks[-1] == {"type": "finish", "finishReason": "other"}


def test_quota_error_on_the_primary_falls_back_to_the_next_model():
    client = FakeGeminiClient([FakeAPIError(429, "RESOURCE_EXHAUSTED"), text_chunks("from fallback")])
    chunks = _run(client, fallback_models=["gemini-lite"])
    assert [c["model"] for c in client.models.calls] == ["gemini-test", "gemini-lite"]
    assert "".join(c.get("delta", "") for c in chunks) == "from fallback"


def test_model_not_found_also_falls_through_the_chain():
    client = FakeGeminiClient([FakeAPIError(404, "NOT_FOUND", "no longer available to new users"), text_chunks("ok")])
    _run(client, fallback_models=["gemini-next"])
    assert [c["model"] for c in client.models.calls] == ["gemini-test", "gemini-next"]


def test_quota_on_every_model_before_any_output_raises_provider_unavailable():
    client = FakeGeminiClient([FakeAPIError(429, "RESOURCE_EXHAUSTED")] * 3)
    with pytest.raises(ProviderUnavailable) as info:
        _run(client, fallback_models=["b", "c"])
    assert info.value.reason == "quota"
    assert len(client.models.calls) == 3


def test_quota_after_the_agent_already_answered_ends_with_a_friendly_message():
    client = FakeGeminiClient([call_chunks("echo", {"x": "1"}), FakeAPIError(429, "RESOURCE_EXHAUSTED")])
    chunks = _run(client, server_tools=ECHO)
    text = "".join(c.get("delta", "") for c in chunks if c["type"] == "text-delta")
    assert "free usage limit" in text
    assert not any(c["type"] == "error" for c in chunks)
    assert chunks[-1]["type"] == "finish"


def test_empty_response_still_says_something_useful():
    empty = [SimpleNamespace(candidates=[SimpleNamespace(content=None, finish_reason=SimpleNamespace(name="MALFORMED_FUNCTION_CALL"))], usage_metadata=None)]
    chunks = _run(FakeGeminiClient([empty]))
    assert any(c["type"] == "text-delta" for c in chunks)
    assert chunks[-1]["type"] == "finish"


# ---------------------------------------------------------------------------
# History conversion, config, provider helpers
# ---------------------------------------------------------------------------


def test_history_conversion_maps_tool_use_and_tool_result():
    msgs = [
        {"role": "user", "content": "scroll please"},
        {"role": "assistant", "content": [{"type": "text", "text": "ok"}, {"type": "tool_use", "id": "t1", "name": "ui_scroll_to", "input": {"section": "work"}}]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t1", "content": '{"status": "done"}'}]},
    ]
    contents = to_gemini_contents(msgs, "gemini-3.5-flash-lite")
    assert [c["role"] for c in contents] == ["user", "model", "user"]
    fc_part = contents[1]["parts"][1]
    assert fc_part["function_call"] == {"id": "t1", "name": "ui_scroll_to", "args": {"section": "work"}}
    assert fc_part["thought_signature"]  # Gemini 3+ needs a signature on replayed calls
    assert contents[2]["parts"][0]["function_response"] == {"id": "t1", "name": "ui_scroll_to", "response": {"result": {"status": "done"}}}
    assert "thought_signature" not in to_gemini_contents(msgs, "gemini-2.5-flash")[1]["parts"][1]


def test_config_converts_anthropic_tool_schemas_to_function_declarations():
    cfg = build_config(model="gemini-3.5-flash-lite", system="s", tool_schemas=[ECHO["echo"].schema], max_output_tokens=500, thinking_level="low")
    decl = cfg["tools"][0]["function_declarations"][0]
    assert decl["name"] == "echo" and decl["parameters_json_schema"]["type"] == "object"
    assert cfg["thinking_config"] == {"thinking_level": "low"}


def test_config_is_accepted_by_the_real_sdk_types():
    from google.genai import types

    cfg = build_config(model="gemini-3.5-flash-lite", system="s", tool_schemas=[ECHO["echo"].schema], max_output_tokens=500, thinking_level=None)
    types.GenerateContentConfig.model_validate(cfg)
    types.Content.model_validate(to_gemini_contents([{"role": "assistant", "content": [{"type": "tool_use", "id": "a", "name": "echo", "input": {}}]}], "gemini-3.5-flash")[0])


@pytest.mark.parametrize(
    "exc,reason",
    [
        (FakeAPIError(429, "RESOURCE_EXHAUSTED"), "quota"),
        (FakeAPIError(404, "NOT_FOUND"), "model"),
        (FakeAPIError(400, "INVALID_ARGUMENT", "API_KEY_INVALID"), "auth"),
        (FakeAPIError(503, "UNAVAILABLE"), "unavailable"),
        (ValueError("weird"), "error"),
    ],
)
def test_classify_error(exc, reason):
    assert classify_error(exc) == reason


def test_model_chain_uses_the_live_model_list_when_available():
    assert model_chain("a", ["b", "a", "c"], None) == ["a", "b", "c"]
    assert model_chain("a", ["b", "c"], {"b", "c"}) == ["b", "c"]
    assert model_chain("a", ["b"], {"zzz"}) == ["a", "b"]  # never ends up empty


def test_settings_default_to_gemini_free_tier(monkeypatch):
    for k in ("LLM_PROVIDER", "AGENT_MODEL", "AGENT_FALLBACK_MODELS", "GEMINI_API_KEY", "GOOGLE_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    s = load_settings()
    assert s.llm_provider == "gemini"
    assert s.model == "gemini-3.5-flash-lite"
    assert s.fallback_models == ["gemini-3.5-flash", "gemini-flash-latest"]
    assert s.model_configured is False
    assert s.model_pricing() == (0.0, 0.0)
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("AGENT_FALLBACK_MODELS", "none")
    s = load_settings()
    assert s.model_configured is True and s.fallback_models == []


# ---------------------------------------------------------------------------
# /v1/chat end to end with the fake client: graceful demo fallback
# ---------------------------------------------------------------------------


def _override(settings, client):
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_index] = lambda: BM25Index()
    app.dependency_overrides[get_limiter] = lambda: MemorySlidingWindowLimiter(limit=1000, window_seconds=3600)
    app.dependency_overrides[get_llm_client] = lambda: client


BODY = {"messages": [{"role": "user", "parts": [{"type": "text", "text": "hi"}]}]}


def _gemini_settings(tmp_path, content_dir):
    return make_settings(
        tmp_path, content_dir, llm_provider="gemini", gemini_api_key="k", model="gemini-test", fallback_models=["gemini-lite"]
    )


def test_chat_streams_gemini_output_in_the_ai_sdk_format(tmp_path, content_dir):
    client = FakeGeminiClient([text_chunks("Hello from Gemini")], available=["gemini-test", "gemini-lite"])
    _override(_gemini_settings(tmp_path, content_dir), client)
    try:
        with TestClient(app) as tc:
            resp = tc.post("/v1/chat", json=BODY)
        assert resp.status_code == 200
        assert resp.headers["x-vercel-ai-ui-message-stream"] == "v1"
        assert "Hello from Gemini" in resp.text
        assert resp.text.rstrip().endswith("data: [DONE]")
    finally:
        app.dependency_overrides.clear()


def test_chat_answers_503_demo_when_gemini_free_quota_is_exhausted(tmp_path, content_dir):
    client = FakeGeminiClient([FakeAPIError(429, "RESOURCE_EXHAUSTED")] * 2)
    _override(_gemini_settings(tmp_path, content_dir), client)
    try:
        with TestClient(app) as tc:
            resp = tc.post("/v1/chat", json=BODY)
        assert resp.status_code == 503
        assert resp.json() == {"demo": True, "reason": "quota"}
        assert [c["model"] for c in client.models.calls] == ["gemini-test", "gemini-lite"]
    finally:
        app.dependency_overrides.clear()


def test_healthz_reports_the_provider(tmp_path, content_dir):
    app.dependency_overrides[get_settings] = lambda: _gemini_settings(tmp_path, content_dir)
    try:
        with TestClient(app) as tc:
            body = tc.get("/healthz").json()
        assert body["provider"] == "gemini" and body["modelConfigured"] is True
    finally:
        app.dependency_overrides.clear()
