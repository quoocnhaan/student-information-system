```python
"""Single-process durable job worker for local Docker Compose."""

async def run_worker() -> None:
    """Claim jobs safely, finish in-flight work on shutdown, and then exit."""

    configure_logging()
    settings = get_settings()
    logger = get_logger()
    shutdown = asyncio.Event()
    _install_shutdown_handlers(shutdown)

    database = SurrealDatabase(settings)
    await database.connect()
    if settings.surreal_apply_schema_on_startup:
        await database.apply_schema()
    # Requeues `running` jobs whose lease has expired. This recovers work that
    # a crashed worker abandoned, without changing jobs owned by a live worker.
    await database.requeue_expired_jobs()
    processors = {
        "ocr": OcrJobProcessor(
            database, MinioObjectStore(settings), LmStudioOcr(settings)
        )
    }

    try:
        while not shutdown.is_set():
            try:
                job = await database.claim_next_queued_job(
                    settings.worker_id, settings.worker_lease_seconds
                )
            except SurrealDatabaseError:
                logger.exception("job_claim_failed")
                # Waits up to one second before retrying, but wakes immediately
                # if shutdown begins. It prevents a tight database-error loop.
                await _wait_for_shutdown(shutdown, 1)
                continue

            if job is None:
                await database.requeue_expired_jobs()
                # There is no due job. Wait one second (or until shutdown)
                # before polling again, so the worker does not use busy CPU.
                await _wait_for_shutdown(shutdown, 1)
                continue

            await _process_claimed_job(database, processors, job, settings, logger)
    finally:
        await database.close()


async def _process_claimed_job(
    database: SurrealDatabase,
    processors: Mapping[str, OcrJobProcessor],
    job: Mapping[str, Any],
    settings: Settings,
    logger: Any,
) -> None:
    """Run one claimed job with a lease heartbeat and central failure policy."""

    job_id = _record_id(job["id"])
    job_type = str(job["type"])
    processor = processors.get(job_type)
    # A shared on/off signal. Setting it tells the lease heartbeat that job
    # processing ended and it should stop renewing this job's lease.
    lease_stop = asyncio.Event()
    lease_task = asyncio.create_task(
        _maintain_lease(database, job_id, settings, lease_stop, logger)
    )  # Starts the heartbeat concurrently; it is another async task, not a thread.

    try:
        if processor is None:
            raise PermanentJobError(f"Unsupported job type: {job_type}")

        logger.info("job_claimed", extra={"jobId": job_id, "jobType": job_type})
        await processor.process(job)
    except Exception as error:
        logger.exception("job_failed", extra={"jobId": job_id, "jobType": job_type})
        await _handle_job_failure(database, job, settings, error, logger)
    finally:
        lease_stop.set()
        await lease_task


async def _handle_job_failure(
    database: SurrealDatabase,
    job: Mapping[str, Any],
    settings: Settings,
    error: Exception,
    logger: Any,
) -> None:
    """Schedule retryable failures or permanently fail their source document."""

    job_id = _record_id(job["id"])
    attempts = int(job.get("attempts", 1))
    max_attempts = int(job.get("max_attempts", settings.job_max_attempts))
    retry_at = (
        _retry_at(settings, attempts)
        if _is_retryable(error) and attempts < max_attempts
        else None
    )
    # Retry only if the error is temporary AND attempts remain. `retry_at` is
    # the future retry time; `None` means that this is a permanent failure.
    try:
        final_job = await database.schedule_retry_or_fail(
            job_id,
            settings.worker_id,
            str(error) or "Job processing failed",
            retry_at,
        )
        # Persists the outcome only while this worker still owns the job. With
        # retry_at it requeues the job for later; with None it saves status=failed.
    except SurrealDatabaseError:
        logger.exception("job_failure_not_persisted", extra={"jobId": job_id})
        return

    if final_job is None:
        logger.error("job_failure_ownership_lost", extra={"jobId": job_id})
        return
    if final_job["status"] == "failed":
        document_id = _record_id(job["document_id"])
        try:
            # Sets the related document's process_status to `failed`. It does
            # not delete the job or original PDF.
            await database.fail_document(document_id)
        except SurrealDatabaseError:
            logger.exception("failed_document_not_marked", extra={"jobId": job_id})
    else:
        logger.info(
            "job_retry_scheduled",
            extra={"jobId": job_id, "retryAt": str(retry_at)},
        )


async def _maintain_lease(
    database: SurrealDatabase,
    job_id: str,
    settings: Settings,
    stop: asyncio.Event,
    logger: Any,
) -> None:
    """Renew the claim lease while a processor is doing asynchronous work."""

    while True:
        try:
            await asyncio.wait_for(
                stop.wait(), timeout=settings.worker_heartbeat_seconds
            )
            # Wait for `stop` until the heartbeat interval. If processing has
            # ended, stop.wait() finishes and this function returns. Otherwise
            # the timeout is raised and the lease is renewed below.
            return
        except TimeoutError:
            pass

        try:
            renewed = await database.renew_job_lease(
                job_id, settings.worker_id, settings.worker_lease_seconds
            )
            # Extends lease_expires_at, but only if the job is still running and
            # belongs to this worker. False means this worker lost ownership.
            if not renewed:
                logger.error("job_lease_lost", extra={"jobId": job_id})
                return
        except SurrealDatabaseError:
            logger.exception("job_lease_renewal_failed", extra={"jobId": job_id})


def _retry_at(settings: Settings, attempts: int) -> datetime:
    """Use capped exponential backoff with small jitter for retryable failures."""

    delay = min(
        settings.job_retry_base_seconds * (2 ** max(attempts - 1, 0)),
        settings.job_retry_max_seconds,
    ) 
    # Returns the next allowed retry time. The delay doubles per attempt, is
    # capped by job_retry_max_seconds, and gets up to 10% random jitter.
    return datetime.now(UTC) + timedelta(seconds=delay + random.uniform(0, delay * 0.1))


def _is_retryable(error: Exception) -> bool:
    """Classify malformed source data as permanent; network failures can retry."""

    current: BaseException | None = error
    while current is not None:
        if isinstance(current, httpx.HTTPError):
            return True
        current = current.__cause__
    # Network/HTTP errors (even if wrapped as a cause) retry. Direct OCR/source
    # errors and unsupported job types do not; other errors retry by default.
    return not isinstance(error, (OcrError, PermanentJobError))


async def _wait_for_shutdown(shutdown: asyncio.Event, timeout_seconds: float) -> None:
    """Sleep until either polling should resume or a graceful shutdown begins."""
    # An interruptible sleep: it ends after the timeout or immediately when
    # `shutdown` is set. A TimeoutError is normal and simply resumes polling.
    try:
        await asyncio.wait_for(shutdown.wait(), timeout=timeout_seconds)
    except TimeoutError:
        pass 


def _install_shutdown_handlers(shutdown: asyncio.Event) -> None:
    """Set a flag on SIGTERM/SIGINT; the active job is allowed to finish.

    SIGINT normally means Ctrl+C; SIGTERM is commonly sent by Docker to stop a
    process. Both set `shutdown`, so no new job is claimed, while the active
    job is allowed to finish. The except branch is a platform fallback.
    """

    loop = asyncio.get_running_loop()
    for received_signal in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(received_signal, shutdown.set)
        except NotImplementedError:
            signal.signal(
                received_signal,
                lambda _signal, _frame: loop.call_soon_threadsafe(shutdown.set),
            )


if __name__ == "__main__":
    asyncio.run(run_worker())


def _record_id(value: Any) -> str:
    """Return the identifier part of a Surreal record ID.

    It accepts either a record-ID object or a string like `document:abc123`,
    and returns only `abc123`.
    """

    if hasattr(value, "id"):
        return str(value.id)
    return str(value).split(":", maxsplit=1)[-1]

```

# Detailed walkthrough

The code above is the worker's **control layer**. It does not itself read PDF
pages or call the OCR model. `OcrJobProcessor.process(job)` does that work. The
worker's responsibility is to make that work reliable: choose a job, make sure
only one worker owns it, keep that ownership alive, save failures, retry safe
failures, and stop safely.

## 1. Why the worker exists

OCR may take seconds or minutes, so the upload API should not wait for it. The
upload endpoint instead saves two database records:

```text
document                         job
-----------------------------    --------------------------------
id: document:abc                id: job:xyz
process_status: processing      document_id: document:abc
source: original PDF in MinIO   type: ocr
                                 status: queued
```

The API can reply to the browser immediately. The browser can later ask for
the job status, while this worker runs in the background.

## 2. What happens when the worker starts

`run_worker()` is the main function. The final lines of the file call it only
when Python runs this file directly:

```python
if __name__ == "__main__":
    asyncio.run(run_worker())
```

`asyncio.run(...)` creates Python's asynchronous event loop and runs the
worker until it exits. `await` means “pause this task here while an I/O action
is happening, but let other async tasks run.” It does not freeze the whole
process in the way a normal blocking network call would.

At startup, the worker configures logs, reads `Settings`, connects to
SurrealDB, optionally applies the database schema, and calls
`requeue_expired_jobs()`.

### Why expired jobs must be requeued

Imagine Worker A claims job `job:xyz` for 60 seconds, then the computer loses
power while OCR is running. Without recovery, the job would remain `running`
forever. It cannot simply be requeued immediately: Worker A might still be
alive and doing the work.

A lease solves this. When a worker claims a job, the database stores:

```text
status: running
worker_id: worker-a
lease_expires_at: current time + 60 seconds
```

`requeue_expired_jobs()` changes a job back to `queued` only when it is
`running` **and** its expiry time is already in the past. Therefore it recovers
abandoned work while leaving a live worker's job alone.

## 3. Finding and claiming work

The `while not shutdown.is_set()` loop is the worker's life cycle. It keeps
looking for work until a graceful shutdown has been requested.

`claim_next_queued_job(worker_id, lease_seconds)` asks the database to select
one queued job whose scheduled retry time has arrived. In one database action,
it changes that job to `running`, records the worker ID, sets the expiry time,
and increments `attempts`.

This single atomic action is essential when two worker containers are running:

```text
Worker A asks for next job ─┐
                            ├─ database grants job:xyz to Worker A
Worker B asks for next job ─┘  Worker B receives another job, or no job
```

Without an atomic claim, both workers could read the same queued job before
either marked it as running, causing duplicate OCR and duplicate saved drafts.

There are three possible results:

| Result | Meaning | Worker action |
|---|---|---|
| A job record | The worker owns one job | Process it. |
| `None` | No queued job is due yet | Recover expired jobs, then wait. |
| `SurrealDatabaseError` | The query could not be completed | Log the error, then wait and try again. |

### Why wait one second?

`_wait_for_shutdown(shutdown, 1)` is not regular `time.sleep(1)`. It waits for
up to one second, but returns early when the shutdown event is set. This avoids
two problems:

- **Busy polling:** querying the database thousands of times per second when
  there is no job or the database is down.
- **Slow shutdown:** waiting a full second after Docker has asked the worker to
  stop.

## 4. Starting OCR and the heartbeat at the same time

Once a job is claimed, `_process_claimed_job()` obtains its ID and type. The
`processors` dictionary maps a type to the code that knows how to perform it:

```python
processors = {"ocr": OcrJobProcessor(...) }
processor = processors.get(job_type)
```

For an OCR job, `processor.process(job)` performs the real ingestion work. It
uses MinIO to access the saved PDF and LM Studio to perform OCR. If no matching
processor exists, the worker raises `PermanentJobError`: retrying an unknown
type cannot succeed until the code is changed.

OCR may take longer than the initial lease. That is why this function starts a
heartbeat before calling `processor.process(job)`:

```text
Main task                         Heartbeat task
------------------------------    ---------------------------------
await processor.process(job)      wait heartbeat interval
download / OCR / save draft       renew lease expiry
                                  wait heartbeat interval
                                  renew lease expiry
job finishes                      receive stop signal and exit
```

`lease_stop = asyncio.Event()` is the stop signal shared by these two tasks.
Initially it is not set, which means “keep the heartbeat alive.”
`asyncio.create_task(...)` schedules the heartbeat concurrently on the same
async event loop; it is not a new operating-system thread.

When processing ends—whether successfully or because of an exception—the
`finally` block runs:

```python
lease_stop.set()
await lease_task
```

The first line tells the heartbeat that it may stop. The second line waits for
the heartbeat task to finish. This prevents a leftover task from renewing a
lease for a job that is no longer processing.

## 5. How the heartbeat keeps ownership

`_maintain_lease()` repeats this logic:

```text
Wait for the stop event for heartbeat_seconds.
  If stop arrives: exit the heartbeat.
  If the wait times out: extend the job lease and repeat.
```

The code uses `asyncio.wait_for(stop.wait(), timeout=...)` to express that
logic. If `stop` is set before the timeout, `stop.wait()` completes normally
and the function returns. If it is not set, the timeout causes `TimeoutError`.
The `except TimeoutError: pass` is expected, not a failure: it means “it is
time to send the next heartbeat.”

`renew_job_lease(job_id, worker_id, lease_seconds)` only updates the database
when both of these are true:

```text
job.status == running
job.worker_id == this worker's ID
```

If it returns `False`, the worker no longer owns the job—for example, its
lease expired during a long outage and another worker claimed it. The heartbeat
then logs `job_lease_lost` and exits instead of modifying a job it does not own.

## 6. What happens when OCR fails

Any exception from `processor.process(job)` is caught and sent to
`_handle_job_failure()`. The function decides whether to try again later or
mark the job as permanently failed.

```python
retry_at = (
    _retry_at(settings, attempts)
    if _is_retryable(error) and attempts < max_attempts
    else None
)
```

Read it as this sentence:

> Create a retry time only if the error is retryable and this job has not used
> all of its allowed attempts. Otherwise, use `None` to mean permanently fail.

The attempt count is increased when the job is claimed. With
`max_attempts = 3`, the behaviour is:

| Failure | Attempt number | Is it retryable? | Outcome |
|---|---:|---:|---|
| HTTP timeout | 1 | Yes | Queue a retry. |
| HTTP timeout | 2 | Yes | Queue a retry. |
| HTTP timeout | 3 | Yes | Fail permanently. |
| Unsupported job type | 1 | No | Fail permanently. |
| Invalid source/OCR error | 1 | No | Fail permanently. |

## 7. Which errors can retry?

`_is_retryable(error)` examines the error and its `__cause__` chain.

An `httpx.HTTPError` is retryable because it normally indicates a temporary
problem calling a network service: a timeout, unavailable OCR server, or an
HTTP connection error. The function checks causes so an `OcrError` that wraps
an `httpx.HTTPError` is still retried.

Direct `OcrError` and `PermanentJobError` values are not retried. They signal
problems that another identical attempt is unlikely to solve, such as a bad
PDF or an unsupported job type. Unexpected error types default to retryable so
a temporary, unclassified service problem does not immediately lose the job.

## 8. How retry timing works

`_retry_at()` returns a UTC date/time in the future. Its formula is:

```text
delay = minimum(base_delay × 2^(attempts - 1), maximum_delay)
retry time = now + delay + random jitter
```

For example, if the base delay is 10 seconds and the maximum is 60 seconds,
the main delay is 10 seconds after attempt 1, 20 seconds after attempt 2, 40
seconds after attempt 3, and 60 seconds for later attempts. The additional
random jitter is between zero and 10% of the delay. It prevents a large group
of jobs from all retrying at the exact same second after an OCR service outage.

## 9. Saving retry or final-failure state

`schedule_retry_or_fail(...)` is the database operation that records the
decision. It also checks that the job is still `running` and owned by this
worker. This ownership check protects data from stale workers.

For a retry, it stores roughly:

```text
status: queued
step: retry_scheduled
progress: 0
next_attempt_at: retry_at
worker_id: none
lease_expires_at: none
error: safe error message
```

For a permanent failure, it stores roughly:

```text
status: failed
step: failed
progress: 100
worker_id: none
lease_expires_at: none
error: safe error message
```

If it returns `None`, the worker has lost ownership and must not update the
document. If it returns a job with `status == "failed"`, then
`fail_document(document_id)` sets the related document's `process_status` to
`failed`. The original PDF in MinIO and the job record remain stored; marking a
document failed does not delete them.

## 10. Graceful shutdown

`_install_shutdown_handlers()` registers two operating-system signals:

- `SIGINT`: usually Ctrl+C in a terminal.
- `SIGTERM`: commonly sent when Docker or the operating system stops a process.

Both handlers set the `shutdown` event. The worker does not abruptly terminate
the active OCR job. The outer loop notices the event and stops claiming new
jobs; the already claimed job completes its normal success/failure path, then
the outer `finally` closes the database connection.

The `NotImplementedError` branch is a compatibility fallback for platforms or
event loops that cannot use `loop.add_signal_handler()` directly.

## 11. SurrealDB record IDs

SurrealDB record IDs can be objects or strings. A string representation often
looks like this:

```text
document:abc123
job:def456
```

`_record_id(value)` accepts either form and returns only the identifier part:

```python
_record_id("document:abc123")  # returns "abc123"
```

That normalized value is used when the worker calls database methods such as
`renew_job_lease("def456", ...)` and `fail_document("abc123")`.
