"""Async SurrealDB adapter and schema bootstrap support."""

import asyncio
import hashlib
import json
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from uuid import uuid4

from surrealdb import AsyncSurreal

from app.config import Settings


class SurrealDatabaseError(RuntimeError):
    """Raised when the database cannot be prepared for this service."""


_DOCUMENT_ID = re.compile(r"doc_[0-9a-f]{32}\Z")
_JOB_ID = re.compile(r"job_[0-9a-f]{32}\Z")


def _record_id(value: Any) -> str:
    """Extract the record key from a SurrealDB ID."""

    if hasattr(value, "id"):
        return str(value.id)
    return str(value).split(":", maxsplit=1)[-1]


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
            "progress: 0, processed_pages: 0, sequence: 1}; "
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
                    "progress = 5, claim_id = $claim_id, sequence += 1 "
                    "WHERE status = 'queued' AND type = $type RETURN AFTER;",
                    {"claim_id": claim_id, "type": job_type},
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
        fields = {"step", "progress", "total_pages", "processed_pages"}
        if not _JOB_ID.fullmatch(record_id) or not changes or set(changes) - fields:
            raise ValueError("Invalid progress update")
        previous = await self.get_job(job_id)
        if previous is None or previous.get("claim_id") != claim_id or previous.get("status") != "running":
            return None
        if int(changes.get("progress", previous["progress"])) < int(previous["progress"]):
            return None
        if int(changes.get("processed_pages", previous.get("processed_pages", 0))) < int(previous.get("processed_pages", 0)):
            return None
        if all(previous.get(key) == value for key, value in changes.items()):
            return previous
        assignments = ", ".join(f"{field} = $changes.{field}" for field in changes)
        rows = await self.client.query(
            f"UPDATE job:{record_id} SET {assignments}, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id "
            "AND progress <= $minimum_progress AND processed_pages <= $minimum_pages RETURN AFTER;",
            {
                "claim_id": claim_id, "changes": dict(changes),
                "minimum_progress": changes.get("progress", previous["progress"]),
                "minimum_pages": changes.get("processed_pages", previous.get("processed_pages", 0)),
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
            return rows[0] if rows[0].get("confirmation_fingerprint") == fingerprint else None
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
            text = edits[page_no] if page_no in edits else (page.get("reviewed_text") if page.get("reviewed_text") is not None else page.get("corrected_text") if page.get("corrected_text") is not None else page.get("raw_text", ""))
            index_pages.append({"page": page_no, "text": str(text)})
        if not any(page["text"].strip() for page in index_pages):
            return None
        draft_record_id = _record_id(draft["id"])
        job_record_id = f"job_{uuid4().hex}"
        input_record_id = f"index_input_{uuid4().hex}"
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
            f"document_id: document:{document_record_id}, index_input_id: index_input:{input_record_id}, confirmation_fingerprint: $fingerprint, "
            "type: 'index_document', dedupe_key: 'index_document', "
            "status: 'queued', step: 'queued', progress: 0, processed_pages: 0, sequence: 1}; "
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
                return rows[0] if rows[0].get("confirmation_fingerprint") == fingerprint else None
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
        index_input_id = str(job.get("index_input_id", ""))
        if not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id) or not re.fullmatch(r"index_input:index_input_[0-9a-f]{32}", index_input_id):
            return None
        record_id = _record_id(job_id)
        statements = [
            "BEGIN TRANSACTION;",
            f"LET $claimed = (SELECT id FROM job:{record_id} WHERE status = 'running' AND claim_id = $claim_id);",
            "IF array::len($claimed) = 0 THEN THROW 'job_claim_conflict'; END;",
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
            f"UPDATE job SET ocr_draft_id = NONE WHERE document_id = {document_id} AND ocr_draft_id IS NOT NONE;",
            f"DELETE {index_input_id};",
            f"DELETE ocr_draft WHERE document_id = {document_id};",
            "COMMIT TRANSACTION;",
        ])
        try:
            await self.client.query(" ".join(statements), variables)
        except Exception as error:
            current = await self.get_job(job_id)
            if current and current.get("status") == "completed" and current.get("claim_id") == claim_id:
                return current
            raise SurrealDatabaseError("Unable to commit document index") from error
        return await self.get_job(job_id)

    async def get_index_input_for_job(self, job_id: str) -> Mapping[str, Any] | None:
        """Load the immutable review-confirmed input for an index worker."""

        job = await self.get_job(job_id)
        if job is None or job.get("type") != "index_document" or not job.get("index_input_id"):
            return None
        try:
            rows = await self.client.query(f"SELECT * FROM {job['index_input_id']};")
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
            "error = $error, progress = 100, sequence += 1 WHERE status = 'running' "
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
        input_id = str(job.get("index_input_id", ""))
        document_id = str(job.get("document_id", ""))
        if not re.fullmatch(r"index_input:index_input_[0-9a-f]{32}", input_id) or not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id):
            return None
        try:
            if not await self.client.query(f"SELECT id FROM {input_id};"):
                return None
            rows = await self.client.query(
                f"UPDATE job:{_record_id(job_id)} "
                "SET status = 'queued', step = 'queued', progress = 0, processed_pages = 0, "
                "claim_id = NONE, error = NONE, sequence += 1 "
                "WHERE status = 'failed' AND index_input_id = type::record('index_input', $input_id) RETURN AFTER;",
                {"input_id": _record_id(input_id)},
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to requeue failed index job") from error
        if not rows:
            return None
        await self.client.query(f"UPDATE {document_id} SET process_status = 'indexing' WHERE process_status = 'failed';")
        return rows[0]

    async def indexed_chunks(self, document_record_id: str) -> list[Mapping[str, Any]] | None:
        document = await self.get_document(document_record_id)
        if document is None or document.get("process_status") != "indexed":
            return None
        chunks = await self.client.query(
            "SELECT * FROM chunk WHERE document_id = type::record('document', $id) "
            "ORDER BY position.chunk_index ASC;", {"id": document_record_id},
        )
        for chunk in chunks:
            suggestions = await self.client.query(
                "SELECT * FROM correction_suggestion WHERE chunk_id = $chunk_id "
                "ORDER BY created_at DESC LIMIT 1;", {"chunk_id": chunk["id"]},
            )
            chunk["suggestion"] = (
                suggestions[0] if suggestions and suggestions[0]["status"] in ("pending", "ready", "outdated", "failed")
                else None
            )
        return chunks

    async def request_chunk_correction(
        self, document_record_id: str, chunk_ids: list[str]
    ) -> Mapping[str, Any] | None:
        if not chunk_ids or len(chunk_ids) > 100 or len(set(chunk_ids)) != len(chunk_ids):
            return None
        if any(not re.fullmatch(r"chunk:chunk_[0-9a-f]{32}", item) for item in chunk_ids):
            return None
        chunks = await self.indexed_chunks(document_record_id)
        if chunks is None:
            return None
        selected = [chunk for chunk in chunks if str(chunk["id"]) in chunk_ids]
        if len(selected) != len(chunk_ids) or any(chunk.get("suggestion") and chunk["suggestion"]["status"] in ("pending", "ready") for chunk in selected):
            return None
        job_record_id = f"job_{uuid4().hex}"
        statements = ["BEGIN TRANSACTION;",
                      f"LET $document = (SELECT id FROM document:{document_record_id} WHERE process_status = 'indexed');",
                      "IF array::len($document) = 0 THEN THROW 'not_indexed'; END;",
                      f"CREATE job:{job_record_id} CONTENT {{document_id: document:{document_record_id}, "
                      f"type: 'correct_chunks', dedupe_key: 'correct_chunks:{uuid4().hex}', "
                      "status: 'queued', step: 'queued', progress: 0, processed_pages: 0, sequence: 1};"]
        variables: dict[str, Any] = {}
        for index, chunk in enumerate(selected):
            chunk_id = str(chunk["id"])
            variables[f"base_{index}"] = str(chunk["text"])
            statements.extend([
                f"LET $busy_{index} = (SELECT id FROM correction_suggestion WHERE chunk_id = {chunk_id} "
                "AND status INSIDE ['pending', 'ready']);",
                f"IF array::len($busy_{index}) > 0 THEN THROW 'suggestion_busy'; END;",
                f"CREATE correction_suggestion:suggestion_{uuid4().hex} CONTENT {{"
                f"document_id: document:{document_record_id}, chunk_id: {chunk_id}, job_id: job:{job_record_id}, "
                f"base_text: $base_{index}, position: {index}, status: 'pending'}};",
            ])
        statements.append("COMMIT TRANSACTION;")
        try:
            await self.client.query(" ".join(statements), variables)
        except Exception as error:
            if "suggestion_busy" in str(error) or "not_indexed" in str(error):
                return None
            raise SurrealDatabaseError("Unable to request chunk correction") from error
        return await self.get_job(job_record_id)

    async def job_suggestions(self, job_id: str) -> list[Mapping[str, Any]]:
        return await self.client.query(
            "SELECT * FROM correction_suggestion WHERE job_id = type::record('job', $id) "
            "ORDER BY position ASC;", {"id": _record_id(job_id)},
        )

    async def save_suggestion(self, suggestion_id: str, text: str | None) -> None:
        record_id = _record_id(suggestion_id)
        if not re.fullmatch(r"suggestion_[0-9a-f]{32}", record_id):
            raise ValueError("Invalid suggestion ID")
        await self.client.query(
            f"UPDATE correction_suggestion:{record_id} SET suggested_text = $text, "
            "status = $status WHERE status = 'pending';",
            {"text": text, "status": "ready" if text else "rejected"},
        )

    async def finish_chunk_correction(self, job_id: str, claim_id: str, error: str | None = None) -> None:
        record_id = _record_id(job_id)
        if not _JOB_ID.fullmatch(record_id):
            return
        status = "failed" if error else "completed"
        query = (
            "BEGIN TRANSACTION; "
            f"LET $job = (UPDATE job:{record_id} SET status = '{status}', step = '{status}', "
            "progress = 100, error = $error, sequence += 1 WHERE status = 'running' "
            "AND claim_id = $claim_id RETURN AFTER); "
            "IF array::len($job) = 0 THEN THROW 'claim_conflict'; END; "
            + ("UPDATE correction_suggestion SET status = 'failed' WHERE job_id = "
               f"job:{record_id} AND status = 'pending'; " if error else "")
            + "COMMIT TRANSACTION;"
        )
        await self.client.query(query, {"claim_id": claim_id, "error": error[:500] if error else None})

    async def accept_suggestion(self, suggestion_id: str) -> tuple[str, Mapping[str, Any] | None]:
        record_id = _record_id(suggestion_id)
        if not re.fullmatch(r"suggestion_[0-9a-f]{32}", record_id):
            return "missing", None
        rows = await self.client.query(f"SELECT * FROM correction_suggestion:{record_id};")
        if not rows:
            return "missing", None
        suggestion = rows[0]
        if suggestion.get("status") != "ready" or not suggestion.get("suggested_text"):
            return "conflict", None
        chunk_id = str(suggestion["chunk_id"])
        chunks = await self.client.query(f"SELECT * FROM {chunk_id};")
        if not chunks:
            return "conflict", None
        chunk = chunks[0]
        if chunk["text"] != suggestion["base_text"]:
            await self.client.query(f"UPDATE correction_suggestion:{record_id} SET status = 'outdated' WHERE status = 'ready';")
            return "outdated", None
        from app.application.chunking import build_embedding_text
        text = str(suggestion["suggested_text"])
        embedding_text = build_embedding_text(chunk["hierarchy"], text)
        token_count = len(text.split())
        job_record_id = f"job_{uuid4().hex}"
        try:
            await self.client.query(
                "BEGIN TRANSACTION; "
                f"LET $chunk = (UPDATE {chunk_id} SET text = $text, embedding_text = $embedding_text, "
                "token_count = $token_count, embedding_status = 'stale' WHERE text = $base_text RETURN AFTER); "
                "IF array::len($chunk) = 0 THEN THROW 'outdated'; END; "
                f"LET $suggestion = (UPDATE correction_suggestion:{record_id} SET status = 'accepted' "
                "WHERE status = 'ready' RETURN AFTER); "
                "IF array::len($suggestion) = 0 THEN THROW 'suggestion_conflict'; END; "
                f"CREATE job:{job_record_id} CONTENT {{document_id: {str(suggestion['document_id'])}, "
                f"chunk_id: {chunk_id}, type: 'reembed_chunk', dedupe_key: 'reembed_chunk:{uuid4().hex}', "
                "status: 'queued', step: 'queued', progress: 0, processed_pages: 0, sequence: 1}; "
                "COMMIT TRANSACTION;",
                {"text": text, "embedding_text": embedding_text, "token_count": token_count,
                 "base_text": suggestion["base_text"]},
            )
        except Exception as error:
            if "outdated" in str(error):
                await self.client.query(f"UPDATE correction_suggestion:{record_id} SET status = 'outdated' WHERE status = 'ready';")
                return "outdated", None
            if "suggestion_conflict" in str(error):
                return "conflict", None
            raise SurrealDatabaseError("Unable to accept correction") from error
        return "accepted", await self.get_job(job_record_id)

    async def reject_suggestion(self, suggestion_id: str) -> bool:
        record_id = _record_id(suggestion_id)
        if not re.fullmatch(r"suggestion_[0-9a-f]{32}", record_id):
            return False
        rows = await self.client.query(
            f"UPDATE correction_suggestion:{record_id} SET status = 'rejected' "
            "WHERE status = 'ready' RETURN AFTER;"
        )
        return bool(rows)

    async def complete_reembed_job(self, job_id: str, claim_id: str, embedding_text: str, vector: list[float]) -> None:
        job = await self.get_job(job_id)
        if job is None or job.get("status") != "running" or job.get("claim_id") != claim_id:
            return
        chunk_id = str(job["chunk_id"])
        record_id = _record_id(job_id)
        if not re.fullmatch(r"chunk:chunk_[0-9a-f]{32}", chunk_id):
            return
        await self.client.query(
            "BEGIN TRANSACTION; "
            f"LET $job = (UPDATE job:{record_id} SET status = 'completed', step = 'completed', "
            "progress = 100, sequence += 1 WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER); "
            "IF array::len($job) = 0 THEN THROW 'claim_conflict'; END; "
            f"UPDATE {chunk_id} SET embedding = $vector, embedding_status = 'ok' "
            "WHERE embedding_text = $embedding_text; COMMIT TRANSACTION;",
            {"claim_id": claim_id, "embedding_text": embedding_text, "vector": vector},
        )

    async def fail_reembed_job(self, job_id: str, claim_id: str, error: str) -> None:
        record_id = _record_id(job_id)
        if not _JOB_ID.fullmatch(record_id):
            return
        await self.client.query(
            f"UPDATE job:{record_id} SET status = 'failed', step = 'failed', "
            "progress = 100, error = $error, sequence += 1 WHERE type = 'reembed_chunk' "
            "AND status = 'running' AND claim_id = $claim_id;",
            {"claim_id": claim_id, "error": error[:500]},
        )


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
        skipped = document.get("llm_correction") == "skipped"
        next_job_record_id = f"job_{uuid4().hex}" if not skipped else None
        next_job = (
            f"CREATE job:{next_job_record_id} CONTENT {{"
            f"document_id: document:{document_record_id}, type: 'correct_ocr', "
            f"ocr_draft_id: {draft_id}, "
            "dedupe_key: 'correct_ocr', status: 'queued', step: 'queued', "
            "progress: 0, processed_pages: 0, sequence: 1}; "
            if next_job_record_id else ""
        )
        job_completion = (
            f"LET $completed = (UPDATE job:{job_record_id} SET status = 'completed', "
            f"step = 'completed', progress = 100, ocr_draft_id = {draft_id}, "
            + (f"next_job_id = job:{next_job_record_id}, " if next_job_record_id else "")
            +
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
            "status: 'draft', revision: 1, pages: $pages, "
            + ("correction_status: 'skipped'" if skipped else "correction_status: 'pending'")
            + "}; "
            f"LET $updated = (UPDATE document:{document_record_id} MERGE $changes "
            "WHERE process_status = 'processing' RETURN AFTER); "
            "IF array::len($updated) = 0 THEN THROW 'document_not_processing'; END; "
            + job_completion
            + next_job
            +
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(
                query, {"pages": [dict(page) for page in pages],
                        "changes": {
                            **(dict(metadata) if skipped else {}),
                            "process_status": "review" if skipped else "processing",
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
            "step = 'failed', progress = 100, error = $error, sequence += 1 "
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

    async def complete_correction_job(
        self, job_id: str, claim_id: str, draft_id: str,
        pages: list[Mapping[str, Any]], metadata: Mapping[str, Any],
        model: str, prompt_version: str,
    ) -> Mapping[str, Any] | None:
        """Commit corrected pages, metadata, review state, and job completion."""

        job = await self.get_job(job_id)
        if job is None or job.get("type") != "correct_ocr":
            return None
        if job.get("status") == "completed" and job.get("claim_id") == claim_id:
            return job
        if job.get("status") != "running" or job.get("claim_id") != claim_id:
            return None
        document_id = str(job["document_id"])
        if not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id):
            return None
        draft_record_id = _record_id(draft_id)
        if not re.fullmatch(r"ocr_job_[0-9a-f]{32}", draft_record_id):
            return None
        job_record_id = _record_id(job_id)
        query = (
            "BEGIN TRANSACTION; "
            f"LET $draft = (UPDATE ocr_draft:{draft_record_id} "
            "SET pages = $pages, correction_status = 'completed', "
            "correction_model = $model, correction_prompt_version = $prompt_version "
            "WHERE correction_status = 'pending' RETURN AFTER); "
            "IF array::len($draft) = 0 THEN THROW 'draft_not_pending'; END; "
            f"LET $document = (UPDATE {document_id} MERGE $changes "
            "WHERE process_status = 'processing' RETURN AFTER); "
            "IF array::len($document) = 0 THEN THROW 'document_not_processing'; END; "
            f"LET $job = (UPDATE job:{job_record_id} SET status = 'completed', "
            "step = 'completed', progress = 100, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER); "
            "IF array::len($job) = 0 THEN THROW 'job_claim_conflict'; END; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(query, {
                "pages": [dict(page) for page in pages],
                "model": model, "prompt_version": prompt_version,
                "changes": {**dict(metadata), "process_status": "review"},
                "claim_id": claim_id,
            })
        except Exception as error:
            current = await self.get_job(job_id)
            if current and current.get("status") == "completed" and current.get("claim_id") == claim_id:
                return current
            raise SurrealDatabaseError("Unable to complete OCR correction") from error
        return await self.get_job(job_id)

    async def fail_correction_job(
        self, job_id: str, claim_id: str, draft_id: str,
        metadata: Mapping[str, Any], error: str,
    ) -> Mapping[str, Any] | None:
        """Keep raw OCR reviewable after an optional correction failure."""

        job = await self.get_job(job_id)
        if job is None or job.get("type") != "correct_ocr":
            return None
        if job.get("status") == "failed" and job.get("claim_id") == claim_id:
            return job
        if job.get("status") != "running" or job.get("claim_id") != claim_id:
            return None
        document_id = str(job["document_id"])
        draft_record_id = _record_id(draft_id)
        if not re.fullmatch(r"document:doc_[0-9a-f]{32}", document_id) or not re.fullmatch(r"ocr_job_[0-9a-f]{32}", draft_record_id):
            return None
        job_record_id = _record_id(job_id)
        query = (
            "BEGIN TRANSACTION; "
            f"LET $draft = (UPDATE ocr_draft:{draft_record_id} SET correction_status = 'failed' "
            "WHERE correction_status = 'pending' RETURN AFTER); "
            "IF array::len($draft) = 0 THEN THROW 'draft_not_pending'; END; "
            f"LET $document = (UPDATE {document_id} MERGE $changes "
            "WHERE process_status = 'processing' RETURN AFTER); "
            "IF array::len($document) = 0 THEN THROW 'document_not_processing'; END; "
            f"LET $job = (UPDATE job:{job_record_id} SET status = 'failed', step = 'failed', "
            "progress = 100, error = $error, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER); "
            "IF array::len($job) = 0 THEN THROW 'job_claim_conflict'; END; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(query, {
                "changes": {**dict(metadata), "process_status": "review"},
                "claim_id": claim_id, "error": error[:500],
            })
        except Exception as failure:
            current = await self.get_job(job_id)
            if current and current.get("status") == "failed" and current.get("claim_id") == claim_id:
                return current
            raise SurrealDatabaseError("Unable to fail OCR correction") from failure
        return await self.get_job(job_id)

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
