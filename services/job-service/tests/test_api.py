"""Central creation and claim routes enforce owner/worker credentials."""

from fastapi.testclient import TestClient

from job_service.config import Settings
from job_service.main import app


class Store:
    def __init__(self) -> None:
        self.created = 0

    async def create(self, owner, type_, subject, key):
        self.created += 1
        return {"id": "job:job_" + "a" * 32, "owner": owner, "type": type_, "subject_id": subject,
                "status": "queued", "step": "queued", "progress": 0, "sequence": 1}

    async def claim(self, job_id, claim_id, owner, type_):
        return {"id": job_id, "owner": owner, "type": type_, "subject_id": "subject:1",
                "status": "running", "step": "claimed", "progress": 5, "sequence": 2}


class Publisher:
    async def publish(self, row):
        pass


def test_owner_cannot_impersonate_and_worker_claim_requires_token():
    store = Store()
    app.state.store = store
    app.state.publisher = Publisher()
    app.state.settings = Settings(worker_token="worker-secret", owner_tokens_json='{"knowledge":"knowledge-secret"}')
    client = TestClient(app)
    body = {"owner": "knowledge", "type": "ocr_pdf", "subject_id": "document:1", "creation_key": "document:1"}
    assert client.post("/internal/v1/jobs", json=body).status_code == 401
    assert client.post("/internal/v1/jobs", json=body, headers={"Authorization": "Bearer other"}).status_code == 401
    assert store.created == 0
    created = client.post("/internal/v1/jobs", json=body, headers={"Authorization": "Bearer knowledge-secret"})
    assert created.status_code == 201 and store.created == 1
    claim = {"claim_id": "b" * 32, "owner": "knowledge", "type": "ocr_pdf"}
    assert client.post(f"/internal/v1/jobs/{created.json()['id']}/claim", json=claim).status_code == 401
    assert client.post(f"/internal/v1/jobs/{created.json()['id']}/claim", json=claim, headers={"Authorization": "Bearer worker-secret"}).status_code == 200
