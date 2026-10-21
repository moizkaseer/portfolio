from app.messages import to_anthropic_messages, text_of_message


def test_user_text_message():
    out = to_anthropic_messages([{"role": "user", "parts": [{"type": "text", "text": "hello"}]}])
    assert out == [{"role": "user", "content": "hello"}]


def test_assistant_tool_call_with_output_splits_into_tool_use_and_tool_result():
    ui_messages = [
        {"role": "user", "parts": [{"type": "text", "text": "open the demo project"}]},
        {
            "role": "assistant",
            "parts": [
                {"type": "text", "text": "Sure, opening it."},
                {
                    "type": "tool-ui_open_project",
                    "toolCallId": "call_1",
                    "input": {"slug": "demo-project"},
                    "state": "output-available",
                    "output": {"ok": True},
                },
            ],
        },
    ]
    out = to_anthropic_messages(ui_messages)
    assert out[0] == {"role": "user", "content": "open the demo project"}
    assert out[1]["role"] == "assistant"
    assert out[1]["content"] == [
        {"type": "text", "text": "Sure, opening it."},
        {"type": "tool_use", "id": "call_1", "name": "ui_open_project", "input": {"slug": "demo-project"}},
    ]
    assert out[2] == {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "call_1", "content": '{"ok": true}'}]}


def test_pending_ui_tool_call_with_no_output_yet_has_no_tool_result():
    ui_messages = [
        {"role": "user", "parts": [{"type": "text", "text": "scroll to work"}]},
        {
            "role": "assistant",
            "parts": [
                {"type": "tool-ui_scroll_to", "toolCallId": "call_2", "input": {"section": "work"}, "state": "input-available"}
            ],
        },
    ]
    out = to_anthropic_messages(ui_messages)
    assert len(out) == 2
    assert out[1] == {"role": "assistant", "content": [{"type": "tool_use", "id": "call_2", "name": "ui_scroll_to", "input": {"section": "work"}}]}


def test_tool_output_error_sets_is_error():
    ui_messages = [
        {
            "role": "assistant",
            "parts": [
                {
                    "type": "tool-search_knowledge",
                    "toolCallId": "call_3",
                    "input": {"query": "x"},
                    "state": "output-error",
                    "errorText": "boom",
                }
            ],
        }
    ]
    out = to_anthropic_messages(ui_messages)
    assert out[1] == {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "call_3", "content": "boom", "is_error": True}]}


def test_text_of_message_concatenates_text_parts():
    assert text_of_message({"parts": [{"type": "text", "text": "a"}, {"type": "text", "text": "b"}]}) == "ab"
