#!/usr/bin/env python3
"""Builds the knowledge index from content/ and persists it to AGENT_INDEX_PATH
(brief §3). Run this at deploy time (the Dockerfile does) or locally after
editing content/:

    agent/.venv/bin/python agent/scripts/build_index.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # agent/ on sys.path

from app.config import get_settings  # noqa: E402
from app.knowledge.store import build_index, save_index  # noqa: E402


def main() -> None:
    settings = get_settings()
    index = build_index(
        settings.content_dir,
        github_token=settings.github_token,
        github_repos=settings.github_readme_repos,
    )
    save_index(index, settings.index_path)
    print(f"Indexed {len(index.doc_ids)} documents from {settings.content_dir} -> {settings.index_path}")


if __name__ == "__main__":
    main()
