# Direct job publishing with event-driven outbox recovery

## Goal

Publish newly created OCR jobs to RabbitMQ immediately from the API, while
preserving the database outbox as the durable recovery mechanism. Do not poll
the database continuously or add a periodic safety sweep.

## Core decisions

- SurrealDB remains the source of truth for documents, jobs, progress, retries,
  and outbox events.
- RabbitMQ remains an at-least-once delivery trigger; it does not own job
  state.
- The API publishes a new job as the normal, low-latency path.
- The outbox publishes only when recovery is needed:
  - the API could not publish the job;
  - the API crashed after the database transaction;
  - the outbox process starts;
  - the RabbitMQ connection is re-established.
- There is intentionally no fixed-interval query for pending outbox events.
- Duplicate queue deliveries are expected and safe because a worker atomically
  claims `queued -> running` in SurrealDB.

## Target flow

```text
Normal upload

Browser -> POST /v1/documents -> API
                                 |
                                 | one SurrealDB transaction
                                 | create document + queued job + outbox event
                                 v
                              SurrealDB
                                 |
                                 | after commit
                                 v
                         API -> RabbitMQ publish with confirmation
                                 |
                                 | confirmation received
                                 v
                         mark this outbox event published in SurrealDB
                                 |
                                 v
                              Worker claims job

Recovery

API publish fails, API crashes, outbox starts, or RabbitMQ reconnects
  -> query unpublished outbox events
  -> publish each event with confirmation
  -> mark each confirmed event published
```

## Implementation phases

### [x] Phase 1 — Preserve durable creation

1. Continue storing the source PDF in MinIO first.
2. In one SurrealDB transaction, create the document, queued OCR job, and its
   `job.queued` outbox event.
3. Return `202 Accepted` only after that transaction succeeds.
4. Keep the outbox event unpublished until RabbitMQ publisher confirmation is
   received.

Acceptance checks:

- A committed job always has a committed outbox event.
- If the API exits immediately after the transaction, the job remains
  recoverable.

### [x] Phase 2 — Make API publishing the normal path

1. After the database transaction commits, publish the new `job_id` directly
   to RabbitMQ.
2. Use RabbitMQ publisher confirmations; a local send attempt alone is not a
   successful publish.
3. On confirmation, mark that exact outbox event as published.
4. If publishing, confirmation, or marking the event published fails, leave
   the event unpublished and return the accepted job response. Do not roll
   back the durable job.

Acceptance checks:

- With RabbitMQ available, an idle worker receives a new job without waiting
  for an outbox polling interval.
- A broker-confirmed message whose database publication mark fails can be
  redelivered without duplicate OCR work.

### [x] Phase 3 — Change the outbox publisher into a recovery relay

1. Remove its continuous `outbox_poll_seconds` loop.
2. On outbox-process startup, fetch and drain all unpublished outbox events.
3. Detect RabbitMQ connection loss and reconnection.
4. On every successful reconnection, fetch and drain all unpublished outbox
   events.
5. During a drain, publish each event, wait for confirmation, then mark only
   that confirmed event published.
6. Keep an event unpublished when any step fails, so the next startup or broker
   reconnection retries it.

Acceptance checks:

- Jobs created while RabbitMQ is unavailable are delivered after RabbitMQ
  reconnects.
- A pending outbox event is delivered when the recovery relay restarts.
- When RabbitMQ remains connected and there are no failures, the relay makes no
  recurring database fetch for pending events.

### [x] Phase 4 — Retain idempotent worker behavior

1. Queue messages continue to contain only `job_id`.
2. Workers atomically claim a job before OCR.
3. Acknowledge the queue message after the durable claim decision.
4. Acknowledge and ignore a message when its job is no longer claimable.
5. Preserve leases, heartbeats, retry scheduling, and expired-lease recovery.

Acceptance checks:

- API publishing plus later outbox recovery can deliver the same job ID twice
  but results in one active claim and one OCR draft.
- A worker crash during OCR remains recoverable through the existing job lease.

## Failure matrix

| Situation | Durable state | Recovery action |
| --- | --- | --- |
| API commits then publishes successfully | Job and published outbox event | Worker handles normal queue delivery. |
| API crashes after commit, before publish | Unpublished outbox event | Recovery relay drains it at startup or RabbitMQ reconnect. |
| RabbitMQ is unavailable during upload | Unpublished outbox event | Recovery relay drains it after broker reconnect. |
| Broker confirms but marking outbox published fails | Unpublished event; possible delivered message | Later recovery can republish; worker safely ignores duplicate claim. |
| Worker crashes after claim | Running job with expired lease | Existing lease recovery requeues the job. |

## Explicitly out of scope

- Continuous database polling for unpublished outbox events.
- A scheduled or periodic outbox safety sweep.
- Making RabbitMQ the source of truth for job state.
- Sending PDFs or OCR text through RabbitMQ.
- Removing REST job-status retrieval or worker lease recovery.
