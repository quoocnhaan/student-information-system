"""Authenticated OCR input and result callbacks from the shared worker."""

import re
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.application.document_metadata import DocumentMetadataDetector
from app.config import Settings, get_settings
from app.domain.document import OcrPage
from app.infrastructure.job_service import JobServiceError
from app.infrastructure.minio import ObjectStoreError
from app.infrastructure.surreal import SurrealDatabaseError

router = APIRouter(prefix="/internal/v1/knowledge/jobs", tags=["internal-knowledge-jobs"])
_DOCUMENT_ID = re.compile(r"document:doc_[0-9a-f]{32}\Z")
_JOB_ID = re.compile(r"job:job_[0-9a-f]{32}\Z")


class Page(BaseModel):
    page: int = Field(ge=1)
    raw_text: str = Field(min_length=1, max_length=500_000)


class ResultBody(BaseModel):
    claim_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    pages: list[Page] = Field(min_length=1, max_length=1000)


class FailBody(BaseModel):
    claim_id: str = Field(pattern=r"^[0-9a-f]{32}$")


def _worker_auth(settings: Annotated[Settings, Depends(get_settings)], authorization: Annotated[str | None, Header()] = None) -> None:
    token = settings.worker_callback_token
    if not token or not authorization or not authorization.startswith("Bearer ") or not secrets.compare_digest(authorization[7:], token):
        raise HTTPException(status_code=401, detail="Worker authentication required")


async def _claimed(request: Request, job_id: str, claim_id: str) -> dict:
    if not _JOB_ID.fullmatch(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    try:
        claim = await request.app.state.job_client.verify(job_id, claim_id)
    except JobServiceError as error:
        raise HTTPException(status_code=error.status_code or 503, detail=str(error)) from error
    if not _DOCUMENT_ID.fullmatch(str(claim.get("subject_id", ""))):
        raise HTTPException(status_code=409, detail="Job has invalid Knowledge document")
    return claim


@router.get("/{job_id}/source", dependencies=[Depends(_worker_auth)])
async def source(job_id: str, claim_id: str, request: Request) -> Response:
    claim = await _claimed(request, job_id, claim_id)
    document_id = claim["subject_id"].split(":", 1)[1]
    database = request.app.state.database
    document = await database.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Source document not found")
    try:
        size = await request.app.state.object_store.get_size(document["source"]["object_key"])
        if size > request.app.state.settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="Source exceeds upload limit")
        data = await request.app.state.object_store.get_bytes(document["source"]["object_key"])
    except (ObjectStoreError, KeyError) as error:
        raise HTTPException(status_code=503, detail="Source unavailable") from error
    return Response(content=data, media_type="application/pdf")


@router.post("/{job_id}/result", dependencies=[Depends(_worker_auth)])
async def result(job_id: str, body: ResultBody, request: Request) -> dict:
    claim = await _claimed(request, job_id, body.claim_id)
    settings: Settings = request.app.state.settings
    if len(body.pages) > settings.ocr_max_pages or [page.page for page in body.pages] != list(range(1, len(body.pages) + 1)):
        raise HTTPException(status_code=422, detail="OCR pages must be consecutive and within the limit")
    document_id = claim["subject_id"].split(":", 1)[1]
    database = request.app.state.database
    document = await database.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    draft_id = f"ocr_{job_id.split(':', 1)[1]}"
    pages = [OcrPage(page=item.page, raw_text=item.raw_text) for item in body.pages]
    try:
        metadata = DocumentMetadataDetector().detect(pages, document["source"]["original_filename"])
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail="OCR result is invalid") from error
    try:
        stored = await database.apply_ocr_result(document_id, draft_id, [page.model_dump() for page in pages], metadata)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="OCR result could not be saved") from error
    return {"ocr_draft_id": stored}


@router.post("/{job_id}/fail", dependencies=[Depends(_worker_auth)])
async def fail(job_id: str, body: FailBody, request: Request) -> dict:
    claim = await _claimed(request, job_id, body.claim_id)
    document_id = claim["subject_id"].split(":", 1)[1]
    if not await request.app.state.database.fail_processing_document(document_id):
        raise HTTPException(status_code=409, detail="Document is not processing")
    return {"status": "failed"}
