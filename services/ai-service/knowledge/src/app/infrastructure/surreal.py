"""Async SurrealDB adapter and schema bootstrap support."""

import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from surrealdb import AsyncSurreal

from app.config import Settings


class SurrealDatabaseError(RuntimeError):
    """Raised when the database cannot be prepared for this service."""


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


    async def delete_document(self, record_id: str) -> None:
        """Remove a document after a failed multi-store upload."""

        try:
            await self.client.query(f"DELETE document:{record_id};")
        except Exception as error:
            raise SurrealDatabaseError("Unable to remove document metadata") from error


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


    async def apply_ocr_result(
        self, document_record_id: str, draft_record_id: str,
        pages: list[Mapping[str, Any]], metadata: Mapping[str, Any],
    ) -> str:
        """Commit a new draft and review state together; never rewrite a draft."""

        if not re.fullmatch(r"doc_[0-9a-f]{32}", document_record_id):
            raise ValueError("Invalid document ID")
        if not re.fullmatch(r"ocr_job_[0-9a-f]{32}", draft_record_id):
            raise ValueError("Invalid draft ID")
        draft_id = f"ocr_draft:{draft_record_id}"
        existing = await self.client.query(f"SELECT id FROM {draft_id};")
        if existing:
            return draft_id
        query = (
            "BEGIN TRANSACTION; "
            f"CREATE {draft_id} CONTENT {{document_id: document:{document_record_id}, "
            "status: 'draft', revision: 1, pages: $pages}; "
            f"LET $updated = (UPDATE document:{document_record_id} MERGE $changes "
            "WHERE process_status = 'processing' RETURN AFTER); "
            "IF array::len($updated) = 0 THEN THROW 'document_not_processing'; END; "
            "COMMIT TRANSACTION;"
        )
        try:
            await self.client.query(
                query, {"pages": [dict(page) for page in pages],
                        "changes": {**dict(metadata), "process_status": "review", "page_count": len(pages)}},
            )
            return draft_id
        except Exception as error:
            # CREATE is unique by record ID. An ambiguous response or concurrent
            # repeat may have committed already; do not overwrite reviewed text.
            existing = await self.client.query(f"SELECT id FROM {draft_id};")
            if existing:
                return draft_id
            raise SurrealDatabaseError("Unable to apply OCR result") from error

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

    async def list_processing_documents(self) -> list[Mapping[str, Any]]:
        """Return documents eligible for a conservative missing-job audit."""

        try:
            return await self.client.query(
                "SELECT id, source, created_at FROM document "
                "WHERE process_status = 'processing' ORDER BY id;"
            )
        except Exception as error:
            raise SurrealDatabaseError("Unable to list processing documents") from error


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
