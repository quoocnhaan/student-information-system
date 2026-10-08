"""Indexed route inventory, safe projections, and replacement validation."""
from copy import deepcopy
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.dependencies import get_database
from app.infrastructure.surreal import SurrealDatabaseError

ID = "doc_" + "a" * 32
METADATA = dict(title="Title", document_type="Policy", document_number=None, description=None, language="en", cohort=None, program_scope=None)
DOCUMENT = dict(id="document:" + ID, process_status="indexed", source=dict(object_key="private/key", original_filename="source.pdf", mime_type="application/pdf"),
                page_count=1, created_at="created", updated_at="updated", metadata_version="2026-10-08T02:00:00.123456789Z", **METADATA)
CHUNK = dict(id="chunk:test", text="Indexed text", hierarchy={}, position=dict(chunk_index=0, page_start=1, page_end=1), embedding_status="ok",
             updated_at="updated", embedding=[0.0] * 768, embedding_text="Private embedding input", correction=None)


def client(database):
    app = create_app()
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app)


def test_indexed_detail_contains_metadata_and_chunks_without_storage_internals():
    database = AsyncMock()
    database.indexed_document.return_value = (DOCUMENT, [CHUNK])
    response = client(database).get(f"/v1/documents/{ID}")
    assert response.status_code == 200
    body = response.json()
    assert body["metadata"] == METADATA
    assert body["version"] == DOCUMENT["metadata_version"]
    assert body["pages"][0]["chunks"][0]["text"] == "Indexed text"
    assert not any(private in response.text for private in ("object_key", "embedding_text", "embedding_input", "ocr_draft", "payload"))
    database.indexed_document.assert_awaited_once_with(ID)
    database.get_document.assert_not_awaited()


def test_route_inventory_and_static_options_precede_document_identity():
    app = create_app()
    paths = app.openapi()["paths"]
    assert "/v1/documents/{document_id}/draft" in paths
    assert "/v1/documents/{document_id}/result" not in paths
    assert set(paths["/v1/documents/{document_id}/metadata"]) == {"put"}
    database = AsyncMock()
    response = client(database).get("/v1/documents/metadata-options")
    assert response.status_code == 200
    assert response.json()["program_scope_types"] == ["all", "non_language_major", "specific_programs"]
    database.indexed_document.assert_not_awaited()


@pytest.mark.parametrize("state,status", [(None, 404), ("review", 409), ("unavailable", 503)])
def test_indexed_detail_failure_statuses(state, status):
    database = AsyncMock()
    if state == "unavailable": database.indexed_document.side_effect = SurrealDatabaseError("offline")
    else: database.indexed_document.return_value = None if state is None else ({**DOCUMENT, "process_status": state}, [])
    assert client(database).get(f"/v1/documents/{ID}").status_code == status
    assert client(database).get("/v1/documents/invalid").status_code == 404


def test_update_normalizes_empty_fields_and_returns_saved_header_only():
    database = AsyncMock()
    database.update_indexed_metadata.return_value = {**DOCUMENT, "title": None}
    response = client(database).put(f"/v1/documents/{ID}/metadata", json={"expected_version": "exact-version", "metadata": {**METADATA, "title": "  "}})
    assert response.status_code == 200
    assert response.json()["metadata"]["title"] is None and "pages" not in response.json()
    database.update_indexed_metadata.assert_awaited_once_with(ID, "exact-version", {**METADATA, "title": None})


@pytest.mark.parametrize("changes", [
    {"title": "x" * 501}, {"document_type": "x" * 121}, {"document_number": "x" * 201},
    {"description": "x" * 10001}, {"language": "x"}, {"language": "x" * 13},
    {"cohort": {"to_year": 2026}}, {"cohort": {"from_year": 2026, "to_year": 2025}},
    {"cohort": {"from_year": 1899}}, {"cohort": {"from_year": 2026, "unexpected": True}},
    {"program_scope": {"type": "invalid", "programs": []}},
    {"program_scope": {"type": "specific_programs", "programs": []}},
    {"program_scope": {"type": "all", "programs": ["CS"]}}, {"source": {}}, {"process_status": "review"},
])
def test_update_rejects_invalid_metadata_and_server_owned_fields(changes):
    database = AsyncMock()
    response = client(database).put(f"/v1/documents/{ID}/metadata", json={"expected_version": "v1", "metadata": {**METADATA, **changes}})
    assert response.status_code == 422
    database.update_indexed_metadata.assert_not_awaited()


def test_update_requires_all_seven_fields_and_rejects_unknown_top_level_fields():
    database = AsyncMock()
    incomplete = deepcopy(METADATA)
    del incomplete["description"]
    for body in ({"expected_version": "v1", "metadata": incomplete}, {"expected_version": "v1", "metadata": METADATA, "id": ID}):
        assert client(database).put(f"/v1/documents/{ID}/metadata", json=body).status_code == 422


@pytest.mark.parametrize("state,status,message", [(None, 404, "not found"), ("review", 409, "not indexed"), ("indexed", 409, "stale"), ("unavailable", 503, "could not be saved")])
def test_update_conflicts_and_unavailability(state, status, message):
    database = AsyncMock()
    database.update_indexed_metadata.return_value = None
    database.get_document.return_value = None if state is None else {**DOCUMENT, "process_status": state}
    if state == "unavailable": database.update_indexed_metadata.side_effect = SurrealDatabaseError("offline")
    response = client(database).put(f"/v1/documents/{ID}/metadata", json={"expected_version": "v1", "metadata": METADATA})
    assert response.status_code == status and message in response.json()["detail"]
