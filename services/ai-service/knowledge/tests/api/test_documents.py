from io import BytesIO

from fastapi.testclient import TestClient

from app.dependencies import get_database, get_object_store
from app.main import create_app


class FakeObjectStore:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    async def put_pdf(self, object_key: str, stream: BytesIO, length: int) -> None:
        self.objects[object_key] = stream.read(length)

    async def remove(self, object_key: str) -> None:
        self.objects.pop(object_key, None)


class FakeDatabase:
    def __init__(self) -> None:
        self.documents: dict[str, dict[str, object]] = {}
        self.jobs: dict[str, dict[str, object]] = {}

    async def create_document(self, record_id: str, document: dict[str, object]) -> None:
        self.documents[record_id] = document

    async def create_job(
        self, record_id: str, document_record_id: str, job_type: str
    ) -> None:
        self.jobs[record_id] = {
            "id": f"job:{record_id}",
            "type": job_type,
            "document_id": f"document:{document_record_id}",
            "ocr_draft_id": None,
            "status": "queued",
            "step": "queued",
            "progress": 0,
            "total_pages": None,
            "processed_pages": 0,
            "error": None,
        }

    async def get_job(self, record_id: str) -> dict[str, object] | None:
        return self.jobs.get(record_id)

    async def delete_document(self, record_id: str) -> None:
        self.documents.pop(record_id, None)


def create_upload_client() -> tuple[TestClient, FakeObjectStore, FakeDatabase]:
    app = create_app()
    object_store = FakeObjectStore()
    database = FakeDatabase()
    app.dependency_overrides[get_object_store] = lambda: object_store
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app), object_store, database


def test_upload_pdf_stores_the_object_and_creates_a_processing_document() -> None:
    client, object_store, database = create_upload_client()

    with client:
        response = client.post(
            "/v1/documents",
            files={"file": ("regulations.pdf", b"%PDF-1.7 sample", "application/pdf")},
        )

    assert response.status_code == 202
    body = response.json()
    assert body["document_id"].startswith("document:doc_")
    assert body["job_id"].startswith("job:job_")
    assert body["status"] == "processing"
    assert len(object_store.objects) == 1
    assert database.documents
    assert next(iter(database.documents.values()))["process_status"] == "processing"
    assert database.jobs

    job_response = client.get(f"/v1/jobs/{body['job_id']}")
    assert job_response.status_code == 200
    assert job_response.json()["step"] == "queued"


def test_upload_rejects_non_pdf_content() -> None:
    client, _, _ = create_upload_client()

    with client:
        response = client.post(
            "/v1/documents",
            files={"file": ("wrong.pdf", b"not a pdf", "application/pdf")},
        )

    assert response.status_code == 415
