from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


def test_healthz_reports_status_and_model(settings):
    app.dependency_overrides[get_settings] = lambda: settings
    try:
        with TestClient(app) as tc:
            resp = tc.get("/healthz")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["model"] == settings.model
        assert body["modelConfigured"] is True
    finally:
        app.dependency_overrides.clear()
