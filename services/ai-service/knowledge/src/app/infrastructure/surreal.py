"""Async SurrealDB adapter and schema bootstrap support."""

import asyncio
import logging
from collections.abc import AsyncIterator, Mapping
from pathlib import Path
from typing import Any

from surrealdb import AsyncSurreal

from app.config import Settings
from app.observability.metrics import CLAIM_CONFLICTS

_CLAIM_CONFLICT_RETRIES = 5


class SurrealDatabaseError(RuntimeError):
    """Raised when the database cannot be prepared for this service."""


class OutboxLiveSubscription:
    """Own a live-query cursor; notification details stay inside this adapter."""

    def __init__(self, client: Any, query_id: Any, stream: AsyncIterator[Any]) -> None:
        self._client = client
        self._query_id = query_id
        self._stream = stream

    async def changes(self) -> AsyncIterator[None]:
        """Yield wake-up hints without exposing SDK notification shapes."""

        async for _notification in self._stream:
            yield None

    async def close(self) -> None:
        try:
            await self._client.kill(self._query_id)
        except Exception as error:  # noqa: BLE001 - the websocket may be disconnected.
            # The connection may already have gone away; closing remains safe.
            logging.getLogger(__name__).debug("outbox_live_query_kill_failed: %s", error)


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

    async def is_ready(self) -> bool:
        """Return whether the selected database accepts a lightweight query."""

        try:
            await self.client.query("RETURN true;")
            return True
        except Exception:  # noqa: BLE001 - readiness must reduce any SDK failure to false.
            return False

    async def subscribe_to_outbox_changes(self) -> OutboxLiveSubscription:
        """Open a live query used only as an outbox relay wake-up hint."""

        try:
            query_id = await self.client.live("outbox_event")
            stream = await self.client.subscribe_live(query_id)
            return OutboxLiveSubscription(self.client, query_id, stream)
        except Exception as error:
            raise SurrealDatabaseError("Unable to subscribe to outbox changes") from error

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
                f"UPSERT ocr_draft:{record_id} SET "
                f"document_id = document:{document_record_id}, "
                "status = 'draft', revision = 1, pages = $pages;",
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
        """Create a durable job; schema events atomically create its outbox rows."""

        try:
            await self.client.query(
                f"CREATE job:{record_id} CONTENT {{"
                f"type: $job_type, document_id: document:{document_record_id}, "
                "status: 'queued', step: 'queued', progress: 0, processed_pages: 0, "
                "attempts: 0, max_attempts: $max_attempts, sequence: 1, "
                "dispatch_generation: 1"
                "};",
                {"job_type": job_type, "max_attempts": self._settings.job_max_attempts},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to create ingestion job") from error

    async def create_document_with_job(
        self,
        document_record_id: str,
        document: Mapping[str, Any],
        job_record_id: str,
        job_type: str,
    ) -> None:
        """Atomically create the document, job, and schema-driven outbox events."""

        query = (
            "BEGIN TRANSACTION; "
            f"CREATE document:{document_record_id} CONTENT $document; "
            f"CREATE job:{job_record_id} CONTENT {{"
            f"type: $job_type, document_id: document:{document_record_id}, "
            "status: 'queued', step: 'queued', progress: 0, processed_pages: 0, "
            "attempts: 0, max_attempts: $max_attempts, sequence: 1, "
            "dispatch_generation: 1"
            "}; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(
                query,
                {
                    "document": dict(document),
                    "job_type": job_type,
                    "max_attempts": self._settings.job_max_attempts,
                },
            )
        except Exception as error:
            raise SurrealDatabaseError(
                "Unable to create document ingestion transaction"
            ) from error

    async def get_job(self, record_id: str) -> Mapping[str, Any] | None:
        """Return one durable job, if it exists."""

        try:
            jobs = await self.client.query(f"SELECT * FROM job:{record_id};")
        except Exception as error:
            raise SurrealDatabaseError("Unable to read ingestion job") from error
        return jobs[0] if jobs else None

    async def claim_job(
        self, record_id: str, worker_id: str, lease_seconds: int
    ) -> Mapping[str, Any] | None:
        """Atomically claim the specific job named by a queue delivery."""

        query = (
            f"UPDATE job:{record_id} SET "
            "status = 'running', step = 'claimed', progress = 5, "
            "claimed_at = time::now(), worker_id = $worker_id, "
            f"lease_expires_at = time::now() + {_duration_literal(lease_seconds)}, "
            "attempts += 1, sequence += 1, error = NONE "
            "WHERE status = 'queued' "
            "AND (next_attempt_at IS NONE OR next_attempt_at <= time::now()) "
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
                    CLAIM_CONFLICTS.inc()
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
            assignments = [
                "status = $changes.status",
                "step = $changes.step",
                "progress = $changes.progress",
                "error = $changes.error",
                "next_attempt_at = $changes.next_attempt_at",
                "worker_id = NONE",
                "lease_expires_at = NONE",
                "sequence += 1",
            ]
            if retrying:
                assignments.append("dispatch_generation += 1")
            jobs = await self.client.query(
                f"UPDATE job:{record_id} SET {', '.join(assignments)} "
                "WHERE status = 'running' AND worker_id = $worker_id RETURN AFTER;",
                {"changes": changes, "worker_id": worker_id},
            )
            return jobs[0] if jobs else None
        except Exception as error:
            raise SurrealDatabaseError(
                "Unable to finalize failed ingestion job"
            ) from error

    async def update_job(
        self, record_id: str, changes: Mapping[str, Any], worker_id: str | None = None
    ) -> bool:
        """Persist progress and sequence it, optionally enforcing lease ownership."""

        allowed_fields = {
            "status",
            "step",
            "progress",
            "total_pages",
            "processed_pages",
            "error",
        }
        unknown = set(changes) - allowed_fields
        if unknown:
            raise ValueError(f"Unsupported job fields: {sorted(unknown)}")
        assignments = [f"{field} = $changes.{field}" for field in changes]
        assignments.append("sequence += 1")
        ownership = ""
        variables: dict[str, Any] = {"changes": dict(changes)}
        if worker_id is not None:
            ownership = " WHERE status = 'running' AND worker_id = $worker_id"
            variables["worker_id"] = worker_id
        try:
            jobs = await self.client.query(
                f"UPDATE job:{record_id} SET {', '.join(assignments)}"
                f"{ownership} RETURN AFTER;",
                variables,
            )
            return bool(jobs)
        except Exception as error:
            raise SurrealDatabaseError("Unable to update ingestion job") from error

    async def complete_job(
        self,
        record_id: str,
        ocr_draft_record_id: str,
        page_count: int,
        worker_id: str | None = None,
    ) -> bool:
        """Mark a job successful and attach its stored OCR draft."""

        try:
            ownership = (
                " WHERE status = 'running' AND worker_id = $worker_id"
                if worker_id is not None
                else ""
            )
            jobs = await self.client.query(
                f"UPDATE job:{record_id} SET "
                f"ocr_draft_id = ocr_draft:{ocr_draft_record_id}, "
                "status = 'completed', step = 'completed', progress = 100, "
                f"total_pages = {page_count}, processed_pages = {page_count}, "
                "lease_expires_at = NONE, next_attempt_at = NONE, sequence += 1"
                f"{ownership} RETURN AFTER;",
                {"worker_id": worker_id},
            )
            return bool(jobs)
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

    async def update_document_review(
        self,
        record_id: str,
        expected_revision: int,
        metadata: Mapping[str, Any],
        page_updates: list[Mapping[str, Any]],
    ) -> bool:
        """Atomically save reviewer corrections without changing original OCR text."""

        result = await self.get_document_result(record_id)
        if result is None:
            return False
        document, draft = result
        if (
            document.get("process_status") != "review"
            or draft is None
            or draft.get("status") != "draft"
            or int(draft.get("revision", 1)) != expected_revision
        ):
            return False

        original_pages = draft.get("pages")
        if not isinstance(original_pages, list):
            return False
        changes_by_page = {int(change["page"]): str(change["reviewed_text"]) for change in page_updates}
        known_pages = {
            int(page["page"])
            for page in original_pages
            if isinstance(page, Mapping) and isinstance(page.get("page"), int)
        }
        if not set(changes_by_page).issubset(known_pages):
            return False
        pages = [
            {
                **dict(page),
                **(
                    {"reviewed_text": changes_by_page[int(page["page"])]}
                    if int(page["page"]) in changes_by_page
                    else {}
                ),
            }
            for page in original_pages
            if isinstance(page, Mapping)
        ]
        draft_record_id = _record_id(draft["id"])
        query = (
            "BEGIN TRANSACTION; "
            f"LET $updated_draft = (UPDATE ocr_draft:{draft_record_id} "
            "SET pages = $pages, revision += 1 "
            "WHERE revision = $expected_revision RETURN AFTER); "
            "IF array::len($updated_draft) = 0 THEN "
            "THROW 'review_revision_conflict'; END; "
            f"UPDATE document:{record_id} MERGE $metadata; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(
                query,
                {
                    "pages": pages,
                    "metadata": dict(metadata),
                    "expected_revision": expected_revision,
                },
            )
            return True
        except Exception as error:
            if "review_revision_conflict" in str(error):
                return False
            raise SurrealDatabaseError("Unable to save document review") from error

    async def fail_document(self, record_id: str) -> None:
        """Mark the document as failed when its durable job has failed."""

        try:
            await self.client.query(
                f"UPDATE document:{record_id} SET process_status = 'failed';"
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to mark failed document") from error

    async def requeue_expired_jobs(self) -> int:
        """Recover only abandoned claims, never work owned by a live worker."""

        try:
            jobs = await self.client.query(
                "UPDATE job SET status = 'queued', step = 'queued', progress = 0, "
                "worker_id = NONE, lease_expires_at = NONE, sequence += 1, "
                "dispatch_generation += 1 "
                "WHERE status = 'running' AND lease_expires_at < time::now() "
                "RETURN AFTER;"
            )
            return len(jobs)
        except Exception as error:
            raise SurrealDatabaseError("Unable to recover interrupted jobs") from error

    async def get_pending_outbox_events(self, limit: int) -> list[Mapping[str, Any]]:
        """Return unpublished events in creation order for broker delivery."""

        try:
            events = await self.client.query(
                "SELECT * FROM outbox_event WHERE published_at IS NONE "
                "AND (available_at IS NONE OR available_at <= time::now()) "
                f"ORDER BY created_at LIMIT {int(limit)};"
            )
            return list(events)
        except Exception as error:
            raise SurrealDatabaseError("Unable to read the event outbox") from error

    async def get_earliest_pending_outbox_available_at(self) -> Any | None:
        """Return the next delayed event so the relay can set one timer."""

        try:
            events = await self.client.query(
                "SELECT available_at FROM outbox_event WHERE published_at IS NONE "
                "AND available_at IS NOT NONE AND available_at > time::now() "
                "ORDER BY available_at LIMIT 1;"
            )
            return events[0].get("available_at") if events else None
        except Exception as error:
            raise SurrealDatabaseError("Unable to read next outbox availability") from error

    async def document_exists_by_source_key(self, object_key: str) -> bool:
        """Use the unique source-key index to safely check cleanup candidates."""

        try:
            documents = await self.client.query(
                "SELECT id FROM document WHERE source.object_key = $object_key LIMIT 1;",
                {"object_key": object_key},
            )
            return bool(documents)
        except Exception as error:
            raise SurrealDatabaseError("Unable to check document source object") from error

    async def get_pending_job_dispatch_event(
        self, job_record_id: str, dispatch_generation: int = 1
    ) -> Mapping[str, Any] | None:
        """Return the current job trigger created with a newly queued job."""

        try:
            events = await self.client.query(
                "SELECT * FROM outbox_event WHERE type = 'job.queued' "
                f"AND job_id = job:{job_record_id} "
                "AND dispatch_generation = $dispatch_generation "
                "AND published_at IS NONE ORDER BY created_at DESC LIMIT 1;",
                {"dispatch_generation": dispatch_generation},
            )
            return events[0] if events else None
        except Exception as error:
            raise SurrealDatabaseError(
                "Unable to read job dispatch outbox event"
            ) from error

    async def mark_outbox_published(self, record_id: str) -> None:
        """Mark an event delivered only after RabbitMQ publisher confirmation."""

        try:
            await self.client.query(
                f"UPDATE outbox_event:{record_id} SET published_at = time::now(), "
                "publish_attempts += 1, last_error = NONE;"
            )
        except Exception as error:
            raise SurrealDatabaseError(
                "Unable to mark outbox event published"
            ) from error

    async def mark_outbox_failed(self, record_id: str, error_message: str) -> None:
        """Record a failed publish attempt while leaving the event pending."""

        try:
            await self.client.query(
                f"UPDATE outbox_event:{record_id} SET publish_attempts += 1, "
                "last_error = $error;",
                {"error": error_message[:500]},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to record outbox failure") from error

    async def repair_missing_job_triggers(self) -> int:
        """Create triggers for legacy queued jobs missing their current generation."""

        try:
            jobs = await self.client.query(
                "SELECT id, document_id, dispatch_generation, next_attempt_at FROM job "
                "WHERE status = 'queued';"
            )
            repaired = 0
            for job in jobs:
                generation = int(job.get("dispatch_generation") or 1)
                events = await self.client.query(
                    "SELECT id FROM outbox_event WHERE type = 'job.queued' "
                    "AND job_id = $job_id AND dispatch_generation = $generation "
                    "LIMIT 1;",
                    {"job_id": job["id"], "generation": generation},
                )
                if events:
                    continue
                await self.client.query(
                    "CREATE outbox_event SET type = 'job.queued', job_id = $job_id, "
                    "document_id = $document_id, dispatch_generation = $generation, "
                    "available_at = $available_at;",
                    {
                        "job_id": job["id"],
                        "document_id": job["document_id"],
                        "generation": generation,
                        "available_at": job.get("next_attempt_at"),
                    },
                )
                repaired += 1
            return repaired
        except Exception as error:
            raise SurrealDatabaseError(
                "Unable to repair missing job triggers"
            ) from error

    async def get_job_counts(self) -> Mapping[str, int]:
        """Return current counts used by the operational metrics endpoint."""

        try:
            rows = await self.client.query(
                "SELECT status, count() AS total FROM job GROUP BY status;"
            )
            return {str(row["status"]): int(row["total"]) for row in rows}
        except Exception as error:
            raise SurrealDatabaseError("Unable to count ingestion jobs") from error

    async def get_document(self, record_id: str) -> Mapping[str, Any] | None:
        """Return one document for worker-side source lookup."""

        try:
            documents = await self.client.query(f"SELECT * FROM document:{record_id};")
        except Exception as error:
            raise SurrealDatabaseError("Unable to read document") from error
        return documents[0] if documents else None

    async def get_document_result(
        self, record_id: str
    ) -> tuple[Mapping[str, Any], Mapping[str, Any] | None] | None:
        """Return a document and its OCR draft for the review read model."""

        document = await self.get_document(record_id)
        if document is None:
            return None
        try:
            drafts = await self.client.query(
                "SELECT * FROM ocr_draft "
                "WHERE document_id = type::record('document', $record_id) "
                "ORDER BY updated_at DESC LIMIT 1;",
                {"record_id": record_id},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to read OCR draft") from error
        return document, (drafts[0] if drafts else None)


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
