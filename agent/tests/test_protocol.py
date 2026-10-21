import json

from app.protocol import (
    MAX_UI_ACTIONS_PER_TURN,
    SECTIONS,
    SSE_DONE,
    UI_TOOLS,
    encode_sse,
    error,
    finish,
    start,
    text_delta,
    text_end,
    text_start,
    tool_input_available,
    tool_output_available,
    validate_ui_action,
)

KNOWN_SLUGS = ["cold-outreach-agent", "demo-project"]
TOOL_NAMES = ["Claude", "Python"]


class TestAllowList:
    def test_only_the_six_ui_tools_exist(self):
        assert isinstance(validate_ui_action("ui_submit_form", {}, KNOWN_SLUGS, TOOL_NAMES), str)
        assert isinstance(validate_ui_action("ui_send_email", {}, KNOWN_SLUGS, TOOL_NAMES), str)
        assert set(UI_TOOLS) == {
            "ui_scroll_to",
            "ui_highlight_project",
            "ui_open_project",
            "ui_set_theme",
            "ui_highlight_tools",
            "ui_prefill_contact",
        }

    def test_scroll_to_only_knows_home_sections(self):
        assert SECTIONS == ("your-turn", "work", "process", "agent", "toolbox", "contact")
        assert validate_ui_action("ui_scroll_to", {"section": "work"}, KNOWN_SLUGS, TOOL_NAMES) == {
            "tool": "ui_scroll_to",
            "input": {"section": "work"},
        }
        assert isinstance(validate_ui_action("ui_scroll_to", {"section": "admin"}, KNOWN_SLUGS, TOOL_NAMES), str)

    def test_projects_must_be_real_slugs(self):
        result = validate_ui_action("ui_open_project", {"slug": "cold-outreach-agent"}, KNOWN_SLUGS, TOOL_NAMES)
        assert result["tool"] == "ui_open_project"
        assert isinstance(validate_ui_action("ui_open_project", {"slug": "../../evil"}, KNOWN_SLUGS, TOOL_NAMES), str)
        assert isinstance(
            validate_ui_action("ui_open_project", {"slug": "https://evil.example"}, KNOWN_SLUGS, TOOL_NAMES), str
        )

    def test_theme_tools_and_prefill_inputs_are_checked(self):
        assert isinstance(validate_ui_action("ui_set_theme", {"theme": "neon"}, KNOWN_SLUGS, TOOL_NAMES), str)
        assert validate_ui_action("ui_highlight_tools", {"names": ["Claude", "made-up"]}, KNOWN_SLUGS, TOOL_NAMES) == {
            "tool": "ui_highlight_tools",
            "input": {"names": ["Claude"]},
        }
        assert isinstance(validate_ui_action("ui_prefill_contact", {"summary": "   "}, KNOWN_SLUGS, TOOL_NAMES), str)

    def test_max_ui_actions_per_turn(self):
        assert MAX_UI_ACTIONS_PER_TURN == 3


class TestStreamChunks:
    def test_chunk_shapes_match_the_installed_ai_sdk_schema(self):
        assert start("msg-1") == {"type": "start", "messageId": "msg-1"}
        assert start() == {"type": "start"}
        assert text_start("t-1") == {"type": "text-start", "id": "t-1"}
        assert text_delta("t-1", "hi") == {"type": "text-delta", "id": "t-1", "delta": "hi"}
        assert text_end("t-1") == {"type": "text-end", "id": "t-1"}
        assert tool_input_available("call-1", "get_toolbox", {}) == {
            "type": "tool-input-available",
            "toolCallId": "call-1",
            "toolName": "get_toolbox",
            "input": {},
        }
        assert tool_output_available("call-1", {"ok": True}) == {
            "type": "tool-output-available",
            "toolCallId": "call-1",
            "output": {"ok": True},
        }
        assert error("boom") == {"type": "error", "errorText": "boom"}
        assert finish("stop") == {"type": "finish", "finishReason": "stop"}
        assert finish() == {"type": "finish"}

    def test_encode_sse_matches_json_to_sse_transform_stream_format(self):
        encoded = encode_sse({"type": "start"})
        assert encoded == b'data: {"type":"start"}\n\n'
        assert json.loads(encoded.decode().removeprefix("data: ").strip())["type"] == "start"
        assert SSE_DONE == b"data: [DONE]\n\n"
