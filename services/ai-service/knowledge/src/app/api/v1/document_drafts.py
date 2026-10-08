"""Upload and OCR draft review routes."""
from collections.abc import Mapping
from io import BytesIO
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, status
from app.api.v1.document_helpers import _as_document_result, _document_record_id_or_none
from app.api.v1.schemas.documents import ConfirmAcceptedResponse, ConfirmRequest, DocumentResultResponse, DocumentUploadAcceptedResponse
from app.config import Settings, get_settings
from app.dependencies import get_database, get_object_store
from app.infrastructure.minio import MinioObjectStore, ObjectStoreError
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/documents", tags=["document drafts"])


@router.post(
    "",
    response_model=DocumentUploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_pdf(
    file: Annotated[UploadFile, File(description="PDF source document")],
    background_tasks: BackgroundTasks,
    request: Request,
    database: Annotated[SurrealDatabase, Depends(get_database)],
    object_store: Annotated[MinioObjectStore, Depends(get_object_store)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DocumentUploadAcceptedResponse:
    """Persist a PDF, document, and service-owned OCR job."""

    signature = await file.read(5)
    if signature != b"%PDF-":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="file must be a PDF",
        )

    await file.seek(0)
    pdf_data = await file.read()
    size = len(pdf_data)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="file must not be empty",
        )

    # The service limit protects memory/disk use during multipart parsing.
    if size > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "file exceeds the "
                f"{settings.max_upload_bytes // (1024 * 1024)} MiB limit"
            ),
        )

    record_id = f"doc_{uuid4().hex}"
    job_record_id = f"job_{uuid4().hex}"
    document_id = f"document:{record_id}"
    object_key = f"documents/{record_id}/original.pdf"
    filename = Path(file.filename or "document.pdf").name
    document = {
        "source": {
            "object_key": object_key,
            "original_filename": filename,
            "mime_type": "application/pdf",
        },
        "process_status": "processing",
        "status": "active",
    }

    try:
        await object_store.put_pdf(object_key, BytesIO(pdf_data), size)
    except ObjectStoreError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="PDF storage is unavailable",
        ) from error

    try:
        job = await database.create_document_with_job(record_id, document, job_record_id)
    except SurrealDatabaseError as error:
        # A connection can fail after a durable write reaches SurrealDB. Keep
        # the source object so conservative orphan cleanup can reconcile it.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata could not be saved",
        ) from error

    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None:
        background_tasks.add_task(publisher.publish, job)
    return DocumentUploadAcceptedResponse(document_id=document_id, job_id=str(job["id"]))


@router.post("/{document_id}/confirm", response_model=ConfirmAcceptedResponse, status_code=202)
async def confirm_document(
    document_id: str,
    body: ConfirmRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    database: Annotated[SurrealDatabase, Depends(get_database)],
) -> ConfirmAcceptedResponse:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        result = await database.get_document_result(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Review could not be confirmed") from error
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document, draft = result
    requested_pages = set(body.selected_pages)
    if document.get("process_status") == "review" and draft is not None and draft.get("status") == "draft":
        pages = draft.get("pages") if isinstance(draft.get("pages"), list) else []
        known_pages = {entry.get("page") for entry in pages if isinstance(entry, Mapping)}
        edit_pages = {entry.page for entry in body.page_edits}
        if not requested_pages.issubset(known_pages) or not edit_pages.issubset(known_pages):
            raise HTTPException(status_code=422, detail="Confirmation contains an unknown page")
        edits = {entry.page: entry.reviewed_text for entry in body.page_edits}
        selected_text = [
            edits.get(int(entry["page"]), entry.get("raw_text", ""))
            for entry in pages
            if isinstance(entry, Mapping) and entry.get("page") in requested_pages
        ]
        if not any(isinstance(text, str) and text.strip() for text in selected_text):
            raise HTTPException(status_code=422, detail="At least one selected page must contain indexable text")
    try:
        job = await database.confirm_review(
            record_id, body.expected_revision, body.metadata.model_dump(mode="json"),
            [entry.model_dump() for entry in body.page_edits], sorted(requested_pages),
        )
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Review could not be confirmed") from error
    if job is None:
        raise HTTPException(status_code=409, detail="Review is stale or not ready to confirm")
    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None and job["status"] == "queued":
        background_tasks.add_task(publisher.publish, job)
    return ConfirmAcceptedResponse(document_id=f"document:{record_id}", job_id=str(job["id"]))


@router.get("/{document_id}/draft", response_model=DocumentResultResponse)
async def get_document_draft(
    document_id: str,
    database: Annotated[SurrealDatabase, Depends(get_database)],
) -> DocumentResultResponse:
    """Return completed OCR output without leaking storage internals."""

    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        result = await database.get_document_result(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document result is unavailable",
        ) from error
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document, draft = result
    if document.get("process_status") != "review" or draft is None or draft.get("status") != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="OCR result is not ready",
        )
    return _as_document_result(document, draft)


