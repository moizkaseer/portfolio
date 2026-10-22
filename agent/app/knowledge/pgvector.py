"""Optional Postgres+pgvector knowledge store (brief §3).

Only used when DATABASE_URL is set. Importing this module is always safe even
without `psycopg` or an embedding provider installed/configured — the heavy
imports are deferred into the methods that actually need them, and every
method that depends on an optional extra raises a clear RuntimeError instead
of failing at import time.

Setup (run once against the target database):
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE agent_documents (
        id text PRIMARY KEY,
        title text NOT NULL,
        url text NOT NULL,
        text text NOT NULL,
        kind text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        embedding vector(1536)
    );
"""
from __future__ import annotations

from typing import Any

from app.knowledge.content_loader import Document


class PgVectorUnavailable(RuntimeError):
    pass


def embed_text(text: str, *, provider: str | None, openai_api_key: str | None) -> list[float]:
    """Embeds one string via the configured provider. Currently supports
    provider="openai" (text-embedding-3-small, 1536 dims) over plain HTTP —
    no `openai` SDK dependency required.
    """
    if provider != "openai":
        raise PgVectorUnavailable(
            f'no embedding provider configured (EMBEDDING_PROVIDER={provider!r}); set EMBEDDING_PROVIDER="openai" '
            "and OPENAI_API_KEY to use the Postgres+pgvector path"
        )
    if not openai_api_key:
        raise PgVectorUnavailable("EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set")

    import httpx

    resp = httpx.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {openai_api_key}"},
        json={"model": "text-embedding-3-small", "input": text},
        timeout=15.0,
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


class PgVectorStore:
    """Thin wrapper around a `vector`-enabled Postgres table. Lazily imports
    `psycopg` so this module stays import-safe without it installed."""

    def __init__(self, database_url: str, *, embedding_provider: str | None, openai_api_key: str | None):
        self._database_url = database_url
        self._embedding_provider = embedding_provider
        self._openai_api_key = openai_api_key

    def _connect(self):
        try:
            import psycopg
        except ImportError as exc:  # pragma: no cover - exercised only when extra missing
            raise PgVectorUnavailable(
                "DATABASE_URL is set but `psycopg` isn't installed — install the optional "
                '"pgvector" extra (pip install "psycopg[binary]") to use this path'
            ) from exc
        return psycopg.connect(self._database_url)

    def upsert_documents(self, documents: list[Document]) -> None:
        import json

        with self._connect() as conn, conn.cursor() as cur:
            for doc in documents:
                embedding = embed_text(doc.text, provider=self._embedding_provider, openai_api_key=self._openai_api_key)
                cur.execute(
                    """
                    INSERT INTO agent_documents (id, title, url, text, kind, metadata, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title, url = EXCLUDED.url, text = EXCLUDED.text,
                        kind = EXCLUDED.kind, metadata = EXCLUDED.metadata, embedding = EXCLUDED.embedding
                    """,
                    (doc.id, doc.title, doc.url, doc.text, doc.kind, json.dumps(doc.metadata), embedding),
                )
            conn.commit()

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        embedding = embed_text(query, provider=self._embedding_provider, openai_api_key=self._openai_api_key)
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, text, kind, metadata, 1 - (embedding <=> %s) AS score
                FROM agent_documents
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                (embedding, embedding, top_k),
            )
            rows = cur.fetchall()
        return [
            {"id": r[0], "title": r[1], "url": r[2], "text": r[3], "kind": r[4], "metadata": r[5], "score": round(float(r[6]), 4)}
            for r in rows
        ]
