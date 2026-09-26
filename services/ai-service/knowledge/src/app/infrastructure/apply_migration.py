"""Apply one explicitly selected SurrealDB migration during deployment."""

import asyncio
import sys
from pathlib import Path

from app.config import get_settings
from app.infrastructure.surreal import SurrealDatabase


async def main(name: str) -> None:
    if name not in {
        "001_job_row_dispatch_backfill",
        "002_remove_outbox_events",
        "003_remove_outbox_table",
    }:
        raise ValueError(f"Unknown migration: {name}")
    path = Path.cwd() / "db" / "migrations" / f"{name}.surql"
    database = SurrealDatabase(get_settings())
    await database.connect()
    try:
        await database.execute_script(path.read_text(encoding="utf-8"))
    finally:
        await database.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.infrastructure.apply_migration MIGRATION_NAME")
    asyncio.run(main(sys.argv[1]))
