"""Operational endpoints."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel


class ServiceStatus(BaseModel):
    status: Literal["ok"]
    service: Literal["knowledge-service"]


router = APIRouter(tags=["operations"])


@router.get("/health", response_model=ServiceStatus)
async def health() -> ServiceStatus:
    """Report whether the process is running."""

    return ServiceStatus(status="ok", service="knowledge-service")


@router.get("/ready", response_model=ServiceStatus)
async def ready(request: Request) -> ServiceStatus:
    """Report whether durable storage and configured messaging are reachable."""

    database = getattr(request.app.state, "database", None)
    object_store = getattr(request.app.state, "object_store", None)
    settings = request.app.state.settings
    database_ready = not settings.surreal_enabled or (
        database is not None and await database.is_ready()
    )
    object_store_ready = object_store is not None and await object_store.is_ready()
    broker = getattr(request.app.state, "rabbitmq", None)
    broker_ready = not settings.rabbitmq_enabled or (
        broker is not None and not broker.is_closed
    )
    if not (database_ready and object_store_ready and broker_ready):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge service dependencies are not ready",
        )

    return ServiceStatus(status="ok", service="knowledge-service")
