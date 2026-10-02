"""Knowledge-owned job status over HTTP and WebSocket."""

import asyncio
import re
import secrets
from collections.abc import Mapping
from typing import Any

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

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
        id=str(job["id"]), type={"ocr_pdf": "ocr", "correct_ocr": "correct", "index_document": "index", "correct_chunks": "correct_chunks", "reembed_chunk": "reembed"}.get(job["type"], str(job["type"])),
        document_id=str(job["document_id"]),
        ocr_draft_id=str(job["ocr_draft_id"]) if job.get("ocr_draft_id") else None,
        next_job_id=str(job["next_job_id"]) if job.get("next_job_id") else None,
        status=job["status"], step=job["step"], progress=job["progress"],
        total_pages=job.get("total_pages"), processed_pages=job.get("processed_pages", 0),
        sequence=job.get("sequence", 1),
        updated_at=str(job["updated_at"]) if job.get("updated_at") else None,
        error=job.get("error"),
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
        last_sequence = int(row.get("sequence", 1))

        async def forward() -> None:
            nonlocal last_sequence
            async for event in events:
                changed = event.get("result", event) if isinstance(event, dict) else None
                if not isinstance(changed, dict) or str(changed.get("id")) != job_id:
                    continue
                current = await database.get_job(job_id)
                if current is None or int(current.get("sequence", 0)) <= last_sequence:
                    continue
                last_sequence = int(current["sequence"])
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
