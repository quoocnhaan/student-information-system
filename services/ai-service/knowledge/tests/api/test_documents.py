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

    async def create_document(
        self, record_id: str, document: dict[str, object]
    ) -> None:
        self.documents[record_id] = document

    async def create_document_with_job(
        self, record_id: str, document: dict[str, object], job_record_id: str
    ) -> dict[str, object]:
        self.documents[record_id] = document
        job = {
            "id": f"job:{job_record_id}", "type": "ocr_pdf",
            "document_id": f"document:{record_id}", "status": "queued",
            "step": "queued", "progress": 0,
        }
        self.jobs[job["id"]] = job
        return job

    async def get_job(self, job_id: str) -> dict[str, object] | None:
        return self.jobs.get(job_id)

    async def delete_document(self, record_id: str) -> None:
        self.documents.pop(record_id, None)



class FakePublisher:
    def __init__(self) -> None:
        self.published: list[dict[str, object]] = []

    async def publish(self, job: dict[str, object]) -> None:
        self.published.append(job)

    async def close(self) -> None:
        pass


class FailingPublisher(FakePublisher):
    async def publish(self, job: dict[str, object]) -> None:
        return None

def create_upload_client() -> tuple[TestClient, FakeObjectStore, FakeDatabase, FakePublisher]:
    app = create_app()
    object_store = FakeObjectStore()
    database = FakeDatabase()
    app.dependency_overrides[get_object_store] = lambda: object_store
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app), object_store, database, FakePublisher()


def test_upload_pdf_stores_the_object_and_creates_a_processing_document() -> None:
    client, object_store, database, jobs = create_upload_client()

    with client:
        client.app.state.database = database
        client.app.state.publisher = jobs
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
    created_job = database.jobs[body["job_id"]]
    assert created_job["type"] == "ocr_pdf"
    assert created_job["document_id"] == body["document_id"]
    assert jobs.published == [created_job]

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


def test_upload_succeeds_when_broker_is_unavailable() -> None:
    client, object_store, database, _ = create_upload_client()

    with client:
        client.app.state.database = database
        client.app.state.publisher = FailingPublisher()
        response = client.post(
            "/v1/documents",
            files={"file": ("regulations.pdf", b"%PDF-1.7 sample", "application/pdf")},
        )

    assert response.status_code == 202
    assert len(object_store.objects) == 1
    assert len(database.documents) == 1
    assert len(database.jobs) == 1


def test_job_status_rejects_non_generated_record_ids() -> None:
    client, _, _, _ = create_upload_client()

    with client:
        response = client.get("/v1/jobs/not-a-generated-job-id")

    assert response.status_code == 404
