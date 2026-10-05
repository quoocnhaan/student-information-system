> Historical plan: workflow/schema compatibility and manual acceptance requirements
> are superseded by [the current workflow](../README.md) and the obsolete workflow cleanup.

# Stalled job failure and manual retry

## Objective and policy

Bound stalled processing with operation deadlines and recover abandoned jobs once at worker startup, preserving inputs for explicit user retry. A failed job moves to `queued` only through a user Retry action or the retry endpoint. Timeout handlers and startup recovery never enqueue, publish, or retry work. Use no periodic database heartbeats, lease renewal, or recurring watchdog scans.

Keep claim-before-ACK delivery: the worker atomically claims a queued job, acknowledges its RabbitMQ message, then processes it. Existing queued-job replay remains delivery of already-authorized work, not a retry of failed work. Preserve legitimate OCR-to-correction stage publication. Separate pre-claim broker delivery failures from processing failures; document the existing pre-claim NACK behavior rather than treating it as job retry.

## Evidence and uncertainty

Job `job_d74c57608ca94def8885939aac5d32de` was observed at `running / embedding / 90%` after a successful embedding response. Its retained input produced 16 chunks from 3 pages. Independent reads found zero committed chunks, document status `indexing`, and the retained `index_input` still present.

SurrealDB was healthy and accepted independent reads. These observations establish that the final index did not commit; they do not establish which await stalled or whether the cause is a server error, client response handling, a silent return, or a transaction error. The previous write probe used `client.query()` against a schemafull table without required chunk fields; absence of a raised exception is insufficient evidence that each transaction statement succeeded. Verify raw statement results before claiming a write succeeded.

## Implementation sequence

### 1. Reproduce and locate the completion failure

Read `src/app/worker/{core,index,__main__}.py`, `src/app/infrastructure/surreal.py`, `src/app/jobs/publisher.py`, the job schema, and the job lifecycle tests. Inspect the installed SDK behavior for `query()` and `query_raw()`, especially multi-statement errors and transaction result selection.

Use an isolated test namespace/database to run the exact index transaction with valid chunk fields and 768-dimensional vectors. Examine every raw statement status. Add structured logs at commit entry, completion, timeout, and failure, with job ID, claim ID, chunk count, and duration; exclude document text, vectors, and credentials. Preserve server-side error causes in logs and return bounded safe errors to clients.

Handle a completion method returning `None` as an explicit lost-claim or invalid-state outcome, rather than successful processing of a still-running job. After an uncertain response, reconcile durable state before choosing an outcome.

**Done when:** a deterministic test reproduces a hanging completion or a silently failed transaction, and the actual transaction succeeds or produces a checked, diagnosable error in an isolated SurrealDB instance. Record the underlying cause if reproduced; retain uncertainty if it is not.

### 2. Bound database operations and reconcile uncertain commits

Introduce positive, configurable database request and index commit deadlines. Use one bounded adapter mechanism for relevant database calls, including error reconciliation and failure persistence. Check every transaction statement using raw results instead of assuming `query()` exceptions report all failures.

On timeout, treat commit outcome as unknown: cancelling a Python await does not prove that a server transaction rolled back. Discard the suspect connection with bounded cleanup and read durable state using a fresh, independently owned connection. Avoid closing a shared client beneath unrelated tasks; isolate processing connections or otherwise establish explicit connection ownership.

If this claim has completed, preserve success. If this claim is still running, conditionally mark it failed and apply the matching domain failure changes atomically. If the claim has changed or the job is already terminal, leave it untouched. Fence every completion/failure write by both `status = 'running'` and the expected claim inside the transaction so an old worker cannot overwrite a user retry. Test transaction conflicts and late commits against the deployed SurrealDB version.

If SurrealDB is unavailable, log failure persistence as pending; durable failure can only be recorded after database connectivity returns. Do not report success or publish a retry during this interval.

Bound external model calls with elapsed deadlines as well as transport timeouts, and give processing an overall configurable deadline appropriate to its job type. Existing low-level request retries must be audited: the user's policy is to fail on faults and retry only through explicit user action, so remove automatic model/request reattempts during processing. Bound failure handling independently after processing cancellation. If reconciliation or failure persistence cannot complete, stop accepting new work and exit unsuccessfully so container restart can attempt startup recovery. Reattempting a guarded failure-state write during recovery is bookkeeping, not execution of the job.

**Done when:** hanging calls terminate within their configured bounds; checked database errors reach failure handling; a committed-but-unanswered transaction remains completed; an obsolete claim cannot change current job or domain records.

### 3. Recover only this worker's abandoned jobs at startup

Give each configured worker replica a stable `worker_id` and each process start a new `worker_run_id`. Store both on the job atomically with its claim. The stable identity must survive container recreation; generate the run identity at process startup. Keep claim IDs unique per attempt. Index job ownership for bounded recovery queries.

Before consuming messages, perform one bounded recovery pass for `running` jobs owned by this stable worker identity from previous runs. Reconcile each row on a fresh connection and atomically fail it only when status, recorded ownership, and claim still match. Apply the job type's domain failure effects in the same transaction. Recovery leaves queued jobs and other replicas' running jobs untouched, preserves completed jobs, and publishes zero messages.

This relies on an explicit deployment invariant: exactly one live process may use a stable worker identity. Configure distinct identities for OCR, correction, index, and every additional replica. A replacement starts only after its predecessor has terminated; overlapping rolling replacement under one identity is unsupported. Do not infer death merely from a different run ID, an old progress timestamp, or queue membership. A generic startup scan of all running jobs would incorrectly fail other workers' active jobs.

If startup recovery fails or times out, exit before registering RabbitMQ consumers; the configured container restart policy can attempt startup again. Once recovery completes, ordinary processing begins without any recurring database scan. If a crashed replica never restarts, its abandoned rows remain running until an operator starts its replacement or performs explicit recovery.

Add optional ownership fields and an ownership index to the schema and a migration integrated with `src/app/infrastructure/apply_migration.py`. Legacy running jobs lack reliable ownership: recover explicitly selected jobs only after verifying their owning workers have stopped. Never bulk-fail unowned jobs during ordinary startup. Manual retry clears old ownership, and a new claim records current ownership.

An operation timeout requires a responsive event loop. For total process freezes, document an external supervisor/liveness mechanism or operator restart. Docker Compose `restart: unless-stopped` restarts exited processes; an `unhealthy` health check alone does not restart a container. Do not claim the timeout/startup design detects a frozen process that remains running.

**Done when:** restart under the same stable worker identity fails only its abandoned previous-run jobs before consuming; another replica's active jobs remain untouched; recovery races preserve terminal states; database outages block consumption; normal operation performs no heartbeat or watchdog database traffic.

### 4. Apply the correct failure effects for each job type

Share claim-guarded failure policy between normal processing exceptions, operation deadlines, and startup recovery. Keep external I/O outside failure transactions; use durable records to resolve effects.

| Type | Required failure behavior |
| --- | --- |
| `ocr_pdf` | Mark processing document failed; retain source PDF. |
| `index_document` | Mark indexing document failed; retain confirmed `index_input` and OCR draft; preserve any previously committed index. |
| `correct_ocr` | Keep raw OCR reviewable using existing correction-failure semantics. |
| `correct_chunks` | Mark affected pending suggestions failed; preserve indexed chunks. |
| `reembed_chunk` | Mark job failed; preserve the existing searchable vector. |

Keep the current manual index retry contract: only a failed index job with retained confirmed input can be requeued. Retry clears old ownership, and the next claim receives a new claim ID. Show errors and expose an eligible Retry action in the admin UI if missing; do not add automatic retry or broaden retry to other job types in this change.

**Done when:** every supported job type has tested domain effects, retained input rules, and stale-claim fencing; only an explicit retry request changes a failed index job to queued and publishes it.

### 5. Validate and document operation

Add meaningful regression coverage through worker execution and database integration:

- Successful embeddings followed by a hanging index commit become failed within the deadline, retaining confirmed input.
- A raw multi-statement error cannot be mistaken for completed processing.
- Lost commit responses reconcile to durable success when appropriate.
- Startup recovery fails previous-run jobs of the same stable worker, preserves other workers' active jobs and terminal jobs, and safely handles repeated startup.
- A live-but-hung worker reaches its processing deadline; processing makes no automatic model/request reattempts after faults.
- Failed startup recovery registers no consumers; failure persistence outages cause an unsuccessful worker exit.
- Old completion attempts cannot publish chunks or overwrite a retried claim.
- Failure paths and startup recovery publish zero messages, including repeated recovery and reconnection.
- Ordinary idle and active operation emits no heartbeat writes or periodic recovery scans.
- Manual retry rejects running/completed jobs and missing inputs, and accepts eligible failed indexing jobs.
- Failure behavior for correction and reembedding preserves reviewable/searchable data.

Run the relevant tests against an isolated SurrealDB database, then the service test suite. Update `.env.example`, Docker Compose configuration, and README with operation/processing deadlines, stable worker identities, restart policy, startup recovery, and manual retry behavior. Document the one-live-process-per-identity invariant, legacy job recovery, total-freeze limitations, and the fact that failure persistence requires a reachable database. Remove heartbeat/watchdog configuration from this approach.

**Done when:** regression tests and required checks pass, isolated artifacts are removed, and configuration and operator documentation match the implemented policy.

### 6. Recover the reported job when implementation/deployment is authorized

Re-read this specific job before recovery; it may have changed since diagnosis. Stop its owning worker and verify termination before fencing the old attempt. Do not restart SurrealDB as a routine recovery step. Check document state, chunks, retained input, and claim through a fresh connection. This legacy job has no new ownership metadata: explicitly select it for recovery rather than relying on the normal ownership-based startup pass. If still running and abandoned, apply the guarded failure transition with a clear error. Preserve retained input and document source. Rebuild/restart the worker with its stable identity and the validated fix.

Verify `GET /v1/jobs/job_d74c57608ca94def8885939aac5d32de` reports failed and that no recovery message was published. Wait for the user to click Retry or explicitly request the retry endpoint; that action alone authorizes another processing attempt. If the job has already completed, preserve completion and skip failure recovery.

**Done when:** the observed abandoned job is failed with inputs preserved, or its independently verified terminal state is preserved; retry remains a separate explicit user action.

## Scope of this document

This is an implementation plan only. Creating it does not modify application code, deploy containers, change the reported job, or call its retry endpoint.
