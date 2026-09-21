# Knowledge service: architecture and workflow

This document explains the knowledge service as it is implemented today. It is
intended for developers who need to understand the design, find the code that
owns a behavior, debug a failed document, or safely change the ingestion
pipeline.

The implemented workflow accepts a PDF, stores the original source, processes
it asynchronously with OCR, detects draft metadata, and leaves the document in
human-review state. It also provides durable retries, live progress delivery,
broker-outage recovery, and conservative cleanup of orphaned source objects.

It does **not** currently confirm metadata, split reviewed text into retrieval
chunks, build embeddings, or enforce parent-application user/document
authorization. The schema contains types for later retrieval work, but the
workflow described here ends at an OCR draft in `review` state.

## The mental model

Keep these four rules in mind when reading or changing the service:

1. **SurrealDB is the source of truth.** A job exists because a SurrealDB `job`
   record exists—not because RabbitMQ currently shows a message.
2. **RabbitMQ is an admission and delivery signal.** A worker may start a new
   job only after receiving its job ID from RabbitMQ, but the broker does not
   own the job state or the source PDF.
3. **MinIO owns source bytes.** RabbitMQ messages contain IDs and status fields,
   never PDF bytes or OCR text.
4. **Delivery is at least once.** Publisher-confirmation uncertainty, process
   crashes, and recovery can produce duplicate messages. Atomic claims, job
   sequences, and stable OCR draft IDs make duplicates safe.

The shortest useful picture is:

~~~text
Client uploads PDF
        |
        v
FastAPI ---- stores source ----> MinIO
        |
        +---- transaction -----> SurrealDB
                                  document + job + outbox_event
                                           |
                                  live-query wake-up
                                           v
                                      Outbox relay
                                           |
                                  confirmed RabbitMQ publish
                                           v
                                         Worker
                                           |
                          claim + lease in SurrealDB
                                           |
                          MinIO PDF -> LM Studio OCR
                                           |
                          OCR draft + review metadata
                                           |
                          sequenced status outbox events
                                           v
                          REST snapshot + optional WebSocket
~~~

## Processes and responsibilities

The Docker deployment runs several processes because their failure and scaling
boundaries are different.

| Process or dependency | Responsibility | Why it is separate |
| --- | --- | --- |
| `knowledge-api` | Accept uploads, return job snapshots, and fan status messages to WebSocket clients. | HTTP must remain responsive while OCR is slow or unavailable. |
| `knowledge-outbox` | Convert durable `outbox_event` rows into confirmed RabbitMQ messages. | Database commits and broker publishes cannot share one transaction. |
| `knowledge-worker` | Claim RabbitMQ-delivered jobs, maintain leases, run OCR, and persist results. | OCR is long-running and can be scaled or restarted independently. |
| `knowledge-orphan-cleanup` | Reconcile old MinIO source objects with SurrealDB documents. | Deletion is operational maintenance and must never run in an API request. |
| SurrealDB | Store documents, jobs, leases, drafts, and the outbox. | This is the durable recovery boundary. |
| RabbitMQ | Deliver job triggers and transient status notifications. | It wakes consumers quickly without becoming the source of truth. |
| MinIO | Store original PDFs. | Retries and lease recovery reuse the original source. |
| LM Studio | OCR one rendered PDF page at a time. | Model inference is isolated behind an OpenAI-compatible HTTP API. |

## Core files: where to start reading

These are the files that define the system. Read them in this order when
onboarding:

| File | Core responsibility | Important symbols |
| --- | --- | --- |
| `knowledge/db/schema.surql` | Durable data model, indexes, and automatic outbox creation. | `job_status_outbox`, `job_dispatch_outbox` |
| `knowledge/src/app/config.py` | Validated environment configuration and safety defaults. | `Settings`, `get_settings` |
| `knowledge/src/app/api/v1/documents.py` | Upload transaction and direct-publish fast path. | `upload_pdf`, `_publish_new_job` |
| `knowledge/src/app/infrastructure/surreal.py` | All SurrealDB reads, writes, claims, leases, outbox operations, and indexed cleanup lookup. | `SurrealDatabase`, `OutboxLiveSubscription` |
| `knowledge/src/app/infrastructure/rabbitmq.py` | RabbitMQ topology, confirmed publishing, job consumption, and status consumption. | `RabbitMqBroker`, `RabbitMqPublishTimeout` |
| `knowledge/src/app/outbox.py` | Event-driven durable outbox relay. | `run_outbox_publisher`, `_drain_pending_events` |
| `knowledge/src/app/worker.py` | RabbitMQ-only job admission, lease recovery, retry policy, and processor dispatch. | `run_worker`, `_process_claimed_job`, `_handle_job_failure` |
| `knowledge/src/app/application/ocr_jobs.py` | OCR use case and job-visible progress milestones. | `OcrJobProcessor.process` |
| `knowledge/src/app/infrastructure/ocr.py` | PDF rendering and LM Studio calls. | `LmStudioOcr.extract_pdf` |
| `knowledge/src/app/application/document_metadata.py` | Deterministic first-pass metadata detection. | `DocumentMetadataDetector.detect` |
| `knowledge/src/app/main.py` | API lifecycle and RabbitMQ status subscriber. | `lifespan`, `_run_status_subscription` |
| `knowledge/src/app/api/v1/jobs.py` | REST job status and WebSocket endpoint. | `get_job_status`, `stream_job_status` |
| `knowledge/src/app/websocket_hub.py` | In-process, sequence-aware WebSocket fan-out. | `JobStatusHub` |
| `knowledge/src/app/application/orphan_cleanup.py` | Cleanup safety policy. | `OrphanCleanup.run_once` |
| `knowledge/src/app/orphan_cleanup.py` | Dedicated periodic cleanup process. | `run_orphan_cleanup` |
| `knowledge/docker-compose.yml` | Runtime wiring, health checks, and maintenance profile. | `knowledge-api`, `knowledge-worker`, `knowledge-outbox`, `knowledge-orphan-cleanup` |

Paths in the table are relative to `services/ai-service/`.

## Durable records and why each one exists

The schema is defined in `knowledge/db/schema.surql`.

### `document`

One record represents an uploaded source document.

Important fields:

- `source.object_key`: exact MinIO key for the original PDF;
- `source.original_filename` and `source.mime_type`: source metadata;
- `process_status`: `processing`, `review`, `indexed`, or `failed`;
- detected metadata such as `title`, `document_type`, `cohort`, and language;
- `page_count`: filled after OCR.

`source.object_key` has a unique index. Besides preventing two document records
from claiming one object, this index makes orphan-cleanup existence checks
narrow and safe.

### `job`

One record represents a durable asynchronous task. The current job type is
`ocr`.

Important fields:

- `status`: `queued`, `running`, `completed`, or `failed`;
- `step` and `progress`: UI-visible progress;
- `sequence`: increases on every visible job update;
- `attempts` and `max_attempts`: retry accounting;
- `next_attempt_at`: earliest time a retry may be dispatched;
- `worker_id` and `lease_expires_at`: current ownership;
- `dispatch_generation`: increases whenever a new queue trigger is required;
- `ocr_draft_id`: result link after successful OCR.

The lease fields are critical. RabbitMQ ACK means the message may disappear,
so the database lease is what makes an interrupted claimed job recoverable.

### `outbox_event`

One record represents a message that must be delivered to RabbitMQ.

There are two event types:

- `job.queued`: wakes an OCR worker;
- `job.status_changed`: carries a sequenced job-state notification to API
  instances for WebSocket fan-out.

Important fields:

- `published_at`: `NONE` until a Basic.Ack publisher confirmation is received;
- `available_at`: delays retry dispatch without polling;
- `publish_attempts` and `last_error`: delivery diagnostics;
- job status fields copied into `job.status_changed` events;
- `dispatch_generation`: identifies the queued-job generation.

SurrealDB table events create these rows in the same database commit as the job
change:

- `job_status_outbox` creates a status event when a job is created or its
  `sequence` changes;
- `job_dispatch_outbox` creates a dispatch event for a new queued job or a new
  `dispatch_generation`.

This is the transactional-outbox guarantee: if the job change commits, its
message request commits too.

### `ocr_draft`

One record stores ordered OCR pages and their unreviewed text. The ID is derived
from the job ID (`ocr_<job-id>`), so replaying the same job upserts the same
draft instead of creating duplicates.

## Workflow 1: accepting a PDF

Entry point: `upload_pdf` in `api/v1/documents.py`.

~~~text
POST /v1/documents
  -> validate PDF signature
  -> read and enforce size limit
  -> generate document ID, job ID, and object key
  -> put original.pdf in MinIO
  -> create document + job in one SurrealDB transaction
  -> schema creates status and dispatch outbox rows
  -> try direct RabbitMQ dispatch
  -> return 202 Accepted
~~~

### Step 1: request validation

`upload_pdf` checks the first five bytes for `%PDF-`, reads the upload, rejects
an empty/invalid source, and enforces `max_upload_bytes` (50 MiB by default).
This protects the service before it spends storage or OCR capacity.

### Step 2: source storage

The API generates keys with this exact form:

~~~text
documents/doc_<32 lowercase hexadecimal characters>/original.pdf
~~~

`MinioObjectStore.put_pdf` writes the validated source as a private
`application/pdf` object. The generated key is also stored in the document
record, which is how workers later locate the source.

If MinIO fails, the API returns `502` and no database job is created.

### Step 3: durable transaction

`SurrealDatabase.create_document_with_job` creates the `document` and `job` in
one SurrealDB transaction. Schema events atomically add the outbox rows.

If the database call reports an error, the API returns `503` but deliberately
does not immediately delete the source object. The connection may have failed
after the database accepted `COMMIT`; deleting at that point could destroy the
source for a real durable job. The orphan-cleanup process handles proven
leftovers later, after a grace period.

### Step 4: direct-publish fast path

`_publish_new_job` finds the exact pending `job.queued` event and calls
`RabbitMqBroker.publish_outbox_event`. If RabbitMQ confirms it, the API marks
that outbox row published.

This path reduces latency, but it is not required for durability. Connection
failure, rejection, or confirmation timeout is recorded with
`mark_outbox_failed`, and the API still returns `202` because the job and
outbox event already committed.

Example response:

~~~json
{
  "document_id": "document:doc_...",
  "job_id": "job:job_...",
  "status": "processing"
}
~~~

The client must keep `job_id`; it is the durable handle for progress and final
state.

## Workflow 2: publishing the durable outbox

Entry point: `run_outbox_publisher` in `app/outbox.py`.

The relay is event-driven. It does not repeatedly query for pending events
while idle.

### Why the live query is only a wake-up hint

`SurrealDatabase.subscribe_to_outbox_changes` opens a SurrealDB live query on
`outbox_event` using a dedicated database connection. Notifications only set
one coalescing `asyncio.Event`; notification payloads are not trusted as the
message source.

After every wake-up, `_drain_pending_events` reads authoritative pending rows
from SurrealDB. This prevents correctness from depending on notification
ordering, duplication, or payload shape.

### Wake-up sources

The same coalescing event receives all reasons to drain:

- initial process startup;
- a new or changed `outbox_event` live notification;
- RabbitMQ reconnection;
- live-query reconnection;
- a publish retry deadline;
- the earliest future `available_at` deadline.

The live subscription is established before the initial drain. Therefore an
event committed during startup either appears in that drain or produces a live
notification; it cannot fall into a subscription gap.

### Serialized drain

One `asyncio.Lock` protects the drain. `_drain_pending_events`:

1. fetches due, unpublished rows in creation order;
2. publishes one row;
3. waits for its RabbitMQ confirmation;
4. marks only that row published;
5. continues until no due row remains.

A burst of live notifications collapses into one wake-up and never creates
parallel publishers for the same batch.

### Delayed events and retry backoff

When no due rows remain,
`get_earliest_pending_outbox_available_at` returns the next future deadline.
The relay creates one cancellable timer for that instant. This is scheduling,
not recurring database polling.

When publishing fails, the event stays pending and the relay applies bounded
exponential backoff using `outbox_retry_base_seconds` and
`outbox_retry_max_seconds`. Updating `last_error` itself emits a live-query
notification, so `retry_until` prevents that self-generated notification from
bypassing the intended delay.

### Publisher confirmation boundary

`RabbitMqBroker.publish_outbox_event` creates a publisher-confirm channel,
declares the required topology, publishes a persistent message with
`mandatory=True`, and accepts success only for `Basic.Ack`.

Only the confirmation wait is wrapped in
`rabbitmq_publish_confirm_timeout_seconds` (five seconds by default). The
publishing channel is closed in `finally` for every result.

Results mean:

| Result | Durable action | Why |
| --- | --- | --- |
| Basic.Ack | Set `published_at`; clear `last_error`. | RabbitMQ confirmed acceptance. |
| Basic.Nack or non-Ack | Keep pending; record rejection. | Broker explicitly did not confirm success. |
| Connection failure | Keep pending; record failure. | No safe delivery proof exists. |
| Confirmation timeout | Keep pending; record timeout. | Outcome is unknown: RabbitMQ may have accepted the message before the confirmation was lost. |

An uncertain event can therefore be published again. Worker claiming and
status sequencing are designed for this at-least-once behavior.

## Workflow 3: worker admission, ownership, and OCR

Entry point: `run_worker` in `app/worker.py`.

RabbitMQ is mandatory for starting work. The worker has no database polling
fallback and `SurrealDatabase` has no `claim_next_queued_job` method.

### Admission through RabbitMQ

At startup, the worker connects and establishes consumption before entering
its maintenance loop. `RabbitMqBroker.consume_jobs` configures
`prefetch_count=1`, so one worker has at most one unacknowledged job message.

The queue payload is intentionally small:

~~~json
{
  "event_type": "job.queued",
  "job_id": "job:job_...",
  "dispatch_generation": 1
}
~~~

Malformed messages and invalid generated IDs are rejected. If RabbitMQ is
reconnecting, a delivery is negatively acknowledged and no database claim is
attempted.

### Atomic claim and ACK boundary

For a valid delivery, `SurrealDatabase.claim_job` performs a guarded update:

~~~text
only if status = queued
and next_attempt_at is absent or due

set status = running
set step = claimed
set worker_id
set claimed_at
set lease_expires_at
increment attempts
increment sequence
~~~

Transaction conflicts are retried briefly. Only one competing worker can
change the durable record from `queued` to `running`.

The RabbitMQ message is ACKed after this durable claim decision:

- successful claim: ACK, then process OCR;
- already claimed/completed/not due: ACK and ignore as a safe duplicate;
- database claim error: NACK/requeue through the consumer error path.

ACK does not mean OCR completed. It means SurrealDB now knows who owns the job
and when that ownership expires.

### Lease and crash recovery

`_maintain_lease` renews ownership every `worker_heartbeat_seconds` while OCR is
running. Progress and completion updates include `worker_id` in their database
guard, preventing an old worker from writing after its lease is reassigned.

`requeue_expired_jobs` runs at worker startup and periodically afterward. It
changes abandoned `running` jobs back to `queued`, clears ownership, increments
`sequence`, and increments `dispatch_generation`. The schema then creates a new
`job.queued` outbox event.

Recovery does **not** process the job directly. It waits for the new outbox
event to reach RabbitMQ and return as a delivery.

### OCR processing

`_process_claimed_job` selects `OcrJobProcessor` for `type = ocr` and runs it
while the heartbeat task maintains the lease.

`OcrJobProcessor.process` performs:

~~~text
read document and MinIO object key
  -> download original PDF
  -> step=ocr, progress=10
  -> render each page and call LM Studio
  -> persist progress after every page (10%..85%)
  -> step=detecting_metadata, progress=87
  -> run deterministic metadata rules
  -> step=saving_draft, progress=92
  -> upsert stable OCR draft
  -> move document to review
  -> complete job at 100%
~~~

`LmStudioOcr.extract_pdf` checks page count, rejects zero-page or over-limit
documents, renders one page at a time to PNG, and sends each image to the
configured OpenAI-compatible `/chat/completions` endpoint. Page rendering runs
off the event loop.

`DocumentMetadataDetector.detect` derives a first-pass title, document type,
document number, cohort, programme scope, and language from OCR text and the
original filename. These values are drafts for human review, not trusted final
metadata.

### Retry and terminal failure

`_is_retryable` treats network/HTTP failures as retryable and malformed source
or permanent OCR data failures as terminal. `_retry_at` uses exponential delay
with small jitter, capped by `job_retry_max_seconds`.

`schedule_retry_or_fail` then does one of two things:

- retryable and attempts remain: return the job to `queued`, set
  `next_attempt_at`, clear ownership, increment sequence and dispatch
  generation;
- terminal or attempts exhausted: set job `failed` and mark the document
  `failed`.

The delayed dispatch event is durable immediately, but the outbox timer does
not publish it until `available_at` is due.

## Workflow 4: REST and live status

REST is authoritative. WebSocket delivery is a low-latency convenience.

Recommended client flow:

~~~text
1. POST /v1/documents
2. save job_id
3. GET /v1/jobs/{job_id}
4. optionally connect /v1/ws/jobs/{job_id}
5. after reconnect, GET the REST snapshot again
6. apply only events with a newer sequence
~~~

### REST snapshot

`get_job_status` in `api/v1/jobs.py` reads the current job directly from
SurrealDB. It returns state, step, progress, page counts, sequence, attempts,
retry time, result ID, and safe error text.

RabbitMQ queue depth is not a substitute for this endpoint. A healthy worker
ACKs its trigger quickly, while the durable job may continue running for
minutes.

### Status-event path

Every job sequence change creates a durable `job.status_changed` outbox row.
The outbox publishes it to the topic exchange `knowledge.status`.

Each API instance runs `_run_status_subscription` from `main.py`. It creates an
exclusive, auto-delete queue bound to `job.status_changed`, then forwards
messages into `JobStatusHub`.

`JobStatusHub` remembers the highest sequence per job, ignores duplicate or
out-of-order messages, and broadcasts only newer events to local WebSocket
clients. A new WebSocket receives the newer of:

- the current durable REST-style snapshot; or
- the newest event already seen by that API instance.

The WebSocket sends heartbeat pings at the configured interval. If the client
disconnects or an API instance restarts, the client must read REST again; the
in-process hub is deliberately not durable.

### Health versus readiness

- `GET /v1/health` answers whether the API process is alive.
- `GET /v1/ready` checks configured SurrealDB, the MinIO bucket, and the live
  RabbitMQ status connection.

When RabbitMQ is unavailable, readiness returns `503`. The API can still
durably accept an upload if MinIO and SurrealDB work; that job stays queued and
does not start until RabbitMQ and outbox delivery recover.

## Workflow 5: safe MinIO orphan cleanup

There is an unavoidable cross-store ambiguity: MinIO may accept a PDF and the
API may lose its database connection while committing the matching document.
Immediate deletion would risk removing a valid source. Never add eager cleanup
to the upload error path.

Cleanup is implemented as a separate process in `app/orphan_cleanup.py` and is
disabled by default.

### Candidate definition

`MinioObjectStore.list_source_objects` lists only the `documents/` prefix and
returns application-owned `SourceObject` values rather than raw SDK objects.

`OrphanCleanup.run_once` considers an object only when all of these are true:

1. its key exactly matches
   `documents/doc_<32 lowercase hex>/original.pdf`;
2. its modification time is older than the configured grace period;
3. the indexed SurrealDB lookup finds no document with that source key;
4. the lookup completed successfully.

In dry-run mode, the service logs the candidate and does not delete it.

In deletion mode, it performs the same indexed database lookup a second time
immediately before calling `MinioObjectStore.remove`. This closes the race where
a document appears after the first lookup. A lookup error always retains the
object. A delete error is recorded and does not stop later candidates.

### Safe operation

Defaults are deliberately conservative:

~~~text
KNOWLEDGE_ORPHAN_CLEANUP_ENABLED=false
KNOWLEDGE_ORPHAN_CLEANUP_GRACE_SECONDS=86400
KNOWLEDGE_ORPHAN_CLEANUP_INTERVAL_SECONDS=3600
KNOWLEDGE_ORPHAN_CLEANUP_DRY_RUN=true
~~~

Start with dry-run enabled:

~~~powershell
$env:KNOWLEDGE_ORPHAN_CLEANUP_ENABLED = "true"
$env:KNOWLEDGE_ORPHAN_CLEANUP_DRY_RUN = "true"
docker compose --profile maintenance up --build knowledge-orphan-cleanup
~~~

Inspect `orphan_cleanup_dry_run_candidate` logs. Enable deletion only after the
reported keys and database state have been independently checked. Deploy only
one cleanup process unless a distributed lock is added.

## Failure behavior reference

| Failure point | Durable result | Recovery behavior |
| --- | --- | --- |
| Invalid or oversized upload | Nothing created. | Client must correct the request. |
| MinIO write fails | Nothing created in SurrealDB. | API returns `502`; client can retry. |
| Database reports failure around commit | Source may remain; commit outcome may be ambiguous. | API returns `503`; conservative cleanup checks it after the grace period. |
| Direct RabbitMQ publish fails or times out | Document, job, and pending outbox rows remain. | API returns `202`; relay retries later. |
| RabbitMQ accepts a message but publication marking fails | Message may exist and outbox row remains pending. | Relay may republish; atomic claim makes the duplicate safe. |
| RabbitMQ is down | New job remains `queued` with no worker claim. | API readiness is `503`; outbox and worker resume after reconnect. |
| Outbox live query disconnects | Durable rows remain in SurrealDB. | Relay reconnects, subscribes, then performs a catch-up drain. |
| Worker receives a duplicate message | Existing state is not claimable by the duplicate. | Worker ACKs and ignores it. |
| Worker dies before ACK | RabbitMQ retains or redelivers the message. | A worker retries the guarded claim. |
| Worker dies after claim and ACK | Job stays `running` until its lease expires. | Lease recovery requeues it and creates a new dispatch event. |
| RabbitMQ drops during active OCR | Existing claimed job may finish under its lease. | No next job is claimed until RabbitMQ is available. |
| Retryable OCR/network failure | Job becomes delayed `queued` if attempts remain. | Outbox timer publishes the next dispatch when due. |
| Permanent OCR/source failure | Job and document become `failed`. | Operator/client sees the safe error through REST. |
| WebSocket disconnects | Durable job is unchanged. | Client reconnects and refreshes from REST. |
| Cleanup database lookup fails | Object is retained. | A later cleanup pass can try again. |

## State and progress reference

Normal job progression:

~~~text
queued (0%)
  -> claimed (5%)
  -> ocr (10%)
  -> ocr page progress (up to 85%)
  -> detecting_metadata (87%)
  -> saving_draft (92%)
  -> completed (100%)
~~~

Normal document progression:

~~~text
processing -> review
           -> failed    when the OCR job ends terminally
~~~

`indexed` exists in the schema for later retrieval work but is not reached by
this OCR workflow.

## Configuration that changes behavior

All settings live in `app/config.py`, use the `KNOWLEDGE_` prefix unless an
explicit compatibility alias exists, and are represented in `.env.example` or
Compose.

| Setting | Default | Effect |
| --- | ---: | --- |
| `RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_SECONDS` | 5 | Maximum wait for a broker confirmation. Must be positive. |
| `OUTBOX_BATCH_SIZE` | 100 | Maximum rows fetched per due-event batch. |
| `OUTBOX_RETRY_BASE_SECONDS` | 1 | Initial relay retry delay. |
| `OUTBOX_RETRY_MAX_SECONDS` | 30 | Cap for relay retry backoff. |
| `WORKER_LEASE_SECONDS` | 180 | Duration of one durable worker claim. |
| `WORKER_HEARTBEAT_SECONDS` | 30 | Lease-renewal interval; must be less than lease duration. |
| `RECOVERY_SWEEP_SECONDS` | 30 | How often workers requeue expired leases. |
| `JOB_MAX_ATTEMPTS` | 3 | Maximum normal processing attempts. |
| `JOB_RETRY_BASE_SECONDS` | 10 | Initial job retry delay. |
| `JOB_RETRY_MAX_SECONDS` | 300 | Cap for job retry delay. |
| `OCR_MAX_PAGES` | 100 | Maximum accepted PDF page count for OCR. |
| `OCR_TIMEOUT_SECONDS` | 120 | LM Studio request timeout. |
| `WEBSOCKET_HEARTBEAT_SECONDS` | 20 | WebSocket ping interval. |
| `ORPHAN_CLEANUP_ENABLED` | false | Master switch for the cleanup process. |
| `ORPHAN_CLEANUP_GRACE_SECONDS` | 86400 | Minimum source-object age before consideration. |
| `ORPHAN_CLEANUP_INTERVAL_SECONDS` | 3600 | Delay between cleanup passes. |
| `ORPHAN_CLEANUP_DRY_RUN` | true | Report candidates without deletion. |

The actual environment names include the `KNOWLEDGE_` prefix, for example
`KNOWLEDGE_RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_SECONDS`.

## Observability and debugging

### Useful endpoints and commands

From `services/ai-service/knowledge`:

~~~powershell
docker compose up -d --build
docker compose ps
docker compose logs -f knowledge-api knowledge-outbox knowledge-worker
~~~

| Address | Meaning |
| --- | --- |
| `http://localhost:8000/v1/health` | API process liveness. |
| `http://localhost:8000/v1/ready` | SurrealDB, MinIO, and RabbitMQ readiness. |
| `http://localhost:8000/v1/jobs/{job_id}` | Authoritative durable job state. |
| `http://localhost:8000/docs` | OpenAPI UI. |
| `http://localhost:8000/metrics` | API Prometheus metrics. |
| `http://localhost:15672` | RabbitMQ management UI. |
| `http://localhost:9001` | MinIO console. |
| `http://localhost:8001` | SurrealDB endpoint exposed by Compose. |

Queue counters:

~~~powershell
docker exec knowledge-rabbitmq-1 rabbitmqctl list_queues `
  name messages_ready messages_unacknowledged messages
~~~

### Metrics to know

| Metric | What it answers |
| --- | --- |
| `knowledge_outbox_publishes_total{type,result}` | Are events published, timing out, rejected, or failing to connect? |
| `knowledge_job_claims_total{result}` | Are worker deliveries claimed or ignored as duplicates? |
| `knowledge_job_claim_conflicts_total` | Are concurrent claims contending? |
| `knowledge_expired_leases_total` | Are workers disappearing during jobs? |
| `knowledge_job_retries_total` | How often are jobs retried? |
| `knowledge_terminal_failures_total` | How many jobs end permanently failed? |
| `knowledge_rabbitmq_queue_depth` | How many OCR trigger messages are ready? |
| `knowledge_jobs{status}` | How many durable jobs exist in each state? |
| `knowledge_ocr_document_seconds` | End-to-end OCR processing time. |
| `knowledge_ocr_page_seconds` | Per-page LM Studio latency. |
| `knowledge_orphan_cleanup_total{result}` | What did the cleanup scanner retain, report, delete, or fail to check? |

### Debug by symptom

| Symptom | First checks | Core code |
| --- | --- | --- |
| Upload returns `502` | MinIO health, bucket, credentials, API logs. | `MinioObjectStore.put_pdf` |
| Upload returns `503` before `202` | SurrealDB connectivity and schema initialization. | `create_document_with_job` |
| Upload returns `202` but job stays queued | `/v1/ready`, pending outbox fields, outbox logs, RabbitMQ connection. | `_publish_new_job`, `run_outbox_publisher` |
| Outbox retries too quickly | `last_error`, publish result metric, retry settings, self-notification gate. | `drain_and_schedule`, `_retry_delay` |
| Queue has messages but worker is idle | Worker connection, consumer count, malformed message logs. | `RabbitMqBroker.consume_jobs` |
| Job stays running | `worker_id`, `lease_expires_at`, worker logs, recovery sweep. | `_maintain_lease`, `requeue_expired_jobs` |
| OCR progress stops on one page | LM Studio health/model, HTTP timeout, GPU capacity. | `LmStudioOcr._extract_page` |
| REST updates but WebSocket does not | Status outbox publication, API status consumer, sequence values. | `_run_status_subscription`, `JobStatusHub.broadcast` |
| Cleanup reports nothing | Enabled/profile flags, object age, exact key shape. | `OrphanCleanup.run_once` |

## Verification

Local code checks:

~~~powershell
python -m ruff check src tests
pytest -q
docker compose --env-file .env.example config --quiet
~~~

The implementation has also been exercised with:

- a real four-page PDF completing OCR and reaching `completed`;
- RabbitMQ stopped while an upload committed: readiness returned `503`, the
  job remained `queued` with zero attempts, and it completed after recovery;
- rebuilt API, worker, and outbox images starting cleanly;
- the maintenance cleanup service started with cleanup enabled and dry-run
  enabled.

Targeted automated tests live under `knowledge/tests/`. The most relevant are:

- `tests/infrastructure/test_rabbitmq_confirmations.py`;
- `tests/infrastructure/test_outbox_recovery.py`;
- `tests/infrastructure/test_job_claiming.py`;
- `tests/application/test_worker_rabbitmq_required.py`;
- `tests/application/test_orphan_cleanup.py`;
- `tests/application/test_ocr_idempotence.py`;
- `tests/api/test_documents.py` and `tests/api/test_health.py`.

## Known boundary

The optional shared `KNOWLEDGE_WEBSOCKET_AUTH_TOKEN` can protect status sockets
at deployment level, but it is not user/document authorization. Before a
multi-tenant production deployment, the parent application's identity and
authorization model must be enforced for both REST and WebSocket access.
