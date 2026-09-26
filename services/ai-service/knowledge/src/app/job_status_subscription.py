"""Fan authoritative SurrealDB job changes to connected WebSocket clients."""

import asyncio

from fastapi import FastAPI

from app.api.v1.jobs import _as_response
from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError, _record_id
from app.observability.logging import get_logger


async def run_job_status_subscription(app: FastAPI, settings: Settings, stop: asyncio.Event) -> None:
    logger = get_logger()
    live_database = SurrealDatabase(settings)
    app.state.job_status_live = False
    try:
        while not stop.is_set():
            subscription = None
            try:
                await live_database.connect()
                subscription = await live_database.subscribe_to_job_changes()
                app.state.job_status_live = True
                await _refresh_active_jobs(app)
                async for job_id in subscription.changes():
                    if stop.is_set():
                        break
                    if job_id is None:
                        await _refresh_active_jobs(app)
                    elif job_id in await app.state.job_status_hub.active_job_ids():
                        await _broadcast_job(app, job_id)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("job_status_live_query_failed")
            finally:
                app.state.job_status_live = False
                await app.state.job_status_hub.close_all()
                if subscription is not None:
                    await subscription.close()
                await live_database.close()
            if not stop.is_set():
                try:
                    await asyncio.wait_for(stop.wait(), timeout=2)
                except TimeoutError:
                    pass
    finally:
        app.state.job_status_live = False
        await live_database.close()


async def _refresh_active_jobs(app: FastAPI) -> None:
    for job_id in await app.state.job_status_hub.active_job_ids():
        await _broadcast_job(app, job_id)


async def _broadcast_job(app: FastAPI, job_id: str) -> None:
    database: SurrealDatabase = app.state.database
    try:
        job = await database.get_job(_record_id(job_id))
    except SurrealDatabaseError:
        get_logger().exception("job_status_snapshot_failed", extra={"jobId": job_id})
        raise
    if job is None:
        return
    event = _as_response(job).model_dump()
    event["event_type"] = "job.status_changed"
    event["job_id"] = event.pop("id")
    await app.state.job_status_hub.broadcast(event)
