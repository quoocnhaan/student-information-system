# Knowledge service implementation plan

## Goal

Process uploaded PDFs reliably and show progress to the UI with low latency.

The design must tolerate worker restarts, duplicate queue messages, temporary
LM Studio/MinIO failures, browser reconnects, and later worker scaling.

## Architecture decisions

- **SurrealDB is the durable source of truth.** It stores the document, job,
status, progress, retry state, worker lease, OCR draft, and audit trail.
- **RabbitMQ is a delivery trigger.** It wakes workers quickly, but does not
own job state and does not guarantee exactly-once delivery.
- **FastAPI owns browser WebSockets.** Workers publish internal status events;
FastAPI authenticates clients and broadcasts those events to the UI.
- **One worker container is one worker process.** Scale containers before using
Python multiprocessing. Start OCR at one replica because replicas share the
same LM Studio model/GPU.
- **REST remains available.** The UI uses REST for initial state and reconnect
recovery; WebSocket is for live updates.

## Target flow

```text
Browser
  | POST /v1/documents
  v
FastAPI -- create document + job + outbox event --> SurrealDB
  |                                                |
  | publish pending outbox event                   | source of truth
  v                                                |
RabbitMQ -- job ID --> worker -- claim/update job --+
                         |
                         +-- MinIO: read PDF
                         +-- LM Studio: OCR pages
                         +-- SurrealDB: OCR draft + status
                                   |
                                   +-- status event --> FastAPI WebSocket hub
                                                           |
                                                           v
                                                         Browser
```

## Phase 0 - Keep the durable job foundation healthy

### Current behavior

The current worker already has:

- durable jobs in SurrealDB;
- atomic one-job claims;
- worker leases and heartbeat renewal;
- retry/backoff for transient failures;
- graceful shutdown that finishes the in-flight job;
- `GET /v1/jobs/{job_id}` for durable status retrieval.

### Rules to preserve

1. Create the document and job before returning `202 Accepted`.
2. Persist a status change before emitting a notification about it.
3. A worker processes a job only after successfully claiming it.
4. Never trust a message queue or WebSocket event as the only copy of state.
5. Every workflow must be idempotent: repeated delivery of the same job ID
 cannot produce duplicate OCR drafts or duplicate downstream work.

### Acceptance checks

- Killing a worker during OCR does not lose the job.
- A lease-expired job can be recovered by another worker.
- A duplicate job delivery cannot result in two active claims.
- A failed transient OCR request retries with bounded backoff.

## Phase 1 - Scale workers safely

### Why

More worker containers allow different jobs to run concurrently. This is safer
and easier to observe than spawning multiple Python processes inside one
container.

### How

1. Keep one worker while establishing an OCR performance baseline.
2. In LM Studio, check the loaded model's **Max Concurrent Predictions**.
3. Test two replicas with one or two allowed concurrent predictions:
   ```powershell
    docker compose up -d --scale knowledge-worker=2
   ```
4. Measure per-page OCR latency, total document latency, GPU VRAM, GPU
 utilization, and LM Studio failures.
5. Keep the replica count that improves throughput without causing timeouts or
 GPU memory pressure.

### Important note

Two worker replicas can submit OCR requests simultaneously. They normally share
the same LM Studio server and GPU; they are not two separate model instances.
If LM Studio concurrency is one, requests queue there. If it is greater than
one, LM Studio may batch/process requests concurrently.

### Acceptance checks

- Two replicas claim different jobs.
- No job has more than one active worker lease.
- OCR throughput improves without unacceptable GPU memory use.

## Phase 2 - Add RabbitMQ as the job trigger

### Why

The current worker polls SurrealDB every second. RabbitMQ lets workers receive
new work immediately. However, RabbitMQ is at-least-once delivery: a message
may be delivered again after a worker crash or an unacknowledged connection.

### Components

- RabbitMQ broker service in Docker Compose.
- `jobs` durable exchange and queue.
- `outbox_event` table in SurrealDB.
- Outbox publisher process/service.
- RabbitMQ consumer in each worker.
- Low-frequency database recovery sweeper.

### Outbox design

When FastAPI creates a job, it also creates an outbox record such as:

```json
{
  "type": "job.queued",
  "job_id": "job:...",
  "status": "pending",
  "created_at": "...",
  "published_at": null,
  "attempts": 0
}
```

The outbox publisher sends the job ID to RabbitMQ, waits for broker
confirmation, then marks the outbox event as published. If FastAPI crashes
between creating the job and publishing the message, the publisher eventually
finds the pending outbox record and publishes it.

### Worker consumer behavior

1. Receive a message containing only `job_id`.
2. Atomically claim the job in SurrealDB.
3. If the claim succeeds, process the job.
4. If the job is already running/completed/failed, acknowledge the message and
 do not process it again.
5. Acknowledge RabbitMQ only after the durable claim decision is stored.

### Recovery behavior

- RabbitMQ redelivery is safe because the database claim is idempotent.
- The outbox publisher retries unpublished events.
- A low-frequency sweeper finds queued jobs without a published outbox event,
and repairs them.
- Keep the current database poller behind a feature flag during migration; turn
it off only after RabbitMQ and recovery behavior are proven.

### Acceptance checks

- New jobs reach an idle worker without one-second polling delay.
- Restarting a worker before message acknowledgment does not duplicate OCR.
- A job stored while RabbitMQ is unavailable is processed after RabbitMQ returns.
- A message delivered twice results in one durable claim.

## Phase 3 - Publish job status events

### Why

Workers already write progress to SurrealDB. They should additionally publish a
small internal event after each persisted state change so FastAPI can notify the
UI immediately.

### Event contract

Use a stable event shape:

```json
{
  "event_type": "job.status_changed",
  "job_id": "job:...",
  "document_id": "document:...",
  "sequence": 12,
  "status": "running",
  "step": "ocr",
  "progress": 45,
  "processed_pages": 3,
  "total_pages": 8,
  "updated_at": "..."
}
```

Requirements:

- Increment `sequence` in the same durable update that changes job status.
- Do not include PDF bytes or OCR page text in status events.
- Consumers must tolerate duplicate and out-of-order events by keeping only the
highest sequence number per job.

### Acceptance checks

- Each persisted state transition creates one status event.
- Repeated events do not cause the UI to move backward in progress.

## Phase 4 - Add the FastAPI WebSocket hub

### Why

Workers are backend processes, not browser connection managers. FastAPI should
handle WebSocket authentication, authorization, subscriptions, disconnects, and
fan-out to multiple UI clients.

### How

1. Add a WebSocket endpoint, for example:
   ```text
    /v1/ws/jobs/{job_id}
   ```
2. Authenticate the connection using the same application authentication model
 as other APIs.
3. Authorize that the connected user may view the document/job.
4. Subscribe the FastAPI WebSocket hub to `job.status_changed` events from
 RabbitMQ.
5. Broadcast an event only to clients subscribed to that job/document.
6. Send a lightweight heartbeat/ping and remove disconnected clients.

### Acceptance checks

- Authorized clients receive OCR progress without polling.
- Unauthorized clients cannot subscribe to another user's job.
- Multiple clients viewing the same job receive the same status event.

## Phase 5 - Keep REST for initial state and reconnect recovery

### Why

WebSocket events are transient. A browser can open after processing began,
disconnect during OCR, sleep, or miss messages while reconnecting. REST returns
the latest durable truth from SurrealDB.

### UI flow

```text
1. Upload PDF -> API returns document_id and job_id.
2. GET /v1/jobs/{job_id} -> UI renders the current durable status.
3. Connect WebSocket for that job -> UI receives future changes.
4. WebSocket reconnects -> GET /v1/jobs/{job_id} again.
5. Ignore WebSocket events whose sequence is not newer than the fetched status.
```

REST is not continuous polling after WebSockets are available. It is the
reliable snapshot endpoint for page load and recovery.

### Acceptance checks

- Opening a completed job page shows its status without prior WebSocket events.
- Disconnecting at 40% and reconnecting at 80% shows 80% immediately.
- UI progress never regresses from stale events.

## Phase 6 - Operations and observability

### Metrics and logs

Track at minimum:

- queued/running/completed/failed job counts;
- queue depth and RabbitMQ redeliveries;
- claim conflicts and expired leases;
- retry count and terminal failures;
- OCR latency per page/document;
- LM Studio request failures and GPU memory usage;
- WebSocket connected-client count and dropped connections.

### Deployment order

1. Deploy database schema changes first.
2. Deploy producer/outbox publisher support.
3. Deploy RabbitMQ consumer support with database polling fallback enabled.
4. Test duplicate delivery, broker outage, worker crash, and UI reconnect.
5. Enable RabbitMQ as the primary trigger.
6. Deploy WebSocket hub and update the UI.
7. Scale workers only after OCR capacity testing.

## Not in scope yet

- Sending PDFs or OCR draft content through RabbitMQ or WebSockets.
- Removing SurrealDB job records after completion.
- Python multiprocessing inside a worker container.
- Disabling REST job-status retrieval.

