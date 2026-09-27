"""Conservative reconciliation of MinIO source objects with durable documents."""

import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.infrastructure.minio import SourceObject
from app.observability.metrics import ORPHAN_CLEANUP

_SOURCE_KEY = re.compile(r"documents/doc_[0-9a-f]{32}/original\.pdf\Z")


class SourceObjectStore(Protocol):
    async def list_source_objects(self) -> list[SourceObject]: ...

    async def remove(self, object_key: str) -> None: ...


class SourceDocumentDatabase(Protocol):
    async def document_exists_by_source_key(self, object_key: str) -> bool: ...


class JobLookup(Protocol):
    async def find_creation(self, document_id: str) -> dict | None: ...


@dataclass
class OrphanCleanupResult:
    scanned: int = 0
    retained: int = 0
    dry_run_candidates: int = 0
    deleted: int = 0
    lookup_failures: int = 0
    delete_failures: int = 0


class OrphanCleanup:
    """Delete only source objects that survive every conservative safety gate."""

    def __init__(
        self,
        object_store: SourceObjectStore,
        database: SourceDocumentDatabase,
        *,
        grace_seconds: float,
        dry_run: bool,
        now: datetime | None = None,
        logger: logging.Logger | None = None,
        job_client: JobLookup | None = None,
    ) -> None:
        self._object_store = object_store
        self._database = database
        self._grace = timedelta(seconds=grace_seconds)
        self._dry_run = dry_run
        self._now = now
        self._logger = logger or logging.getLogger(__name__)
        self._job_client = job_client

    async def run_once(self) -> OrphanCleanupResult:
        """Inspect candidates; a failed lookup is always retained, never deleted."""

        result = OrphanCleanupResult()
        now = self._now or datetime.now(UTC)
        for source in await self._object_store.list_source_objects():
            result.scanned += 1
            ORPHAN_CLEANUP.labels(result="scanned").inc()
            if not _SOURCE_KEY.fullmatch(source.object_key) or not _is_old(source, now, self._grace):
                result.retained += 1
                ORPHAN_CLEANUP.labels(result="retained").inc()
                continue
            try:
                if await self._database.document_exists_by_source_key(source.object_key):
                    result.retained += 1
                    ORPHAN_CLEANUP.labels(result="retained").inc()
                    continue
            except Exception:
                result.lookup_failures += 1
                ORPHAN_CLEANUP.labels(result="lookup_failure").inc()
                self._logger.exception("orphan_cleanup_lookup_failed", extra={"objectKey": source.object_key})
                continue

            if self._dry_run:
                result.dry_run_candidates += 1
                ORPHAN_CLEANUP.labels(result="dry_run_candidate").inc()
                self._logger.info("orphan_cleanup_dry_run_candidate", extra={"objectKey": source.object_key})
                continue

            # A document can appear after the first check; never delete without
            # this immediate second indexed lookup.
            try:
                if await self._database.document_exists_by_source_key(source.object_key):
                    result.retained += 1
                    ORPHAN_CLEANUP.labels(result="retained").inc()
                    continue
            except Exception:
                result.lookup_failures += 1
                ORPHAN_CLEANUP.labels(result="lookup_failure").inc()
                self._logger.exception("orphan_cleanup_final_lookup_failed", extra={"objectKey": source.object_key})
                continue
            try:
                await self._object_store.remove(source.object_key)
                result.deleted += 1
                ORPHAN_CLEANUP.labels(result="deleted").inc()
                self._logger.info("orphan_cleanup_deleted", extra={"objectKey": source.object_key})
            except Exception:
                result.delete_failures += 1
                ORPHAN_CLEANUP.labels(result="delete_failure").inc()
                self._logger.exception("orphan_cleanup_delete_failed", extra={"objectKey": source.object_key})
        if self._job_client is not None:
            await self._cleanup_documents_without_jobs(result, now)
        return result

    async def _cleanup_documents_without_jobs(self, result: OrphanCleanupResult, now: datetime) -> None:
        """Audit old processing documents left before central job creation."""

        # The database adapter is the only production implementation of this
        # optional extension; older test fakes exercise source-object cleanup.
        if not hasattr(self._database, "list_processing_documents"):
            return
        for document in await self._database.list_processing_documents():
            created = document.get("created_at")
            if created is None:
                continue
            if not isinstance(created, datetime):
                created = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            if created > now - self._grace:
                continue
            document_id = str(document["id"])
            source_key = document.get("source", {}).get("object_key")
            if not isinstance(source_key, str) or not _SOURCE_KEY.fullmatch(source_key):
                continue
            try:
                if await self._job_client.find_creation(document_id) is not None:
                    continue
                if self._dry_run:
                    result.dry_run_candidates += 1
                    self._logger.info("missing_job_document_candidate", extra={"documentId": document_id})
                    continue
                # Recheck the job service immediately before deleting. A failed
                # lookup retains the document and its PDF.
                if await self._job_client.find_creation(document_id) is not None:
                    continue
                await self._database.delete_document(document_id.split(":", 1)[1])
                await self._object_store.remove(source_key)
                result.deleted += 1
            except Exception:
                result.lookup_failures += 1
                self._logger.exception("missing_job_document_cleanup_failed", extra={"documentId": document_id})


def _is_old(source: SourceObject, now: datetime, grace: timedelta) -> bool:
    modified = source.last_modified
    if modified.tzinfo is None:
        modified = modified.replace(tzinfo=UTC)
    return modified <= now - grace
