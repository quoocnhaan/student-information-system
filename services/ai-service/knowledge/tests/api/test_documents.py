from io import BytesIO

from fastapi.testclient import TestClient

from app.dependencies import get_database, get_object_store
from app.infrastructure.job_service import JobServiceError
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

    async def create_document(
        self, record_id: str, document: dict[str, object]
    ) -> None:
        self.documents[record_id] = document

    async def delete_document(self, record_id: str) -> None:
        self.documents.pop(record_id, None)


class FakeJobClient:
    def __init__(self) -> None:
        self.jobs: dict[str, dict[str, object]] = {}

    async def create(self, document_id: str) -> dict[str, object]:
        record_id = "job_" + document_id.split("doc_", 1)[1]
        job = {
            "id": f"job:{record_id}",
            "owner": "knowledge",
            "type": "ocr_pdf",
            "subject_id": document_id,
            "result_ref": None,
            "status": "queued",
            "step": "queued",
            "progress": 0,
            "total_pages": None,
            "processed_pages": 0,
            "error": None,
        }
        self.jobs[job["id"]] = job
        return job

    async def get(self, job_id: str) -> dict[str, object] | None:
        return self.jobs.get(job_id)

    async def close(self) -> None:
        pass


class FailingJobClient(FakeJobClient):
    async def create(self, document_id: str) -> dict[str, object]:
        raise JobServiceError("Central job creation failed")

def create_upload_client() -> tuple[TestClient, FakeObjectStore, FakeDatabase, FakeJobClient]:
    app = create_app()
    object_store = FakeObjectStore()
    database = FakeDatabase()
    app.dependency_overrides[get_object_store] = lambda: object_store
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app), object_store, database, FakeJobClient()


def test_upload_pdf_stores_the_object_and_creates_a_processing_document() -> None:
    client, object_store, database, jobs = create_upload_client()

    with client:
        client.app.state.job_client = jobs
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
    assert jobs.jobs

    job_response = client.get(f"/v1/jobs/{body['job_id']}")
    assert job_response.status_code == 200
    assert job_response.json()["step"] == "queued"


def test_upload_rejects_non_pdf_content() -> None:
    client, _, _, _ = create_upload_client()

    with client:
        response = client.post(
            "/v1/documents",
            files={"file": ("wrong.pdf", b"not a pdf", "application/pdf")},
        )

    assert response.status_code == 415


def test_upload_preserves_source_and_document_when_job_creation_is_ambiguous() -> None:
    client, object_store, database, _ = create_upload_client()

    with client:
        client.app.state.job_client = FailingJobClient()
        response = client.post(
            "/v1/documents",
            files={"file": ("regulations.pdf", b"%PDF-1.7 sample", "application/pdf")},
        )

    assert response.status_code == 503
    assert response.json() == {"detail": "OCR job could not be created"}
    assert len(object_store.objects) == 1
    assert len(database.documents) == 1


def test_job_status_rejects_non_generated_record_ids() -> None:
    client, _, _, _ = create_upload_client()

    with client:
        response = client.get("/v1/jobs/not-a-generated-job-id")

    assert response.status_code == 404
