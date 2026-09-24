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
        "pages": [{"page": 1, "raw_text": "Hello", "reviewed_text": None}],
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

    async def update_document_review(
        self,
        record_id: str,
        expected_revision: int,
        metadata: dict[str, object],
        pages: list[dict[str, object]],
    ) -> bool:
        assert record_id == _DOCUMENT_ID
        if expected_revision != self.draft["revision"]:
            return False
        self.document.update(metadata)
        by_page = {int(change["page"]): str(change["reviewed_text"]) for change in pages}
        for page in self.draft["pages"]:
            if page["page"] in by_page:
                page["reviewed_text"] = by_page[page["page"]]
        self.draft["revision"] += 1
        return True


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
    assert body["ocr_draft"]["revision"] == 1
    assert "object_key" not in response.text


def test_reviewer_can_save_metadata_and_page_markdown() -> None:
    with review_client() as client:
        response = client.patch(
            f"/v1/documents/document:{_DOCUMENT_ID}/review-draft",
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
                "pages": [{"page": 1, "reviewed_text": "# Corrected"}],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["metadata"]["title"] == "Corrected regulations"
    assert body["ocr_draft"]["revision"] == 2
    assert body["ocr_draft"]["pages"] == [
        {"page": 1, "raw_text": "Hello", "reviewed_text": "# Corrected"}
    ]


def test_reviewer_cannot_overwrite_a_stale_draft() -> None:
    with review_client() as client:
        first_response = client.patch(
            f"/v1/documents/document:{_DOCUMENT_ID}/review-draft",
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
                "pages": [],
            },
        )
        response = client.patch(
            f"/v1/documents/document:{_DOCUMENT_ID}/review-draft",
            json={
                "expected_revision": 1,
                "metadata": {
                    "title": "Stale correction",
                    "document_type": "regulation",
                    "document_number": None,
                    "description": None,
                    "cohort": None,
                    "program_scope": {"type": "all", "programs": []},
                    "language": "en",
                },
                "pages": [],
            },
        )

    assert first_response.status_code == 200
    assert response.status_code == 409


def test_review_draft_rejects_duplicate_page_updates() -> None:
    with review_client() as client:
        response = client.patch(
            f"/v1/documents/document:{_DOCUMENT_ID}/review-draft",
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
                "pages": [
                    {"page": 1, "reviewed_text": "one"},
                    {"page": 1, "reviewed_text": "two"},
                ],
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
