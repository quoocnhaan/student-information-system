# Reliability hardening plan: RabbitMQ, outbox, and MinIO

## Goal

Implement the first four limitations recorded in KNOWLEDGE_WORKFLOW.md:

1. Bound RabbitMQ publisher-confirmation waits.
2. Deliver new outbox events continuously without fixed-interval database polling.
3. Make RabbitMQ mandatory for starting jobs by removing the worker database fallback.
4. Safely clean up orphaned source PDFs in MinIO.

WebSocket/user authorization is excluded from this plan.

## Required reading

Before editing code, read these current sources completely:

- services/ai-service/docs/KNOWLEDGE_WORKFLOW.md
- services/ai-service/knowledge/src/app/config.py
- services/ai-service/knowledge/src/app/infrastructure/rabbitmq.py
- services/ai-service/knowledge/src/app/infrastructure/surreal.py
- services/ai-service/knowledge/src/app/infrastructure/minio.py
- services/ai-service/knowledge/src/app/outbox.py
- services/ai-service/knowledge/src/app/worker.py
- services/ai-service/knowledge/src/app/main.py
- services/ai-service/knowledge/src/app/api/v1/documents.py
- services/ai-service/knowledge/db/schema.surql
- services/ai-service/knowledge/docker-compose.yml
- relevant tests under services/ai-service/knowledge/tests

Preserve unrelated working-tree changes. Add regression tests before each behavioral
change. Run focused tests after every phase and the full suite at the end.

## Architecture decisions

These decisions are part of the requested implementation:

- SurrealDB remains the durable source of truth.
- RabbitMQ remains an at-least-once dispatch and status transport.
- A RabbitMQ publish succeeds only after a Basic.Ack publisher confirmation.
- A publisher timeout has an unknown outcome. Keep the outbox event unpublished,
  because RabbitMQ may have accepted the message even if the confirmation was lost.
- Outbox wake-up is event-driven through a SurrealDB live query. Do not restore a
  fixed-interval pending-event polling loop.
- Delayed outbox events use a one-shot timer for the earliest available_at value.
  A timer is scheduling, not recurring database polling.
- RabbitMQ is mandatory for starting new jobs. Remove the worker's direct database
  claim fallback.
- If RabbitMQ is lost after a worker has already claimed a job, let that in-flight
  job finish under its lease. Do not start another job until RabbitMQ is available.
- MinIO cleanup is conservative: delete only old, correctly shaped source objects
  that have no matching SurrealDB document after a final recheck.
- All delivery remains idempotent. Duplicate RabbitMQ messages are expected.

## Phase 1 - Bound publisher confirmations

### Implementation

1. Add a validated setting:
   - rabbitmq_publish_confirm_timeout_seconds
   - default: 5 seconds
   - positive value only
2. Add the corresponding environment example and Docker Compose variable.
3. In RabbitMqBroker.publish_outbox_event, wrap only the confirmation wait in an
   explicit asyncio timeout.
4. Raise a specific publish-timeout exception with event type and event ID, without
   logging credentials or message bodies.
5. Always close the publishing channel.
6. Treat timeout exactly like an unknown publish outcome:
   - do not set published_at;
   - increment publish_attempts;
   - store a bounded last_error;
   - allow a later delivery attempt.
7. Keep the API response bounded. If the database transaction committed and the
   direct publish times out, return the accepted job response after recording the
   failed attempt.
8. Add a metric label/result that distinguishes timeout from broker rejection and
   connection failure if the existing metric model supports this without
   high-cardinality labels.

Likely files:

- src/app/config.py
- src/app/infrastructure/rabbitmq.py
- src/app/api/v1/documents.py
- src/app/outbox.py
- src/app/observability/metrics.py
- .env.example
- docker-compose.yml
- tests/infrastructure/test_rabbitmq_confirmations.py
- tests/api/test_documents.py

### Acceptance criteria

- A fake publish coroutine that never resolves fails within the configured deadline.
- The timeout leaves published_at empty and records last_error.
- A Basic.Ack still marks the exact event published.
- Basic.Nack or a non-Ack result remains a failed publish.
- An upload whose direct publish times out still returns 202 after its durable
  transaction, within a bounded test duration.
- A later replay of the uncertain event is safe and does not create two active job
  claims.
- No test relies on real-time sleeps longer than a few milliseconds; inject a short
  timeout in tests.

Phase complete when all focused confirmation and upload tests pass.

## Phase 2 - Continuous event-driven outbox delivery

### Chosen mechanism

The pinned SurrealDB Python client exposes live, subscribe_live, and kill on its
WebSocket connection. Use a live query on outbox_event to wake the relay when a
record is created or changed. The notification is only a wake-up hint; always read
the authoritative pending rows before publishing.

### Implementation

1. Add a SurrealDatabase abstraction for subscribing to outbox table changes.
   Keep SDK-specific notification parsing inside the infrastructure adapter.
2. Use a dedicated live-query connection or otherwise prove that live notifications
   and normal queries can safely share the existing client.
3. Start the live subscription before the initial pending-event drain. This closes
   the race where an event is committed between startup drain and subscription.
4. Feed all wake-up sources into one coalescing asyncio.Event:
   - initial startup;
   - outbox live notification;
   - RabbitMQ reconnect;
   - database live-query reconnect;
   - publish retry timer;
   - earliest available_at timer.
5. Protect draining with one lock. Multiple notifications should coalesce into one
   drain, never create concurrent publishers for the same rows.
6. During a drain:
   - fetch due unpublished rows in creation order;
   - publish one event;
   - wait for confirmation;
   - mark only that event published;
   - continue batches until no due rows remain.
7. Add a query for the earliest future available_at among unpublished events.
   Schedule one cancellable timer for that instant. Recalculate it whenever the
   pending set changes.
8. If publish fails while the process remains alive, keep the event pending and
   schedule a bounded exponential-backoff retry. This is failure recovery, not an
   idle polling loop.
9. If the SurrealDB live stream ends or errors:
   - reconnect/resubscribe with backoff;
   - run a full catch-up drain after subscription is restored;
   - exit non-zero if recovery cannot continue and process supervision is the chosen
     recovery boundary.
10. On shutdown, cancel timers, kill the live query, close both connections, and
    finish or safely abandon the active publish.
11. Make startup tolerant of schema-initialization order. A missing/unready outbox
    table must cause retry/reconnect, not a permanently sleeping relay.
12. Update status delivery so new job.status_changed rows wake the relay immediately.

Likely files:

- src/app/infrastructure/surreal.py
- src/app/outbox.py
- src/app/infrastructure/rabbitmq.py
- src/app/config.py
- tests/infrastructure/test_outbox_recovery.py
- tests/infrastructure/test_outbox_live_delivery.py
- tests/integration/test_status_delivery.py
- docker-compose.yml

### Acceptance criteria

- Start the relay, then create an outbox row: it publishes without restarting the
  relay and without reconnecting RabbitMQ.
- An event created during relay startup is not missed.
- A future available_at event publishes once it becomes due without periodic queries.
- A burst of notifications produces one serialized drain, not parallel drains.
- A live-query disconnect followed by recovery performs a catch-up drain.
- A publish timeout/failure remains pending and retries with bounded backoff.
- While completely idle, the relay performs no recurring pending-event query.
- A real OCR job emits sequenced running/progress/completed status events to a
  connected WebSocket client, and REST returns the same final state.
- Restarting either SurrealDB or RabbitMQ does not lose committed events.

Phase complete when unit tests and the Docker-backed outbox/status integration test
pass.

## Phase 3 - Make RabbitMQ mandatory for starting jobs

### Policy boundary

RabbitMQ availability controls admission and new job starts. An already claimed
in-flight job may finish because aborting it would discard useful work and delay
recovery. No worker may claim another queued job until its RabbitMQ consumer is
available again.

### Implementation

1. Remove these settings and their environment variables:
   - database_poll_fallback_enabled
   - database_poll_fallback_seconds
2. Remove the worker branch that calls claim_next_queued_job.
3. Remove claim_next_queued_job if no non-test caller remains, along with obsolete
   tests and metrics labels that exist only for fallback claiming.
4. Keep claim_job for RabbitMQ deliveries and preserve its atomic queued-to-running
   guard.
5. At worker startup, establish RabbitMQ consumption before waiting for work.
6. On RabbitMQ loss:
   - stop new deliveries/claims;
   - report an unhealthy/not-ready state or exit non-zero so process supervision can
     restart it;
   - allow an already claimed job to finish under its lease;
   - reconnect before accepting the next message.
7. Keep expired-lease recovery, but recovery may only change running to queued and
   create an outbox event. It must not directly process the queued job.
8. Ensure the API readiness endpoint returns 503 while its RabbitMQ status connection
   is unavailable.
9. Preserve durable upload semantics. A job committed during a publish outage stays
   queued and cannot run until RabbitMQ recovers and the outbox publishes it.
10. Remove fallback guidance from README and KNOWLEDGE_WORKFLOW.md. Document the
    final mandatory-broker behavior.

Likely files:

- src/app/config.py
- src/app/worker.py
- src/app/infrastructure/surreal.py
- src/app/main.py
- src/app/api/v1/health.py
- src/app/observability/metrics.py
- .env.example
- docker-compose.yml
- README.md
- ../docs/KNOWLEDGE_WORKFLOW.md
- tests/infrastructure/test_job_claiming.py
- tests/application/test_worker_rabbitmq_required.py
- tests/api/test_health.py

### Acceptance criteria

- Searching the runtime code finds no database polling fallback setting or worker
  claim loop.
- With RabbitMQ stopped, a newly committed job remains queued and OCR does not start.
- API readiness returns 503 while RabbitMQ is disconnected.
- After RabbitMQ returns, outbox delivery wakes the worker and the same job completes.
- A worker that loses RabbitMQ while already processing one job may finish that job
  but cannot claim the next queued job.
- Duplicate messages still result in one active owner and one OCR draft.
- Expired-lease recovery requeues work but waits for a new RabbitMQ delivery.

Phase complete when the broker-outage Docker integration test proves no queued job
starts before RabbitMQ recovery.

## Phase 4 - Safely clean orphaned MinIO source objects

### Definition

An orphan candidate is an object with the exact key shape:

~~~text
documents/doc_<32 lowercase hex characters>/original.pdf
~~~

It becomes deletable only when:

- its last-modified time is older than the configured grace period;
- no SurrealDB document has source.object_key equal to that key;
- the database check succeeds;
- a final database recheck immediately before deletion still finds no document.

### Implementation

1. Add settings:
   - orphan_cleanup_enabled, default false;
   - orphan_cleanup_grace_seconds, default 86400;
   - orphan_cleanup_interval_seconds, default 3600;
   - orphan_cleanup_dry_run, default true.
2. Extend MinioObjectStore with a narrow iterator for source objects that returns key
   and last-modified time. Keep raw MinIO SDK objects out of application logic.
3. Add an indexed SurrealDB lookup for document existence by source.object_key.
   Reuse the existing unique index; do not scan all documents in application code.
4. Implement an orphan cleanup use case that:
   - lists only the documents/ prefix;
   - ignores keys that do not match the exact generated shape;
   - ignores objects younger than the grace period;
   - skips every object when its database lookup errors;
   - rechecks the database immediately before deletion;
   - supports dry-run logs without deletion;
   - deletes only the exact validated key.
5. Run cleanup in a dedicated process/module, not inside API request handling.
6. When enabled, run once at startup and then at the configured interval. Ensure only
   one cleanup service is deployed unless a distributed lock is added.
7. Add structured counters/logs for scanned, retained, dry-run candidate, deleted,
   lookup failure, and delete failure. Never log credentials.
8. Add a Compose service/profile with safe defaults. Normal local startup must not
   delete objects unless cleanup is explicitly enabled and dry-run is explicitly
   disabled.
9. Document how to run dry-run first and how to inspect candidates.

Likely files:

- src/app/config.py
- src/app/infrastructure/minio.py
- src/app/infrastructure/surreal.py
- src/app/application/orphan_cleanup.py
- src/app/orphan_cleanup.py
- src/app/observability/metrics.py
- .env.example
- docker-compose.yml
- README.md
- ../docs/KNOWLEDGE_WORKFLOW.md
- tests/application/test_orphan_cleanup.py

### Acceptance criteria

- A recent unmatched object is retained.
- An old object with a matching document is retained.
- An old object with no matching document is reported but retained in dry-run mode.
- The same old orphan is deleted when enabled and dry-run is false.
- A malformed or unrelated object key is never deleted.
- A database lookup error causes retention.
- If a document appears between the first check and final recheck, the object is
  retained.
- A MinIO delete error is logged/metriced and does not stop checking other objects.
- Cleanup is disabled by default in Docker Compose.

Phase complete when all cleanup safety tests pass using fake MinIO and SurrealDB
adapters, followed by one Docker dry-run verification.

## Phase 5 - Cross-feature verification and documentation

1. Run formatting/lint/type checks configured by the repository.
2. Run the complete knowledge-service test suite.
3. Rebuild the Docker stack from clean service images.
4. Run this end-to-end matrix:
   - normal PDF completes;
   - confirmation timeout leaves an unpublished event and later recovers;
   - new status events reach WebSocket without relay restart;
   - RabbitMQ outage prevents a queued job from starting;
   - RabbitMQ recovery dispatches and completes that job;
   - worker crash after ACK recovers through lease plus a new queue message;
   - orphan cleanup dry-run reports but does not delete;
   - enabled non-dry cleanup deletes only a proven orphan.
5. Verify RabbitMQ queue counters, SurrealDB job/outbox state, MinIO object presence,
   API readiness, and container logs for every matrix row.
6. Update KNOWLEDGE_WORKFLOW.md so it describes final behavior and removes the four
   resolved limitations.
7. Record any intentionally deferred issue in a separate follow-up section; do not
   silently weaken an acceptance criterion.

### Final definition of done

- Every acceptance criterion in Phases 1-4 has a passing automated test or a named
  Docker integration check.
- Full test suite passes.
- Docker services start cleanly without startup-order outbox errors.
- No idle fixed-interval outbox polling exists.
- No worker database fallback exists.
- No PDF is deleted unless every cleanup safety gate passes.
- Documentation matches runtime behavior.
- WebSocket/user authorization remains untouched and out of scope.
