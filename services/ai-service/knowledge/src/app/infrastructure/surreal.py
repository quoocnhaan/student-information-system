"""Async SurrealDB adapter and schema bootstrap support."""

import asyncio
from pathlib import Path
from typing import Any, Mapping

from surrealdb import AsyncSurreal

from app.config import Settings


_CLAIM_CONFLICT_RETRIES = 5


class SurrealDatabaseError(RuntimeError):
    """Raised when the database cannot be prepared for this service."""


class SurrealDatabase:
    """One lifecycle-managed SurrealDB connection for the FastAPI process."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Any | None = None

    @property
    def client(self) -> Any:
        """Return the connected SDK client."""

        if self._client is None:
            raise SurrealDatabaseError("SurrealDB has not been connected")
        return self._client

    async def connect(self) -> None:
        """Connect, authenticate, and select the configured namespace/database."""

        client = AsyncSurreal(self._settings.surreal_url)
        try:
            await client.connect()
            await client.signin(
                {
                    "username": self._settings.surreal_user,
                    "password": self._settings.surreal_password,
                }
            )
            await client.use(
                self._settings.surreal_namespace,
                self._settings.surreal_database,
            )
        except Exception as error:
            await client.close()
            raise SurrealDatabaseError("Unable to connect to SurrealDB") from error
        self._client = client

    async def close(self) -> None:
        """Close the open database connection, if any."""

        if self._client is not None:
            await self._client.close()
            self._client = None

    async def apply_schema(self) -> None:
        """Apply the idempotent knowledge schema to the selected database."""

        schema_path = Path.cwd() / "db" / "schema.surql"
        schema = schema_path.read_text(encoding="utf-8")
        await self.client.query(schema)

    async def create_document(
        self, record_id: str, document: Mapping[str, Any]
    ) -> None:
        """Create one document record using an internally generated record ID."""

        try:
            await self.client.query(
                f"CREATE document:{record_id} CONTENT $document;",
                {"document": dict(document)},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to create document metadata") from error

    async def create_ocr_draft(
        self,
        record_id: str,
        document_record_id: str,
        pages: list[Mapping[str, Any]],
    ) -> None:
        """Create the unreviewed OCR text belonging to one document."""

        try:
            await self.client.query(
                f"CREATE ocr_draft:{record_id} CONTENT {{"
                f"document_id: document:{document_record_id}, "
                "status: 'draft', pages: $pages"
                "};",
                {"pages": [dict(page) for page in pages]},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to create OCR draft") from error

    async def delete_document(self, record_id: str) -> None:
        """Remove a document after a failed multi-store upload."""

        try:
            await self.client.query(f"DELETE document:{record_id};")
        except Exception as error:
            raise SurrealDatabaseError("Unable to remove document metadata") from error

    async def create_job(
        self, record_id: str, document_record_id: str, job_type: str
    ) -> None:
        """Create a durable job after its source document is stored."""

        try:
            await self.client.query(
                f"CREATE job:{record_id} CONTENT {{"
                f"type: $job_type, document_id: document:{document_record_id}, "
                "status: 'queued', step: 'queued', progress: 0, processed_pages: 0, "
                "attempts: 0, max_attempts: $max_attempts"
                "};",
                {"job_type": job_type, "max_attempts": self._settings.job_max_attempts},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to create ingestion job") from error

    async def get_job(self, record_id: str) -> Mapping[str, Any] | None:
        """Return one durable job, if it exists."""

        try:
            jobs = await self.client.query(f"SELECT * FROM job:{record_id};")
        except Exception as error:
            raise SurrealDatabaseError("Unable to read ingestion job") from error
        return jobs[0] if jobs else None

    async def claim_next_queued_job(
        self, worker_id: str, lease_seconds: int
    ) -> Mapping[str, Any] | None:
        """Atomically claim one due job so concurrent workers cannot duplicate it."""

        query = (
            "UPDATE (SELECT * FROM job "
            "WHERE status = 'queued' "
            "AND (next_attempt_at IS NONE OR next_attempt_at <= time::now()) "
            "ORDER BY created_at LIMIT 1) SET "
            "status = 'running', step = 'claimed', progress = 5, "
            "claimed_at = time::now(), worker_id = $worker_id, "
            f"lease_expires_at = time::now() + {_duration_literal(lease_seconds)}, "
            "attempts += 1, error = NONE "
            "RETURN AFTER;"
        )
        for attempt in range(_CLAIM_CONFLICT_RETRIES):
            try:
                jobs = await self.client.query(query, {"worker_id": worker_id})
                return jobs[0] if jobs else None
            except Exception as error:
                if (
                    _is_transaction_conflict(error)
                    and attempt < _CLAIM_CONFLICT_RETRIES - 1
                ):
                    await asyncio.sleep(0.025 * (2**attempt))
                    continue
                raise SurrealDatabaseError("Unable to claim ingestion job") from error

    async def renew_job_lease(
        self, record_id: str, worker_id: str, lease_seconds: int
    ) -> bool:
        """Extend a running job's lease only while this worker still owns it."""

        try:
            jobs = await self.client.query(
                f"UPDATE job:{record_id} SET "
                f"lease_expires_at = time::now() + {_duration_literal(lease_seconds)} "
                "WHERE status = 'running' AND worker_id = $worker_id RETURN AFTER;",
                {"worker_id": worker_id},
            )
            return bool(jobs)
        except Exception as error:
            raise SurrealDatabaseError("Unable to renew ingestion job lease") from error

    async def schedule_retry_or_fail(
        self,
        record_id: str,
        worker_id: str,
        error_message: str,
        retry_at: Any | None,
    ) -> Mapping[str, Any] | None:
        """Release a failed claim for retry, or persist a terminal failure."""

        retrying = retry_at is not None
        changes = {
            "status": "queued" if retrying else "failed",
            "step": "retry_scheduled" if retrying else "failed",
            "progress": 0 if retrying else 100,
            "error": error_message[:500],
            "next_attempt_at": retry_at,
            "worker_id": None,
            "lease_expires_at": None,
        }
        try:
            jobs = await self.client.query(
                f"UPDATE job:{record_id} MERGE $changes "
                "WHERE status = 'running' AND worker_id = $worker_id RETURN AFTER;",
                {"changes": changes, "worker_id": worker_id},
            )
            return jobs[0] if jobs else None
        except Exception as error:
            raise SurrealDatabaseError("Unable to finalize failed ingestion job") from error

    async def update_job(self, record_id: str, changes: Mapping[str, Any]) -> None:
        """Merge job progress fields without replacing the job record."""

        try:
            await self.client.query(
                f"UPDATE job:{record_id} MERGE $changes;",
                {"changes": dict(changes)},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to update ingestion job") from error

    async def complete_job(
        self, record_id: str, ocr_draft_record_id: str, page_count: int
    ) -> None:
        """Mark a job successful and attach its stored OCR draft."""

        try:
            await self.client.query(
                f"UPDATE job:{record_id} SET "
                f"ocr_draft_id = ocr_draft:{ocr_draft_record_id}, "
                "status = 'completed', step = 'completed', progress = 100, "
                f"total_pages = {page_count}, processed_pages = {page_count}, "
                "lease_expires_at = NONE, next_attempt_at = NONE;"
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to complete ingestion job") from error

    async def update_document_after_ocr(
        self, record_id: str, page_count: int, metadata: Mapping[str, Any]
    ) -> None:
        """Save rule-detected metadata and move a document to human review."""

        changes = {
            **dict(metadata),
            "process_status": "review",
            "page_count": page_count,
        }
        try:
            await self.client.query(
                f"UPDATE document:{record_id} MERGE $changes;",
                {"changes": changes},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to update document after OCR") from error

    async def fail_document(self, record_id: str) -> None:
        """Mark the document as failed when its durable job has failed."""

        try:
            await self.client.query(
                f"UPDATE document:{record_id} SET process_status = 'failed';"
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to mark failed document") from error

    async def requeue_expired_jobs(self) -> None:
        """Recover only abandoned claims, never work owned by a live worker."""

        try:
            await self.client.query(
                "UPDATE job SET status = 'queued', step = 'queued', progress = 0, "
                "worker_id = NONE, lease_expires_at = NONE "
                "WHERE status = 'running' AND lease_expires_at < time::now();"
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to recover interrupted jobs") from error

    async def get_document(self, record_id: str) -> Mapping[str, Any] | None:
        """Return one document for worker-side source lookup."""

        try:
            documents = await self.client.query(
                f"SELECT * FROM document:{record_id};"
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to read document") from error
        return documents[0] if documents else None


def _record_id(value: Any) -> str:
    """Extract the safe generated portion of a SurrealDB RecordID."""

    if hasattr(value, "id"):
        return str(value.id)
    return str(value).split(":", maxsplit=1)[-1]


def _duration_literal(seconds: int) -> str:
    """Return a validated SurrealQL duration literal from trusted configuration."""

    if seconds < 1:
        raise ValueError("Duration must be at least one second")
    return f"{seconds}s"


def _is_transaction_conflict(error: Exception) -> bool:
    """Recognize SurrealDB's optimistic-concurrency conflict response."""

    return "Transaction conflict" in str(error)
