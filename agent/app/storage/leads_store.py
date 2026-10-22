"""Local lead storage via SQLite (brief §4 capture_lead). The file lives under
agent/data/ by default (gitignored) — never committed, never logged verbatim."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            name TEXT,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            client_ip TEXT
        )
        """
    )
    return conn


def save_lead(db_path: Path, *, name: str | None, email: str, message: str, client_ip: str | None) -> int:
    from datetime import datetime, timezone

    with _connect(db_path) as conn:
        cur = conn.execute(
            "INSERT INTO leads (created_at, name, email, message, client_ip) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), name, email, message, client_ip),
        )
        conn.commit()
        return cur.lastrowid


def list_leads(db_path: Path) -> list[dict[str, Any]]:
    if not db_path.exists():
        return []
    with _connect(db_path) as conn:
        rows = conn.execute("SELECT id, created_at, name, email, message, client_ip FROM leads ORDER BY id DESC").fetchall()
    return [
        {"id": r[0], "created_at": r[1], "name": r[2], "email": r[3], "message": r[4], "client_ip": r[5]} for r in rows
    ]
