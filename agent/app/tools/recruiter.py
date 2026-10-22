"""match_job_description — recruiter mode (brief §4): maps each requirement of a
pasted JD to evidence with citations, plus honest gaps and an overall fit score.
Deterministic (BM25 against the indexed knowledge) — no second LLM call, no
invented evidence."""
from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.tools import ToolContext, ToolSpec

_MATCH_THRESHOLD = 1.5  # BM25 score above which a requirement counts as "evidenced"
_SPLIT_RE = re.compile(r"[\n\r]+|(?<=[.;])\s+(?=[A-Z0-9])")


def _requirements_from(job_description: str) -> list[str]:
    raw = [r.strip(" \t-•*·").strip() for r in _SPLIT_RE.split(job_description)]
    return [r for r in raw if len(r) > 6][:25]  # cap to keep the tool output bounded


def _match_job_description(ctx: "ToolContext"):
    def execute(input_: dict[str, Any]) -> Any:
        jd = str(input_.get("job_description", ""))[:8000]
        requirements = _requirements_from(jd)
        if not requirements:
            return {"error": "no requirements could be parsed from that text"}

        mapped = []
        matched_count = 0
        for req in requirements:
            hits = ctx.index.search(req, top_k=2)
            evidenced = bool(hits) and hits[0]["score"] >= _MATCH_THRESHOLD
            if evidenced:
                matched_count += 1
            mapped.append(
                {
                    "requirement": req,
                    "status": "evidenced" if evidenced else "gap",
                    "evidence": [
                        {"id": h["id"], "title": h["title"], "url": h["url"], "snippet": h["text"][:220]}
                        for h in hits
                        if h["score"] >= _MATCH_THRESHOLD
                    ],
                }
            )

        fit_ratio = matched_count / len(requirements)
        return {
            "requirements": mapped,
            "matchedCount": matched_count,
            "totalCount": len(requirements),
            "fitRatio": round(fit_ratio, 2),
            "summaryNote": (
                "Evidence comes only from the owner's indexed site content. Gaps are requirements with no "
                "supporting document — present them honestly, not as disqualifying by default."
            ),
        }

    return execute


def build(ctx: "ToolContext") -> dict[str, "ToolSpec"]:
    from app.tools import ToolSpec

    return {
        "match_job_description": ToolSpec(
            schema={
                "name": "match_job_description",
                "description": (
                    "Recruiter mode: paste a job description and get each requirement mapped to evidence from the "
                    "owner's work (with citations) plus honest gaps and an overall fit ratio. Use this when a visitor "
                    "pastes a JD or asks 'is this a fit for a role like X'."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {"job_description": {"type": "string", "description": "the pasted job description text"}},
                    "required": ["job_description"],
                },
            },
            execute=_match_job_description(ctx),
        )
    }
