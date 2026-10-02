# Phase 1: job store, publisher, and API inside Knowledge

**Read first:** `README.md` (architecture rules, `JOB_QUEUES`, envelope).
**Requires:** nothing; this is the first phase.
**Working directory:** `services/ai-service/knowledge`.

## Scope

Knowledge stores its jobs in its own SurrealDB, publishes them to RabbitMQ itself, and serves job status from its own table. Port logic from `services/job-service/` (`store.py`, `publisher.py`, `main.py`'s `stream_job`), adapting it to Knowledge.

`JobServiceClient`, `api/internal_jobs.py`, and the orphan-cleanup job lookup stay in place and wired during this phase; phase 3 deletes them. The OCR worker arrives in phase 2, so in this phase jobs are created and published but not yet consumed.

## Job table

Add to `db/schema.surql` and as migration `db/migrations/006_service_owned_jobs.surql`:

```sql
DEFINE TABLE IF NOT EXISTS job SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS type ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS dedupe_key ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE job TYPE record<document>;
DEFINE FIELD IF NOT EXISTS status ON TABLE job TYPE string ASSERT $value INSIDE ['queued', 'running', 'completed', 'failed'];
DEFINE FIELD IF NOT EXISTS step ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS progress ON TABLE job TYPE int ASSERT $value >= 0 AND $value <= 100;
DEFINE FIELD IF NOT EXISTS total_pages ON TABLE job TYPE option<int>;
DEFINE FIELD IF NOT EXISTS processed_pages ON TABLE job TYPE int DEFAULT 0;
DEFINE FIELD IF NOT EXISTS sequence ON TABLE job TYPE int DEFAULT 1;
DEFINE FIELD IF NOT EXISTS claim_id ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS ocr_draft_id ON TABLE job TYPE option<record<ocr_draft>>;
DEFINE FIELD IF NOT EXISTS error ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE job TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE job TYPE datetime VALUE time::now();
DEFINE INDEX IF NOT EXISTS job_document_dedupe ON TABLE job FIELDS document_id, dedupe_key UNIQUE;
DEFINE INDEX IF NOT EXISTS job_status_created ON TABLE job FIELDS status, created_at;
```

Every state change increments `sequence`; the WebSocket relies on it.

## Job store

`SurrealDatabase` methods. Each is idempotent: a retry after an ambiguous response returns the committed state.

| Method | Rule |
|---|---|
| `create_document_with_job(record_id, document, job_record_id)` | One transaction: `CREATE document`, `CREATE job` (`type ocr_pdf`, `dedupe_key ocr_pdf`, `queued`, step `queued`, progress 0). Replaces `create_document` in the upload path. |
| `get_job(job_id)` | Validates `job_[0-9a-f]{32}`, returns the row or `None`. |
| `claim_job(job_id, claim_id, type)` | `queued → running` (step `claimed`, progress 5), only if `status='queued' AND type=$type`. Returns the row if this same claim already holds it. Retries SurrealDB transaction conflicts as `job-service/store.py` does. |
| `job_progress(job_id, claim_id, changes)` | Only while `running` with this `claim_id`; progress and processed pages never decrease. |
| `apply_ocr_result(document_record_id, job_id, claim_id, pages, metadata)` | Extend the existing method. In the **same transaction**: create the draft, move the document to `review`, and mark the job `completed` with `ocr_draft_id`, guarded by `claim_id`. Keep the rule of never rewriting an existing draft. |
| `fail_job(job_id, claim_id, error)` | One transaction: document `processing → failed`, job `running → failed` with a bounded error (≤ 500 chars). |
| `queued_jobs_after(cursor, limit)` | Page of `queued` rows for replay. |
| `subscribe_jobs()` | Live query on `job` for the WebSocket. |

## Steps

1. **Job schema and store.** Add the job table, migration 006, and the store methods above. Port and adapt the store tests from `job-service`, plus new tests for:
   - duplicate `create_document_with_job` (same `(document_id, dedupe_key)`);
   - concurrent claims (exactly one wins);
   - progress that never decreases;
   - `apply_ocr_result` called twice (one draft, job `completed` once);
   - `fail_job` on a document that is no longer processing.

   *Done when every method has a test for its success path, its idempotent repeat, and its guard rejection.*

2. **Routes module and publisher.**
   - Add `app/jobs/routes.py` with `JOB_QUEUES = {"ocr_pdf": "ocr"}` and envelope encode/decode per the README (port the validation from `worker-service/core.py` `Envelope`, without `owner`).
   - Add `aio-pika` to `pyproject.toml` and `KNOWLEDGE_RABBITMQ_URL` (pointing at vhost `knowledge`) and `KNOWLEDGE_JOB_REPLAY_BATCH_SIZE` (default 100) to `config.py`.
   - Port `JobPublisher` into `app/jobs/publisher.py`. It declares `jobs.v1`, `jobs.dead` + queue `jobs.dead`, and one durable queue `jobs.<queue>` per distinct value in `JOB_QUEUES`, with `x-dead-letter-exchange=jobs.dead`.
   - Keep the current publishing policy: no confirms, no outbox. Replay `queued` rows on the first successful connection and after each reconnect.

   *Done when tests show: replay publishes every queued row across more than one batch; a publish while disconnected logs and returns without raising; the envelope round-trips and rejects malformed input.*

3. **Upload path.**
   - Start the publisher in the `main.py` lifespan.
   - Change `upload_pdf` to: store PDF → `create_document_with_job` → schedule `publisher.publish(job)` as a background task → return `202 {document_id, job_id}`.

   Multiple API replicas may replay the same row; claim atomicity (phase 2) makes that safe. *Done when tests show: an upload creates the document and job in one database call with no job-service HTTP call, and a publish failure does not fail the upload.*

4. **Job status routes.** Rewrite `api/v1/jobs.py`:
   - Read the local `job` table.
   - Stream through `subscribe_jobs()` by porting `job-service`'s `stream_job`: per-connection client, snapshot first, then only rows with a higher `sequence`.
   - Keep Knowledge's existing WebSocket auth and heartbeat.
   - Map rows to `JobStatusResponse`: `type "ocr_pdf" → "ocr"`, plus `document_id` and `ocr_draft_id`.
   - Make `/v1/ready` check the database, the object store, and the broker connection state.

   *Done when the response JSON and event shapes (`job.status_snapshot`, `job.status_changed`, `ping`) match the current ones field for field, and `apps/admin-web` tests pass unchanged.*

## Phase complete when

- All four steps' checks pass and both test suites are green.
- `rg "job_client" src/app/api/v1` returns nothing (upload and status no longer use the central service).
