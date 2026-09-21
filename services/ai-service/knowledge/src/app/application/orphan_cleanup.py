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
    ) -> None:
        self._object_store = object_store
        self._database = database
        self._grace = timedelta(seconds=grace_seconds)
        self._dry_run = dry_run
        self._now = now
        self._logger = logger or logging.getLogger(__name__)

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
        return result


def _is_old(source: SourceObject, now: datetime, grace: timedelta) -> bool:
    modified = source.last_modified
    if modified.tzinfo is None:
        modified = modified.replace(tzinfo=UTC)
    return modified <= now - grace
