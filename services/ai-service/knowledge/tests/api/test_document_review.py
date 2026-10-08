from collections.abc import AsyncIterator
from copy import deepcopy

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
        "revision": 1,
        "pages": [{"page": 1, "raw_text": "Hello"}],
    }

    def __init__(self) -> None:
        self.document = deepcopy(type(self).document)
        self.draft = deepcopy(type(self).draft)

    async def get_document_result(self, record_id: str):
        assert record_id == _DOCUMENT_ID
        return self.document, self.draft

    async def get_document(self, record_id: str):
        assert record_id == _DOCUMENT_ID
        return self.document

    async def confirm_review(self, record_id: str, expected_revision: int, metadata: dict[str, object], page_edits: list[dict[str, object]], selected_pages: list[int]):
        assert record_id == _DOCUMENT_ID
        if expected_revision != self.draft["revision"]:
            return None
        self.document.update(metadata)
        self.confirmation = {"page_edits": page_edits, "selected_pages": selected_pages}
        self.draft["status"] = "confirmed"
        self.document["process_status"] = "indexing"
        return {"id": "job:job_" + "b" * 32, "status": "queued"}


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
        response = client.get(f"/v1/documents/document:{_DOCUMENT_ID}/draft")

    assert response.status_code == 200
    body = response.json()
    assert body["ocr_draft"]["pages"] == [
        {"page": 1, "raw_text": "Hello"}
    ]
    assert body["ocr_draft"]["revision"] == 1
    assert "object_key" not in response.text


def test_reviewer_confirms_metadata_edits_and_selected_pages_together() -> None:
    with review_client() as client:
        response = client.post(
            f"/v1/documents/document:{_DOCUMENT_ID}/confirm",
            json={
                "expected_revision": 1,
                "metadata": {
                    "title": "Corrected regulations",
                    "document_type": "regulation",
                    "document_number": None,
                    "description": None,
                    "cohort": None,
                    "program_scope": {"type": "all", "programs": []},
                    "language": "en",
                },
                "page_edits": [{"page": 1, "reviewed_text": "# Corrected"}],
                "selected_pages": [1],
            },
        )

    assert response.status_code == 202
    assert response.json()["job_id"] == "job:job_" + "b" * 32


def test_confirmation_rejects_a_stale_draft() -> None:
    with review_client() as client:
        response = client.post(
            f"/v1/documents/document:{_DOCUMENT_ID}/confirm",
            json={
                "expected_revision": 2,
                "metadata": {
                    "title": "Stale correction",
                    "document_type": "regulation",
                    "document_number": None,
                    "description": None,
                    "cohort": None,
                    "program_scope": {"type": "all", "programs": []},
                    "language": "en",
                },
                "page_edits": [], "selected_pages": [1],
            },
        )

    assert response.status_code == 409


def test_confirmation_rejects_duplicate_page_edits_and_unknown_pages() -> None:
    with review_client() as client:
        response = client.post(
            f"/v1/documents/document:{_DOCUMENT_ID}/confirm",
            json={
                "expected_revision": 1,
                "metadata": {
                    "title": "Corrected regulations",
                    "document_type": "regulation",
                    "document_number": None,
                    "description": None,
                    "cohort": None,
                    "program_scope": {"type": "all", "programs": []},
                    "language": "en",
                },
                "page_edits": [
                    {"page": 1, "reviewed_text": "one"},
                    {"page": 1, "reviewed_text": "two"},
                ],
                "selected_pages": [1],
            },
        )

    assert response.status_code == 422


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
