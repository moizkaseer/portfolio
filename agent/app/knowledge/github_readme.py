"""Optional: index GitHub repo READMEs alongside content/ (brief §3). Off by
default — only runs when both GITHUB_TOKEN and GITHUB_README_REPOS are set.
"""
from __future__ import annotations

import httpx

from app.knowledge.content_loader import Document


def fetch_readme_documents(github_token: str, repos: list[str], *, timeout: float = 10.0) -> list[Document]:
    docs: list[Document] = []
    headers = {"Authorization": f"Bearer {github_token}", "Accept": "application/vnd.github.raw+json"}
    with httpx.Client(timeout=timeout) as client:
        for repo in repos:
            repo = repo.strip()
            if not repo or "/" not in repo:
                continue
            try:
                resp = client.get(f"https://api.github.com/repos/{repo}/readme", headers=headers)
                resp.raise_for_status()
            except httpx.HTTPError:
                continue
            text = resp.text
            if not text.strip():
                continue
            docs.append(
                Document(
                    id=f"github:{repo}",
                    title=f"{repo} README",
                    url=f"https://github.com/{repo}",
                    text=text,
                    kind="github",
                    metadata={"repo": repo},
                )
            )
    return docs
