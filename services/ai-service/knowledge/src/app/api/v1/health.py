"""Operational endpoints."""

from typing import Literal

from fastapi import APIRouter
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
async def ready() -> ServiceStatus:
    """Report whether the module can accept traffic.

    Dependency checks are added when the vector and source stores are chosen.
    """

    return ServiceStatus(status="ok", service="knowledge-service")
