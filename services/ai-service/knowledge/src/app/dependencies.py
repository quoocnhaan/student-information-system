"""Dependency wiring for HTTP handlers."""

from fastapi import HTTPException, Request, status

from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.surreal import SurrealDatabase


def get_database(request: Request) -> SurrealDatabase:
    """Return the configured database or a clear service-unavailable response."""

    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge database is not configured",
        )
    return database


def get_object_store(request: Request) -> MinioObjectStore:
    """Return the configured object store."""

    return request.app.state.object_store

