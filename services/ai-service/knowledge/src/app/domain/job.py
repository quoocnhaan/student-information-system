"""Validated, immutable inputs for each persisted job type."""

from collections.abc import Mapping
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.document import ChunkHierarchy


class JobPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class OcrPayload(JobPayload):
    pass


class IndexPayload(JobPayload):
    index_input_id: Annotated[str, Field(pattern=r"^index_input:index_input_[0-9a-f]{32}$")]
    confirmation_fingerprint: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]


class CorrectionPayload(JobPayload):
    chunk_id: Annotated[str, Field(pattern=r"^chunk:chunk_[0-9a-f]{32}$")]
    base_text: str = Field(min_length=1)
    embedding_text: str = Field(min_length=1)
    embedding_version: int = Field(ge=1)
    embedding_status: Literal["ok", "stale"]
    hierarchy: ChunkHierarchy


class CorrectionResult(JobPayload):
    outcome: Literal["applied", "unchanged", "failed"]
    proposed_text: str | None = None

    @model_validator(mode="after")
    def terminal_outcomes_have_the_expected_text(self) -> "CorrectionResult":
        if self.outcome in ("applied", "unchanged") and not self.proposed_text:
            raise ValueError("Applied and unchanged corrections require proposed text")
        return self


class ReembedPayload(JobPayload):
    chunk_id: Annotated[str, Field(pattern=r"^chunk:chunk_[0-9a-f]{32}$")]
    embedding_text: str = Field(min_length=1)
    embedding_version: int = Field(ge=1)


PAYLOAD_MODELS = {
    "ocr_pdf": OcrPayload,
    "index_document": IndexPayload,
    "correct_chunks": CorrectionPayload,
    "reembed_chunk": ReembedPayload,
}


def validate_payload(job_type: str, payload: Any) -> JobPayload:
    model = PAYLOAD_MODELS.get(job_type)
    if model is None:
        raise ValueError("Unsupported job type")
    if not isinstance(payload, Mapping):
        raise ValueError("Job payload must be an object")
    # The database SDK returns typed record references. Normalize those only;
    # strict validation still rejects numbers, booleans, and other invalid inputs.
    values = dict(payload)
    for key in ("index_input_id", "chunk_id"):
        value = values.get(key)
        if value is not None and hasattr(value, "table_name"):
            values[key] = str(value)
    return model.model_validate(values)


def validate_correction_result(result: Any) -> CorrectionResult:
    """Validate the terminal result stored only by a correction worker.

    Results deliberately have a separate contract from a job payload: a worker
    may update this field after a job has been claimed, but it must never alter
    the immutable captured payload.
    """

    if not isinstance(result, Mapping):
        raise ValueError("Correction result must be an object")
    values = dict(result)
    # SurrealDB omits a nested field written as NONE. That is the durable
    # representation of a failed correction's nullable proposed text; it is
    # not an incomplete applied/unchanged model result.
    if values.get("outcome") == "failed" and "proposed_text" not in values:
        values["proposed_text"] = None
    return CorrectionResult.model_validate(values)
