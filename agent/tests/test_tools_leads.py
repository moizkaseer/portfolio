import respx
from httpx import Response

from app.knowledge.bm25 import BM25Index
from app.storage.leads_store import list_leads
from app.tools import ToolContext
from app.tools.leads import build as build_leads_tools


def make_ctx(settings) -> ToolContext:
    return ToolContext(
        settings=settings, index=BM25Index(), known_slugs=[], toolbox_names=[], prompt_state=None, client_ip="203.0.113.9"
    )


def test_capture_lead_requires_consent(settings, content_dir):
    tool = build_leads_tools(make_ctx(settings))["capture_lead"]
    result = tool.execute({"email": "a@b.com", "message": "hi", "consent": False})
    assert result["error"] == "consent_required"
    assert list_leads(settings.leads_db_path) == []


def test_capture_lead_validates_email(settings, content_dir):
    tool = build_leads_tools(make_ctx(settings))["capture_lead"]
    result = tool.execute({"email": "not-an-email", "message": "hi", "consent": True})
    assert result["error"] == "invalid_email"


def test_capture_lead_without_resend_key_still_stores_locally(settings, content_dir):
    assert settings.resend_api_key is None
    tool = build_leads_tools(make_ctx(settings))["capture_lead"]
    result = tool.execute({"name": "Jane", "email": "jane@example.com", "message": "Let's talk", "consent": True})

    assert result["stored"] is True
    assert result["emailed"] is False
    leads = list_leads(settings.leads_db_path)
    assert len(leads) == 1
    assert leads[0]["email"] == "jane@example.com"
    assert leads[0]["client_ip"] == "203.0.113.9"


def test_capture_lead_with_resend_key_emails_the_owner(tmp_path, content_dir):
    from conftest import make_settings

    s = make_settings(tmp_path, content_dir, resend_api_key="re_test_key")
    tool = build_leads_tools(make_ctx(s))["capture_lead"]

    with respx.mock(assert_all_called=True) as mock:
        route = mock.post("https://api.resend.com/emails").mock(return_value=Response(200, json={"id": "email_1"}))
        result = tool.execute({"email": "jane@example.com", "message": "Let's talk", "consent": True})

    assert result["emailed"] is True
    assert route.calls.last.request.headers["authorization"] == "Bearer re_test_key"
    assert list_leads(s.leads_db_path)


def test_capture_lead_degrades_gracefully_when_resend_fails(tmp_path, content_dir):
    from conftest import make_settings

    s = make_settings(tmp_path, content_dir, resend_api_key="re_test_key")
    tool = build_leads_tools(make_ctx(s))["capture_lead"]

    with respx.mock:
        respx.post("https://api.resend.com/emails").mock(return_value=Response(500))
        result = tool.execute({"email": "jane@example.com", "message": "Let's talk", "consent": True})

    assert result["stored"] is True
    assert result["emailed"] is False
    assert list_leads(s.leads_db_path)
