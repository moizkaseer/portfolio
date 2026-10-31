"""Regressions found by the live end-to-end test of the site agent (2026-10-31):
malformed / empty requests must be 4xx (a 5xx flips the site to demo mode), the whole
turn must finish inside the proxy's time budget, the proxy-asserted visitor IP is used
for rate limiting, and overview questions get the full, featured-first project list."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.knowledge.content_loader import load_project_detail, load_project_summaries, load_projects
from app.main import app
from app.providers import ProviderUnavailable
from app.ratelimit import client_ip
from app.security import GuardrailError, validate_request_shape
from app.system_prompt import build_system_prompt
from app.tools import ToolContext, build_server_tools
from app.knowledge.bm25 import BM25Index
from conftest import make_settings
from test_gemini_agent import FakeGeminiClient, UI, ECHO, _gemini_settings, _override, _run, call_chunks, text_chunks

import pytest


# --- request guardrails -------------------------------------------------------------


@pytest.mark.parametrize("raw", [b"not json", b"", b"{", b"\xff\xfe"])
def test_malformed_json_body_is_a_400_not_a_500(tmp_path, content_dir, raw):
    _override(_gemini_settings(tmp_path, content_dir), FakeGeminiClient([]))
    try:
        with TestClient(app, raise_server_exceptions=False) as tc:
            resp = tc.post("/v1/chat", content=raw, headers={"content-type": "application/json"})
        assert resp.status_code == 400
        assert resp.json() == {"error": "invalid-request"}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("text", ["", "   ", "\n\t"])
def test_empty_visitor_message_is_rejected_before_the_model(tmp_path, content_dir, text):
    client = FakeGeminiClient([])  # any model call would raise "ran out of scripted turns"
    _override(_gemini_settings(tmp_path, content_dir), client)
    try:
        with TestClient(app) as tc:
            resp = tc.post("/v1/chat", json={"messages": [{"role": "user", "parts": [{"type": "text", "text": text}]}]})
        assert resp.status_code == 400
        assert resp.json() == {"error": "empty"}
        assert client.models.calls == []
    finally:
        app.dependency_overrides.clear()


def test_empty_check_only_applies_to_a_new_visitor_message(settings):
    # a follow-up after a ui_* tool ends with the assistant turn — that's fine
    body = {
        "messages": [
            {"role": "user", "parts": [{"type": "text", "text": "show me"}]},
            {"role": "assistant", "parts": [{"type": "tool-ui_scroll_to", "toolCallId": "c1", "state": "output-available", "input": {}, "output": {}}]},
        ]
    }
    assert validate_request_shape(body, settings)
    with pytest.raises(GuardrailError):
        validate_request_shape({"messages": [{"role": "user", "parts": []}]}, settings)


# --- rate-limit key -------------------------------------------------------------------


def test_proxy_asserted_client_ip_is_only_trusted_with_the_shared_secret():
    headers = {"x-agent-client-ip": "198.51.100.9", "x-forwarded-for": "10.0.0.1, 10.0.0.2"}
    assert client_ip(headers, trust_proxy_header=True) == "198.51.100.9"
    assert client_ip(headers) == "10.0.0.1"
    assert client_ip({"x-forwarded-for": "203.0.113.1"}, trust_proxy_header=True) == "203.0.113.1"
    assert client_ip({"x-agent-client-ip": "unknown", "x-real-ip": "203.0.113.2"}, trust_proxy_header=True) == "203.0.113.2"


def test_rate_limit_keys_on_the_proxy_asserted_ip(tmp_path, content_dir):
    from app.main import get_limiter
    from app.ratelimit import MemorySlidingWindowLimiter

    settings = make_settings(
        tmp_path, content_dir, llm_provider="gemini", gemini_api_key="k", model="gemini-test", fallback_models=[], shared_secret="s"
    )
    limiter = MemorySlidingWindowLimiter(limit=1, window_seconds=3600)
    _override(settings, FakeGeminiClient([text_chunks("one"), text_chunks("two")]))
    app.dependency_overrides[get_limiter] = lambda: limiter
    body = {"messages": [{"role": "user", "parts": [{"type": "text", "text": "hi"}]}]}
    try:
        with TestClient(app) as tc:
            h = {"x-agent-secret": "s", "x-forwarded-for": "10.0.0.1"}
            assert tc.post("/v1/chat", json=body, headers={**h, "x-agent-client-ip": "198.51.100.1"}).status_code == 200
            # same proxy hop, different visitor -> not limited
            assert tc.post("/v1/chat", json=body, headers={**h, "x-agent-client-ip": "198.51.100.2"}).status_code == 200
            # same visitor again -> limited
            assert tc.post("/v1/chat", json=body, headers={**h, "x-agent-client-ip": "198.51.100.1"}).status_code == 429
    finally:
        app.dependency_overrides.clear()


# --- turn deadline --------------------------------------------------------------------


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


class SlowModels:
    """Each model call advances the fake clock, then plays a scripted turn."""

    def __init__(self, clock: Clock, turns: list, cost_s: float):
        self.clock, self.turns, self.cost_s, self.calls = clock, list(turns), cost_s, []

    def generate_content_stream(self, *, model, contents, config):
        self.calls.append({"model": model, "config": config})
        self.clock.t += self.cost_s
        turn = self.turns.pop(0)
        if isinstance(turn, Exception):
            raise turn
        return iter(turn)


class SlowClient:
    def __init__(self, clock, turns, cost_s):
        self.models = SlowModels(clock, turns, cost_s)


def test_each_model_call_gets_a_timeout_no_longer_than_the_time_left():
    clock = Clock()
    client = SlowClient(clock, [text_chunks("hi")], cost_s=1)
    _run(client, turn_budget_s=10, attempt_timeout_s=15, clock=clock)
    assert client.models.calls[0]["config"]["http_options"] == {"timeout": 10_000}

    client = SlowClient(clock, [text_chunks("hi")], cost_s=1)
    _run(client, turn_budget_s=45, attempt_timeout_s=15, clock=clock)
    assert client.models.calls[0]["config"]["http_options"] == {"timeout": 15_000}


def test_hung_primary_times_out_and_falls_back_within_the_budget():
    clock = Clock()
    client = SlowClient(clock, [TimeoutError("ReadTimeout"), text_chunks("from the fallback")], cost_s=15)
    chunks = _run(client, fallback_models=["gemini-lite"], turn_budget_s=45, attempt_timeout_s=15, clock=clock)
    assert [c["model"] for c in client.models.calls] == ["gemini-test", "gemini-lite"]
    assert "from the fallback" in "".join(c.get("delta", "") for c in chunks)


def test_out_of_budget_before_any_output_raises_provider_unavailable():
    clock = Clock()
    client = SlowClient(clock, [TimeoutError("ReadTimeout"), text_chunks("never")], cost_s=44)
    with pytest.raises(ProviderUnavailable):
        _run(client, fallback_models=["gemini-lite"], turn_budget_s=45, attempt_timeout_s=15, clock=clock)
    assert len(client.models.calls) == 1  # no fallback attempt once the budget is spent


def test_out_of_budget_after_a_tool_call_finishes_politely():
    clock = Clock()
    client = SlowClient(clock, [call_chunks("echo", {"x": "ping"}), text_chunks("never")], cost_s=44.5)
    chunks = _run(client, server_tools=ECHO, turn_budget_s=45, attempt_timeout_s=15, clock=clock)
    text = "".join(c.get("delta", "") for c in chunks)
    assert "try again" in text.lower()
    assert chunks[-1]["type"] == "finish"
    assert len(client.models.calls) == 1


# --- knowledge: featured-first project list --------------------------------------------


def _write_project(content_dir, slug, **fm):
    d = content_dir / "projects" / slug
    d.mkdir(parents=True, exist_ok=True)
    lines = ["---", f'title: "{fm.pop("title", slug)}"'] + [f"{k}: {v}" for k, v in fm.items()] + ["---", "Body."]
    (d / "index.mdx").write_text("\n".join(lines), encoding="utf-8")


def test_list_projects_puts_the_featured_project_first_then_site_order(tmp_path, content_dir):
    _write_project(content_dir, "zeta", order=3, outcome='"Z"')
    _write_project(content_dir, "alpha", order=2, outcome='"A"')
    _write_project(content_dir, "star", order=9, featured="true", outcome='"S"', runsLine='"Live"')
    projects = load_project_summaries(content_dir)
    slugs = [p["slug"] for p in projects]
    flags = [p["featured"] for p in projects]
    assert flags == sorted(flags, reverse=True)  # every featured project before every other one
    assert slugs.index("star") < slugs.index("alpha") < slugs.index("zeta")
    star = next(p for p in projects if p["slug"] == "star")
    assert star["featured"] is True and star["url"] == "/work/star" and star["runsLine"] == "Live"

    settings = make_settings(tmp_path, content_dir)
    ctx = ToolContext(settings=settings, index=BM25Index(), known_slugs=slugs, toolbox_names=[], prompt_state=None, client_ip=None)
    tools = build_server_tools(ctx)
    assert "list_projects" in tools
    out = tools["list_projects"].execute({})
    assert out["projects"][0]["featured"] is True

    assert load_project_detail(content_dir, "star")["featured"] is True
    doc = next(d for d in load_projects(content_dir) if d.id == "project:star")
    assert "Featured project" in doc.text


def test_real_site_content_features_the_cold_outreach_agent():
    from pathlib import Path

    content = Path(__file__).resolve().parents[2] / "content"
    projects = load_project_summaries(content)
    assert projects and projects[0]["slug"] == "cold-outreach-agent"
    assert {p["slug"] for p in projects} >= {"geolumen", "concord", "worldcup-2026-prediction"}


# --- prompt ------------------------------------------------------------------------------


def test_prompt_asks_for_plain_text_natural_citations_and_off_topic_declines():
    p = build_system_prompt()
    assert "Plain text only" in p
    assert "Never show internal ids" in p
    assert "not a general assistant" in p
    assert "list_projects" in p and "ui_prefill_contact" in p
    assert "Write your short answer text FIRST" in p


# --- browser follow-ups after a ui_* tool -------------------------------------------------

from app.gemini_agent import to_gemini_contents  # noqa: E402
from app.messages import to_anthropic_messages  # noqa: E402
from test_gemini_agent import FakeAPIError  # noqa: E402

# What the AI SDK sends back after the browser ran ui_highlight_project: one assistant
# UIMessage holding both model steps (a server tool, then text + a ui tool).
FOLLOW_UP = [
    {"id": "u1", "role": "user", "parts": [{"type": "text", "text": "best project?"}]},
    {
        "id": "a1",
        "role": "assistant",
        "parts": [
            {"type": "step-start"},
            {"type": "tool-list_projects", "toolCallId": "c1", "state": "output-available", "input": {}, "output": {"projects": []}},
            {"type": "step-start"},
            {"type": "text", "text": "The cold outreach agent."},
            {"type": "tool-ui_highlight_project", "toolCallId": "c2", "state": "output-available", "input": {"slug": "x"}, "output": {"status": "done"}},
        ],
    },
]


def test_a_multi_step_assistant_message_is_split_back_into_its_steps():
    msgs = to_anthropic_messages(FOLLOW_UP)
    assert [m["role"] for m in msgs] == ["user", "assistant", "user", "assistant", "user"]
    assert msgs[1]["content"][0]["name"] == "list_projects"
    assert msgs[2]["content"][0]["tool_use_id"] == "c1"
    assert [b["type"] for b in msgs[3]["content"]] == ["text", "tool_use"]
    assert msgs[4]["content"][0]["tool_use_id"] == "c2"


def test_messages_without_step_markers_still_convert_as_one_turn():
    parts = [p for p in FOLLOW_UP[1]["parts"] if p["type"] != "step-start"]
    msgs = to_anthropic_messages([FOLLOW_UP[0], {**FOLLOW_UP[1], "parts": parts}])
    assert [m["role"] for m in msgs] == ["user", "assistant", "user"]


def test_every_replayed_function_call_gets_a_thought_signature_on_gemini_3():
    # Live bug: only the first call per message was signed, so Gemini 3 answered
    # 400 "Function call is missing a thought_signature" to every follow-up after a
    # ui_* tool — which the site turned into a 503 and a switch to the demo replay.
    contents = to_gemini_contents(to_anthropic_messages(FOLLOW_UP), "gemini-3.5-flash-lite")
    calls = [p for c in contents for p in c["parts"] if "function_call" in p]
    assert len(calls) == 2
    assert all(p.get("thought_signature") for p in calls)
    assert not any("thought_signature" in p for c in to_gemini_contents(to_anthropic_messages(FOLLOW_UP), "gemini-2.5-flash") for p in c["parts"])


def test_a_transient_overload_retries_the_same_model_once_before_falling_back():
    slept = []
    client = FakeGeminiClient([FakeAPIError(503, "UNAVAILABLE", "high demand"), text_chunks("ok")])
    chunks = _run(client, fallback_models=["gemini-lite"], sleep=slept.append)
    assert [c["model"] for c in client.models.calls] == ["gemini-test", "gemini-test"]
    assert slept == [1.0]
    assert "ok" in "".join(c.get("delta", "") for c in chunks)

    client = FakeGeminiClient([FakeAPIError(503, "UNAVAILABLE")] * 2 + [text_chunks("lite")])
    _run(client, fallback_models=["gemini-lite"], sleep=lambda s: None)
    assert [c["model"] for c in client.models.calls] == ["gemini-test", "gemini-test", "gemini-lite"]


def test_a_follow_up_request_never_flips_the_site_to_demo(tmp_path, content_dir):
    client = FakeGeminiClient([FakeAPIError(429, "RESOURCE_EXHAUSTED")] * 2)
    _override(_gemini_settings(tmp_path, content_dir), client)
    try:
        with TestClient(app) as tc:
            resp = tc.post("/v1/chat", json={"messages": FOLLOW_UP})
            fresh = tc.post("/v1/chat", json={"messages": FOLLOW_UP[:1]})
        assert resp.status_code == 200
        assert "data: [DONE]" in resp.text and '"finishReason":"other"' in resp.text
        assert "text-delta" in resp.text
        assert fresh.status_code == 503  # a brand-new question still degrades to the demo
    finally:
        app.dependency_overrides.clear()
