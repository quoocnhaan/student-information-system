from fastapi.testclient import TestClient

from app.main import create_app
from app.config import Settings


def test_health_reports_knowledge_service() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "knowledge-service"}


def test_health_returns_or_generates_request_id() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/v1/health", headers={"X-Request-ID": "test-id"})

    assert response.headers["X-Request-ID"] == "test-id"


def test_ready_does_not_require_rabbitmq_for_durable_uploads() -> None:
    class _Ready:
        async def is_ready(self) -> bool:
            return True

    app = create_app()
    with TestClient(app) as client:
        client.app.state.settings = Settings(rabbitmq_enabled=True)
        client.app.state.object_store = _Ready()
        response = client.get("/v1/ready")

    assert response.status_code == 200
