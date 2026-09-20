"""UI polling endpoints for durable document-ingestion jobs."""

import asyncio
import re
import secrets
from collections.abc import Mapping
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.api.v1.schemas.jobs import JobStatusResponse
from app.config import get_settings
from app.dependencies import get_database
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/jobs", tags=["jobs"])
websocket_router = APIRouter(prefix="/ws/jobs", tags=["jobs"])
_JOB_RECORD_ID = re.compile(r"job_[0-9a-f]{32}")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str, database: SurrealDatabase = Depends(get_database)
) -> JobStatusResponse:
    """Return job step and progress so the UI can render ingestion status."""

    record_id = _record_id_or_none(job_id)
    if record_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    try:
        job = await database.get_job(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Job status is unavailable",
        ) from error
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    return _as_response(job)


def _as_response(job: Mapping[str, Any]) -> JobStatusResponse:
    return JobStatusResponse(
        id=str(job["id"]),
        type=job["type"],
        document_id=str(job["document_id"]),
        ocr_draft_id=(
            str(job["ocr_draft_id"]) if job.get("ocr_draft_id") is not None else None
        ),
        status=job["status"],
        step=job["step"],
        progress=job["progress"],
        total_pages=job.get("total_pages"),
        processed_pages=job["processed_pages"],
        sequence=int(job.get("sequence", 1)),
        updated_at=str(job["updated_at"])
        if job.get("updated_at") is not None
        else None,
        error=job.get("error"),
        attempts=job.get("attempts", 0),
        max_attempts=job.get("max_attempts", 3),
        next_attempt_at=(
            str(job["next_attempt_at"])
            if job.get("next_attempt_at") is not None
            else None
        ),
    )


@websocket_router.websocket("/{job_id}")
async def stream_job_status(websocket: WebSocket, job_id: str) -> None:
    """Send a durable snapshot followed by newer RabbitMQ status events."""

    settings = get_settings()
    if settings.websocket_auth_token:
        authorization = websocket.headers.get("authorization", "")
        query_token = websocket.query_params.get("access_token")
        supplied = (
            authorization.removeprefix("Bearer ")
            if authorization.startswith("Bearer ")
            else query_token
        )
        if supplied is None or not secrets.compare_digest(
            supplied, settings.websocket_auth_token
        ):
            await websocket.close(code=1008, reason="Unauthorized")
            return

    database = getattr(websocket.app.state, "database", None)
    hub = getattr(websocket.app.state, "job_status_hub", None)
    if database is None or hub is None:
        await websocket.close(code=1013, reason="Status streaming is unavailable")
        return

    record_id = _record_id_or_none(job_id)
    if record_id is None:
        await websocket.close(code=1008, reason="Job not found")
        return
    try:
        job = await database.get_job(record_id)
    except SurrealDatabaseError:
        await websocket.close(code=1013, reason="Job status is unavailable")
        return
    if job is None:
        await websocket.close(code=1008, reason="Job not found")
        return

    canonical_job_id = str(job["id"])
    await websocket.accept()
    try:
        snapshot = _as_response(job).model_dump()
        snapshot["event_type"] = "job.status_snapshot"
        snapshot["job_id"] = snapshot.pop("id")
        await hub.subscribe(canonical_job_id, websocket, snapshot)
        while True:
            try:
                # Receiving also detects a peer disconnect; clients may send pong/text.
                await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=settings.websocket_heartbeat_seconds,
                )
            except TimeoutError:
                await websocket.send_json({"event_type": "ping"})
    except (RuntimeError, WebSocketDisconnect):
        pass
    finally:
        await hub.remove(canonical_job_id, websocket)


def _record_id_or_none(job_id: str) -> str | None:
    record_id = job_id.removeprefix("job:")
    return record_id if _JOB_RECORD_ID.fullmatch(record_id) else None
