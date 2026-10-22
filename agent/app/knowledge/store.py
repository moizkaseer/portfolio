"""Builds or loads the persisted BM25 index artifact (brief §3)."""
from __future__ import annotations

import json
from pathlib import Path

from app.knowledge.bm25 import BM25Index
from app.knowledge.content_loader import load_all_documents
from app.knowledge.github_readme import fetch_readme_documents


def build_index(content_dir: Path, *, github_token: str | None = None, github_repos: list[str] | None = None) -> BM25Index:
    documents = load_all_documents(content_dir)
    if github_token and github_repos:
        documents = documents + fetch_readme_documents(github_token, github_repos)
    return BM25Index.build(documents)


def save_index(index: BM25Index, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index.to_dict()), encoding="utf-8")


def load_index(path: Path) -> BM25Index | None:
    if not path.exists():
        return None
    try:
        return BM25Index.from_dict(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, KeyError):
        return None


def load_or_build_index(
    content_dir: Path,
    index_path: Path,
    *,
    github_token: str | None = None,
    github_repos: list[str] | None = None,
) -> BM25Index:
    """Loads the persisted index if present; otherwise builds it in memory and
    persists it for next time (cheap for this corpus size — tens of documents)."""
    cached = load_index(index_path)
    if cached is not None:
        return cached
    index = build_index(content_dir, github_token=github_token, github_repos=github_repos)
    try:
        save_index(index, index_path)
    except OSError:
        pass  # read-only filesystem (e.g. some container setups) — in-memory still works
    return index
