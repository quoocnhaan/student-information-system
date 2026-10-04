"""Async SurrealDB adapter and schema bootstrap support."""

import asyncio
import hashlib
import json
import logging
import re
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from uuid import uuid4

from surrealdb import AsyncSurreal

from app.config import Settings
from app.domain.job import validate_payload


class SurrealDatabaseError(RuntimeError):
    """Raised when the database cannot be prepared for this service."""


class CheckedClient:
    """Bound SDK I/O and reject errors in every statement, including transactions."""

    def __init__(self, client: Any, settings: Settings) -> None:
        self.sdk = client
        self.settings = settings

    async def query_raw(self, query: str, variables: dict | None = None,
                        *, timeout_seconds: float | None = None) -> dict:
        deadline = timeout_seconds if timeout_seconds is not None else self.settings.database_timeout_seconds
        async with asyncio.timeout(deadline):
            response = await self.sdk.query_raw(query, variables)
        statements = response.get("result")
        if not isinstance(statements, list) or not statements:
            raise SurrealDatabaseError("Database returned no statement results")
        errors = []
        for index, statement in enumerate(statements):
            if statement.get("status") != "OK":
                cause = str(statement.get("result"))
                # Schema errors may echo rejected values. Retain server causes,
                # but never log vectors or quoted document contents.
                cause = re.sub(r"\[[^\]]*\]", "[redacted]", cause)
                cause = re.sub(r'"[^"\n]*"', '"[redacted]"', cause)
                errors.append(f"statement {index}: {cause[:1000]}")
        if errors:
            cause = "; ".join(errors)
            logging.getLogger(__name__).error("database_statements_failed", extra={"database_cause": cause})
            raise SurrealDatabaseError(f"Database statements failed: {cause}")
        return response

    async def query(self, query: str, variables: dict | None = None,
                    *, timeout_seconds: float | None = None) -> Any:
        response = await self.query_raw(query, variables, timeout_seconds=timeout_seconds)
        return response["result"][0]["result"]

    def __getattr__(self, name: str) -> Any:
        async def bounded(*args: Any, **kwargs: Any) -> Any:
            async with asyncio.timeout(self.settings.database_timeout_seconds):
                return await getattr(self.sdk, name)(*args, **kwargs)
        return bounded


_DOCUMENT_ID = re.compile(r"doc_[0-9a-f]{32}\Z")
_JOB_ID = re.compile(r"job_[0-9a-f]{32}\Z")


def _record_id(value: Any) -> str:
    """Extract the record key from a SurrealDB ID."""

    if hasattr(value, "id"):
        return str(value.id)
    return str(value).split(":", maxsplit=1)[-1]


class SurrealDatabase:
    """One explicitly owned connection for an API, delivery, or recovery operation."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Any | None = None
        self.worker_run_id: str | None = None

    @property
    def client(self) -> Any:
        """Return the connected SDK client."""

        if self._client is None:
            raise SurrealDatabaseError("SurrealDB has not been connected")
        return self._client

    async def connect(self) -> None:
        """Connect, authenticate, and select the configured namespace/database."""

        client = CheckedClient(AsyncSurreal(self._settings.surreal_url), self._settings)
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
        except BaseException as error:
            try:
                await client.close()
            except Exception:
                pass
            if isinstance(error, asyncio.CancelledError):
                raise
            raise SurrealDatabaseError("Unable to connect to SurrealDB") from error
        self._client = client

    async def close(self) -> None:
        """Close the open database connection, if any."""

        if self._client is not None:
            client, self._client = self._client, None
            await client.close()

    async def is_ready(self) -> bool:
        """Return whether the selected database accepts a lightweight query."""

        try:
            await self.client.query("RETURN true;")
            return True
        except Exception:  # noqa: BLE001 - readiness must reduce any SDK failure to false.
            return False


    async def apply_schema(self) -> None:
        """Apply the idempotent knowledge schema to the selected database."""

        schema_path = Path.cwd() / "db" / "schema.surql"
        schema = schema_path.read_text(encoding="utf-8")
        await self.execute_script(schema)

    async def execute_script(self, script: str) -> None:
        """Run a multi-statement script and check every statement's result."""

        try:
            response = await self.client.query_raw(script)
            statements = response.get("result")
            if not isinstance(statements, list) or not statements:
                raise SurrealDatabaseError(f"SurrealDB script returned no statements: {response}")
            for index, statement in enumerate(statements, start=1):
                if statement.get("status") != "OK":
                    raise SurrealDatabaseError(
                        f"SurrealDB script statement {index} failed: {statement.get('result')}"
                    )
        except SurrealDatabaseError:
            raise
        except Exception as error:
            raise SurrealDatabaseError("Unable to run SurrealDB script") from error

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

    async def create_document_with_job(
        self, record_id: str, document: Mapping[str, Any], job_record_id: str
    ) -> Mapping[str, Any]:
        """Create the source document and its first queued job atomically."""

        if not _DOCUMENT_ID.fullmatch(record_id) or not _JOB_ID.fullmatch(job_record_id):
            raise ValueError("Invalid document or job ID")
        validate_payload("ocr_pdf", {})
        existing = await self.get_job(job_record_id)
        if existing is not None:
            if str(existing.get("document_id")) != f"document:{record_id}":
                raise SurrealDatabaseError("Job ID belongs to another document")
            return existing
        query = (
            "BEGIN TRANSACTION; "
            f"CREATE document:{record_id} CONTENT $document; "
            f"CREATE job:{job_record_id} CONTENT {{"
            f"document_id: document:{record_id}, type: 'ocr_pdf', "
            "dedupe_key: 'ocr_pdf', status: 'queued', step: 'queued', "
            "payload: {}, progress: 0, sequence: 1}; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(query, {"document": dict(document)})
        except Exception as error:
            # A timed-out response can still follow a committed transaction.
            existing = await self.get_job(job_record_id)
            if existing is None:
                rows = await self.client.query(
                    "SELECT * FROM job WHERE document_id = type::record('document', $record_id) "
                    "AND dedupe_key = 'ocr_pdf' LIMIT 1;",
                    {"record_id": record_id},
                )
                existing = rows[0] if rows else None
            if existing is None:
                raise SurrealDatabaseError("Unable to create document and job") from error
            return existing
        row = await self.get_job(job_record_id)
        if row is None:
            raise SurrealDatabaseError("Created job could not be read")
        return row

    async def get_job(self, job_id: str) -> Mapping[str, Any] | None:
        record_id = _record_id(job_id)
        if not _JOB_ID.fullmatch(record_id):
            return None
        try:
            rows = await self.client.query(f"SELECT * FROM job:{record_id};")
        except Exception as error:
            raise SurrealDatabaseError("Unable to read job") from error
        return rows[0] if rows else None

    async def claim_job(
        self, job_id: str, claim_id: str, job_type: str
    ) -> Mapping[str, Any] | None:
        record_id = _record_id(job_id)
        if not _JOB_ID.fullmatch(record_id) or not re.fullmatch(r"[0-9a-f]{32}", claim_id):
            return None
        for attempt in range(5):
            try:
                rows = await self.client.query(
                    f"UPDATE job:{record_id} SET status = 'running', step = 'claimed', "
                    "progress = 5, claim_id = $claim_id, worker_id = $worker_id, "
                    "worker_run_id = $worker_run_id, sequence += 1 "
                    "WHERE status = 'queued' AND type = $type RETURN AFTER;",
                    {"claim_id": claim_id, "type": job_type,
                     "worker_id": self._settings.worker_id, "worker_run_id": self.worker_run_id},
                )
                if rows:
                    return rows[0]
                existing = await self.get_job(job_id)
                return (
                    existing if existing and existing.get("status") == "running"
                    and existing.get("claim_id") == claim_id
                    and existing.get("type") == job_type else None
                )
            except Exception as error:
                if "Transaction conflict" not in str(error) or attempt == 4:
                    raise SurrealDatabaseError("Unable to claim job") from error
                await asyncio.sleep(0.025 * 2**attempt)
        return None

    async def job_progress(
        self, job_id: str, claim_id: str, changes: Mapping[str, Any]
    ) -> Mapping[str, Any] | None:
        record_id = _record_id(job_id)
        fields = {"step", "progress"}
        if not _JOB_ID.fullmatch(record_id) or not changes or set(changes) - fields:
            raise ValueError("Invalid progress update")
        if "progress" in changes and (type(changes["progress"]) is not int or not 0 <= changes["progress"] < 100):
            raise ValueError("Running progress must be an integer below 100")
        previous = await self.get_job(job_id)
        if previous is None or previous.get("claim_id") != claim_id or previous.get("status") != "running":
            return None
        if int(changes.get("progress", previous["progress"])) < int(previous["progress"]):
            return None
        if all(previous.get(key) == value for key, value in changes.items()):
            return previous
        assignments = ", ".join(f"{field} = $changes.{field}" for field in changes)
        rows = await self.client.query(
            f"UPDATE job:{record_id} SET {assignments}, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id "
            "AND progress <= $minimum_progress AND sequence = $sequence RETURN AFTER;",
            {
                "claim_id": claim_id, "changes": dict(changes),
                "minimum_progress": changes.get("progress", previous["progress"]),
                "sequence": previous["sequence"],
            },
        )
        return rows[0] if rows else None

    async def queued_jobs_after(
        self, cursor: str | None, limit: int
    ) -> list[Mapping[str, Any]]:
        if cursor is not None and not _JOB_ID.fullmatch(cursor):
            raise ValueError("Invalid cursor")
        if limit < 1:
            raise ValueError("Invalid limit")
        after = f"AND id > job:{cursor} " if cursor else ""
        return await self.client.query(
            f"SELECT id, type FROM job WHERE status = 'queued' {after}ORDER BY id LIMIT {int(limit)};"
        )

    async def subscribe_jobs(self) -> tuple[Any, Any]:
        query_id = await self.client.live("job")
        return query_id, await self.client.subscribe_live(query_id)


    async def confirm_review(
        self, document_record_id: str, expected_revision: int, metadata: Mapping[str, Any],
        page_edits: list[Mapping[str, Any]], selected_pages: list[int],
    ) -> Mapping[str, Any] | None:
        """Commit reviewer choices and a durable worker input in one transaction."""

        if not _DOCUMENT_ID.fullmatch(document_record_id):
            return None
        normalized = {
            "metadata": dict(metadata),
            "page_edits": sorted(({"page": int(item["page"]), "reviewed_text": str(item["reviewed_text"])} for item in page_edits), key=lambda item: item["page"]),
            "selected_pages": sorted(int(page) for page in selected_pages),
        }
        fingerprint = hashlib.sha256(json.dumps(normalized, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        rows = await self.client.query(
            "SELECT * FROM job WHERE document_id = type::record('document', $record_id) "
            "AND dedupe_key = 'index_document' LIMIT 1;",
            {"record_id": document_record_id},
        )
        if rows:
            return rows[0] if rows[0]["payload"].get("confirmation_fingerprint") == fingerprint else None
        result = await self.get_document_result(document_record_id)
        if result is None or result[1] is None:
            return None
        document, draft = result
        if (
            document.get("process_status") != "review"
            or draft.get("status") != "draft"
            or int(draft.get("revision", 1)) != expected_revision
        ):
            return None
        original_pages = draft.get("pages")
        if not isinstance(original_pages, list):
            return None
        edits = {item["page"]: item["reviewed_text"] for item in normalized["page_edits"]}
        known_pages = {page.get("page") for page in original_pages if isinstance(page, Mapping)}
        if not set(normalized["selected_pages"]).issubset(known_pages):
            return None
        index_pages = []
        for page in original_pages:
            if not isinstance(page, Mapping) or page.get("page") not in normalized["selected_pages"]:
                continue
            page_no = int(page["page"])
            text = edits[page_no] if page_no in edits else page.get("raw_text", "")
            index_pages.append({"page": page_no, "text": str(text)})
        if not any(page["text"].strip() for page in index_pages):
            return None
        draft_record_id = _record_id(draft["id"])
        job_record_id = f"job_{uuid4().hex}"
        input_record_id = f"index_input_{uuid4().hex}"
        validate_payload("index_document", {"index_input_id": f"index_input:{input_record_id}", "confirmation_fingerprint": fingerprint})
        query = (
            "BEGIN TRANSACTION; "
            f"LET $draft = (UPDATE ocr_draft:{draft_record_id} SET status = 'confirmed' "
            "WHERE status = 'draft' AND revision = $revision RETURN AFTER); "
            "IF array::len($draft) = 0 THEN THROW 'review_revision_conflict'; END; "
            f"LET $document = (UPDATE document:{document_record_id} MERGE $metadata "
            "WHERE process_status = 'review' RETURN AFTER); "
            "IF array::len($document) = 0 THEN THROW 'document_not_review'; END; "
            f"UPDATE document:{document_record_id} SET process_status = 'indexing' WHERE process_status = 'review'; "
            f"CREATE index_input:{input_record_id} CONTENT {{document_id: document:{document_record_id}, pages: $pages}}; "
            f"CREATE job:{job_record_id} CONTENT {{"
            f"document_id: document:{document_record_id}, payload: {{index_input_id: index_input:{input_record_id}, confirmation_fingerprint: $fingerprint}}, "
            "type: 'index_document', dedupe_key: 'index_document', "
            "status: 'queued', step: 'queued', progress: 0, sequence: 1}; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(query, {"revision": expected_revision, "metadata": dict(metadata), "pages": index_pages, "fingerprint": fingerprint})
        except Exception as error:
            rows = await self.client.query(
                "SELECT * FROM job WHERE document_id = type::record('document', $record_id) "
                "AND dedupe_key = 'index_document' LIMIT 1;",
                {"record_id": document_record_id},
            )
            if rows:
                return rows[0] if rows[0]["payload"].get("confirmation_fingerprint") == fingerprint else None
            if "review_revision_conflict" in str(error) or "document_not_review" in str(error):
                return None
            raise SurrealDatabaseError("Unable to confirm review") from error
        return await self.get_job(job_record_id)

    async def complete_index_job(
        self, job_id: str, claim_id: str, chunks: list[Mapping[str, Any]], model: str
    ) -> Mapping[str, Any] | None:
        job = await self.get_job(job_id)
        if job is None or job.get("type") != "index_document":
            return None
        if job.get("status") == "completed" and job.get("claim_id") == claim_id:
            return job
        if job.get("status") != "running" or job.get("claim_id") != claim_id:
            return None
        document_id = str(job["document_id"])
        index_input_id = str(job["payload"].get("index_input_id", ""))
        if not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id) or not re.fullmatch(r"index_input:index_input_[0-9a-f]{32}", index_input_id):
            return None
        record_id = _record_id(job_id)
        statements = [
            "BEGIN TRANSACTION;",
            f"LET $claimed = (SELECT id FROM job:{record_id} WHERE status = 'running' AND claim_id = $claim_id);",
            "IF array::len($claimed) = 0 THEN THROW 'job_claim_conflict'; END;",
            f"LET $input = (SELECT id FROM {index_input_id} WHERE document_id = {document_id});",
            "IF array::len($input) = 0 THEN THROW 'index_input_conflict'; END;",
            f"DELETE chunk WHERE document_id = {document_id};",
        ]
        variables: dict[str, Any] = {"claim_id": claim_id, "model": model}
        for index, chunk in enumerate(chunks):
            key = f"chunk_{index}"
            variables[key] = dict(chunk)
            statements.append(
                f"CREATE chunk:chunk_{uuid4().hex} CONTENT {{document_id: {document_id}, "
                f"text: ${key}.text, embedding_text: ${key}.embedding_text, "
                f"embedding: ${key}.embedding, position: ${key}.position, hierarchy: ${key}.hierarchy, "
                f"token_count: ${key}.token_count}};"
            )
        statements.extend([
            f"LET $document = (UPDATE {document_id} SET process_status = 'indexed', "
            "embedding_model = $model WHERE process_status = 'indexing' RETURN AFTER);",
            "IF array::len($document) = 0 THEN THROW 'document_not_indexing'; END;",
            f"LET $job = (UPDATE job:{record_id} SET status = 'completed', step = 'completed', "
            "progress = 100, sequence += 1 WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER);",
            "IF array::len($job) = 0 THEN THROW 'job_claim_conflict'; END;",
            f"DELETE {index_input_id};",
            f"DELETE ocr_draft WHERE document_id = {document_id};",
            "COMMIT TRANSACTION;",
        ])
        started = time.monotonic()
        context = {"job_id": job_id, "claim_id": claim_id, "chunk_count": len(chunks)}
        logger = logging.getLogger(__name__)
        logger.info("index_commit_enter", extra=context)
        try:
            await self.client.query(" ".join(statements), variables,
                                    timeout_seconds=self._settings.index_commit_timeout_seconds)
            completed = await self.get_job(job_id)
            if not completed or completed.get("status") != "completed" or completed.get("claim_id") != claim_id:
                raise SurrealDatabaseError("Index completion did not persist for this claim")
            logger.info("index_commit_completed", extra={**context, "duration_seconds": time.monotonic() - started})
            return completed
        except Exception as error:
            logger.exception("index_commit_timeout" if isinstance(error, TimeoutError) else "index_commit_failed",
                             extra={**context, "duration_seconds": time.monotonic() - started})
            raise

    async def get_index_input_for_job(self, job_id: str) -> Mapping[str, Any] | None:
        """Load the immutable review-confirmed input for an index worker."""

        job = await self.get_job(job_id)
        if job is None or job.get("type") != "index_document":
            return None
        payload = validate_payload(job["type"], job.get("payload"))
        try:
            rows = await self.client.query(
                f"SELECT * FROM {payload.index_input_id} WHERE document_id = $document_id;",
                {"document_id": job["document_id"]},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to read index input") from error
        return rows[0] if rows else None

    async def fail_index_job(self, job_id: str, claim_id: str, error: str) -> None:
        job = await self.get_job(job_id)
        if job is None or job.get("status") != "running" or job.get("claim_id") != claim_id:
            return
        document_id = str(job["document_id"])
        record_id = _record_id(job_id)
        if not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id):
            return
        await self.client.query(
            "BEGIN TRANSACTION; "
            f"LET $job = (UPDATE job:{record_id} SET status = 'failed', step = 'failed', "
            "error = $error, sequence += 1 WHERE status = 'running' "
            "AND claim_id = $claim_id RETURN AFTER); "
            "IF array::len($job) = 0 THEN THROW 'job_claim_conflict'; END; "
            f"UPDATE {document_id} SET process_status = 'failed' WHERE process_status = 'indexing'; "
            "COMMIT TRANSACTION;",
            {"claim_id": claim_id, "error": error[:500]},
        )

    async def requeue_failed_index_job(self, job_id: str) -> Mapping[str, Any] | None:
        """Guardedly retry a failed index job against its retained input."""

        job = await self.get_job(job_id)
        if job is None or job.get("type") != "index_document" or job.get("status") != "failed":
            return None
        input_id = str(job["payload"].get("index_input_id", ""))
        document_id = str(job.get("document_id", ""))
        if not re.fullmatch(r"index_input:index_input_[0-9a-f]{32}", input_id) or not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id):
            return None
        try:
            await self.client.query(
                "BEGIN TRANSACTION; "
                f"LET $input = (SELECT id FROM {input_id} WHERE document_id = {document_id}); "
                "IF array::len($input) = 0 THEN THROW 'retry_conflict'; END; "
                f"LET $job = (UPDATE job:{_record_id(job_id)} SET status = 'queued', "
                "step = 'queued', progress = 0, claim_id = NONE, "
                "worker_id = NONE, worker_run_id = NONE, error = NONE, sequence += 1 "
                "WHERE type = 'index_document' AND status = 'failed' "
                "AND payload.index_input_id = $input_id RETURN AFTER); "
                "IF array::len($job) = 0 THEN THROW 'retry_conflict'; END; "
                f"LET $document = (UPDATE {document_id} SET process_status = 'indexing' "
                "WHERE process_status = 'failed' RETURN AFTER); "
                "IF array::len($document) = 0 THEN THROW 'retry_conflict'; END; "
                "COMMIT TRANSACTION;", {"input_id": job["payload"]["index_input_id"]},
            )
        except Exception as error:
            if "retry_conflict" in str(error):
                return None
            raise SurrealDatabaseError("Unable to requeue failed index job") from error
        return await self.get_job(job_id)

    async def indexed_chunks(self, document_record_id: str) -> list[Mapping[str, Any]] | None:
        document = await self.get_document(document_record_id)
        if document is None or document.get("process_status") != "indexed":
            return None
        chunks = await self.client.query(
            "SELECT * FROM chunk WHERE document_id = type::record('document', $id) "
            "ORDER BY position.chunk_index ASC;", {"id": document_record_id},
        )
        from app.api.v1.jobs import _as_response

        for chunk in chunks:
            inputs = await self.client.query(
                "SELECT * FROM chunk_correction_input WHERE chunk_id = $chunk_id "
                "ORDER BY created_at DESC LIMIT 1;", {"chunk_id": chunk["id"]},
            )
            chunk["correction"] = None
            if inputs:
                captured = inputs[0]
                parent = await self.get_job(str(captured["job_id"]))
                if parent:
                    children = await self.followup_jobs(str(parent["id"]))
                    chunk["correction"] = {
                        "input_id": str(captured["id"]), "outcome": captured["status"],
                        "job": _as_response(parent).model_dump(),
                        "children": [_as_response(child).model_dump() for child in children],
                        "chunk_child_ids": [str(child["id"]) for child in children
                                            if str(child["payload"].get("chunk_id")) == str(chunk["id"])],
                    }
        return chunks

    async def request_chunk_correction(
        self, document_record_id: str, chunk_id: str
    ) -> Mapping[str, Any] | None:
        """Create one automatically-applied correction request under chunk locks.

        Capturing the text and taking the durable lock are one transaction.  The
        earlier read is used only to build guarded statements; every mutable
        value is checked again by the transaction.
        """
        if not isinstance(chunk_id, str) or not re.fullmatch(r"chunk:chunk_[0-9a-f]{32}", chunk_id):
            return None
        chunks = await self.indexed_chunks(document_record_id)
        if chunks is None:
            return None
        selected = [chunk for chunk in chunks if str(chunk["id"]) == chunk_id]
        if len(selected) != 1:
            return None
        job_record_id = f"job_{uuid4().hex}"
        input_record_id = f"input_{uuid4().hex}"
        validate_payload("correct_chunks", {"chunk_id": chunk_id, "correction_input_id": f"chunk_correction_input:{input_record_id}"})
        statements = ["BEGIN TRANSACTION;",
                      f"LET $document = (SELECT id FROM document:{document_record_id} WHERE process_status = 'indexed');",
                      "IF array::len($document) = 0 THEN THROW 'not_indexed'; END;",
                      f"CREATE job:{job_record_id} CONTENT {{document_id: document:{document_record_id}, "
                      f"type: 'correct_chunks', dedupe_key: 'correct_chunks:{uuid4().hex}', "
                      f"payload: {{chunk_id: {chunk_id}, correction_input_id: chunk_correction_input:{input_record_id}}}, followup_job_ids: [], "
                      "status: 'queued', step: 'queued', progress: 0, sequence: 1};"]
        variables: dict[str, Any] = {}
        for index, chunk in enumerate(selected):
            chunk_id = str(chunk["id"])
            variables[f"base_{index}"] = str(chunk["text"])
            statements.extend([
                f"LET $lock_{index} = (UPDATE {chunk_id} SET active_job_id = job:{job_record_id} "
                f"WHERE document_id = document:{document_record_id} AND text = $base_{index} "
                "AND active_job_id IS NONE RETURN AFTER);",
                f"IF array::len($lock_{index}) = 0 THEN THROW 'chunk_busy_or_changed'; END;",
                f"CREATE chunk_correction_input:{input_record_id} CONTENT {{"
                f"document_id: document:{document_record_id}, chunk_id: {chunk_id}, job_id: job:{job_record_id}, "
                f"base_text: $base_{index}, embedding_text: $lock_{index}[0].embedding_text, "
                f"embedding_version: $lock_{index}[0].embedding_version, hierarchy: $lock_{index}[0].hierarchy, "
                f"embedding_status: $lock_{index}[0].embedding_status, status: 'pending'}};",
            ])
        statements.append("COMMIT TRANSACTION;")
        try:
            await self.client.query(" ".join(statements), variables)
        except Exception as error:
            if any(marker in str(error) for marker in ("chunk_busy_or_changed", "not_indexed")):
                return None
            raise SurrealDatabaseError("Unable to request chunk correction") from error
        return await self.get_job(job_record_id)

    async def correction_inputs(self, job_id: str) -> list[Mapping[str, Any]]:
        job = await self.get_job(job_id)
        if not job or job["type"] != "correct_chunks":
            return []
        payload = validate_payload(job["type"], job["payload"])
        rows = await self.client.query(
            f"SELECT * FROM {payload.correction_input_id} WHERE job_id = $job_id "
            "AND chunk_id = $chunk_id AND document_id = $document_id;",
            {"job_id": job["id"], "chunk_id": job["payload"]["chunk_id"], "document_id": job["document_id"]},
        )
        return rows

    async def followup_jobs(self, job_id: str) -> list[Mapping[str, Any]]:
        """Return the optional durable child for a completed correction."""

        job = await self.get_job(job_id)
        if not job:
            return []
        ids = job.get("followup_job_ids") or []
        rows: list[Mapping[str, Any]] = []
        for child_id in ids:
            child = await self.get_job(str(child_id))
            if child is not None:
                rows.append(child)
        return rows

    async def apply_chunk_corrections(
        self, job_id: str, claim_id: str, corrections: Mapping[str, str],
    ) -> list[Mapping[str, Any]] | None:
        """Atomically apply one captured result and create its optional child.

        The model call happens before this operation. A conflict aborts both
        the text change and creation of the embedding child.
        """

        record_id = _record_id(job_id)
        if not _JOB_ID.fullmatch(record_id):
            return None
        job = await self.get_job(job_id)
        if job and job.get("status") == "completed" and job.get("claim_id") == claim_id:
            return await self.followup_jobs(job_id)
        inputs = await self.correction_inputs(job_id)
        if len(inputs) != 1 or set(map(str, (row["id"] for row in inputs))) != set(corrections):
            raise ValueError("Correction results do not match the selected chunks")
        from app.application.chunking import build_embedding_text

        statements = [
            "BEGIN TRANSACTION;",
            f"LET $parent = (UPDATE job:{record_id} SET sequence += 1 "
            "WHERE type = 'correct_chunks' "
            "AND status = 'running' AND claim_id = $claim_id RETURN AFTER);",
            "IF array::len($parent) = 0 THEN THROW 'claim_conflict'; END;",
            "LET $document = (SELECT id FROM document WHERE id = $parent[0].document_id AND process_status = 'indexed');",
            "IF array::len($document) = 0 THEN THROW 'chunk_conflict'; END;",
        ]
        variables: dict[str, Any] = {"claim_id": claim_id}
        child_ids: list[str] = []
        for index, captured in enumerate(inputs):
            input_id = _record_id(captured["id"])
            chunk_id = str(captured["chunk_id"])
            proposed = corrections[str(captured["id"])]
            base = str(captured["base_text"])
            changed = proposed != base
            stale = captured["embedding_status"] == "stale"
            if not re.fullmatch(r"input_[0-9a-f]{32}", input_id) or not re.fullmatch(r"chunk:chunk_[0-9a-f]{32}", chunk_id):
                raise ValueError("Invalid correction input ID")
            variables.update({f"captured_embedding_{index}": captured["embedding_text"],
                              f"version_{index}": captured["embedding_version"],
                              f"hierarchy_{index}": captured["hierarchy"],
                              f"document_{index}": captured["document_id"],
                              f"captured_status_{index}": captured["embedding_status"]})
            statements.extend([
                f"LET $fence_{index} = (SELECT id FROM {chunk_id} WHERE document_id = $document_{index} "
                f"AND document_id = $parent[0].document_id AND text = $base_{index} "
                f"AND embedding_text = $captured_embedding_{index} AND embedding_version = $version_{index} "
                f"AND hierarchy = $hierarchy_{index} AND embedding_status = $captured_status_{index} "
                f"AND active_job_id = job:{record_id});",
                f"IF array::len($fence_{index}) = 0 THEN THROW 'chunk_conflict'; END;",
            ])
            child_id = f"job_{uuid4().hex}" if changed or stale else None
            variables.update({f"base_{index}": base, f"proposed_{index}": proposed})
            statements.extend([
                f"LET $input_{index} = (UPDATE chunk_correction_input:{input_id} SET proposed_text = $proposed_{index}, "
                f"status = $audit_status_{index} WHERE job_id = job:{record_id} AND status = 'pending' "
                f"AND chunk_id = {chunk_id} AND document_id = $document_{index} AND base_text = $base_{index} "
                f"AND embedding_text = $captured_embedding_{index} AND embedding_version = $version_{index} "
                f"AND hierarchy = $hierarchy_{index} AND embedding_status = $captured_status_{index} RETURN AFTER);",
                f"IF array::len($input_{index}) = 0 THEN THROW 'input_conflict'; END;",
            ])
            variables[f"audit_status_{index}"] = "applied" if changed else "unchanged"
            if changed:
                hierarchy = captured["hierarchy"]
                embedding_text = build_embedding_text(hierarchy, proposed)
                variables.update({f"embedding_{index}": embedding_text, f"tokens_{index}": len(proposed.split())})
                # The child lock is installed with the text update, so a new
                # Correct request cannot race the queued embedding.
                statements.extend([
                    f"LET $chunk_{index} = (UPDATE {chunk_id} SET text = $proposed_{index}, "
                    f"embedding_text = $embedding_{index}, token_count = $tokens_{index}, embedding_status = 'stale', embedding_version += 1, "
                    f"active_job_id = job:{child_id}, last_embedding_job_id = job:{child_id} WHERE text = $base_{index} AND active_job_id = job:{record_id} RETURN AFTER);",
                    f"IF array::len($chunk_{index}) = 0 THEN THROW 'chunk_conflict'; END;",
                ])
            elif child_id:
                statements.extend([
                    f"LET $chunk_{index} = (UPDATE {chunk_id} SET active_job_id = job:{child_id}, last_embedding_job_id = job:{child_id} "
                    f"WHERE text = $base_{index} AND active_job_id = job:{record_id} AND embedding_status = 'stale' RETURN AFTER);",
                    f"IF array::len($chunk_{index}) = 0 THEN THROW 'chunk_conflict'; END;",
                ])
            else:
                statements.extend([
                    f"LET $chunk_{index} = (UPDATE {chunk_id} SET active_job_id = NONE "
                    f"WHERE text = $base_{index} AND active_job_id = job:{record_id} RETURN AFTER);",
                    f"IF array::len($chunk_{index}) = 0 THEN THROW 'chunk_conflict'; END;",
                ])
            if child_id:
                child_ids.append(child_id)
                # For a changed chunk the transaction writes this same value;
                # for stale no-op it is the current captured input.
                if not changed:
                    variables[f"embedding_{index}"] = captured["embedding_text"]
                validate_payload("reembed_chunk", {"chunk_id": chunk_id, "embedding_text": variables[f"embedding_{index}"], "embedding_version": captured["embedding_version"] + int(changed)})
                statements.append(
                    f"CREATE job:{child_id} CONTENT {{document_id: {str(job['document_id'])}, payload: {{chunk_id: {chunk_id}, "
                    f"embedding_version: {captured['embedding_version'] + int(changed)}, embedding_text: $embedding_{index}}}, type: 'reembed_chunk', dedupe_key: 'reembed_chunk:{uuid4().hex}', "
                    "status: 'queued', step: 'queued', progress: 0, sequence: 1};"
                )
        followups = "[" + ", ".join(f"job:{child_id}" for child_id in child_ids) + "]"
        statements.extend([
            f"LET $complete = (UPDATE job:{record_id} SET status = 'completed', step = 'completed', progress = 100, "
            f"followup_job_ids = {followups}, sequence += 1 WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER);",
            "IF array::len($complete) = 0 THEN THROW 'claim_conflict'; END;",
            "COMMIT TRANSACTION;",
        ])
        try:
            await self.client.query(" ".join(statements), variables)
        except Exception as error:
            if any(marker in str(error) for marker in ("claim_conflict", "input_conflict", "chunk_conflict")):
                return None
            # A timeout can occur after commit.  Durable state is authoritative.
            current = await self.reconcile_failure(job_id, claim_id, "Correction commit failed")
            if current.get("status") == "completed" and current.get("claim_id") == claim_id:
                return current.get("_followups", [])
            raise SurrealDatabaseError("Unable to apply chunk corrections") from error
        return await self.followup_jobs(job_id)

    async def complete_reembed_job(self, job_id: str, claim_id: str, embedding_text: str, vector: list[float]) -> Mapping[str, Any] | None:
        job = await self.get_job(job_id)
        if job is None or job.get("status") != "running" or job.get("claim_id") != claim_id:
            return None
        chunk_id = str(job["payload"]["chunk_id"])
        record_id = _record_id(job_id)
        if not re.fullmatch(r"chunk:chunk_[0-9a-f]{32}", chunk_id):
            return None
        if job["payload"].get("embedding_text") != embedding_text or job["payload"].get("embedding_version") is None:
            return None
        try:
            await self.client.query(
                "BEGIN TRANSACTION; "
                f"LET $job = (UPDATE job:{record_id} SET status = 'completed', step = 'completed', "
                "progress = 100, sequence += 1 WHERE status = 'running' AND claim_id = $claim_id "
                "AND payload.embedding_text = $embedding_text AND payload.embedding_version = $version RETURN AFTER); "
                "IF array::len($job) = 0 THEN THROW 'claim_conflict'; END; "
                f"LET $chunk = (UPDATE {chunk_id} SET embedding = $vector, embedding_status = 'ok', active_job_id = NONE "
                f"WHERE embedding_text = $embedding_text AND active_job_id = job:{record_id} "
                "AND last_embedding_job_id = $job[0].id AND document_id = $job[0].document_id "
                "AND embedding_version = $version RETURN AFTER); "
                "IF array::len($chunk) = 0 THEN THROW 'chunk_conflict'; END; COMMIT TRANSACTION;",
                {"claim_id": claim_id, "embedding_text": embedding_text,
                 "version": job["payload"]["embedding_version"], "vector": vector},
            )
        except Exception as error:
            if any(marker in str(error) for marker in ("claim_conflict", "chunk_conflict")):
                return None
            raise
        return await self.get_job(job_id)

    async def fail_reembed_job(self, job_id: str, claim_id: str, error: str) -> None:
        await self.fail_claim(job_id, claim_id, error)

    async def apply_ocr_result(
        self, document_record_id: str, draft_record_id: str,
        pages: list[Mapping[str, Any]], metadata: Mapping[str, Any],
        job_id: str | None = None, claim_id: str | None = None,
    ) -> str:
        """Commit a new draft and review state together; never rewrite a draft."""

        if not re.fullmatch(r"doc_[0-9a-f]{32}", document_record_id):
            raise ValueError("Invalid document ID")
        if not re.fullmatch(r"ocr_job_[0-9a-f]{32}", draft_record_id):
            raise ValueError("Invalid draft ID")
        if (job_id is None) != (claim_id is None):
            raise ValueError("Job and claim IDs must be supplied together")
        job_record_id = _record_id(job_id) if job_id else None
        if job_record_id is not None and not _JOB_ID.fullmatch(job_record_id):
            raise ValueError("Invalid job ID")
        draft_id = f"ocr_draft:{draft_record_id}"
        existing = await self.client.query(f"SELECT id FROM {draft_id};")
        if existing:
            if job_id is not None:
                completed = await self.get_job(job_id)
                if completed is None or completed.get("status") != "completed" or completed.get("claim_id") != claim_id:
                    raise SurrealDatabaseError("OCR draft belongs to a different claim")
            return draft_id
        document = await self.get_document(document_record_id)
        if document is None:
            raise SurrealDatabaseError("OCR document not found")
        job_completion = (
            f"LET $completed = (UPDATE job:{job_record_id} SET status = 'completed', "
            f"step = 'completed', progress = 100, "
            "sequence += 1 WHERE status = 'running' AND claim_id = $claim_id "
            "RETURN AFTER); "
            "IF array::len($completed) = 0 THEN THROW 'job_claim_conflict'; END; "
            if job_record_id else ""
        )
        query = (
            "BEGIN TRANSACTION; "
            + (
                f"LET $claimed = (SELECT id FROM job:{job_record_id} "
                "WHERE status = 'running' AND claim_id = $claim_id); "
                "IF array::len($claimed) = 0 THEN THROW 'job_claim_conflict'; END; "
                if job_record_id else ""
            )
            +
            f"CREATE {draft_id} CONTENT {{document_id: document:{document_record_id}, "
            "status: 'draft', revision: 1, pages: $pages}; "
            f"LET $updated = (UPDATE document:{document_record_id} MERGE $changes "
            "WHERE process_status = 'processing' RETURN AFTER); "
            "IF array::len($updated) = 0 THEN THROW 'document_not_processing'; END; "
            + job_completion
            +
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(
                query, {"pages": [dict(page) for page in pages],
                        "changes": {
                            **dict(metadata),
                            "process_status": "review",
                            "page_count": len(pages),
                        },
                        "claim_id": claim_id},
            )
            return draft_id
        except Exception as error:
            # CREATE is unique by record ID. An ambiguous response or concurrent
            # repeat may have committed already; do not overwrite reviewed text.
            existing = await self.client.query(f"SELECT id FROM {draft_id};")
            if existing:
                return draft_id
            raise SurrealDatabaseError("Unable to apply OCR result") from error

    async def fail_job(
        self, job_id: str, claim_id: str, error: str
    ) -> Mapping[str, Any] | None:
        record_id = _record_id(job_id)
        if not _JOB_ID.fullmatch(record_id):
            return None
        existing = await self.get_job(job_id)
        if existing is None or existing.get("claim_id") != claim_id:
            return None
        if existing.get("status") == "failed":
            return existing
        if existing.get("status") != "running":
            return None
        document_id = str(existing["document_id"])
        if not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id):
            raise SurrealDatabaseError("Job has invalid document ID")
        query = (
            "BEGIN TRANSACTION; "
            f"LET $failed_document = (UPDATE {document_id} SET process_status = 'failed' "
            "WHERE process_status = 'processing' RETURN AFTER); "
            "IF array::len($failed_document) = 0 THEN THROW 'document_not_processing'; END; "
            f"LET $failed_job = (UPDATE job:{record_id} SET status = 'failed', "
            "step = 'failed', error = $error, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER); "
            "IF array::len($failed_job) = 0 THEN THROW 'job_claim_conflict'; END; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(query, {"claim_id": claim_id, "error": error[:500]})
        except Exception as failure:
            current = await self.get_job(job_id)
            if current and current.get("status") == "failed" and current.get("claim_id") == claim_id:
                return current
            if "document_not_processing" in str(failure) or "job_claim_conflict" in str(failure):
                return None
            raise SurrealDatabaseError("Unable to fail job") from failure
        return await self.get_job(job_id)

    async def fail_claim(self, job_id: str, claim_id: str, error: str,
                         owner: tuple[str, str] | None = None) -> None:
        """Atomically apply domain failure effects using only durable records."""
        job = await self.get_job(job_id)
        if not job or job.get("status") != "running" or job.get("claim_id") != claim_id:
            return
        if owner and (job.get("worker_id"), job.get("worker_run_id")) != owner:
            return
        record_id = _record_id(job_id)
        document_id = str(job["document_id"])
        if not _JOB_ID.fullmatch(record_id) or not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id):
            raise SurrealDatabaseError("Invalid failure record IDs")
        ownership = " AND worker_id = $worker_id AND worker_run_id = $worker_run_id" if owner else ""
        statements = [
            "BEGIN TRANSACTION;",
            f"LET $job = (UPDATE job:{record_id} SET status = 'failed', step = 'failed', "
            "error = $error, sequence += 1 WHERE status = 'running' "
            f"AND claim_id = $claim_id{ownership} RETURN AFTER);",
            "IF array::len($job) = 0 THEN THROW 'claim_conflict'; END;",
        ]
        variables = {"claim_id": claim_id, "error": error[:500]}
        if owner:
            variables.update(worker_id=owner[0], worker_run_id=owner[1])
        job_type = job["type"]
        if job_type in ("ocr_pdf", "index_document"):
            status = "processing" if job_type == "ocr_pdf" else "indexing"
            statements.append(f"UPDATE {document_id} SET process_status = 'failed' WHERE process_status = '{status}';")
        elif job_type == "correct_chunks":
            statements.append(f"UPDATE chunk_correction_input SET status = 'failed' WHERE job_id = job:{record_id} AND status = 'pending';")
            statements.append(f"UPDATE chunk SET active_job_id = NONE WHERE active_job_id = job:{record_id};")
        elif job_type == "reembed_chunk":
            statements.append(f"UPDATE chunk SET active_job_id = NONE WHERE active_job_id = job:{record_id};")
        elif job_type != "reembed_chunk":
            raise SurrealDatabaseError("Unsupported job type during failure recovery")
        statements.append("COMMIT TRANSACTION;")
        try:
            await self.client.query(" ".join(statements), variables)
        except Exception as failure:
            if "claim_conflict" not in str(failure):
                raise

    async def reconcile_failure(self, job_id: str, claim_id: str, error: str,
                                owner: tuple[str, str] | None = None) -> Mapping[str, Any]:
        """Discard processing state and settle an uncertain outcome independently."""
        fresh = SurrealDatabase(self._settings)
        async with asyncio.timeout(self._settings.failure_timeout_seconds):
            try:
                await fresh.connect()
                await fresh.fail_claim(job_id, claim_id, error, owner)
                current = await fresh.get_job(job_id)
                if not current:
                    raise SurrealDatabaseError("Job missing during reconciliation")
                logging.getLogger(__name__).info("job_outcome_reconciled", extra={
                    "job_id": job_id, "claim_id": claim_id, "reconciled_status": current.get("status"),
                })
                if current.get("status") == "running" and current.get("claim_id") == claim_id:
                    if not owner or (current.get("worker_id"), current.get("worker_run_id")) == owner:
                        raise SurrealDatabaseError("Failure persistence is pending")
                # The processing connection may already have been discarded.
                # Read any committed automatic fan-out before closing this fresh
                # connection so callers can still publish it after a lost reply.
                if (current.get("type") == "correct_chunks"
                        and current.get("status") == "completed"):
                    current = dict(current)
                    current["_followups"] = await fresh.followup_jobs(job_id)
                return current
            finally:
                await fresh.close()

    async def recover_abandoned_jobs(self, worker_run_id: str) -> None:
        """One bounded startup pass for this identity; never publish or retry."""
        if not self._settings.worker_id:
            raise ValueError("KNOWLEDGE_WORKER_ID is required for workers")
        async with asyncio.timeout(self._settings.startup_recovery_timeout_seconds):
            after = None
            while True:
                rows = await self.client.query(
                    "SELECT * FROM job WHERE status = 'running' AND worker_id = $worker_id "
                    "AND worker_run_id != $run_id "
                    + ("AND id > $after " if after is not None else "")
                    + "ORDER BY id LIMIT 100;",
                    {"worker_id": self._settings.worker_id, "run_id": worker_run_id, "after": after},
                )
                if not rows:
                    return
                for row in rows:
                    await self.reconcile_failure(str(row["id"]), row["claim_id"],
                        "Worker stopped before processing completed; manual retry required",
                        (self._settings.worker_id, row["worker_run_id"]))
                after = rows[-1]["id"]

    async def fail_processing_document(self, record_id: str) -> bool:
        """Only a still-processing document may become failed."""

        if not re.fullmatch(r"doc_[0-9a-f]{32}", record_id):
            return False
        rows = await self.client.query(f"SELECT process_status FROM document:{record_id};")
        if not rows:
            return False
        if rows[0]["process_status"] == "failed":
            return True
        changed = await self.client.query(
            f"UPDATE document:{record_id} SET process_status = 'failed' "
            "WHERE process_status = 'processing' RETURN AFTER;"
        )
        return bool(changed)

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
