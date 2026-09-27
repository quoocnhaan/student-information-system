"""Worker callbacks require both a service token and an active central claim."""

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app

JOB = "job:job_" + "a" * 32
DOCUMENT = "document:doc_" + "b" * 32
CLAIM = "c" * 32


class Jobs:
    def __init__(self) -> None:
        self.verified = 0

    async def verify(self, job_id, claim_id):
        assert job_id == JOB
        assert claim_id == CLAIM
        self.verified += 1
        return {"owner": "knowledge", "type": "ocr_pdf", "subject_id": DOCUMENT, "status": "running"}

    async def close(self):
        pass


class Documents:
    def __init__(self) -> None:
        self.saved = 0

    async def get_document(self, record_id):
        assert record_id == DOCUMENT.split(":", 1)[1]
        return {"source": {"object_key": "documents/source/original.pdf", "original_filename": "rules.pdf"}}

    async def apply_ocr_result(self, record_id, draft_id, pages, metadata):
        self.saved += 1
        assert record_id == DOCUMENT.split(":", 1)[1]
        assert pages == [{"page": 1, "raw_text": "RULES", "reviewed_text": None}]
        return "ocr_draft:" + draft_id


class Objects:
    async def get_size(self, key):
        return 8

    async def get_bytes(self, key):
        return b"%PDF-1.7"


def test_callback_auth_and_claim_gate() -> None:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(worker_callback_token="test-token")
    jobs, documents = Jobs(), Documents()
    with TestClient(app) as client:
        client.app.state.job_client = jobs
        client.app.state.database = documents
        client.app.state.object_store = Objects()
        no_token = client.post(f"/internal/v1/knowledge/jobs/{JOB}/result", json={"claim_id": CLAIM, "pages": [{"page": 1, "raw_text": "RULES"}]})
        assert no_token.status_code == 401
        assert jobs.verified == 0 and documents.saved == 0
        wrong_claim = client.post(f"/internal/v1/knowledge/jobs/{JOB}/result", headers={"Authorization": "Bearer test-token"}, json={"claim_id": "bad", "pages": [{"page": 1, "raw_text": "RULES"}]})
        assert wrong_claim.status_code == 422
        source = client.get(f"/internal/v1/knowledge/jobs/{JOB}/source", headers={"Authorization": "Bearer test-token"}, params={"claim_id": CLAIM})
        assert source.status_code == 200 and source.content == b"%PDF-1.7"
        result = client.post(f"/internal/v1/knowledge/jobs/{JOB}/result", headers={"Authorization": "Bearer test-token"}, json={"claim_id": CLAIM, "pages": [{"page": 1, "raw_text": "RULES"}]})
        assert result.status_code == 200
        assert documents.saved == 1 and jobs.verified == 2
