"""Agent-loop tests against a scripted FakeAnthropicClient — no network calls."""
from types import SimpleNamespace

import pytest

from app.anthropic_agent import run_agent_turn
from app.tools import ToolSpec
from conftest import FakeAnthropicClient, text_turn, tool_use_turn


def collect(gen) -> list[dict]:
    return list(gen)


def test_plain_text_answer_emits_the_full_expected_chunk_sequence():
    client = FakeAnthropicClient([text_turn("Hi there!")])
    chunks = collect(
        run_agent_turn(
            client,
            model="claude-test-model",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "hello"}],
            server_tools={},
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
        )
    )
    types = [c["type"] for c in chunks]
    assert types == ["start", "start-step", "text-start", "text-delta", "text-end", "finish-step", "finish"]
    assert chunks[-1] == {"type": "finish", "finishReason": "stop"}
    assert len(client.messages.calls) == 1


def test_server_tool_call_executes_then_continues_to_a_second_step():
    client = FakeAnthropicClient(
        [
            tool_use_turn("call_1", "get_toolbox", {}),
            text_turn("Here's the toolbox."),
        ]
    )
    server_tools = {"get_toolbox": ToolSpec(schema={"name": "get_toolbox", "input_schema": {}}, execute=lambda _: {"groups": []})}
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "what tools do you use?"}],
            server_tools=server_tools,
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
        )
    )
    types = [c["type"] for c in chunks]
    assert types == [
        "start",
        "start-step",
        "tool-input-start",
        "tool-input-available",
        "tool-output-available",
        "finish-step",
        "start-step",
        "text-start",
        "text-delta",
        "text-end",
        "finish-step",
        "finish",
    ]
    tool_output = next(c for c in chunks if c["type"] == "tool-output-available")
    assert tool_output["output"] == {"groups": []}
    assert len(client.messages.calls) == 2


def test_ui_tool_call_ends_the_turn_without_a_second_model_call():
    client = FakeAnthropicClient([tool_use_turn("call_ui", "ui_scroll_to", {"section": "work"})])
    ui_tools = {"ui_scroll_to": ToolSpec(schema={"name": "ui_scroll_to", "input_schema": {}})}
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "scroll to work"}],
            server_tools={},
            ui_tools=ui_tools,
            known_slugs=[],
            toolbox_names=[],
        )
    )
    types = [c["type"] for c in chunks]
    assert types == ["start", "start-step", "tool-input-start", "tool-input-available", "finish-step", "finish"]
    last = chunks[-1]
    assert last == {"type": "finish", "finishReason": "tool-calls"}
    tool_chunk = next(c for c in chunks if c["type"] == "tool-input-available")
    assert tool_chunk["input"] == {"section": "work"}
    assert len(client.messages.calls) == 1  # never asked the model again — waits for the browser


def test_invalid_ui_tool_input_is_rejected_server_side_and_still_ends_the_turn():
    client = FakeAnthropicClient([tool_use_turn("call_ui", "ui_scroll_to", {"section": "not-a-real-section"})])
    ui_tools = {"ui_scroll_to": ToolSpec(schema={"name": "ui_scroll_to", "input_schema": {}})}
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "scroll somewhere bogus"}],
            server_tools={},
            ui_tools=ui_tools,
            known_slugs=[],
            toolbox_names=[],
        )
    )
    types = [c["type"] for c in chunks]
    assert "tool-input-error" in types
    assert "tool-input-available" not in types
    assert chunks[-1]["finishReason"] == "tool-calls"


def test_step_cap_stops_the_loop_even_though_the_model_keeps_calling_tools():
    turns = [tool_use_turn(f"call_{i}", "get_toolbox", {}) for i in range(10)]
    client = FakeAnthropicClient(turns)
    server_tools = {"get_toolbox": ToolSpec(schema={"name": "get_toolbox", "input_schema": {}}, execute=lambda _: {})}
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "loop forever?"}],
            server_tools=server_tools,
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
            max_steps=3,
            max_cost_usd=1000,
        )
    )
    assert len(client.messages.calls) == 3
    assert chunks[-1] == {"type": "finish", "finishReason": "length"}


def test_cost_budget_stops_the_loop_before_the_step_cap():
    turns = [tool_use_turn(f"call_{i}", "get_toolbox", {}, output_tokens=100_000) for i in range(10)]
    client = FakeAnthropicClient(turns)
    server_tools = {"get_toolbox": ToolSpec(schema={"name": "get_toolbox", "input_schema": {}}, execute=lambda _: {})}
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "spend a lot"}],
            server_tools=server_tools,
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
            max_steps=10,
            max_cost_usd=0.01,  # one step's output tokens alone blow this budget
            pricing=(3.0, 15.0),
        )
    )
    assert len(client.messages.calls) == 1
    assert chunks[-1] == {"type": "finish", "finishReason": "other"}


def test_refusal_emits_an_error_part_and_a_content_filter_finish():
    client = FakeAnthropicClient([text_turn("", stop_reason="refusal")])
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "do something unsafe"}],
            server_tools={},
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
        )
    )
    assert any(c["type"] == "error" for c in chunks)
    assert chunks[-1] == {"type": "finish", "finishReason": "content-filter"}


def test_a_broken_connection_yields_a_clean_error_part_instead_of_raising():
    class ExplodingMessages:
        def stream(self, **kwargs):
            raise RuntimeError("connection reset")

    client = SimpleNamespace(messages=ExplodingMessages())
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "hello"}],
            server_tools={},
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
        )
    )
    assert chunks[0] == {"type": "start"}
    assert any(c["type"] == "error" and "connection reset" in c["errorText"] for c in chunks)
    assert chunks[-1] == {"type": "finish", "finishReason": "error"}


def test_a_broken_tool_execute_does_not_crash_the_stream():
    client = FakeAnthropicClient(
        [
            tool_use_turn("call_1", "flaky_tool", {}),
            text_turn("Sorry, that didn't work."),
        ]
    )

    def boom(_input):
        raise ValueError("tool exploded")

    server_tools = {"flaky_tool": ToolSpec(schema={"name": "flaky_tool", "input_schema": {}}, execute=boom)}
    chunks = collect(
        run_agent_turn(
            client,
            model="m",
            system="sys",
            anthropic_messages=[{"role": "user", "content": "use the flaky tool"}],
            server_tools=server_tools,
            ui_tools={},
            known_slugs=[],
            toolbox_names=[],
        )
    )
    assert any(c["type"] == "tool-output-error" for c in chunks)
    # the loop recovers and keeps going (the model gets the error as a tool_result) rather than crashing
    assert chunks[-1] == {"type": "finish", "finishReason": "stop"}
    assert len(client.messages.calls) == 2


def test_anthropic_rate_limit_before_any_output_raises_provider_unavailable():
    import pytest

    from app.providers import ProviderUnavailable

    class RateLimitError(Exception):
        status_code = 429

    class LimitedMessages:
        def stream(self, **kwargs):
            raise RateLimitError("rate limited")

    with pytest.raises(ProviderUnavailable):
        collect(
            run_agent_turn(
                SimpleNamespace(messages=LimitedMessages()),
                model="m",
                system="sys",
                anthropic_messages=[{"role": "user", "content": "hello"}],
                server_tools={},
                ui_tools={},
                known_slugs=[],
                toolbox_names=[],
            )
        )
