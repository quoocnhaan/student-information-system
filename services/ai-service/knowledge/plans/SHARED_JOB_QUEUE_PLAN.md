# Shared job queue plan

## Goal

Use one durable RabbitMQ queue for every `job.queued` message. The worker claims the job, reads its persisted `job.type`, and selects the corresponding processor. Adding a job type should require a producer and processor, but no new RabbitMQ queue or binding.

This plan supersedes the per-job-type queue topology in `EXTENSIBLE_JOB_ROUTING_PLAN.md`; it does not undo the job-type or dispatch-generation safety checks introduced there.

## Target flow

`job.queued` outbox event → `knowledge.jobs` direct exchange with routing key `job.queued` → one durable jobs queue → worker → generation-guarded database claim → processor selected by persisted `job.type`.

Keep the existing physical queue and configured name (`knowledge.jobs.ocr`) during this change, despite its historical name, so queued OCR work is not stranded. Renaming it would be a separate migration. Bind this same queue to both the old `ocr` key and the new `job.queued` key during rollout; there must not be a second jobs queue.

The message carries only `job_id` and `dispatch_generation`. The database is authoritative for `job.type`; the worker selects a processor only after the guarded claim returns the persisted job. Keep publisher confirms, persistent messages, acknowledgements, retry behavior, prefetch, and the status-event exchange unchanged.

## Implementation sequence

1. Add tests that describe the shared-queue contract before changing the broker. Cover multiple jobs published into the **same** queue, selection of processors from the claimed database records, stale generations being rejected, and old OCR messages delivered through the existing `ocr` binding. Assert that status events still use their separate exchange.
2. Move supported job-type validation out of the RabbitMQ route mapping. Use one application-level registry or equivalent source of truth for types accepted at job creation; ensure each accepted type has a worker processor at startup. Do not copy `job.type` into the outbox or RabbitMQ message, and do not make queue names or routing keys depend on job type.
3. Simplify `RabbitMqBroker`: declare and bind the configured jobs queue once, publish every `job.queued` event with the generic `job.queued` key, and consume from that one queue with one consumer. Remove the per-type queue declarations and consumer bookkeeping. Measure queue depth from that queue alone. Keep the public broker API as small as possible; it should not need a list of queue routes to publish or consume jobs.
4. Keep processor dispatch in the worker after a successful database claim. Unknown persisted types must fail visibly without being silently acknowledged as completed. Accept legacy messages containing `job_type`, but ignore that transport field.
5. Roll out consumers before enabling generic publishing or adding any non-OCR producers. An old consumer of `knowledge.jobs.ocr` can discard a new type, so all worker replicas must understand the shared-queue contract first. Then deploy the publisher with the generic binding, and only then enable new job types. Leave the old `ocr` binding until old publishers are gone and pending OCR messages have drained; remove that binding in a later, verified cleanup. Do not delete or purge the queue.

## Verification and done criteria

- Unit and broker integration tests show two types arriving on one queue and reaching the correct processors, with no per-type queue declared.
- Existing OCR messages and newly published messages both drain from the retained queue during migration.
- Generation mismatch tests show that stale messages cannot start processing, while processor selection uses the persisted job type.
- The outbox publish/retry path, status notifications, and queue-depth metric continue to work.
- A new job type can be added by registering its producer/processor and supported type, without editing RabbitMQ topology or adding a queue setting.
