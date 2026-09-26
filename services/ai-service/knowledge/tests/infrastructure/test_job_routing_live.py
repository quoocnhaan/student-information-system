"""Opt-in checks against the configured SurrealDB server version."""

import asyncio
import logging
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.config import Settings
from app.dispatcher import drain_due_jobs
from app.infrastructure.rabbitmq import RabbitMqBroker
from app.infrastructure.surreal import SurrealDatabase
from app.job_status_subscription import run_job_status_subscription


@pytest.mark.skipif(
    os.getenv("KNOWLEDGE_RUN_LIVE_ROUTING_TEST") != "1",
    reason="requires a running local SurrealDB",
)
def test_live_dispatch_uses_persisted_type_and_generation_guard() -> None:
    async def scenario() -> None:
        database_name = f"routing_test_{uuid4().hex}"
        settings = Settings().model_copy(update={
            "surreal_url": "ws://localhost:8001",
            "surreal_database": database_name,
        })
        database = SurrealDatabase(settings)
        document_id = f"doc_{uuid4().hex}"
        job_id = f"job_{uuid4().hex}"
        connected = False

        try:
            await database.connect()
            connected = True
            await database.apply_schema()
            await database.create_document_with_job(
                document_id,
                {
                    "source": {
                        "object_key": f"routing-tests/{document_id}/source.pdf",
                        "original_filename": "source.pdf",
                        "mime_type": "application/pdf",
                    },
                    "process_status": "processing",
                    "status": "active",
                },
                job_id,
                "ocr",
            )

            job = await database.get_job(job_id)
            assert job is not None
            assert job["dispatch_generation"] == 1
            assert job.get("dispatch_published_at") is None

            await database.client.query(
                f"UPDATE job:{job_id} SET dispatch_generation = 2;"
            )
            retry_job = await database.get_job(job_id)
            assert retry_job is not None
            assert retry_job["dispatch_generation"] == 2
            assert await database.claim_job(job_id, "routing-test", 180, 1) is None
            claimed = await database.claim_job(job_id, "routing-test", 180, 2)
            assert claimed is not None
            assert claimed["status"] == "running"
            assert claimed["type"] == "ocr"
        finally:
            if connected:
                try:
                    await database.client.query(f"REMOVE DATABASE {database_name};")
                finally:
                    await database.close()

    asyncio.run(scenario())


@pytest.mark.skipif(
    os.getenv("KNOWLEDGE_RUN_LIVE_ROUTING_TEST") != "1",
    reason="requires a running local SurrealDB",
)
def test_live_api_subscription_broadcasts_authoritative_job_status() -> None:
    async def scenario() -> None:
        suffix = uuid4().hex
        database_name = f"status_test_{suffix}"
        settings = Settings().model_copy(update={
            "surreal_url": "ws://localhost:8001",
            "surreal_database": database_name,
        })
        database = SurrealDatabase(settings)
        await database.connect()
        stop = asyncio.Event()
        events: asyncio.Queue[dict] = asyncio.Queue()
        job_id = f"job:{'job_' + suffix}"

        class _Hub:
            async def active_job_ids(self):
                return (job_id,)

            async def broadcast(self, event):
                await events.put(event)

            async def close_all(self):
                pass

        app = SimpleNamespace(state=SimpleNamespace(
            database=database, job_status_hub=_Hub(), job_status_live=False,
        ))
        try:
            await database.apply_schema()
            task = asyncio.create_task(run_job_status_subscription(app, settings, stop))
            try:
                for _ in range(100):
                    if app.state.job_status_live:
                        break
                    await asyncio.sleep(0.05)
                assert app.state.job_status_live
                document_id = f"doc_{suffix}"
                await database.create_document_with_job(
                    document_id,
                    {
                        "source": {
                            "object_key": f"status-tests/{document_id}/source.pdf",
                            "original_filename": "source.pdf",
                            "mime_type": "application/pdf",
                        },
                        "process_status": "processing",
                        "status": "active",
                    },
                    f"job_{suffix}",
                    "ocr",
                )
                event = await asyncio.wait_for(events.get(), timeout=5)
                assert event["job_id"] == job_id
                assert event["sequence"] == 1
                assert event["event_type"] == "job.status_changed"
                assert "dispatch_lease_owner" not in event
            finally:
                stop.set()
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
        finally:
            try:
                await database.client.query(f"REMOVE DATABASE {database_name};")
            finally:
                await database.close()

    asyncio.run(scenario())


@pytest.mark.skipif(
    os.getenv("KNOWLEDGE_RUN_LIVE_ROUTING_TEST") != "1",
    reason="requires a running local SurrealDB",
)
def test_live_job_dispatch_migration_scripts_are_valid() -> None:
    async def scenario() -> None:
        database_name = f"dispatch_migration_test_{uuid4().hex}"
        settings = Settings().model_copy(update={
            "surreal_url": "ws://localhost:8001",
            "surreal_database": database_name,
        })
        database = SurrealDatabase(settings)
        await database.connect()
        try:
            legacy_id = f"job_{uuid4().hex}"
            older_retry_id = f"job_{uuid4().hex}"
            await database.client.query(
                f"CREATE job:{legacy_id} SET type = 'ocr', "
                "document_id = document:legacy, status = 'queued', "
                "step = 'queued', progress = 0, processed_pages = 0, "
                "attempts = 0, max_attempts = 3, created_at = time::now(), sequence = 1;"
            )
            await database.client.query(
                f"CREATE job:{older_retry_id} SET type = 'ocr', "
                "document_id = document:legacy, status = 'running', "
                "step = 'ocr', progress = 10, processed_pages = 0, "
                "attempts = 1, max_attempts = 3, created_at = time::now(), "
                "sequence = 2, dispatch_generation = 2;"
            )
            await database.apply_schema()
            migrations = Path(__file__).parents[2] / "db" / "migrations"
            backfill = (migrations / "001_job_row_dispatch_backfill.surql").read_text()
            await database.execute_script(backfill)
            legacy_job = await database.get_job(legacy_id)
            assert legacy_job is not None
            assert legacy_job["dispatch_generation"] == 1
            assert legacy_job["dispatch_publish_attempts"] == 0
            assert legacy_job.get("dispatch_published_at") is None
            assert any(str(row["id"]) == f"job:{legacy_id}"
                       for row in await database.get_due_dispatch_jobs(10))
            older_retry = await database.get_job(older_retry_id)
            assert older_retry is not None
            assert older_retry["dispatch_generation"] == 2
            assert older_retry["dispatch_publish_attempts"] == 0
            await database.client.query(
                f"UPDATE job:{legacy_id} SET dispatch_published_at = time::now();"
            )
            await database.execute_script(backfill)
            assert (await database.get_job(legacy_id))["dispatch_published_at"] is not None
            for name in ("002_remove_outbox_events", "003_remove_outbox_table"):
                await database.execute_script((migrations / f"{name}.surql").read_text())
        finally:
            try:
                await database.client.query(f"REMOVE DATABASE {database_name};")
            finally:
                await database.close()

    asyncio.run(scenario())


@pytest.mark.skipif(
    os.getenv("KNOWLEDGE_RUN_LIVE_ROUTING_TEST") != "1",
    reason="requires running local SurrealDB and RabbitMQ",
)
def test_live_job_row_dispatch_reaches_worker_claim() -> None:
    async def scenario() -> None:
        suffix = uuid4().hex
        database_name = f"dispatch_worker_test_{suffix}"
        exchange_name = f"knowledge.dispatch_test.{suffix}"
        queue_name = f"{exchange_name}.jobs"
        settings = Settings().model_copy(update={
            "surreal_url": "ws://localhost:8001",
            "surreal_database": database_name,
            "rabbitmq_jobs_exchange": exchange_name,
            "rabbitmq_jobs_queue": queue_name,
        })
        database = SurrealDatabase(settings)
        broker = RabbitMqBroker(settings)
        await database.connect()
        await broker.connect()
        try:
            await database.apply_schema()
            document_id = f"doc_{suffix}"
            job_id = f"job_{suffix}"
            await database.create_document_with_job(
                document_id,
                {
                    "source": {
                        "object_key": f"dispatch-tests/{document_id}/source.pdf",
                        "original_filename": "source.pdf",
                        "mime_type": "application/pdf",
                    },
                    "process_status": "processing",
                    "status": "active",
                },
                job_id,
                "ocr",
            )
            claimed = asyncio.Event()

            async def handler(delivered_id, generation, _redelivered, message):
                row = await database.claim_job(job_id, "live-test-worker", 180, generation)
                await message.ack()
                if row is not None and delivered_id == f"job:{job_id}":
                    claimed.set()

            await broker.consume_jobs(handler)
            await drain_due_jobs(database, broker, settings, logging.getLogger(__name__))
            await asyncio.wait_for(claimed.wait(), timeout=5)
            job = await database.get_job(job_id)
            assert job is not None
            assert job["status"] == "running"
            assert job.get("dispatch_published_at") is not None
        finally:
            await broker.stop_consuming_jobs()
            channel = await broker.connection.channel()
            try:
                queue = await channel.declare_queue(queue_name, passive=True)
                await queue.delete()
                exchange = await channel.declare_exchange(exchange_name, passive=True)
                await exchange.delete()
            finally:
                await channel.close()
                await broker.close()
            try:
                await database.client.query(f"REMOVE DATABASE {database_name};")
            finally:
                await database.close()

    asyncio.run(scenario())


@pytest.mark.skipif(
    os.getenv("KNOWLEDGE_RUN_LIVE_ROUTING_TEST") != "1",
    reason="requires a running local SurrealDB",
)
def test_live_job_subscription_and_dispatch_lease() -> None:
    async def scenario() -> None:
        database_name = f"dispatch_test_{uuid4().hex}"
        settings = Settings().model_copy(update={
            "surreal_url": "ws://localhost:8001",
            "surreal_database": database_name,
        })
        database = SurrealDatabase(settings)
        live_database = SurrealDatabase(settings)
        competitor = SurrealDatabase(settings)
        await database.connect()
        await live_database.connect()
        await competitor.connect()
        try:
            await database.apply_schema()
            subscription = await live_database.subscribe_to_job_changes()
            try:
                document_id = f"doc_{uuid4().hex}"
                job_id = f"job_{uuid4().hex}"
                await database.create_document_with_job(
                    document_id,
                    {
                        "source": {
                            "object_key": f"dispatch-tests/{document_id}/source.pdf",
                            "original_filename": "source.pdf",
                            "mime_type": "application/pdf",
                        },
                        "process_status": "processing",
                        "status": "active",
                    },
                    job_id,
                    "ocr",
                )
                changed = await asyncio.wait_for(anext(subscription.changes()), timeout=5)
                assert changed == f"job:{job_id}"
                due = await database.get_due_dispatch_jobs(10)
                assert any(str(row["id"]) == f"job:{job_id}" for row in due)
                assert (await database.get_dispatch_counts())["pending"] == 1
                claims = await asyncio.gather(
                    database.claim_job_dispatch(job_id, 1, "first", 30),
                    competitor.claim_job_dispatch(job_id, 1, "second", 30),
                )
                assert sum(claim is not None for claim in claims) == 1
                winner = "first" if claims[0] is not None else "second"
                loser = "second" if winner == "first" else "first"
                assert await database.mark_job_dispatch_published(job_id, 1, loser) is False
                retry_at = datetime.now(UTC) + timedelta(seconds=30)
                assert await database.mark_job_dispatch_failed(
                    job_id, 1, winner, "broker unavailable", retry_at
                ) is True
                assert await database.get_due_dispatch_jobs(10) == []
                assert await database.get_next_dispatch_due_at() is not None
                counts = await database.get_dispatch_counts()
                assert counts["pending"] == counts["errors"] == counts["delayed"] == 1
                await database.client.query(
                    f"UPDATE job:{job_id} SET dispatch_next_publish_at = time::now() - 1s;"
                )
                second_lease = await database.claim_job_dispatch(job_id, 1, loser, 30)
                assert second_lease is not None
                assert await database.mark_job_dispatch_published(job_id, 1, winner) is False
                assert await database.mark_job_dispatch_published(job_id, 1, loser) is True
                assert (await database.get_dispatch_counts())["pending"] == 0
            finally:
                await subscription.close()
        finally:
            try:
                await database.client.query(f"REMOVE DATABASE {database_name};")
            finally:
                await live_database.close()
                await competitor.close()
                await database.close()

    asyncio.run(scenario())


@pytest.mark.skipif(
    os.getenv("KNOWLEDGE_RUN_LIVE_ROUTING_TEST") != "1",
    reason="requires a running local RabbitMQ",
)
def test_live_broker_delivers_multiple_jobs_without_transport_types() -> None:
    async def scenario() -> None:
        suffix = uuid4().hex
        exchange_name = f"knowledge.routing_test.{suffix}"
        queue_name = f"{exchange_name}.jobs"
        settings = Settings().model_copy(update={
            "rabbitmq_jobs_exchange": exchange_name,
            "rabbitmq_jobs_queue": queue_name,
        })
        broker = RabbitMqBroker(settings)
        delivered_jobs: list[str] = []
        delivered = asyncio.Event()

        async def handler(job_id, _generation, _redelivered, message):
            delivered_jobs.append(job_id)
            await message.ack()
            if len(delivered_jobs) == 2:
                delivered.set()

        await broker.connect()
        try:
            await broker.consume_jobs(handler)
            for label in ("first", "second"):
                await broker.publish_job_trigger(f"job:{suffix}_{label}", 1)
            await asyncio.wait_for(delivered.wait(), timeout=5)
            assert delivered_jobs == [
                f"job:{suffix}_first", f"job:{suffix}_second",
            ]
        finally:
            await broker.stop_consuming_jobs()
            channel = await broker.connection.channel()
            try:
                queue = await channel.declare_queue(queue_name, passive=True)
                await queue.delete()
                exchange = await channel.declare_exchange(exchange_name, passive=True)
                await exchange.delete()
            finally:
                await channel.close()
                await broker.close()

    asyncio.run(scenario())
