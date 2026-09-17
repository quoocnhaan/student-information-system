from fastapi.testclient import TestClient

from app.main import create_app


def test_health_reports_knowledge_service() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "knowledge-service"}


def test_health_returns_or_generates_request_id() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/v1/health", headers={"X-Request-ID": "test-id"})

    assert response.headers["X-Request-ID"] == "test-id"
