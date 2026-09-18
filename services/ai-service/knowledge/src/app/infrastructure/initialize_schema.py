"""CLI entry point for applying the knowledge SurrealDB schema."""

import asyncio

from app.config import get_settings
from app.infrastructure.surreal import SurrealDatabase


async def main() -> None:
    """Connect to SurrealDB and apply the schema."""

    settings = get_settings()
    if not settings.surreal_enabled:
        raise RuntimeError("Set KNOWLEDGE_SURREAL_ENABLED=true before applying the schema")

    database = SurrealDatabase(settings)
    await database.connect()
    try:
        await database.apply_schema()
        print("Knowledge schema applied.")
    finally:
        await database.close()


if __name__ == "__main__":
    asyncio.run(main())
