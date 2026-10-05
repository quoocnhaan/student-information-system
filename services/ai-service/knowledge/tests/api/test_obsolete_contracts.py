from fastapi.testclient import TestClient

from app.api.v1.jobs import _as_response
from app.main import create_app
from app.dependencies import get_database
import pytest


def test_removed_routes_and_job_fields():
    app = create_app()
    with TestClient(app) as client:
        for action in ("accept", "reject"):
            assert client.post(f"/v1/corrections/obsolete/{action}").status_code == 404
        assert not any(path.startswith("/v1/corrections") for path in app.openapi()["paths"])
    response = _as_response({"id": "job:test", "type": "correct_chunks", "document_id": "document:test",
                             "status": "queued", "step": "queued", "progress": 0}).model_dump()
    assert response["followup_job_ids"] == []
    assert "ocr_draft_id" not in response and "correction_mode" not in response
    assert not {"payload", "total_pages", "processed_pages", "claim_id", "worker_id"}.intersection(response)


@pytest.mark.parametrize("body", [
    {"chunk_ids": ["chunk:chunk_" + "a" * 32]},
    {"chunk_id": "chunk:chunk_" + "a" * 32, "chunk_ids": []},
    {"chunk_id": "chunk:invalid"},
    {"chunk_id": ["chunk:chunk_" + "a" * 32]},
])
def test_correction_rejects_batch_and_invalid_bodies(body):
    class Database:
        async def request_chunk_correction(self, *_):
            pytest.fail("Invalid request reached storage")

    app = create_app()
    app.dependency_overrides[get_database] = Database
    response = TestClient(app).post("/v1/documents/doc_" + "a" * 32 + "/corrections", json=body)
    assert response.status_code == 422


@pytest.mark.parametrize("available", [True, False])
def test_single_chunk_correction_request(available):
    chunk_id = "chunk:chunk_" + "b" * 32
    class Database:
        async def request_chunk_correction(self, document, chunk):
            assert document == "doc_" + "a" * 32 and chunk == chunk_id
            return {"id": "job:job_" + "c" * 32} if available else None

    app = create_app()
    app.dependency_overrides[get_database] = Database
    response = TestClient(app).post("/v1/documents/doc_" + "a" * 32 + "/corrections", json={"chunk_id": chunk_id})
    assert response.status_code == (202 if available else 409)
    if available:
        assert response.json() == {"job_id": "job:job_" + "c" * 32}


def test_chunk_response_exposes_durable_operations_without_captured_text():
    parent = _as_response({"id": "job:test", "type": "correct_chunks", "document_id": "document:test",
                          "status": "failed", "step": "failed", "progress": 100, "error": "Model failed"}).model_dump()
    class Database:
        async def get_document(self, _):
            return {"process_status": "indexed"}

        async def indexed_chunks(self, _):
            return [{"id": "chunk:test", "text": "Original", "hierarchy": {},
                     "position": {"chunk_index": 0, "page_start": 1, "page_end": 1},
                     "correction": {"input_id": "chunk_correction_input:test", "outcome": "failed",
                                    "job": parent, "children": [], "chunk_child_ids": [], "base_text": "Private"}}]
    app = create_app()
    app.dependency_overrides[get_database] = Database
    response = TestClient(app).get("/v1/documents/doc_" + "a" * 32 + "/chunks")
    assert response.status_code == 200
    chunk = response.json()["pages"][0]["chunks"][0]
    assert "suggestion" not in chunk and "base_text" not in chunk["correction"]
    assert chunk["correction"]["job"]["error"] == "Model failed"
