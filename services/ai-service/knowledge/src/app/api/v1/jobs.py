"""Knowledge-owned job status over HTTP and WebSocket."""

import asyncio
import re
import secrets
from collections.abc import Mapping
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, WebSocket, WebSocketDisconnect, status

from app.api.v1.schemas.jobs import JobStatusResponse
from app.config import get_settings
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/jobs", tags=["jobs"])
websocket_router = APIRouter(prefix="/ws/jobs", tags=["jobs"])
_JOB_RECORD_ID = re.compile(r"job_[0-9a-f]{32}\Z")


def _valid(job_id: str) -> bool:
    return bool(_JOB_RECORD_ID.fullmatch(job_id.removeprefix("job:")))


def _as_response(job: Mapping[str, Any]) -> JobStatusResponse:
    return JobStatusResponse(
        id=str(job["id"]), type={"ocr_pdf": "ocr", "index_document": "index", "correct_chunks": "correct_chunks", "reembed_chunk": "reembed"}.get(job["type"], str(job["type"])),
        document_id=str(job["document_id"]),
        followup_job_ids=[str(value) for value in job.get("followup_job_ids", [])],
        status=job["status"], step=job["step"], progress=job["progress"],
        version=job.get("version", 1),
        updated_at=str(job["updated_at"]) if job.get("updated_at") else None,
        error=job.get("error"),
        retry_available=job.get("type") == "index_document" and job.get("status") == "failed" and bool(job.get("payload", {}).get("index_input_id")),
    )


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, request: Request) -> JobStatusResponse:
    if not _valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Job status is unavailable")
    try:
        row = await database.get_job(job_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Job status is unavailable") from error
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _as_response(row)


@router.post("/{job_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_failed_index_job(job_id: str, background_tasks: BackgroundTasks, request: Request) -> dict[str, str]:
    """Operator retry for a failed index job whose confirmed input is retained."""

    if not _valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Job status is unavailable")
    try:
        job = await database.requeue_failed_index_job(job_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Job could not be retried") from error
    if job is None:
        raise HTTPException(status_code=409, detail="Only a failed index job with retained input can be retried")
    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None:
        background_tasks.add_task(publisher.publish, job)
    return {"job_id": str(job["id"])}


@websocket_router.websocket("/{job_id}")
async def stream_job_status(websocket: WebSocket, job_id: str) -> None:
    settings = get_settings()
    if settings.websocket_auth_token:
        authorization = websocket.headers.get("authorization", "")
        supplied = authorization.removeprefix("Bearer ") if authorization.startswith("Bearer ") else websocket.query_params.get("access_token")
        if supplied is None or not secrets.compare_digest(supplied, settings.websocket_auth_token):
            await websocket.close(code=1008, reason="Unauthorized")
            return
    if not _valid(job_id):
        await websocket.close(code=1008, reason="Job not found")
        return

    database = SurrealDatabase(settings)
    query_id = None
    try:
        await database.connect()
        query_id, events = await database.subscribe_jobs()
        row = await database.get_job(job_id)
        if row is None:
            await websocket.close(code=1008, reason="Job not found")
            return
        job_id = str(row["id"])
        await websocket.accept()
        snapshot = _as_response(row).model_dump()
        await websocket.send_json({"event_type": "job.status_snapshot", **snapshot, "job_id": snapshot["id"]})
        last_version = int(row.get("version", 1))

        async def forward() -> None:
            nonlocal last_version
            async for event in events:
                changed = event.get("result", event) if isinstance(event, dict) else None
                if not isinstance(changed, dict) or str(changed.get("id")) != job_id:
                    continue
                current = await database.get_job(job_id)
                if current is None or int(current.get("version", 0)) <= last_version:
                    continue
                last_version = int(current["version"])
                response = _as_response(current).model_dump()
                await websocket.send_json({"event_type": "job.status_changed", **response, "job_id": response["id"]})

        async def heartbeat() -> None:
            while True:
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=settings.websocket_heartbeat_seconds)
                except TimeoutError:
                    await websocket.send_json({"event_type": "ping"})

        tasks = (asyncio.create_task(forward()), asyncio.create_task(heartbeat()))
        try:
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
    except asyncio.CancelledError:
        # A client closing a TestClient/browser socket can cancel this handler
        # while the heartbeat receive is pending. Cleanup still runs below; a
        # normal disconnect must not turn into a cancelled server task.
        pass
    except (SurrealDatabaseError, OSError, RuntimeError, WebSocketDisconnect):
        try:
            await websocket.close(code=1013, reason="Job status unavailable")
        except RuntimeError:
            pass
    finally:
        if query_id is not None:
            try:
                await database.client.kill(query_id)
            except Exception:
                pass
        await database.close()
