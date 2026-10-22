from app.knowledge.store import build_index
from app.knowledge.content_loader import load_project_slugs, load_toolbox_names
from app.tools import ToolContext
from app.tools.recruiter import build as build_recruiter_tools


def make_ctx(settings, content_dir):
    index = build_index(content_dir)
    return ToolContext(
        settings=settings,
        index=index,
        known_slugs=load_project_slugs(content_dir),
        toolbox_names=load_toolbox_names(content_dir),
        prompt_state=None,
        client_ip=None,
    )


def test_match_job_description_maps_requirements_to_evidence_and_gaps(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tool = build_recruiter_tools(ctx)["match_job_description"]

    jd = "Experience building agents with Claude and Python.\nExperience with Kubernetes cluster administration.\nStrong FastAPI background."
    result = tool.execute({"job_description": jd})

    assert result["totalCount"] == 3
    statuses = {r["requirement"]: r["status"] for r in result["requirements"]}
    assert any(s == "evidenced" for s in statuses.values()), "Claude/Python/FastAPI requirement should be evidenced"
    assert any(s == "gap" for s in statuses.values()), "Kubernetes requirement should be a gap"
    assert 0 <= result["fitRatio"] <= 1
    for req in result["requirements"]:
        if req["status"] == "evidenced":
            assert req["evidence"], "evidenced requirements must carry citations"


def test_match_job_description_requires_text(settings, content_dir):
    ctx = make_ctx(settings, content_dir)
    tool = build_recruiter_tools(ctx)["match_job_description"]
    result = tool.execute({"job_description": ""})
    assert "error" in result
