from pathlib import Path

from app.knowledge.content_loader import load_project_slugs, load_toolbox_names
from app.knowledge.store import build_index
from app.tools import ToolContext
from app.tools.knowledge import build as build_knowledge_tools


def make_ctx(settings, content_dir: Path) -> ToolContext:
    index = build_index(content_dir)
    return ToolContext(
        settings=settings,
        index=index,
        known_slugs=load_project_slugs(content_dir),
        toolbox_names=load_toolbox_names(content_dir),
        prompt_state=None,
        client_ip="203.0.113.1",
    )


def test_search_knowledge_returns_cited_results(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tools = build_knowledge_tools(ctx)
    result = tools["search_knowledge"].execute({"query": "Claude Python automation"})
    assert result["results"], "expected at least one hit"
    first = result["results"][0]
    assert {"id", "title", "url", "snippet", "score"} <= first.keys()


def test_search_knowledge_no_match_says_so_honestly(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tools = build_knowledge_tools(ctx)
    result = tools["search_knowledge"].execute({"query": "zzyyxx nonsense query qqwwee"})
    assert result["results"] == []
    assert "note" in result


def test_get_case_study_returns_full_report(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tools = build_knowledge_tools(ctx)
    result = tools["get_case_study"].execute({"slug": "demo-project"})
    assert result["slug"] == "demo-project"
    assert result["title"] == "Demo Project"
    assert result["results"]
    assert result["steps"]
    assert "caseStudy" in result


def test_get_case_study_unknown_slug_lists_known_slugs(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tools = build_knowledge_tools(ctx)
    result = tools["get_case_study"].execute({"slug": "does-not-exist"})
    assert "error" in result
    assert result["known"] == ["demo-project"]


def test_get_experience_cites_background_and_projects(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tools = build_knowledge_tools(ctx)
    result = tools["get_experience"].execute({})
    assert "background" in result and "projects" in result
    assert "note" in result
