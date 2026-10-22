"""A small, dependency-free BM25 index (brief §3 — "works with NO extra infra").

Good enough for a few dozen to a few hundred documents; persisted as plain JSON
by knowledge/store.py so the service doesn't need to rebuild it on every boot.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

_TOKEN_RE = re.compile(r"[a-z0-9]+")

K1 = 1.5
B = 0.75


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


@dataclass
class BM25Index:
    doc_ids: list[str] = field(default_factory=list)
    doc_meta: dict[str, dict[str, Any]] = field(default_factory=dict)
    doc_term_freqs: dict[str, Counter] = field(default_factory=dict)
    doc_lengths: dict[str, int] = field(default_factory=dict)
    doc_freq: Counter = field(default_factory=Counter)
    avg_doc_length: float = 0.0

    @classmethod
    def build(cls, documents: list[Any]) -> "BM25Index":
        """documents: objects/dicts with id, title, url, text, kind, metadata."""
        idx = cls()
        total_length = 0
        for doc in documents:
            doc_id = doc.id if hasattr(doc, "id") else doc["id"]
            text = doc.text if hasattr(doc, "text") else doc["text"]
            tokens = tokenize(text)
            tf = Counter(tokens)
            idx.doc_ids.append(doc_id)
            idx.doc_term_freqs[doc_id] = tf
            idx.doc_lengths[doc_id] = len(tokens)
            total_length += len(tokens)
            for term in tf:
                idx.doc_freq[term] += 1
            idx.doc_meta[doc_id] = {
                "title": doc.title if hasattr(doc, "title") else doc["title"],
                "url": doc.url if hasattr(doc, "url") else doc["url"],
                "text": text,
                "kind": doc.kind if hasattr(doc, "kind") else doc.get("kind", "content"),
                "metadata": doc.metadata if hasattr(doc, "metadata") else doc.get("metadata", {}),
            }
        idx.avg_doc_length = (total_length / len(idx.doc_ids)) if idx.doc_ids else 0.0
        return idx

    def _idf(self, term: str) -> float:
        n = len(self.doc_ids)
        df = self.doc_freq.get(term, 0)
        return math.log(1 + (n - df + 0.5) / (df + 0.5))

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        terms = tokenize(query)
        if not terms or not self.doc_ids:
            return []
        scores: dict[str, float] = {doc_id: 0.0 for doc_id in self.doc_ids}
        for term in terms:
            if term not in self.doc_freq:
                continue
            idf = self._idf(term)
            for doc_id in self.doc_ids:
                tf = self.doc_term_freqs[doc_id].get(term, 0)
                if not tf:
                    continue
                dl = self.doc_lengths[doc_id] or 1
                denom = tf + K1 * (1 - B + B * dl / (self.avg_doc_length or 1))
                scores[doc_id] += idf * (tf * (K1 + 1)) / (denom or 1)
        ranked = sorted((s for s in scores.items() if s[1] > 0), key=lambda kv: kv[1], reverse=True)[:top_k]
        results = []
        for doc_id, score in ranked:
            meta = self.doc_meta[doc_id]
            results.append({"id": doc_id, "score": round(score, 4), **meta})
        return results

    def to_dict(self) -> dict[str, Any]:
        return {
            "doc_ids": self.doc_ids,
            "doc_meta": self.doc_meta,
            "doc_term_freqs": {k: dict(v) for k, v in self.doc_term_freqs.items()},
            "doc_lengths": self.doc_lengths,
            "doc_freq": dict(self.doc_freq),
            "avg_doc_length": self.avg_doc_length,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "BM25Index":
        idx = cls()
        idx.doc_ids = list(data["doc_ids"])
        idx.doc_meta = data["doc_meta"]
        idx.doc_term_freqs = {k: Counter(v) for k, v in data["doc_term_freqs"].items()}
        idx.doc_lengths = data["doc_lengths"]
        idx.doc_freq = Counter(data["doc_freq"])
        idx.avg_doc_length = data["avg_doc_length"]
        return idx
