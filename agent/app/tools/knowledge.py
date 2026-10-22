"""search_knowledge / get_case_study / get_experience (brief §4) — read-only,
always cite a doc id/title/url from the index so the model never has to invent
a source."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.knowledge.content_loader import load_project_detail

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec


def _search_knowledge(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        query = str(input_.get("query", ""))[:300]
        top_k = min(int(input_.get("top_k", 5) or 5), 10)
        results = ctx.index.search(query, top_k=top_k)
        if not results:
            return {"results": [], "note": "no indexed document matched this query — say the answer isn't known"}
        return {
            "results": [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "url": r["url"],
                    "snippet": r["text"][:500],
                    "score": r["score"],
                }
                for r in results
            ]
        }

    return execute


def _get_case_study(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        slug = str(input_.get("slug", ""))
        detail = load_project_detail(ctx.settings.content_dir, slug)
        if not detail:
            return {"error": f'no project "{slug}"', "known": ctx.known_slugs}
        return detail

    return execute


def _get_experience(ctx: "ToolContext"):
    def execute(_input_: dict[str, Any]) -> Any:
        about_results = ctx.index.search("timeline experience background career", top_k=10)
        project_results = [r for r in ctx.index.search("project run outcome results", top_k=10) if r["kind"] == "project"]
        return {
            "background": [
                {"id": r["id"], "title": r["title"], "url": r["url"], "text": r["text"]}
                for r in about_results
                if r["kind"] in ("about", "site")
            ],
            "projects": [
                {"id": r["id"], "title": r["title"], "url": r["url"], "snippet": r["text"][:300]} for r in project_results
            ],
            "note": "Derived from the owner's own site content; cite the id/url for any claim.",
        }

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "search_knowledge": ToolSpec(
            schema={
                "name": "search_knowledge",
                "description": (
                    "Search the owner's indexed knowledge (site info, bio, process, toolbox, project case studies) "
                    "for passages relevant to a query. Always cite the returned id/title/url when you use a result — "
                    "never answer from anything not returned here."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "words to search for"},
                        "top_k": {"type": "integer", "description": "max results, default 5, max 10"},
                    },
                    "required": ["query"],
                },
            },
            execute=_search_knowledge(ctx),
        ),
        "get_case_study": ToolSpec(
            schema={
                "name": "get_case_study",
                "description": "Full run report for one project: facts, results, the system's steps, and the written case study.",
                "input_schema": {
                    "type": "object",
                    "properties": {"slug": {"type": "string", "description": "a project slug, e.g. from search_knowledge"}},
                    "required": ["slug"],
                },
            },
            execute=_get_case_study(ctx),
        ),
        "get_experience": ToolSpec(
            schema={
                "name": "get_experience",
                "description": "The owner's background, timeline and project history (resume-equivalent), with citations.",
                "input_schema": {"type": "object", "properties": {}},
            },
            execute=_get_experience(ctx),
        ),
    }
