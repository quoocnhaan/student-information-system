"""Document ingestion and review endpoints."""

import re
from collections.abc import Mapping
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.v1.schemas.documents import (
    DocumentMetadataResponse,
    DocumentResultResponse,
    DocumentUploadAcceptedResponse,
    OcrDraftResponse,
    OcrPageResponse,
    ReviewDraftUpdateRequest,
    SourceSummary,
)
from app.config import Settings, get_settings
from app.dependencies import get_database, get_object_store
from app.infrastructure.minio import MinioObjectStore, ObjectStoreError
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/documents", tags=["documents"])
_DOCUMENT_RECORD_ID = re.compile(r"doc_[0-9a-f]{32}")


@router.post(
    "",
    response_model=DocumentUploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_pdf(
    file: Annotated[UploadFile, File(description="PDF source document")],
    database: Annotated[SurrealDatabase, Depends(get_database)],
    object_store: Annotated[MinioObjectStore, Depends(get_object_store)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DocumentUploadAcceptedResponse:
    """Persist a PDF and durable OCR job for the database-driven dispatcher."""

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
    job_id = f"job:{job_record_id}"
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
        await database.create_document_with_job(
            record_id,
            document,
            job_record_id,
            job_type="ocr",
        )
    except SurrealDatabaseError as error:
        # A connection can fail after COMMIT reaches the database. Keep the
        # source object so an ambiguously committed durable job is still valid.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata could not be saved",
        ) from error

    return DocumentUploadAcceptedResponse(document_id=document_id, job_id=job_id)


@router.get("/{document_id}/result", response_model=DocumentResultResponse)
async def get_document_result(
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
    if document.get("process_status") != "review" or draft is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="OCR result is not ready",
        )
    return _as_document_result(document, draft)


@router.patch("/{document_id}/review-draft", response_model=DocumentResultResponse)
async def update_review_draft(
    document_id: str,
    update: ReviewDraftUpdateRequest,
    database: Annotated[SurrealDatabase, Depends(get_database)],
) -> DocumentResultResponse:
    """Persist reviewer metadata and page corrections as one guarded draft save."""

    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        current = await database.get_document_result(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document review is unavailable",
        ) from error
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document, draft = current
    if (
        document.get("process_status") != "review"
        or draft is None
        or draft.get("status") != "draft"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document review is not editable",
        )
    existing_page_numbers = {
        page.get("page") for page in draft.get("pages", []) if isinstance(page, Mapping)
    }
    requested_page_numbers = {entry.page for entry in update.pages}
    if not requested_page_numbers.issubset(existing_page_numbers):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Review update contains an unknown page",
        )

    try:
        saved = await database.update_document_review(
            record_id,
            update.expected_revision,
            update.metadata.model_dump(mode="json"),
            [entry.model_dump() for entry in update.pages],
        )
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document review could not be saved",
        ) from error
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This review draft has changed. Reload the latest version.",
        )

    try:
        refreshed = await database.get_document_result(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document review was saved but could not be reloaded",
        ) from error
    if refreshed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    refreshed_document, refreshed_draft = refreshed
    if refreshed_draft is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document review is not editable",
        )
    return _as_document_result(refreshed_document, refreshed_draft)


@router.get("/{document_id}/source")
async def stream_document_source(
    document_id: str,
    request: Request,
    database: Annotated[SurrealDatabase, Depends(get_database)],
    object_store: Annotated[MinioObjectStore, Depends(get_object_store)],
) -> StreamingResponse:
    """Stream the private source PDF with single-range support for PDF viewers."""

    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        document = await database.get_document(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document source is unavailable",
        ) from error
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    source = document.get("source")
    if not isinstance(source, Mapping) or not isinstance(source.get("object_key"), str):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document source not found")
    object_key = source["object_key"]
    try:
        size = await object_store.get_size(object_key)
    except ObjectStoreError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document source is unavailable",
        ) from error
    if size < 1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document source not found")

    start, end = _source_range_or_error(request.headers.get("range"), size)
    length = end - start + 1
    filename = _safe_attachment_filename(str(source.get("original_filename", "document.pdf")))
    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Length": str(length),
    }
    response_status = status.HTTP_200_OK
    if request.headers.get("range") is not None:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        response_status = status.HTTP_206_PARTIAL_CONTENT
    return StreamingResponse(
        object_store.iter_pdf_range(object_key, start, length),
        status_code=response_status,
        media_type="application/pdf",
        headers=headers,
    )


def _as_document_result(
    document: Mapping[str, Any], draft: Mapping[str, Any]
) -> DocumentResultResponse:
    source = document.get("source")
    if not isinstance(source, Mapping):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document source not found")
    pages = draft.get("pages")
    if not isinstance(pages, list):
        pages = []
    metadata = {
        field: document.get(field)
        for field in (
            "title",
            "document_type",
            "document_number",
            "description",
            "cohort",
            "program_scope",
            "language",
        )
    }
    return DocumentResultResponse(
        document_id=str(document["id"]),
        process_status=str(document["process_status"]),
        source=SourceSummary(
            original_filename=str(source.get("original_filename", "document.pdf")),
            mime_type=str(source.get("mime_type", "application/pdf")),
        ),
        page_count=document.get("page_count"),
        metadata=DocumentMetadataResponse(**metadata),
        ocr_draft=OcrDraftResponse(
            id=str(draft["id"]),
            status=str(draft["status"]),
            revision=int(draft.get("revision", 1)),
            pages=[OcrPageResponse.model_validate(page) for page in pages],
        ),
    )


def _document_record_id_or_none(document_id: str) -> str | None:
    record_id = document_id.removeprefix("document:")
    return record_id if _DOCUMENT_RECORD_ID.fullmatch(record_id) else None


def _source_range_or_error(range_header: str | None, size: int) -> tuple[int, int]:
    if range_header is None:
        return 0, size - 1
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
    if match is None or (not match.group(1) and not match.group(2)):
        raise HTTPException(
            status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
            detail="Invalid PDF byte range",
            headers={"Content-Range": f"bytes */{size}"},
        )
    start_text, end_text = match.groups()
    if start_text:
        start = int(start_text)
        end = int(end_text) if end_text else size - 1
        if start >= size or end < start:
            raise HTTPException(
                status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
                detail="PDF byte range is not satisfiable",
                headers={"Content-Range": f"bytes */{size}"},
            )
        return start, min(end, size - 1)
    suffix_length = int(end_text)
    if suffix_length < 1:
        raise HTTPException(
            status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
            detail="PDF byte range is not satisfiable",
            headers={"Content-Range": f"bytes */{size}"},
        )
    return max(size - suffix_length, 0), size - 1


def _safe_attachment_filename(filename: str) -> str:
    """Prevent header injection while retaining a useful inline PDF filename."""

    sanitized = re.sub(r"[\r\n\"\\\\]", "_", Path(filename).name).strip()
    return sanitized or "document.pdf"
