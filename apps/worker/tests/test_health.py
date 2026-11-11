from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "snip-worker"
    assert "publish" not in body["job_kinds"]
