from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # agent/ on sys.path so `import app...` works

from app.config import Settings  # noqa: E402


# ---------------------------------------------------------------------------
# Fixture content/ tree — self-contained, independent of the real repo content
# so these tests stay correct regardless of what the site's own content says.
# ---------------------------------------------------------------------------


@pytest.fixture()
def content_dir(tmp_path: Path) -> Path:
    root = tmp_path / "content"
    root.mkdir()

    (root / "site.json").write_text(
        json.dumps(
            {
                "name": "Test Owner",
                "positioning": "AI agents & automation",
                "summary": "Builds agents that are checked, not just demoed.",
                "city": "Testville",
                "timezone": "UTC",
                "availability": {"status": "available", "label": "Available for projects"},
                "email": "owner@example.com",
                "domain": "example.com",
                "bookingUrl": None,
                "socials": [],
            }
        ),
        encoding="utf-8",
    )
    (root / "about.json").write_text(
        json.dumps(
            {
                "bio": ["I build AI agents and automations.", "I care about evals and an off switch."],
                "now": ["Building a demo agent"],
                "timeline": [{"year": "2025", "title": "Started", "note": "a note about starting"}],
            }
        ),
        encoding="utf-8",
    )
    (root / "process.json").write_text(
        json.dumps({"steps": [{"id": "trigger", "title": "Trigger", "text": "Something happens.", "log": []}]}),
        encoding="utf-8",
    )
    (root / "toolbox.json").write_text(
        json.dumps({"groups": [{"category": "Models", "tools": ["Claude", "Python"]}, {"category": "Backend", "tools": ["FastAPI"]}]}),
        encoding="utf-8",
    )

    project_dir = root / "projects" / "demo-project"
    project_dir.mkdir(parents=True)
    (project_dir / "index.mdx").write_text(
        """---
runId: "001"
title: "Demo Project"
outcome: "A demo outcome about Claude agents"
outcomeLong: "A longer demo outcome about Claude agents and Python automation"
industry: "Testing"
stack: ["Python", "Claude"]
status: live
since: "2026"
year: "2026"
order: 1
featured: true
category: Agents
lead: "A demo lead sentence about automation."
runsLine: "line"
role: "Design and build"
timeline: "1 week"
resultsPeriod: "1 week"
results:
  - { value: "10", unit: "x", label: "faster than before" }
---

## The problem

This is the demo case study body. It mentions Claude, Python, and FastAPI
so that the knowledge index has real terms to search for in tests.

## What's next

Nothing — this is a fixture.
""",
        encoding="utf-8",
    )
    (project_dir / "graph.json").write_text(
        json.dumps(
            {
                "nodes": [
                    {"id": "a", "label": "Lead arrives", "kind": "Trigger"},
                    {"id": "b", "label": "Draft with Claude", "kind": "Model"},
                ],
                "edges": [["a", "b"]],
            }
        ),
        encoding="utf-8",
    )

    return root


@pytest.fixture()
def settings(tmp_path: Path, content_dir: Path) -> Settings:
    return make_settings(tmp_path, content_dir)


def make_settings(tmp_path: Path, content_dir: Path, **overrides) -> Settings:
    data_dir = tmp_path / "data"
    base = dict(
        anthropic_api_key="test-anthropic-key",
        model="claude-test-model",
        max_steps=4,
        max_output_tokens=200,
        max_cost_usd_per_request=1.0,
        cost_input_per_mtok=3.0,
        cost_output_per_mtok=15.0,
        shared_secret=None,
        allowed_origins=["https://example.com"],
        max_input_chars=500,
        max_turns=6,
        max_messages=40,
        upstash_redis_rest_url=None,
        upstash_redis_rest_token=None,
        rate_limit_per_hour=1000,
        content_dir=content_dir,
        index_path=data_dir / "index.json",
        database_url=None,
        embedding_provider=None,
        openai_api_key=None,
        github_token=None,
        github_readme_repos=[],
        calendly_token=None,
        calendly_event_slug="30-min-intro-call",
        resend_api_key=None,
        resend_from_email="hello@example.com",
        resend_to_email="owner@example.com",
        leads_db_path=data_dir / "leads.db",
        host="0.0.0.0",
        port=8000,
    )
    base.update(overrides)
    return Settings(**base)


# ---------------------------------------------------------------------------
# Fake Anthropic client — a mock LLM with no network, for the agent-loop tests.
# ---------------------------------------------------------------------------


class FakeStream:
    def __init__(self, events: list, final_message):
        self._events = events
        self._final_message = final_message

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def __iter__(self):
        return iter(self._events)

    def get_final_message(self):
        return self._final_message


class FakeMessages:
    def __init__(self, turns: list[tuple[list, object]]):
        self._turns = list(turns)
        self.calls: list[dict] = []

    def stream(self, **kwargs):
        self.calls.append(kwargs)
        if not self._turns:
            raise AssertionError("FakeAnthropicClient ran out of scripted turns")
        events, final_message = self._turns.pop(0)
        return FakeStream(events, final_message)


class FakeAnthropicClient:
    def __init__(self, turns: list[tuple[list, object]]):
        self.messages = FakeMessages(turns)


def text_turn(text: str, *, stop_reason: str = "end_turn", input_tokens: int = 10, output_tokens: int = 5):
    """One scripted step: Claude just answers with text."""
    block = SimpleNamespace(type="text", text=text)
    usage = SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)
    final = SimpleNamespace(content=[block], stop_reason=stop_reason, usage=usage)
    events = [
        SimpleNamespace(type="content_block_start", index=0, content_block=SimpleNamespace(type="text")),
        SimpleNamespace(type="content_block_delta", index=0, delta=SimpleNamespace(type="text_delta", text=text)),
        SimpleNamespace(type="content_block_stop", index=0),
    ]
    return events, final


def tool_use_turn(
    tool_id: str,
    tool_name: str,
    tool_input: dict,
    *,
    stop_reason: str = "tool_use",
    input_tokens: int = 10,
    output_tokens: int = 5,
):
    """One scripted step: Claude calls exactly one tool."""
    block = SimpleNamespace(type="tool_use", id=tool_id, name=tool_name, input=tool_input)
    usage = SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)
    final = SimpleNamespace(content=[block], stop_reason=stop_reason, usage=usage)
    events = [
        SimpleNamespace(
            type="content_block_start", index=0, content_block=SimpleNamespace(type="tool_use", id=tool_id, name=tool_name)
        ),
        SimpleNamespace(type="content_block_stop", index=0),
    ]
    return events, final
