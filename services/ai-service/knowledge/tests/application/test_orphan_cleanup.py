"""Safety gates for source-object orphan cleanup."""

import asyncio
from datetime import UTC, datetime, timedelta

from app.application.orphan_cleanup import OrphanCleanup, SourceObject


class _Store:
    def __init__(self, objects: list[SourceObject]) -> None:
        self.objects = objects
        self.deleted: list[str] = []

    async def list_source_objects(self) -> list[SourceObject]:
        return self.objects

    async def remove(self, object_key: str) -> None:
        self.deleted.append(object_key)


class _Database:
    def __init__(self, present: set[str] | None = None) -> None:
        self.present = present or set()
        self.lookups: list[str] = []

    async def document_exists_by_source_key(self, key: str) -> bool:
        self.lookups.append(key)
        return key in self.present


def test_old_orphan_is_only_reported_in_dry_run() -> None:
    key = "documents/doc_" + "a" * 32 + "/original.pdf"
    store = _Store([SourceObject(key, datetime.now(UTC) - timedelta(days=2))])
    database = _Database()

    result = asyncio.run(
        OrphanCleanup(store, database, grace_seconds=60, dry_run=True).run_once()
    )

    assert result.dry_run_candidates == 1
    assert store.deleted == []


def test_old_orphan_is_deleted_only_after_two_absent_database_checks() -> None:
    key = "documents/doc_" + "d" * 32 + "/original.pdf"
    store = _Store([SourceObject(key, datetime.now(UTC) - timedelta(days=2))])
    database = _Database()

    result = asyncio.run(
        OrphanCleanup(store, database, grace_seconds=60, dry_run=False).run_once()
    )

    assert result.deleted == 1
    assert store.deleted == [key]
    assert database.lookups == [key, key]


def test_cleanup_never_deletes_malformed_or_recent_or_rechecked_document() -> None:
    old_key = "documents/doc_" + "b" * 32 + "/original.pdf"
    store = _Store(
        [
            SourceObject("documents/not-a-document/original.pdf", datetime.now(UTC) - timedelta(days=2)),
            SourceObject(old_key, datetime.now(UTC) - timedelta(seconds=1)),
        ]
    )
    database = _Database()

    result = asyncio.run(
        OrphanCleanup(store, database, grace_seconds=60, dry_run=False).run_once()
    )

    assert result.deleted == 0
    assert store.deleted == []


def test_final_database_recheck_prevents_racing_document_deletion() -> None:
    key = "documents/doc_" + "c" * 32 + "/original.pdf"
    store = _Store([SourceObject(key, datetime.now(UTC) - timedelta(days=2))])

    class _RacingDatabase:
        def __init__(self) -> None:
            self.calls = 0

        async def document_exists_by_source_key(self, _key: str) -> bool:
            self.calls += 1
            return self.calls == 2

    result = asyncio.run(
        OrphanCleanup(store, _RacingDatabase(), grace_seconds=60, dry_run=False).run_once()
    )

    assert result.retained == 1
    assert store.deleted == []
