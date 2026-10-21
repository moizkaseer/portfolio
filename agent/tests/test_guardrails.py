import pytest
from fastapi import HTTPException

from app.ratelimit import MemorySlidingWindowLimiter, client_ip, create_limiter
from app.security import GuardrailError, check_shared_secret, validate_request_shape
from app.system_prompt import build_system_prompt


class FakeRequest:
    def __init__(self, headers: dict[str, str]):
        self.headers = headers


class TestSharedSecret:
    def test_missing_header_rejected_when_secret_configured(self, tmp_path, content_dir):
        from conftest import make_settings

        s = make_settings(tmp_path, content_dir, shared_secret="s3cr3t")
        with pytest.raises(HTTPException) as exc:
            check_shared_secret(FakeRequest({}), s)
        assert exc.value.status_code == 401

    def test_wrong_secret_rejected(self, tmp_path, content_dir):
        from conftest import make_settings

        s = make_settings(tmp_path, content_dir, shared_secret="s3cr3t")
        with pytest.raises(HTTPException):
            check_shared_secret(FakeRequest({"x-agent-secret": "wrong"}), s)

    def test_correct_secret_allowed(self, tmp_path, content_dir):
        from conftest import make_settings

        s = make_settings(tmp_path, content_dir, shared_secret="s3cr3t")
        check_shared_secret(FakeRequest({"x-agent-secret": "s3cr3t"}), s)  # must not raise

    def test_unset_secret_runs_open(self, settings):
        check_shared_secret(FakeRequest({}), settings)  # settings fixture has shared_secret=None


class TestRequestShapeGuardrails:
    def test_rejects_non_dict_body(self, settings):
        with pytest.raises(GuardrailError) as exc:
            validate_request_shape(["not", "a", "dict"], settings)
        assert exc.value.code == "invalid-request"

    def test_rejects_empty_messages(self, settings):
        with pytest.raises(GuardrailError) as exc:
            validate_request_shape({"messages": []}, settings)
        assert exc.value.code == "invalid-request"

    def test_rejects_too_many_messages(self, settings):
        messages = [{"role": "user", "parts": [{"type": "text", "text": "hi"}]} for _ in range(settings.max_messages + 1)]
        with pytest.raises(GuardrailError) as exc:
            validate_request_shape({"messages": messages}, settings)
        assert exc.value.code == "too-many-messages"
        assert exc.value.status_code == 413

    def test_rejects_too_many_turns(self, settings):
        messages = [{"role": "user", "parts": [{"type": "text", "text": "hi"}]} for _ in range(settings.max_turns + 1)]
        with pytest.raises(GuardrailError) as exc:
            validate_request_shape({"messages": messages}, settings)
        assert exc.value.code == "turn-limit"
        assert exc.value.status_code == 429

    def test_rejects_input_over_max_chars(self, settings):
        messages = [{"role": "user", "parts": [{"type": "text", "text": "x" * (settings.max_input_chars + 1)}]}]
        with pytest.raises(GuardrailError) as exc:
            validate_request_shape({"messages": messages}, settings)
        assert exc.value.code == "too-long"
        assert exc.value.status_code == 413

    def test_rejects_unknown_role(self, settings):
        with pytest.raises(GuardrailError):
            validate_request_shape({"messages": [{"role": "system", "parts": []}]}, settings)

    def test_accepts_a_valid_short_conversation(self, settings):
        messages = validate_request_shape(
            {"messages": [{"role": "user", "parts": [{"type": "text", "text": "hello there"}]}]}, settings
        )
        assert len(messages) == 1


class TestRateLimiting:
    def test_memory_limiter_blocks_after_the_limit(self):
        limiter = MemorySlidingWindowLimiter(limit=2, window_seconds=60)
        assert limiter.allow("1.2.3.4") is True
        assert limiter.allow("1.2.3.4") is True
        assert limiter.allow("1.2.3.4") is False

    def test_memory_limiter_is_per_key(self):
        limiter = MemorySlidingWindowLimiter(limit=1, window_seconds=60)
        assert limiter.allow("a") is True
        assert limiter.allow("b") is True
        assert limiter.allow("a") is False

    def test_create_limiter_falls_back_to_memory_without_upstash_config(self):
        limiter = create_limiter(limit=5, window_seconds=60, upstash_url=None, upstash_token=None)
        assert isinstance(limiter, MemorySlidingWindowLimiter)

    def test_client_ip_prefers_x_forwarded_for(self):
        assert client_ip({"x-forwarded-for": "203.0.113.5, 10.0.0.1"}) == "203.0.113.5"
        assert client_ip({"x-real-ip": "203.0.113.6"}) == "203.0.113.6"
        assert client_ip({}) == "unknown"


class TestPromptInjectionDefenses:
    def test_system_prompt_warns_against_untrusted_visitor_and_tool_text(self):
        prompt = build_system_prompt()
        lowered = prompt.lower()
        assert "untrusted" in lowered
        assert "never invent" in lowered
        assert "ignore previous instructions" in lowered  # names the classic injection phrase explicitly
        assert "capture_lead" in prompt  # consent-gating rule for the one tool with real side effects
