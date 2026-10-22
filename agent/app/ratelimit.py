"""Per-IP rate limiting (brief §5) — Upstash REST when configured (shared across
instances), otherwise an in-memory sliding window (mirrors lib/server/rate-limit.ts)."""
from __future__ import annotations

import time
from typing import Protocol

import httpx


class Limiter(Protocol):
    def allow(self, key: str) -> bool: ...


class MemorySlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.time()
        hits = [t for t in self._hits.get(key, []) if now - t < self._window]
        ok = len(hits) < self._limit
        if ok:
            hits.append(now)
        self._hits[key] = hits
        return ok


class UpstashRestLimiter:
    """Fixed-window counter via Upstash's Redis REST API (INCR + EXPIRE). This
    is an approximation of the sliding window the TS side uses via @upstash/ratelimit
    — acceptable for this agent's coarse per-hour visitor cap."""

    def __init__(self, url: str, token: str, limit: int, window_seconds: int, prefix: str = "agent"):
        self._url = url.rstrip("/")
        self._token = token
        self._limit = limit
        self._window = window_seconds
        self._prefix = prefix

    def allow(self, key: str) -> bool:
        bucket = int(time.time() // self._window)
        redis_key = f"{self._prefix}:{key}:{bucket}"
        try:
            resp = httpx.post(
                f"{self._url}/pipeline",
                headers={"Authorization": f"Bearer {self._token}"},
                json=[["INCR", redis_key], ["EXPIRE", redis_key, str(self._window)]],
                timeout=5.0,
            )
            resp.raise_for_status()
            count = resp.json()[0]["result"]
            return int(count) <= self._limit
        except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError):
            return True  # fail open — a limiter outage must never take the agent down


def create_limiter(
    *, limit: int, window_seconds: int, upstash_url: str | None, upstash_token: str | None, prefix: str = "agent"
) -> Limiter:
    if upstash_url and upstash_token:
        return UpstashRestLimiter(upstash_url, upstash_token, limit, window_seconds, prefix=prefix)
    return MemorySlidingWindowLimiter(limit, window_seconds)


def client_ip(headers: dict[str, str]) -> str:
    forwarded = headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return headers.get("x-real-ip", "unknown")
