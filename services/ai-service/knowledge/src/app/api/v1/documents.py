"""Document ingestion and review endpoints."""

import re
from collections.abc import Mapping
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.api.v1.document_helpers import _document_record_id_or_none
from app.api.v1.schemas.documents import MetadataOptionsResponse
from app.dependencies import get_database, get_object_store
from app.domain.document import MAJOR_OPTIONS, ProgramScopeType
from app.infrastructure.minio import MinioObjectStore, ObjectStoreError
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/metadata-options", response_model=MetadataOptionsResponse)
async def metadata_options() -> dict:
    return {"program_scope_types": [value.value for value in ProgramScopeType], "majors": list(MAJOR_OPTIONS)}


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
