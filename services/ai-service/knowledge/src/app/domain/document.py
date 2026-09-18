"""Domain models and invariants for knowledge documents and their content."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProgramScopeType(StrEnum):
    ALL = "all"
    NON_LANGUAGE_MAJOR = "non_language_major"
    LANGUAGE_MAJOR = "language_major"
    SPECIFIC_PROGRAMS = "specific_programs"


class DocumentProcessStatus(StrEnum):
    PROCESSING = "processing"
    REVIEW = "review"
    INDEXED = "indexed"
    BLOCKED = "blocked"


class RecordStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class OcrDraftStatus(StrEnum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"


class Cohort(BaseModel):
    from_year: int = Field(ge=1900, le=9999)
    to_year: int | None = Field(default=None, ge=1900, le=9999)

    @model_validator(mode="after")
    def validate_range(self) -> "Cohort":
        if self.to_year is not None and self.to_year < self.from_year:
            raise ValueError("to_year must be greater than or equal to from_year")
        return self


class ProgramScope(BaseModel):
    type: ProgramScopeType
    programs: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_programs(self) -> "ProgramScope":
        if self.type is ProgramScopeType.SPECIFIC_PROGRAMS and not self.programs:
            raise ValueError("specific_programs requires at least one program")
        if self.type is not ProgramScopeType.SPECIFIC_PROGRAMS and self.programs:
            raise ValueError("programs is only allowed for specific_programs")
        return self


class DocumentSource(BaseModel):
    object_key: str = Field(min_length=1)
    original_filename: str = Field(min_length=1)
    mime_type: str = Field(min_length=1)


class DocumentRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str | None = Field(default=None, min_length=1)
    document_type: str | None = Field(default=None, min_length=1)
    document_number: str | None = None
    description: str | None = None
    cohort: Cohort | None = None
    program_scope: ProgramScope | None = None
    language: str | None = Field(default=None, min_length=2, max_length=12)
    source: DocumentSource
    process_status: DocumentProcessStatus
    page_count: int | None = Field(default=None, ge=1)
    status: RecordStatus
    created_at: datetime
    updated_at: datetime


class OcrPage(BaseModel):
    page: int = Field(ge=1)
    raw_text: str
    reviewed_text: str | None = None


class OcrDraftRecord(BaseModel):
    id: str
    document_id: str
    status: OcrDraftStatus
    pages: list[OcrPage] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ChunkPosition(BaseModel):
    chunk_index: int = Field(ge=0)
    page_start: int = Field(ge=1)
    page_end: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_page_range(self) -> "ChunkPosition":
        if self.page_end < self.page_start:
            raise ValueError("page_end must be greater than or equal to page_start")
        return self


class ChunkHierarchy(BaseModel):
    chapter_no: int | None = Field(default=None, ge=1)
    chapter_title: str | None = None
    article_no: int | None = Field(default=None, ge=1)
    article_title: str | None = None
    clause_no: int | None = Field(default=None, ge=1)
    clause_title: str | None = None


class ChunkRecord(BaseModel):
    id: str
    document_id: str
    ocr_draft_id: str
    text: str = Field(min_length=1)
    embedding_text: str = Field(min_length=1)
    embedding: list[float] = Field(min_length=768, max_length=768)
    position: ChunkPosition
    hierarchy: ChunkHierarchy
    token_count: int = Field(ge=0)
    created_at: datetime
