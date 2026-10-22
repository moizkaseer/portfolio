"""Loads content/ (brief §3) into a flat list of Documents for the knowledge index.

Reads the same files the TS site reads (content/site.json, about.json, process.json,
toolbox.json, content/projects/<slug>/{index.mdx,graph.json}) directly off disk —
no dependency on the generated lib/content/*.generated.json artifacts, so this stays
correct even when those haven't been regenerated.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class Document:
    id: str
    title: str
    url: str
    text: str
    kind: str = "content"
    metadata: dict[str, Any] = field(default_factory=dict)


_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)


def _split_frontmatter(raw: str) -> tuple[dict, str]:
    m = _FRONTMATTER_RE.match(raw)
    if not m:
        return {}, raw
    data = yaml.safe_load(m.group(1)) or {}
    return data, m.group(2).strip()


def load_projects(content_dir: Path) -> list[Document]:
    docs: list[Document] = []
    projects_dir = content_dir / "projects"
    if not projects_dir.is_dir():
        return docs
    for entry in sorted(projects_dir.iterdir()):
        if not entry.is_dir():
            continue
        slug = entry.name
        mdx_path = entry / "index.mdx"
        if not mdx_path.exists():
            continue
        frontmatter, body = _split_frontmatter(mdx_path.read_text(encoding="utf-8"))
        title = frontmatter.get("title", slug)
        outcome = frontmatter.get("outcome", "")
        lead = frontmatter.get("lead", "")
        results = frontmatter.get("results") or []
        results_text = "; ".join(f"{r.get('value', '')}{r.get('unit', '')} {r.get('label', '')}" for r in results)
        steps_text = ""
        graph_path = entry / "graph.json"
        if graph_path.exists():
            graph = json.loads(graph_path.read_text(encoding="utf-8"))
            steps_text = " -> ".join(n.get("label", "") for n in graph.get("nodes", []))
        text = "\n\n".join(
            filter(
                None,
                [
                    f"{title} ({frontmatter.get('category', '')}, {frontmatter.get('status', '')})",
                    outcome,
                    lead,
                    f"Stack: {', '.join(frontmatter.get('stack', []))}",
                    f"Steps: {steps_text}" if steps_text else "",
                    f"Results: {results_text}" if results_text else "",
                    body,
                ],
            )
        )
        docs.append(
            Document(
                id=f"project:{slug}",
                title=title,
                url=f"/work/{slug}",
                text=text,
                kind="project",
                metadata={"slug": slug, "runId": frontmatter.get("runId"), "placeholder": frontmatter.get("placeholder", False)},
            )
        )
    return docs


def load_site_docs(content_dir: Path) -> list[Document]:
    docs: list[Document] = []

    site_path = content_dir / "site.json"
    if site_path.exists():
        site = json.loads(site_path.read_text(encoding="utf-8"))
        text = "\n".join(
            filter(
                None,
                [
                    f"{site.get('name', '')} — {site.get('positioning', '')}",
                    site.get("summary", ""),
                    f"Based in {site.get('city', '')} ({site.get('timezone', '')})",
                    f"Availability: {site.get('availability', {}).get('label', '')}",
                    f"Contact email: {site.get('email', '')}",
                ],
            )
        )
        docs.append(Document(id="site:about", title="Site overview", url="/#your-turn", text=text, kind="site"))

    about_path = content_dir / "about.json"
    if about_path.exists():
        about = json.loads(about_path.read_text(encoding="utf-8"))
        bio_text = "\n".join(about.get("bio", []))
        now_text = "\n".join(about.get("now", []))
        timeline_text = "\n".join(
            f"{t.get('year', '')}: {t.get('title', '')} — {t.get('note', '')}" for t in about.get("timeline", [])
        )
        docs.append(
            Document(
                id="site:bio",
                title="About Moiz Ali",
                url="/#agent",
                text="\n\n".join(filter(None, [bio_text, f"Currently:\n{now_text}", f"Timeline:\n{timeline_text}"])),
                kind="about",
            )
        )

    process_path = content_dir / "process.json"
    if process_path.exists():
        process = json.loads(process_path.read_text(encoding="utf-8"))
        for step in process.get("steps", []):
            docs.append(
                Document(
                    id=f"process:{step.get('id')}",
                    title=f"Process — {step.get('title')}",
                    url="/#process",
                    text=f"{step.get('title', '')}: {step.get('text', '')}",
                    kind="process",
                )
            )

    toolbox_path = content_dir / "toolbox.json"
    if toolbox_path.exists():
        toolbox = json.loads(toolbox_path.read_text(encoding="utf-8"))
        for group in toolbox.get("groups", []):
            docs.append(
                Document(
                    id=f"toolbox:{group.get('category')}",
                    title=f"Toolbox — {group.get('category')}",
                    url="/#toolbox",
                    text=f"{group.get('category', '')}: {', '.join(group.get('tools', []))}",
                    kind="toolbox",
                )
            )

    return docs


def load_project_detail(content_dir: Path, slug: str) -> dict[str, Any] | None:
    """Full run report for one project — used by the get_case_study tool."""
    entry = content_dir / "projects" / slug
    mdx_path = entry / "index.mdx"
    if not mdx_path.exists():
        return None
    frontmatter, body = _split_frontmatter(mdx_path.read_text(encoding="utf-8"))
    graph_path = entry / "graph.json"
    graph = json.loads(graph_path.read_text(encoding="utf-8")) if graph_path.exists() else {"nodes": [], "edges": []}
    return {
        "slug": slug,
        "runId": f"#{frontmatter.get('runId')}" if frontmatter.get("runId") else None,
        "title": frontmatter.get("title"),
        "lead": frontmatter.get("lead"),
        "client": frontmatter.get("industry"),
        "role": frontmatter.get("role"),
        "timeline": frontmatter.get("timeline"),
        "stack": frontmatter.get("stack", []),
        "status": frontmatter.get("status"),
        "results": frontmatter.get("results", []),
        "steps": [{"step": n.get("label"), "kind": n.get("kind")} for n in graph.get("nodes", [])],
        "caseStudy": body,
        "placeholder": frontmatter.get("placeholder", False),
        "url": f"/work/{slug}",
    }


def load_toolbox_names(content_dir: Path) -> list[str]:
    toolbox_path = content_dir / "toolbox.json"
    if not toolbox_path.exists():
        return []
    toolbox = json.loads(toolbox_path.read_text(encoding="utf-8"))
    names: list[str] = []
    for group in toolbox.get("groups", []):
        names.extend(group.get("tools", []))
    return names


def load_project_slugs(content_dir: Path) -> list[str]:
    projects_dir = content_dir / "projects"
    if not projects_dir.is_dir():
        return []
    return sorted(p.name for p in projects_dir.iterdir() if p.is_dir())


def load_all_documents(content_dir: Path) -> list[Document]:
    return load_site_docs(content_dir) + load_projects(content_dir)
