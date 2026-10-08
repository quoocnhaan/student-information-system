"""Bounded, shared retrieval contracts. Offsets count Unicode code points."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.document import MAJOR_KEYS

DOCUMENT_ID_PATTERN = r"^(document:)?doc_[0-9a-f]{32}$"


class StudentContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cohort: int = Field(ge=1900, le=9999, strict=True)
    major: str

    @field_validator("major")
    @classmethod
    def normalize_major(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in MAJOR_KEYS:
            raise ValueError("Unknown student major")
        return value


class RetrievalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    student_context: StudentContext | None = None


class FilteredRequest(RetrievalRequest):
    document_ids: list[str] | None = Field(default=None, max_length=100)

    @field_validator("document_ids")
    @classmethod
    def validate_ids(cls, values: list[str] | None) -> list[str] | None:
        import re
        if values is not None and any(not re.fullmatch(DOCUMENT_ID_PATTERN, value) for value in values):
            raise ValueError("Invalid document ID")
        return list(dict.fromkeys(values)) if values is not None else None


class QueryRequest(FilteredRequest):
    query: str = Field(min_length=1, max_length=4000)

    @field_validator("query")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Query must not be blank")
        return value  # Exact lookup preserves submitted whitespace.


class SearchRequest(QueryRequest):
    mode: Literal["semantic"] = "semantic"
    limit: int = Field(default=10, ge=1, le=100, strict=True)


class ExactRequest(QueryRequest):
    case_sensitive: bool = False
    page: int = Field(default=1, ge=1, le=1_000_000, strict=True)
    page_size: int = Field(default=20, ge=1, le=100, strict=True)


class LookupRequest(RetrievalRequest):
    document_number: str = Field(min_length=1, max_length=200)
    article: int = Field(ge=1, le=1_000_000, strict=True)
    clause: int | None = Field(default=None, ge=1, le=1_000_000, strict=True)
    document_id: str | None = Field(default=None, pattern=DOCUMENT_ID_PATTERN)
    page: int = Field(default=1, ge=1, le=1_000_000, strict=True)
    page_size: int = Field(default=20, ge=1, le=100, strict=True)

    @field_validator("document_number")
    @classmethod
    def normalize_number(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Document number must not be blank")
        return value


class Occurrence(BaseModel):
    start: int
    end: int


class RetrievalMatch(BaseModel):
    chunk_id: str
    text: str
    document_id: str
    title: str | None
    document_number: str | None
    cohort: dict[str, Any] | None
    program_scope: dict[str, Any] | None
    hierarchy: dict[str, Any]
    page_start: int
    page_end: int
    chunk_index: int
    embedding_status: str
    source_url: str
    rank: int | None = None
    scores: dict[str, float] = Field(default_factory=dict)
    occurrences: list[Occurrence] = Field(default_factory=list)


class RetrievalResponse(BaseModel):
    items: list[RetrievalMatch]
    filters: dict[str, Any]
    total: int
    page: int | None = None
    page_size: int | None = None
    groups: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class RetrievalOptionsResponse(BaseModel):
    modes: list[str]
    search_modes: list[str]
    majors: list[dict[str, str]]
    defaults: dict[str, Any]
    limits: dict[str, int]
    documents: list[dict[str, Any]]
    boundaries: list[str]
