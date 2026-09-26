# Extensible job routing plan

## Objective

Route each `job.queued` event according to its job type so a future job kind can
use its own durable RabbitMQ queue and processor. Preserve the current PDF upload
and OCR behavior. A new kind should require adding its route, processor, and
producer, without adding another `if job_type == ...` branch to the publisher.

## Current path

`POST /v1/documents` creates a job with `type = "ocr"`. The `job_dispatch_outbox`
SurrealDB event copies the job ID and dispatch generation into an outbox row,
but does not copy `job.type`. `RabbitMqBroker.publish_outbox_event` consequently
publishes every `job.queued` event with routing key `"ocr"`, and
`_declare_job_queue` binds only `knowledge.jobs.ocr` to that key. The worker
already selects a processor from `processors[job["type"]]` after claiming the
job, but `consume_jobs` listens to only that one queue.

The current worker also ignores the `dispatch_generation` in the message:
`claim_job` checks only whether the job is queued and due. A stale delivery can
therefore claim a later generation. Account for that while changing the job
message contract.

## Target contract

```text
job.type -> outbox_event.job_type -> validated JobRoute
         -> direct exchange / routing key -> durable queue
         -> matching worker processor
```

Keep `job.queued` as the event type; `job_type` identifies the work kind.
Define one explicit route registry, for example an immutable `JobRoute` with
`job_type`, `routing_key`, and `queue_name`, initially containing OCR. Keep the
existing `knowledge.jobs` exchange, `ocr` routing key, and
`knowledge.jobs.ocr` queue as the OCR route. The broker reads the registry for
both publishing and queue binding. Unknown types fail validation before job
creation and remain unpublished with a clear error if an invalid legacy row
reaches the relay. A registered route must have a worker processor before that
worker subscribes to its queue.

The registry is an infrastructure seam: producers choose a supported job type;
the broker owns exchange and queue details. A future producer can still use the
existing upload endpoint or a new endpoint according to its product workflow.
Endpoint count does not determine job kind.

## Implementation steps

### 1. Carry the type in the durable event

- Add `job_type` to `outbox_event` in `db/schema.surql` and copy
  `$after.type` in `job_dispatch_outbox`. Keep status events as they are.
- Include the job type in `SurrealDatabase.repair_missing_job_triggers` so
  repaired events use the same contract as new events.
- Backfill existing unpublished `job.queued` rows from their referenced jobs
  before requiring `job_type` in the new publisher. Verify the backfill query
  against the project's SurrealDB version; do not guess a record dereference
  syntax. Do not rewrite published rows.
- Reject unsupported job types at the job submission seam before the document
  and job transaction. Keep the database and outbox transaction atomic.

Completion: a new and a repaired OCR job each create an unpublished outbox row
with `job_type = "ocr"`; any pending pre-change OCR row is backfilled.

### 2. Route and bind through one registry

- Add the route registry in the RabbitMQ infrastructure code and use it to
  resolve `event["job_type"]` in `publish_outbox_event`. Include `job_type` and
  `dispatch_generation` in the message body; retain `job_id` and event ID.
- Generalize `_declare_job_queue` to take a route. Bind that route's durable
  queue to its routing key on the direct jobs exchange. Publish with
  `mandatory=True`, persistent delivery, timeout, and publisher confirmation
  exactly as today. Preserve the separate status-event topic exchange.
- Let `consume_jobs` subscribe to the routes whose processors this worker
  supports. Track their consumer tags so graceful shutdown cancels every
  subscription. Keep one in-flight job per worker; decide whether the current
  `QUEUE_DEPTH` gauge sums the subscribed queues or gains a `job_type` label,
  and update its tests accordingly.
- Keep OCR queue and binding names unchanged so already queued OCR messages
  remain consumable.

Completion: OCR still routes to `knowledge.jobs.ocr`; a test-only second route
can publish to and bind a distinct queue without changing publisher branches.

### 3. Guard claims with the message's identity

- Parse `job_type` and `dispatch_generation` from new messages. Extend
  `SurrealDatabase.claim_job` to require the expected type and generation in
  its atomic `UPDATE ... WHERE` condition, alongside queued/due checks.
- Verify that the queue delivery's route matches its job type before claiming.
  A mismatch or older generation must not start processing; acknowledge an
  obsolete delivery after the database check. Preserve requeue behavior for
  transient database failures.
- Decide and test how to drain pre-change OCR messages that have no `job_type`
  field. During migration, they can be interpreted as OCR only when delivered
  from the existing OCR queue; remove that compatibility path after the queue
  is drained. Do not infer another kind from a missing field.

Completion: an OCR generation-1 message cannot claim a queued generation-2
job, and a message for one kind cannot claim a job of another kind.

### 4. Verify the full path

- Add schema and database tests for outbox creation, repair, and guarded claim.
- Add broker tests with two registered routes that assert exchange, routing
  key, queue binding, payload, publisher confirmation, and unknown-type error.
- Run an OCR upload through the existing Compose stack and confirm that it
  reaches review as before. Create a queued test job for the second route and
  confirm it reaches only its queue/processor; a fake processor is sufficient.
- Check that outbox retries and recovery still publish the original job type
  and current dispatch generation. Confirm a failed publish remains pending.

Completion: existing OCR behavior and the second-route scenario pass; stale
and misrouted deliveries do not process a job.

## Adding a real job kind later

Add its route to the registry, implement and register its processor, and have
its producer create a job with that type. Give the worker access to any new
dependencies it needs and decide whether to run it in the current worker
process or a separate Compose worker. No change to the generic outbox publisher
should be necessary.
