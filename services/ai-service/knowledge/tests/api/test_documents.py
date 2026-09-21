import asyncio
from io import BytesIO

from fastapi.testclient import TestClient

from app.api.v1 import documents
from app.config import Settings
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

    async def create_document_with_job(
        self,
        document_record_id: str,
        document: dict[str, object],
        job_record_id: str,
        job_type: str,
    ) -> None:
        await self.create_document(document_record_id, document)
        await self.create_job(job_record_id, document_record_id, job_type)

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


def test_job_status_rejects_non_generated_record_ids() -> None:
    client, _, _ = create_upload_client()

    with client:
        response = client.get("/v1/jobs/not-a-generated-job-id")

    assert response.status_code == 404


class _DispatchDatabase:
    def __init__(self) -> None:
        self.event = {
            "id": "outbox_event:dispatch_a",
            "type": "job.queued",
            "job_id": "job:job_a",
            "dispatch_generation": 1,
        }
        self.published: list[str] = []
        self.failed: list[tuple[str, str]] = []

    async def get_pending_job_dispatch_event(self, job_record_id: str):
        assert job_record_id == "job_a"
        return self.event

    async def mark_outbox_published(self, event_id: str) -> None:
        self.published.append(event_id)

    async def mark_outbox_failed(self, event_id: str, error: str) -> None:
        self.failed.append((event_id, error))


def test_new_job_is_published_directly_then_marked_delivered(monkeypatch) -> None:
    published: list[dict[str, object]] = []

    class _Broker:
        def __init__(self, _settings: Settings) -> None:
            pass

        async def connect(self) -> None:
            pass

        async def publish_outbox_event(self, event: dict[str, object]) -> None:
            published.append(event)

        async def close(self) -> None:
            pass

    monkeypatch.setattr(documents, "RabbitMqBroker", _Broker)
    database = _DispatchDatabase()

    asyncio.run(documents._publish_new_job(database, Settings(rabbitmq_enabled=True), "job_a"))

    assert published == [database.event]
    assert database.published == ["dispatch_a"]
    assert database.failed == []


def test_new_job_publish_failure_leaves_outbox_event_pending(monkeypatch) -> None:
    class _Broker:
        def __init__(self, _settings: Settings) -> None:
            pass

        async def connect(self) -> None:
            pass

        async def publish_outbox_event(self, _event: dict[str, object]) -> None:
            raise ConnectionError("RabbitMQ is unavailable")

        async def close(self) -> None:
            pass

    monkeypatch.setattr(documents, "RabbitMqBroker", _Broker)
    database = _DispatchDatabase()

    asyncio.run(documents._publish_new_job(database, Settings(rabbitmq_enabled=True), "job_a"))

    assert database.published == []
    assert database.failed == [("dispatch_a", "RabbitMQ is unavailable")]


def test_new_job_publish_timeout_leaves_durable_event_pending(monkeypatch) -> None:
    from app.infrastructure.rabbitmq import RabbitMqPublishTimeout

    class _Broker:
        def __init__(self, _settings: Settings) -> None:
            pass

        async def connect(self) -> None:
            pass

        async def publish_outbox_event(self, _event: dict[str, object]) -> None:
            raise RabbitMqPublishTimeout("job.queued", "outbox_event:dispatch_a")

        async def close(self) -> None:
            pass

    monkeypatch.setattr(documents, "RabbitMqBroker", _Broker)
    database = _DispatchDatabase()

    asyncio.run(documents._publish_new_job(database, Settings(rabbitmq_enabled=True), "job_a"))

    assert database.published == []
    assert len(database.failed) == 1
    assert database.failed[0][0] == "dispatch_a"
