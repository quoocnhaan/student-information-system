# Knowledge ingestion workflow

The knowledge service stores an uploaded PDF in MinIO and creates a `document`
and queued `job` in one SurrealDB transaction. The job row is the durable task,
dispatch request, and current progress snapshot. RabbitMQ carries only a
`{job_id, dispatch_generation}` trigger to a worker.

```text
POST /v1/documents -> MinIO PDF -> SurrealDB document + queued job -> 202
                                        |
                              SurrealDB job live query
                                        |
                              knowledge-dispatcher
                                        |
                        confirmed persistent RabbitMQ message
                                        |
                              knowledge-worker
                                        |
                         SurrealDB claim + OCR progress
                                        |
                        API job live query -> WebSocket
```

## Process responsibilities

| Process | Responsibility |
| --- | --- |
| `knowledge-api` | Persist uploads, serve authoritative REST job snapshots, and forward database job changes to WebSocket clients. |
| `knowledge-dispatcher` | Subscribe to job changes, claim unpublished dispatches, publish confirmed RabbitMQ triggers, and reconcile missed notifications. |
| `knowledge-worker` | Claim a RabbitMQ-delivered job, maintain its worker lease, run OCR, and save results. |
| `knowledge-orphan-cleanup` | Reconcile old MinIO objects against committed documents. |

The API can accept a new upload while RabbitMQ is down. Its `/v1/ready` check
requires SurrealDB and MinIO, the dependencies needed to save that upload.
RabbitMQ remains mandatory for a worker to start a job.

## Durable dispatch

`job.status = 'queued'` alone does not mean a trigger needs publishing: a job
can be queued while its confirmed message waits in RabbitMQ. The dispatcher
selects a row only when `dispatch_published_at` is empty, both the worker retry
time and publisher retry time are due, and no dispatch lease is active.

The dispatcher subscribes to SurrealDB `job` changes for prompt wake-ups. It
subscribes before its initial scan, scans at a bounded interval, and scans after
subscription or broker reconnection. A disconnected live query therefore
cannot strand a committed job. Timers wake it when a delayed retry or expired
dispatch lease becomes due without another database change.

Each publish attempt takes an atomic, generation-guarded lease with a unique
token and increments `dispatch_publish_attempts`. The dispatcher publishes a
persistent message to the existing `knowledge.jobs.ocr` queue using the
`job.queued` routing key and waits for publisher confirmation. Only the same
generation and token may mark `dispatch_published_at` or record a failure.
A publish failure releases the lease and sets a bounded exponential retry.
An expired lease permits takeover after a publisher crash.

The broker may accept a message even when confirmation or the database update
fails. A later publish can duplicate that trigger. The worker's atomic claim
checks `dispatch_generation`, queued status, and retry time, so only one
delivery can run the generation. On worker retry or expired worker lease, the
job increments its generation and clears all dispatch fields in the same
guarded update. Old messages are acknowledged without running the new attempt.

## OCR and progress

The worker ACKs after the durable job claim, maintains its own worker lease,
and selects a processor from the claimed database row's `job.type`. The OCR
processor reads the PDF from MinIO, saves page progress and a stable OCR draft,
updates document review metadata, then marks the job complete. For detailed
worker behavior, see [WORKER.md](WORKER.md).

Every UI-visible job update increases `sequence`. Dispatch bookkeeping does
not. Each API instance has its own SurrealDB job subscription and forwards
changed jobs with connected WebSocket clients through the status hub. It reads
the authoritative row and sends only the public `JobStatusResponse` fields.
A joining client receives a current snapshot. If the live query disconnects,
the API closes its WebSockets and the browser polls `GET /v1/jobs/{job_id}`
every three seconds until it reconnects or reaches a terminal state. The
browser ignores older sequence numbers and resets its state when the job ID
changes. The REST endpoint remains the recovery source after any missed event.

## Deployment and cleanup

Apply the additive job schema, then run the versioned queued-job backfill before
starting the dispatcher on an existing database. Start the dispatcher before
stopping the old outbox publisher. Once all old API and worker replicas are
gone, remove the installed outbox database events with migration `002`. Archive
any rows worth keeping after verifying a retry and a worker recovery, then run
migration `003` to remove the old table. The commands are documented in the
[knowledge README](../knowledge/README.md).

Keep the existing RabbitMQ queue and its legacy `ocr` binding during this
cutover. Queue renaming or purging is a separate migration.

## Operational checks

- Inspect queued jobs with empty `dispatch_published_at`, active dispatch
  leases, `dispatch_last_error`, and the RabbitMQ queue depth.
- Verify that a committed job is published after an API crash or a live-query
  disconnect, and that a broker outage leaves the API ready to accept uploads.
- Verify worker retry and expired-worker-lease recovery increment the generation
  and produce a new confirmed trigger.
- Verify a new WebSocket client, a reconnected client, and REST fallback all
  reach the latest terminal job state.
