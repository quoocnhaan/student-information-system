# Job schema refactor

Status: proposed for implementation. Creating this plan does not authorize code
changes or a Docker-volume reset. Implement when the user explicitly identifies
this plan and asks to implement it.

## Outcome

Make job ownership and update fields easier to understand, and use one field for
subsequent jobs. Preserve existing ingestion, correction, retry, deduplication,
and concurrency behavior.

This plan supersedes the field names and orchestration layout in earlier plans,
including `JOB_PAYLOAD_AND_SINGLE_CHUNK_CORRECTION_PLAN.md`. Other workflow
requirements in those plans remain unchanged.

## Target contract

| Current field | Target field | Required behavior |
| --- | --- | --- |
| `claim_id` | `attempt_id` | Optional string; a new UUID hex token for each successful processing attempt |
| `sequence` | `version` | Integer starting at 1; retain every existing increment and concurrency comparison |
| `next_job_id` | Removed | Use `followup_job_ids` for subsequent work |
| `followup_job_ids` | Unchanged | Array of job records, default `[]`; correction currently creates zero or one child |
| `type` | Unchanged | Select the existing handler and queue |
| `dedupe_key` | Unchanged | Unique together with `document_id` |
| `worker_id` | Unchanged | Stable identity of a worker replica |
| `worker_run_id` | Unchanged | New identity for each worker process startup |

The complete persisted field set is `id`, `document_id`, `type`, `dedupe_key`,
`payload`, `status`, `step`, `progress`, `version`, `attempt_id`, `worker_id`,
`worker_run_id`, `followup_job_ids`, `error`, `created_at`, and `updated_at`.
Retain current types, constraints, defaults, readonly rules, and indexes except
for the explicit changes above. `id` remains the SurrealDB record identity.

Keep `type` and `dedupe_key` separate: OCR and indexing use fixed keys per document;
correction and re-embedding use unique request keys so later operations on the
same document remain possible. Preserve the `job_document_dedupe` index.

REST and WebSocket job responses expose `version` and `followup_job_ids`, and
omit `sequence` and `next_job_id`. Ownership fields and private payloads remain
internal. Preserve the existing public type mapping, `retry_available`, event
names, endpoint paths, and response fields unrelated to this refactor.

The new job record `version` is an update counter. RabbitMQ envelope `version`
and handler `version` are existing protocol versions with different meanings;
leave their values, validation, and routing unchanged.

## Schema and local data policy

Read the service `AGENTS.md` and `README.md` before implementation. The current
bootstrap applies `db/schema.surql`; `db/migrations/` is historical reference and
has no active migration runner. Implement the new contract in the canonical
fresh schema. Preserve historical migrations and plans as historical records;
do not add aliases, dual fields, or a legacy-record migration runner.

This corrects the earlier conversational suggestion of a record-preserving
migration: the service instructions prefer a fresh local schema without legacy
compatibility. Existing local records are not compatible with the renamed fields,
and `DEFINE FIELD IF NOT EXISTS` will not rename or remove old definitions.

Verify the implementation against an isolated, freshly initialized test database.
Preserve existing Docker volumes during implementation unless the user explicitly
requests their reset for this task. Until that request, report the local stack
cutover as pending and avoid running the new code against the old database.

If a reset is explicitly requested, follow the current README procedure: resolve
the actual Compose project and volume names, inspect labels and all consumers,
and reset only verified Knowledge volumes. Preserve unrelated services and MySQL
data. Restart the API, all Knowledge workers, and admin-web together so every
consumer uses the new contract. This plan covers local development; a shared or
production data-preserving rollout requires a separate plan.

## Implementation steps

### 1. Inventory the affected contract

Search the repository for `claim_id`, `sequence`, `next_job_id`, and
`followup_job_ids`. Classify active schema, runtime code, tests, operational docs,
and historical references. Inspect nested `AGENTS.md` files before editing.

Start with:

- `db/schema.surql`.
- `src/app/infrastructure/surreal.py`.
- `src/app/worker/core.py`, `__main__.py`, `ocr.py`, `correct.py`, and `index.py`.
- `src/app/api/v1/jobs.py` and `src/app/api/v1/schemas/jobs.py`.
- `apps/admin-web/src/features/knowledge/api/contracts.ts` and
  `hooks/useIngestionJob.ts` (paths relative to the repository root).
- Knowledge tests, admin Knowledge tests, and `README.md`.

Completion: every active producer and consumer of the changed fields is accounted
for, including embedded correction job responses and WebSocket snapshots/events.

### 2. Refactor persistence and workers

Rename the persisted fields and corresponding arguments, variables, query
bindings, record lookups, and diagnostic context to `attempt_id` and `version`.
Keep `claim_job` as the operation name: claiming describes the queued-to-running
transition even though its token is now called `attempt_id`.

Preserve atomic claim checks, matching-attempt guards on progress/completion and
failure, transaction boundaries, lost-reply reconciliation, worker startup
recovery, and manual index retry. A retry clears ownership and increments the
existing job's version; claiming it creates a fresh attempt token. Progress
writes must still compare the previously read version and prevent regression.

Remove `next_job_id` from the canonical schema and active assertions. Preserve
durable child creation and retrieval through `followup_job_ids`, including
recovery after a correction commit succeeds but its response is lost.

Completion: workers and database queries exclusively use the new persisted
names, with unchanged claim, failure, retry, and child publication behavior.

### 3. Update API and frontend together

Rename the response field to `version`, update serialization and WebSocket
filtering, and remove `next_job_id` from response models. Update frontend Zod
contracts, job types, fixtures, and event handling. Keep mandatory
`followup_job_ids`, including empty arrays.

Ensure frontend comparisons accept only newer versions of the same job and
reset the comparison when the selected job ID changes. Avoid interpreting
envelope/handler protocol versions as job update versions.

Completion: REST responses, WebSocket responses, correction responses, and
admin-web agree on the new contract without legacy aliases.

### 4. Verify behavior

Update existing tests and add focused regressions only where coverage is missing:

- Fresh schema defines the target fields and omits the removed fields.
- Duplicate deliveries cannot both claim the same queued job.
- An old attempt cannot update, complete, or fail a newly claimed attempt.
- Version increments and conditional progress writes preserve concurrent update
  protection and nondecreasing progress.
- Manual index retry keeps the same job ID, clears ownership, advances version,
  and gives the next successful claim a new attempt ID.
- Startup recovery affects an older run of the same worker and preserves jobs
  owned by another worker replica.
- Correction persists zero or one child and retains lost-reply recovery.
- REST/WebSocket responses expose `version`, omit the removed fields and private
  ownership, and frontend handling ignores stale versions while accepting a
  different job whose version starts lower.
- OCR/index deduplication still works, and repeated correction requests remain
  possible after the previous operation has released its chunk lock.

Run the Knowledge pytest suite from the service root using the configured Python
environment. Inspect integration-test prerequisites and run database-backed tests
against an isolated fresh SurrealDB database; report skips or unavailable
dependencies explicitly. Run admin-web `test:run`, `typecheck`, `lint`, and `build`
using its established package manager. Record results and blockers.

Completion: relevant suites pass, and integration results demonstrate the
ownership, retry, version, and follow-up behavior rather than only field spelling.

### 5. Update documentation and hand off

Update current README descriptions of ownership, version ordering, response
fields, and follow-up jobs. Keep historical plans/migrations unchanged. Search
again for the old field names; remaining occurrences must be historical
references or intentional rejection/omission tests.

Schema ownership remains in Knowledge's `db/`. Container configuration is not
expected to change. If implementation changes Dockerfiles, Compose, or database
asset paths, fulfill repository Docker/Compose rules and validate from the root:

```powershell
docker compose --env-file .env -f docker-compose.yml config --quiet
```

Completion: report the final contract, checks run, and whether the existing local
stack still awaits an explicitly authorized reset. Work on
`feature/building-knowledge`; changes intended for `dev` or `main` go through a PR.
