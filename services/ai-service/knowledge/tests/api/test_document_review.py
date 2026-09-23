from collections.abc import AsyncIterator

from fastapi.testclient import TestClient

from app.dependencies import get_database, get_object_store
from app.main import create_app

_DOCUMENT_ID = "doc_" + "a" * 32


class ReviewDatabase:
    document = {
        "id": f"document:{_DOCUMENT_ID}",
        "process_status": "review",
        "page_count": 1,
        "title": "Student regulations",
        "document_type": "regulation",
        "document_number": None,
        "description": None,
        "cohort": None,
        "program_scope": {"type": "all", "programs": []},
        "language": "en",
        "source": {
            "object_key": f"documents/{_DOCUMENT_ID}/original.pdf",
            "original_filename": "regulations.pdf",
            "mime_type": "application/pdf",
        },
    }
    draft = {
        "id": "ocr_draft:ocr_job_example",
        "status": "draft",
        "pages": [{"page": 1, "raw_text": "Hello", "reviewed_text": None}],
    }

    async def get_document_result(self, record_id: str):
        assert record_id == _DOCUMENT_ID
        return self.document, self.draft

    async def get_document(self, record_id: str):
        assert record_id == _DOCUMENT_ID
        return self.document


class ReviewObjectStore:
    async def get_size(self, object_key: str) -> int:
        assert object_key.endswith("original.pdf")
        return 10

    async def iter_pdf_range(
        self, object_key: str, offset: int, length: int
    ) -> AsyncIterator[bytes]:
        assert object_key.endswith("original.pdf")
        yield b"0123456789"[offset : offset + length]


def review_client() -> TestClient:
    app = create_app()
    database = ReviewDatabase()
    object_store = ReviewObjectStore()
    app.dependency_overrides[get_database] = lambda: database
    app.dependency_overrides[get_object_store] = lambda: object_store
    return TestClient(app)


def test_completed_document_result_hides_object_key() -> None:
    with review_client() as client:
        response = client.get(f"/v1/documents/document:{_DOCUMENT_ID}/result")

    assert response.status_code == 200
    body = response.json()
    assert body["ocr_draft"]["pages"] == [
        {"page": 1, "raw_text": "Hello", "reviewed_text": None}
    ]
    assert "object_key" not in response.text


def test_document_source_honors_a_byte_range() -> None:
    with review_client() as client:
        response = client.get(
            f"/v1/documents/{_DOCUMENT_ID}/source", headers={"Range": "bytes=2-5"}
        )

    assert response.status_code == 206
    assert response.content == b"2345"
    assert response.headers["content-range"] == "bytes 2-5/10"
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-type"] == "application/pdf"


def test_document_source_rejects_an_invalid_range() -> None:
    with review_client() as client:
        response = client.get(
            f"/v1/documents/{_DOCUMENT_ID}/source", headers={"Range": "bytes=20-21"}
        )

    assert response.status_code == 416
    assert response.headers["content-range"] == "bytes */10"
