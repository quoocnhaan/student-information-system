# Knowledge ingestion workflow

This document explains how the knowledge service currently processes an uploaded
PDF, why each component exists, and what happens when part of the system fails.

## The central idea

PDF processing is slow and can fail temporarily. A request may take minutes,
while an HTTP connection should return quickly. The service therefore treats OCR
as a **durable background job**:

1. The API safely stores the source PDF and job information.
2. The API returns `202 Accepted` immediately.
3. A worker performs OCR in the background.
4. The UI reads durable state through REST and receives live changes through a
   WebSocket.

The most important design rule is:

> SurrealDB owns the truth. RabbitMQ and WebSockets only deliver notifications.

This rule prevents a queue restart, a lost WebSocket message, or a browser
disconnect from losing the actual job state.

## Components and why they exist

| Component | Responsibility | Why it is needed |
| --- | --- | --- |
| FastAPI | Accept uploads, return job snapshots, and manage browser WebSockets | HTTP and browser connections belong at the API boundary |
| MinIO | Store the original PDF | Large binary files should not be stored in queue messages or job records |
| SurrealDB | Store documents, jobs, leases, retries, progress, OCR drafts, and outbox events | Processing must survive service and worker restarts |
| RabbitMQ | Wake workers and distribute status notifications quickly | Database polling alone adds latency and unnecessary queries |
| Outbox publisher | Move durable events from SurrealDB to RabbitMQ | It closes the failure gap between a database commit and a queue publish |
| Knowledge worker | Claim jobs and perform OCR | Slow processing stays outside the request-response lifecycle |
| LM Studio | Run the OCR model | It converts rendered PDF pages into text |
| REST job endpoint | Return the latest durable job state | A browser may open late or miss WebSocket events |
| WebSocket hub | Fan live status events out to connected browsers | The UI receives low-latency updates without continuous polling |

## High-level flow

```text
Browser
  |
  | POST /v1/documents (PDF)
  v
FastAPI
  |-- store original.pdf -------------------------------> MinIO
  |
  |-- one database transaction ------------------------> SurrealDB
  |     create document
  |     create queued job
  |     create job.queued outbox event
  |     create job.status_changed outbox event
  |
  |<-- 202 { document_id, job_id }
  |
  v
Browser reads GET /v1/jobs/{job_id}

Outbox publisher
  |-- read pending outbox events -----------------------> SurrealDB
  |-- publish job ID -----------------------------------> RabbitMQ
  |<-- publisher confirmation
  |-- mark outbox event published ----------------------> SurrealDB

RabbitMQ
  |-- deliver job ID -----------------------------------> Worker

Worker
  |-- atomically claim job -----------------------------> SurrealDB
  |-- acknowledge queue message after claim decision --> RabbitMQ
  |-- read PDF -----------------------------------------> MinIO
  |-- OCR each page ------------------------------------> LM Studio
  |-- persist sequenced progress -----------------------> SurrealDB
  |-- save deterministic OCR draft ---------------------> SurrealDB
  |-- complete job -------------------------------------> SurrealDB

SurrealDB status outbox
  |-- status events --> Outbox publisher --> RabbitMQ --> FastAPI WebSocket hub
  |                                                     |
  +-----------------------------------------------------+--> Browser
```

## 1. Uploading a PDF

The browser sends the PDF to:

```text
POST /v1/documents
```

The API first checks that the file starts with a PDF signature and is within the
configured size limit. It then stores the source in MinIO under a generated key.

After the file is stored, FastAPI creates the `document` and `job` in one
SurrealDB transaction. The new job starts with values similar to:

```json
{
  "status": "queued",
  "step": "queued",
  "progress": 0,
  "sequence": 1,
  "dispatch_generation": 1
}
```

### Why the database write is transactional

The document, job, and database-generated outbox events must appear together. A
document without a job would never be processed. A job without its document
would have no source data. A queued job without an outbox trigger could wait
unnecessarily for the recovery poller.

SurrealDB table events create two outbox records as part of the job transaction:

- `job.queued` tells a worker that work is available.
- `job.status_changed` tells observers that the durable job state changed.

Only after the source file and durable records exist does FastAPI return:

```json
{
  "document_id": "document:doc_...",
  "job_id": "job:job_...",
  "status": "processing"
}
```

`202 Accepted` means the request was accepted for background processing. It does
not mean OCR has finished.

## 2. Why the outbox exists

A direct sequence such as “save the job, then publish to RabbitMQ” contains a
failure gap:

```text
save job -> API crashes -> publish never happens
```

The outbox removes this gap. The job change and its outbox event are committed
inside SurrealDB together. A separate publisher repeatedly reads unpublished
events and sends them to RabbitMQ.

The publisher follows this order:

1. Read an unpublished outbox event.
2. Publish it to the appropriate RabbitMQ exchange.
3. Wait for RabbitMQ publisher confirmation.
4. Mark the event as published in SurrealDB.

If the publisher crashes after step 2 but before step 4, it publishes the event
again after restarting. This is intentional. The system is designed for
**at-least-once delivery**, so every consumer must tolerate duplicates.

Retry events also have an `available_at` value. The publisher does not send the
next `job.queued` trigger until the retry delay has expired. This avoids an
immediate queue loop while a job is waiting for backoff.

## 3. How a worker safely claims a job

RabbitMQ messages contain only the `job_id`. They do not contain the PDF or OCR
text. The worker uses that ID to perform an atomic conditional update in
SurrealDB:

```text
queued -> running
```

The update also stores:

- the worker ID;
- the claim time;
- the lease expiration time;
- the incremented attempt count;
- the next status sequence number.

Only one worker can successfully change a particular queued job to running. If
two workers receive the same job ID, one claim succeeds and the other observes
that the job is no longer claimable.

The worker acknowledges the RabbitMQ message after this durable claim decision.
At that point RabbitMQ has completed its responsibility. SurrealDB now records
which worker owns the job.

### Why acknowledge after the claim, but before OCR

- Acknowledging before the claim could lose the trigger before durable ownership
  exists.
- Waiting until all OCR completes would cause long-lived unacknowledged queue
  deliveries and unnecessary redelivery after a connection interruption.

If the worker dies after acknowledging, its lease eventually expires. The
recovery process returns the job to `queued`, increments its dispatch generation,
and creates a fresh queue trigger.

## 4. Leases and heartbeats

A running job is not owned forever. Its worker receives a time-limited lease and
renews it periodically with a heartbeat.

```text
claim job
  |
  +-- lease expires in 180 seconds (default)
  |
  +-- heartbeat every 30 seconds (default)
```

Every meaningful progress write checks that:

- the job is still `running`; and
- the same worker still owns it.

This prevents an old worker from continuing to update a job after another worker
has recovered it.

The recovery sweeper finds running jobs whose lease has expired and moves them
back to `queued`. That state change creates both a new sequenced status event and
a new `job.queued` outbox event.

## 5. OCR processing

Once the claim succeeds, the worker:

1. Reads the document record to find the MinIO object key.
2. Downloads the original PDF.
3. Renders pages one at a time.
4. Sends each rendered page to LM Studio.
5. Saves page progress after each successful page.
6. Detects initial metadata with deterministic rules.
7. Saves the OCR draft.
8. Moves the document to `review` and completes the job.

Typical job progress is:

```text
queued (0%)
  -> claimed (5%)
  -> ocr (10% to 85%)
  -> detecting_metadata (87%)
  -> saving_draft (92%)
  -> completed (100%)
```

The OCR draft uses a deterministic ID derived from the job ID. Reprocessing the
same job therefore updates the same draft instead of creating duplicates.

Detected metadata is not treated as approved truth. The document moves to
`review`, allowing a human to verify OCR and metadata before later indexing.

## 6. Retries and permanent failures

Failures are classified before the job is finalized.

Temporary failures, such as LM Studio timeouts or temporary MinIO/network
problems, are retried using capped exponential backoff with jitter:

```text
running -> queued / retry_scheduled -> wait until next_attempt_at -> running
```

The attempt count is bounded. When the configured maximum is reached, or when
the input is permanently invalid, the job becomes `failed` and the document is
also marked `failed`.

Why use bounded backoff:

- Immediate retries can overload a dependency that is already unhealthy.
- Jitter prevents many failed jobs from retrying at exactly the same moment.
- A maximum attempt count prevents permanently bad inputs from looping forever.

## 7. Status sequences and the WebSocket path

Every UI-visible job update increments `job.sequence` in the same durable update.
SurrealDB creates a `job.status_changed` outbox event containing that sequence.

Example event:

```json
{
  "event_type": "job.status_changed",
  "job_id": "job:job_...",
  "document_id": "document:doc_...",
  "sequence": 12,
  "status": "running",
  "step": "ocr",
  "progress": 45,
  "processed_pages": 3,
  "total_pages": 8,
  "updated_at": "..."
}
```

Status events intentionally contain no PDF data or OCR page text. Small events
are faster to deliver and avoid exposing document content through messaging.

FastAPI gives each API instance its own temporary RabbitMQ status queue. This is
important when multiple API replicas are running: every API instance must receive
the event so it can notify its own connected browsers.

The WebSocket endpoint is:

```text
/v1/ws/jobs/{job_id}
```

When a client connects, FastAPI:

1. Validates the optional WebSocket bearer token when configured.
2. Verifies that the job exists.
3. Sends the latest durable job snapshot.
4. Subscribes the socket to future events for only that job.
5. Sends lightweight heartbeat messages during quiet periods.

The hub remembers the highest sequence seen for each job. Duplicate or older
events are ignored, so progress cannot move backward because RabbitMQ delivered
messages more than once or out of order.

## 8. Why REST is still required

WebSocket messages are transient. A browser can:

- open the page after OCR has already started;
- sleep or lose network connectivity;
- reconnect after the job has completed;
- miss events while the API or RabbitMQ is restarting.

The correct browser workflow is therefore:

```text
1. POST /v1/documents
2. GET /v1/jobs/{job_id}
3. Connect /v1/ws/jobs/{job_id}
4. Apply only events with a newer sequence
5. After every reconnect, GET /v1/jobs/{job_id} again
```

REST answers “what is true now?” WebSocket answers “what changed just now?”
Neither one replaces the other.

## 9. What happens during common failures

### RabbitMQ is unavailable

Jobs and outbox events remain stored in SurrealDB. The API continues to expose
durable REST state, the status subscriber reconnects in the background, and the
outbox publisher retries its connection. Workers can use the database polling
fallback until RabbitMQ returns.

### The outbox publisher crashes

Unpublished events remain pending in SurrealDB. After restart, the publisher
continues from those records. An event published immediately before a crash may
be published twice, which consumers safely tolerate.

### A worker crashes during OCR

The running job remains in SurrealDB. Its heartbeat stops, its lease expires, and
the sweeper returns it to the queue with a new dispatch generation.

### The same RabbitMQ message is delivered twice

Both deliveries try to claim the same job, but the database transition from
`queued` to `running` can succeed only once. The other delivery is acknowledged
without processing.

### The browser disconnects

Processing continues because the worker does not depend on the browser. After
reconnecting, the browser reads the latest REST snapshot and then resumes live
events.

### LM Studio or MinIO fails temporarily

The worker persists a retry schedule with bounded backoff. The original PDF
remains in MinIO, so the user does not need to upload it again.

## 10. Scaling workers

Each worker container runs one worker process. Multiple replicas share the same
RabbitMQ queue and compete to atomically claim different jobs:

```powershell
docker compose up -d --scale knowledge-worker=2
```

RabbitMQ can distribute different jobs to both workers, but both workers normally
send OCR requests to the same LM Studio server and GPU. More workers improve
throughput only if LM Studio and the GPU have enough concurrency and memory.

Before keeping two or more replicas, measure:

- per-page and per-document OCR latency;
- total documents completed per unit of time;
- LM Studio failures and timeouts;
- GPU utilization and memory;
- queue depth.

Scale based on throughput and stability, not only on worker CPU usage.

## 11. Operations and observability

The API exposes Prometheus metrics at:

```text
GET /metrics
```

Worker and outbox containers expose process metrics on port `9100` inside the
Compose network. Metrics cover job states, claim results and conflicts, expired
leases, retries, failures, OCR latency, LM Studio failures, RabbitMQ redeliveries,
queue depth, outbox publishing, and connected WebSocket clients.

GPU metrics must be collected from the host running LM Studio, for example with
an NVIDIA/DCGM exporter, because the knowledge containers do not own the GPU
process.

Operational endpoints have separate purposes:

- `GET /v1/health` checks that the API process is alive.
- `GET /v1/ready` checks configured database, MinIO, and RabbitMQ readiness.

## 12. Current boundaries

The current repository contains the knowledge backend but no browser UI or
parent-application authentication implementation.

Until that integration exists, `KNOWLEDGE_WEBSOCKET_AUTH_TOKEN` can require a
deployment-wide bearer token for WebSocket connections. This is useful for local
or single-tenant protection, but it is not a replacement for user-to-document
authorization in a multi-tenant production system.

The UI should eventually implement the REST-plus-WebSocket reconnect workflow
described above and use the parent application's authenticated user identity to
authorize access to each document and job.

## 13. Local services

From `services/ai-service/knowledge`:

```powershell
docker compose up -d --build
```

The Compose stack runs:

- SurrealDB;
- MinIO and bucket initialization;
- RabbitMQ with its management interface;
- the knowledge API;
- one knowledge worker;
- the outbox publisher.

Keep `KNOWLEDGE_DATABASE_POLL_FALLBACK_ENABLED=true` while validating broker
outages, duplicate delivery, worker crashes, and recovery. Disable it only after
the RabbitMQ and sweeper paths have been proven in the target environment.

