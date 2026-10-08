"""Public document-library contracts and validation."""

from fastapi.testclient import TestClient
import pytest

from app.dependencies import get_database
from app.infrastructure.surreal import SurrealDatabaseError
from app.main import create_app


class LibraryDatabase:
    def __init__(self):
        self.parameters = None
        self.fail = False

    async def list_indexed_documents(self, **parameters):
        self.parameters = parameters
        if self.fail:
            raise SurrealDatabaseError("offline")
        return {
            "items": [{"document_id": "document:doc_" + "a" * 32,
                       "title": "Rules", "original_filename": "rules.pdf",
                       "created_at": "2026-10-06T00:00:00Z",
                       "object_key": "private/source.pdf"}],
            "total": 1, "page": parameters["page"], "page_size": parameters["page_size"],
            "document_types": ["Policy"], "languages": ["en"],
        }


def client_and_database():
    app = create_app()
    database = LibraryDatabase()
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app), database


def test_list_accepts_filters_and_returns_only_public_fields():
    client, database = client_and_database()
    response = client.get("/v1/documents", params={
        "q": " rules ", "document_type": "Policy", "language": "en",
        "page": 2, "page_size": 10,
    })
    assert response.status_code == 200
    assert database.parameters == {
        "q": "rules", "document_type": "Policy", "language": "en",
        "page": 2, "page_size": 10,
    }
    body = response.json()
    assert body["items"][0]["original_filename"] == "rules.pdf"
    assert "object_key" not in body["items"][0]
    assert body["document_types"] == ["Policy"]
    assert body["languages"] == ["en"]


@pytest.mark.parametrize("parameters", [
    {"page": 0}, {"page_size": 0}, {"page_size": 101}, {"q": "a" * 501},
])
def test_list_rejects_invalid_pagination_and_search(parameters):
    client, database = client_and_database()
    assert client.get("/v1/documents", params=parameters).status_code == 422
    assert database.parameters is None


def test_list_reports_database_unavailability():
    client, database = client_and_database()
    database.fail = True
    response = client.get("/v1/documents")
    assert response.status_code == 503
    assert response.json()["detail"] == "Document library is unavailable"
