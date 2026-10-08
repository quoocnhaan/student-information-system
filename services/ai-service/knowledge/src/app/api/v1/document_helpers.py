import re
from collections.abc import Mapping
from typing import Any
from fastapi import HTTPException, status
from app.api.v1.schemas.documents import DocumentResultResponse, DocumentMetadataResponse, SourceSummary, OcrDraftResponse, OcrPageResponse

_DOCUMENT_RECORD_ID = re.compile(r"doc_[0-9a-f]{32}")

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


def indexed_header(document):
    return {
        "document_id": str(document["id"]), "process_status": document["process_status"],
        "source": {key: document["source"][key] for key in ("original_filename", "mime_type")},
        "page_count": document.get("page_count"), "created_at": str(document["created_at"]),
        "updated_at": str(document["updated_at"]), "version": document["metadata_version"],
        "metadata": {key: document.get(key) for key in
                     ("title", "document_type", "document_number", "description", "cohort", "program_scope", "language")},
    }


def indexed_pages(chunks):
    pages = {}
    for chunk in chunks:
        position = chunk["position"]
        pages.setdefault(int(position["page_start"]), []).append({
            "id": str(chunk["id"]), "text": chunk["text"], "hierarchy": chunk["hierarchy"],
            "chunk_index": position["chunk_index"], "page_start": position["page_start"], "page_end": position["page_end"],
            "embedding_status": chunk["embedding_status"], "updated_at": str(chunk["updated_at"]),
            "active_job_id": str(chunk["active_job_id"]) if chunk.get("active_job_id") else None,
            "last_embedding_job_id": str(chunk["last_embedding_job_id"]) if chunk.get("last_embedding_job_id") else None,
            "correction": chunk.get("correction"),
        })
    return [{"page": page, "chunks": items} for page, items in sorted(pages.items())]
