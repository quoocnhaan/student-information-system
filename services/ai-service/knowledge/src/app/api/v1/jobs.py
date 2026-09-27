"""Compatibility routes over central job-service status."""

import asyncio
import json
import re
import secrets
from collections.abc import Mapping
from typing import Any

import websockets
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from app.api.v1.schemas.jobs import JobStatusResponse
from app.config import get_settings
from app.infrastructure.job_service import JobServiceError

router = APIRouter(prefix="/jobs", tags=["jobs"])
websocket_router = APIRouter(prefix="/ws/jobs", tags=["jobs"])
_JOB_RECORD_ID = re.compile(r"job_[0-9a-f]{32}\Z")


def _valid(job_id: str) -> bool:
    return bool(_JOB_RECORD_ID.fullmatch(job_id.removeprefix("job:")))


def _as_response(job: Mapping[str, Any]) -> JobStatusResponse:
    return JobStatusResponse(
        id=str(job["id"]), type="ocr" if job["type"] == "ocr_pdf" else str(job["type"]),
        document_id=str(job["subject_id"]), ocr_draft_id=job.get("result_ref"),
        status=job["status"], step=job["step"], progress=job["progress"],
        total_pages=job.get("total_pages"), processed_pages=job.get("processed_pages", 0),
        sequence=job.get("sequence", 1), updated_at=job.get("updated_at"), error=job.get("error"),
    )


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, request: Request) -> JobStatusResponse:
    if not _valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    try:
        job = await request.app.state.job_client.get(job_id)
    except JobServiceError as error:
        raise HTTPException(status_code=503, detail="Job status is unavailable") from error
    if job is None or job.get("owner") != "knowledge":
        raise HTTPException(status_code=404, detail="Job not found")
    return _as_response(job)


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
    client = websocket.app.state.job_client
    try:
        row = await client.get(job_id)
        if row is None or row.get("owner") != "knowledge":
            await websocket.close(code=1008, reason="Job not found")
            return
        url = client.base_url.replace("https://", "wss://").replace("http://", "ws://")
        async with websockets.connect(f"{url}/v1/ws/jobs/{job_id}") as upstream:
            await websocket.accept()

            async def forward() -> None:
                async for payload in upstream:
                    event = json.loads(payload)
                    if event.get("owner") != "knowledge":
                        continue
                    public = _as_response(event).model_dump()
                    public["event_type"] = event["event_type"]
                    public["job_id"] = public.pop("id")
                    await websocket.send_json(public)

            async def receive() -> None:
                while True:
                    try:
                        await asyncio.wait_for(websocket.receive_text(), timeout=settings.websocket_heartbeat_seconds)
                    except TimeoutError:
                        await websocket.send_json({"event_type": "ping"})

            tasks = (asyncio.create_task(forward()), asyncio.create_task(receive()))
            try:
                await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            finally:
                for task in tasks:
                    task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
    except (JobServiceError, OSError, websockets.WebSocketException, RuntimeError, WebSocketDisconnect):
        try:
            await websocket.close(code=1013, reason="Job status unavailable")
        except RuntimeError:
            pass
