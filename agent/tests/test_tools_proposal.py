from app.knowledge.store import build_index
from app.tools import ToolContext
from app.tools.proposal import build as build_proposal_tools


def make_ctx(settings, content_dir):
    return ToolContext(
        settings=settings, index=build_index(content_dir), known_slugs=[], toolbox_names=[], prompt_state=None, client_ip=None
    )


def test_draft_proposal_structure_and_no_prices_by_default(settings, content_dir, monkeypatch):
    monkeypatch.delenv("AGENT_RATE_INFO", raising=False)
    tool = build_proposal_tools(make_ctx(settings, content_dir))["draft_proposal"]
    result = tool.execute({"task_description": "Automate drafting cold outreach emails with Claude and Python"})

    assert result["draft"] is True
    for key in ("problem", "approach", "deliverables", "milestones", "assumptions", "openQuestions"):
        assert result[key]
    assert "Not set" in result["pricing"]


def test_draft_proposal_uses_configured_rate_when_present(settings, content_dir, monkeypatch):
    monkeypatch.setenv("AGENT_RATE_INFO", "$150/hr, 10hr minimum")
    tool = build_proposal_tools(make_ctx(settings, content_dir))["draft_proposal"]
    result = tool.execute({"task_description": "Build a small reporting agent"})
    assert result["pricing"] == "$150/hr, 10hr minimum"


def test_draft_proposal_requires_task_description(settings, content_dir):
    tool = build_proposal_tools(make_ctx(settings, content_dir))["draft_proposal"]
    assert "error" in tool.execute({"task_description": ""})
