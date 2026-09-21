# Knowledge-service workflow

## Purpose

The knowledge service accepts a PDF, creates a durable OCR job, and processes
that job outside the HTTP request. The browser receives a job ID immediately,
then reads the durable status through REST and may receive live status changes
through WebSocket.

SurrealDB is the source of truth. RabbitMQ is a delivery mechanism, so a queue
restart, duplicate message, or disconnected browser cannot erase job state.

## Components

| Component | Responsibility |
| --- | --- |
| FastAPI | Validates uploads, creates durable records, directly publishes new job triggers, and exposes REST/WebSocket endpoints. |
| MinIO | Stores the original PDF. |
| SurrealDB | Stores documents, jobs, leases, progress, OCR drafts, and outbox events. |
| RabbitMQ | Delivers job IDs to workers and status events to API instances. |
| Outbox recovery relay | Drains unpublished outbox events at startup and after a RabbitMQ reconnection. |
| Knowledge worker | Claims one job safely, performs OCR, updates progress, and applies retry policy. |
| LM Studio | Converts rendered PDF pages into OCR text. |

## Normal upload and dispatch

```text
Browser
  | POST /v1/documents (PDF)
  v
FastAPI
  |-- validate PDF and size
  |-- store original PDF in MinIO
  |-- one SurrealDB transaction:
  |     create document
  |     create queued OCR job
  |     create job.queued and job.status_changed outbox events
  |
  |-- read this job's pending job.queued outbox event
  |-- publish its job ID to RabbitMQ
  |-- wait for RabbitMQ publisher confirmation
  |-- mark that outbox event published in SurrealDB
  |
  +-- 202 Accepted { document_id, job_id, status: processing }

RabbitMQ
  |-- deliver job_id
  v
Worker
```

The API publishes only after the database transaction succeeds. If direct
publishing fails, the API still returns the accepted job response because the
unpublished outbox event is durable and available for recovery.

## Job state

A job has durable status, step, progress, page counts, retry data, and lease
ownership.

```text
queued -> running -> completed
            |
            +-> queued (retry scheduled)
            |
            +-> failed
```

Typical successful OCR steps are:

```text
queued (0%)
  -> claimed (5%)
  -> ocr (10–85%)
  -> detecting_metadata (87%)
  -> saving_draft (92%)
  -> completed (100%)
```

The document stays `processing` while its job is active. On success, the
worker creates or updates a stable OCR draft, applies detected metadata, and
moves the document to `review`. On a terminal failure, it moves the document
to `failed`.

## Worker workflow

1. RabbitMQ delivers a message containing only `job_id`.
2. The worker atomically changes the job from `queued` to `running` in
   SurrealDB. This stores the worker ID, lease expiry, attempt number, and
   status sequence.
3. The worker acknowledges the RabbitMQ message after that durable claim
   decision.
4. It downloads the original PDF from MinIO.
5. It renders and OCRs each page through LM Studio.
6. After every meaningful step and each processed page, it saves progress in
   SurrealDB. Every write verifies that the same worker still owns the job.
7. It saves the OCR draft using a deterministic ID derived from the job ID,
   which makes reprocessing idempotent.
8. It completes the job and releases its ownership fields.

If RabbitMQ is disabled or the database fallback is enabled, a worker can also
claim due queued jobs through the configured database fallback loop.

## Leases, duplicates, and retries

### Duplicate delivery

RabbitMQ provides at-least-once delivery. The same job ID can reach multiple
workers, especially after a connection failure. Only one worker can atomically
claim the `queued -> running` transition. Other workers acknowledge and ignore
the already-claimed job.

### Worker crash

Each claim has a lease. The worker renews that lease on a heartbeat while OCR
runs. If it crashes, the lease expires; the recovery sweep requeues the job,
increments its dispatch generation, and creates a fresh job trigger.

### Retryable failure

Network and HTTP failures are retryable. The worker schedules a bounded
exponential-backoff retry with jitter. Invalid source data, unsupported job
types, and OCR-specific permanent errors end the job as `failed`.

The original PDF stays in MinIO for retries, so the client does not upload it
again.

## Outbox recovery workflow

The outbox closes the gap between a successful database transaction and a
successful RabbitMQ delivery.

```text
API commits document + job + outbox event
  |
  +-- API publisher succeeds
  |     -> event is marked published
  |
  +-- API publisher fails or API crashes
        -> event remains unpublished
        -> recovery relay starts or RabbitMQ reconnects
        -> relay reads all due unpublished events
        -> relay publishes each event with confirmation
        -> relay marks confirmed events published
```

There is no recurring outbox database poll and no scheduled outbox safety
sweep. The recovery relay wakes on its startup and on successful RabbitMQ
reconnection.

An event can be published twice if RabbitMQ confirms it but the process fails
before the database mark succeeds. This is intentional and safe because worker
claims and WebSocket status sequencing are idempotent.

## Status delivery and browser workflow

Job updates increment a durable `sequence` number. SurrealDB records a
`job.status_changed` outbox event for each visible update. Status event payloads
contain job metadata and progress, never PDF bytes or OCR page text.

The browser must treat REST as the authoritative snapshot. In the current
event-driven outbox mode, status events that were not directly delivered remain
durable and are fanned out when the recovery relay starts or RabbitMQ
reconnects; they are not fetched on a timer. REST therefore remains the
reliable way to observe every current progress value.

```text
1. POST /v1/documents
2. GET /v1/jobs/{job_id}
3. Connect /v1/ws/jobs/{job_id}
4. Apply only status events with a higher sequence
5. After reconnecting, GET /v1/jobs/{job_id} again
```

A WebSocket disconnect never interrupts processing. The REST endpoint returns
the latest persisted job state after the browser reconnects.

## Operational behavior

- `GET /v1/health` confirms the API process is alive.
- `GET /v1/ready` checks configured dependencies.
- `GET /metrics` exposes API metrics; worker and outbox processes expose
  metrics on port `9100` inside Compose.
- Start the stack from `services/ai-service/knowledge` with:

  ```powershell
  docker compose up -d --build
  ```

- The worker database fallback remains configurable through
  `KNOWLEDGE_DATABASE_POLL_FALLBACK_ENABLED`.
