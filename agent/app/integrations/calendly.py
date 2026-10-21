"""Calendly API v2 client (brief §4 propose_meeting_slots).

Looks up the owner's "30-min-intro-call" event type via /users/me + /event_types,
then lists open slots via /event_type_available_times. Never books anything —
there is no call anywhere in this module to the invitee-creation endpoint.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import httpx

CALENDLY_API_BASE = "https://api.calendly.com"


class CalendlyError(RuntimeError):
    pass


class CalendlyClient:
    def __init__(self, token: str, *, timeout: float = 10.0):
        self._token = token
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}

    def _get(self, client: httpx.Client, path: str, params: dict[str, Any] | None = None) -> dict:
        resp = client.get(f"{CALENDLY_API_BASE}{path}", headers=self._headers(), params=params)
        if resp.status_code >= 400:
            raise CalendlyError(f"Calendly {path} returned {resp.status_code}: {resp.text[:200]}")
        return resp.json()

    def current_user_uri(self, client: httpx.Client) -> str:
        data = self._get(client, "/users/me")
        return data["resource"]["uri"]

    def find_event_type(self, client: httpx.Client, user_uri: str, slug: str) -> dict | None:
        data = self._get(client, "/event_types", params={"user": user_uri, "active": "true"})
        for et in data.get("collection", []):
            if et.get("slug") == slug or slug in (et.get("scheduling_url") or ""):
                return et
        return None

    def available_times(
        self, client: httpx.Client, event_type_uri: str, *, days_ahead: int = 7
    ) -> list[dict[str, str]]:
        now = datetime.now(timezone.utc)
        data = self._get(
            client,
            "/event_type_available_times",
            params={
                "event_type": event_type_uri,
                "start_time": now.isoformat(),
                "end_time": (now + timedelta(days=days_ahead)).isoformat(),
            },
        )
        return data.get("collection", [])


def propose_slots(
    token: str,
    *,
    event_slug: str,
    visitor_timezone: str | None = None,
    days_ahead: int = 7,
    max_slots: int = 5,
) -> dict[str, Any]:
    """Returns {schedulingUrl, slots: [...]} — slots is empty (but schedulingUrl
    is still returned) if the event type or its available times can't be found."""
    with httpx.Client(timeout=10.0) as client:
        api = CalendlyClient(token)
        user_uri = api.current_user_uri(client)
        event_type = api.find_event_type(client, user_uri, event_slug)
        if not event_type:
            return {"schedulingUrl": None, "slots": [], "note": f'no event type matching slug "{event_slug}"'}

        scheduling_url = event_type.get("scheduling_url")
        raw_slots = api.available_times(client, event_type["uri"], days_ahead=days_ahead)

        tz = None
        if visitor_timezone:
            try:
                tz = ZoneInfo(visitor_timezone)
            except Exception:
                tz = None

        slots: list[str] = []
        for slot in raw_slots[:max_slots]:
            start = slot.get("start_time")
            if not start:
                continue
            if tz:
                try:
                    dt = datetime.fromisoformat(start.replace("Z", "+00:00")).astimezone(tz)
                    slots.append(dt.isoformat())
                    continue
                except ValueError:
                    pass
            slots.append(start)

        return {"schedulingUrl": scheduling_url, "slots": slots}
