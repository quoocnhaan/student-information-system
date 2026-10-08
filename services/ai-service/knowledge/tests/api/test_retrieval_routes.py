from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_database
from app.main import create_app


def client(database):
    app = create_app()
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app)


@pytest.mark.parametrize("path,body", [
    ("search", {"query": "  "}), ("exact", {"query": "\n"}),
    ("lookup", {"document_number": " ", "article": 1}),
    ("search", {"query": "x", "mode": "hybrid"}),
    ("exact", {"query": "x", "student_context": {"cohort": 2023}}),
    ("exact", {"query": "x", "document_ids": ["document:injected"]}),
])
def test_invalid_requests_return_422_without_dependencies(path, body):
    database = AsyncMock()
    assert client(database).post(f"/v1/retrieval/{path}", json=body).status_code == 422
    database.client.query.assert_not_awaited()


@pytest.mark.parametrize("path,body", [("exact", {"query": "x"}), ("lookup", {"document_number": "QD/2021", "article": 1})])
def test_empty_matches_and_database_failure(path, body):
    database = AsyncMock()
    database.client.query.return_value = []
    response = client(database).post(f"/v1/retrieval/{path}", json=body)
    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["filters"]["admin_exploration"] is True
    database.client.query.side_effect = RuntimeError("offline")
    assert client(database).post(f"/v1/retrieval/{path}", json=body).status_code == 503


def test_embedding_failure_is_503():
    with patch("app.api.v1.retrieval.embed_texts", new=AsyncMock(side_effect=ValueError("bad vector"))):
        response = client(AsyncMock()).post("/v1/retrieval/search", json={"query": "x"})
    assert response.status_code == 503
    assert "Embedding service" in response.json()["detail"]


def test_options_advertise_only_implemented_modes_and_persisted_documents():
    database = AsyncMock()
    database.client.query.return_value = [{"id": "document:doc_" + "a" * 32, "title": "Policy", "document_number": "QD/2021"}]
    response = client(database).get("/v1/retrieval/options")
    assert response.status_code == 200
    assert response.json()["search_modes"] == ["semantic"]
    assert response.json()["documents"][0]["title"] == "Policy"
    assert [major["key"] for major in response.json()["majors"]] == ["english", "chinese", "non_language"]
