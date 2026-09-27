"""HTTP and WebSocket interface to the central job database."""

import asyncio
import re
import secrets
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request, WebSocket, status
from pydantic import BaseModel, Field

from job_service.config import Settings, get_settings
from job_service.publisher import JobPublisher
from job_service.store import JobStore, snapshot

_KEY = re.compile(r"[A-Za-z0-9_.:-]{1,128}\Z")


class CreateJob(BaseModel):
    owner: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")
    type: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    subject_id: str = Field(min_length=1, max_length=160)
    creation_key: str = Field(min_length=1, max_length=128)


class ClaimJob(BaseModel):
    claim_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    owner: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")
    type: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")


class ProgressJob(BaseModel):
    claim_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    step: str = Field(min_length=1, max_length=80)
    progress: int = Field(ge=0, le=99)
    total_pages: int | None = Field(default=None, ge=1)
    processed_pages: int = Field(default=0, ge=0)


class FinishJob(BaseModel):
    claim_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    result_ref: str | None = Field(default=None, min_length=1, max_length=160)


class FailJob(BaseModel):
    claim_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    error: str = Field(min_length=1, max_length=500)


def _bearer(authorization: str | None, token: str) -> bool:
    return bool(token and authorization and authorization.startswith("Bearer ") and secrets.compare_digest(authorization[7:], token))


def _worker(request: Request, authorization: Annotated[str | None, Header()] = None) -> None:
    if not _bearer(authorization, request.app.state.settings.worker_token):
        raise HTTPException(status_code=401, detail="Worker authentication required")


async def _owner(request: Request, owner: str, authorization: str | None) -> None:
    token = request.app.state.settings.owner_tokens.get(owner)
    if not token or not _bearer(authorization, token):
        raise HTTPException(status_code=401, detail="Owner authentication required")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    store = JobStore(settings)
    await store.connect()
    await store.apply_schema()
    publisher = JobPublisher(store, settings)
    app.state.store = store
    app.state.publisher = publisher
    app.state.settings = settings
    publisher.start()
    try:
        yield
    finally:
        await publisher.close()
        await store.close()


app = FastAPI(title="Job Service", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
async def ready(request: Request) -> dict:
    if not await request.app.state.store.ready():
        raise HTTPException(status_code=503, detail="Job database unavailable")
    return {"status": "ok"}


@app.post("/internal/v1/jobs", status_code=201)
async def create_job(body: CreateJob, request: Request, background: BackgroundTasks, authorization: Annotated[str | None, Header()] = None) -> dict:
    await _owner(request, body.owner, authorization)
    if (body.owner, body.type) not in request.app.state.settings.allowed_types or not _KEY.fullmatch(body.creation_key):
        raise HTTPException(status_code=422, detail="Unregistered job type or invalid creation key")
    try:
        row = await request.app.state.store.create(body.owner, body.type, body.subject_id, body.creation_key)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    background.add_task(request.app.state.publisher.publish, row)
    return snapshot(row)


@app.get("/v1/jobs/{job_id}")
async def get_job(job_id: str, request: Request) -> dict:
    row = await request.app.state.store.get(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return snapshot(row)


@app.get("/internal/v1/jobs/by-creation/{owner}/{creation_key}")
async def find_by_creation(owner: str, creation_key: str, request: Request, authorization: Annotated[str | None, Header()] = None) -> dict:
    await _owner(request, owner, authorization)
    row = await request.app.state.store.find_creation(owner, creation_key)
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return snapshot(row)


@app.post("/internal/v1/jobs/{job_id}/claim")
async def claim(job_id: str, body: ClaimJob, request: Request, _: Annotated[None, Depends(_worker)]) -> dict:
    if (body.owner, body.type) not in request.app.state.settings.allowed_types:
        raise HTTPException(status_code=409, detail="Job type disabled")
    row = await request.app.state.store.claim(job_id, body.claim_id, body.owner, body.type)
    if row is None:
        raise HTTPException(status_code=409, detail="Job not claimable")
    return {**snapshot(row), "claim_id": body.claim_id}


@app.get("/internal/v1/jobs/{job_id}/claims/{claim_id}")
async def verify_claim(job_id: str, claim_id: str, request: Request, authorization: Annotated[str | None, Header()] = None) -> dict:
    row = await request.app.state.store.get(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    await _owner(request, row["owner"], authorization)
    if row["claim_id"] != claim_id or row["status"] != "running":
        raise HTTPException(status_code=409, detail="Claim is not active")
    return snapshot(row)


@app.patch("/internal/v1/jobs/{job_id}/progress")
async def progress(job_id: str, body: ProgressJob, request: Request, _: Annotated[None, Depends(_worker)]) -> dict:
    previous = await request.app.state.store.get(job_id)
    if previous is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if body.total_pages is not None and body.processed_pages > body.total_pages:
        raise HTTPException(status_code=422, detail="Invalid page counts")
    if body.processed_pages < previous.get("processed_pages", 0):
        raise HTTPException(status_code=422, detail="Progress cannot decrease")
    if body.progress < previous.get("progress", 0):
        raise HTTPException(status_code=422, detail="Progress cannot decrease")
    row = await request.app.state.store.progress(job_id, body.claim_id, body.model_dump(exclude={"claim_id"}))
    if row is None:
        raise HTTPException(status_code=409, detail="Claim or progress conflict")
    return snapshot(row)


@app.post("/internal/v1/jobs/{job_id}/complete")
async def complete(job_id: str, body: FinishJob, request: Request, _: Annotated[None, Depends(_worker)]) -> dict:
    row = await request.app.state.store.finish(job_id, body.claim_id, result_ref=body.result_ref)
    if row is None:
        raise HTTPException(status_code=409, detail="Claim or terminal state conflict")
    return snapshot(row)


@app.post("/internal/v1/jobs/{job_id}/fail")
async def fail(job_id: str, body: FailJob, request: Request, _: Annotated[None, Depends(_worker)]) -> dict:
    row = await request.app.state.store.finish(job_id, body.claim_id, error=body.error)
    if row is None:
        raise HTTPException(status_code=409, detail="Claim or terminal state conflict")
    return snapshot(row)


@app.websocket("/v1/ws/jobs/{job_id}")
async def stream_job(websocket: WebSocket, job_id: str) -> None:
    store = JobStore(websocket.app.state.settings)
    query_id = None
    try:
        await store.connect()
        query_id, events = await store.subscribe()
        row = await store.get(job_id)
        if row is None:
            await websocket.close(code=1008, reason="Job not found")
            return
        job_id = str(row["id"])
        await websocket.accept()
        await websocket.send_json({"event_type": "job.status_snapshot", **snapshot(row), "job_id": str(row["id"])})
        last_sequence = int(row.get("sequence", 1))
        async for event in events:
            changed = event.get("result", event) if isinstance(event, dict) else None
            changed_id = str(changed.get("id")) if isinstance(changed, dict) and changed.get("id") else None
            if changed_id is not None and changed_id != job_id:
                continue
            row = await store.get(job_id)
            if row is None or int(row.get("sequence", 0)) <= last_sequence:
                continue
            last_sequence = int(row["sequence"])
            await websocket.send_json({"event_type": "job.status_changed", **snapshot(row), "job_id": str(row["id"])})
    except Exception:
        try:
            await websocket.close(code=1013, reason="Job status unavailable")
        except RuntimeError:
            pass
    finally:
        if query_id is not None:
            try:
                await store.client.kill(query_id)
            except Exception:
                pass
        await store.close()
