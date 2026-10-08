# Remove obsolete workflow endpoints and schema fields

> **Superseded.** Follow `DOCUMENT_ENDPOINTS_AND_CORRECTION_JOB_DATA_PLAN.md`
> for the active correction storage and document-route contracts.

## Objective and authority

Make the Knowledge service and admin client describe only the current workflow:

1. Upload PDF, extract OCR, optionally correct OCR, and review locally.
2. Confirm metadata, text edits, and selected pages once; index the captured input.
3. Correct indexed chunks automatically, then track every independent embedding job.

The user has chosen disposable local Docker data instead of legacy compatibility.
Use the current schema as the source of truth for fresh installations. This plan
supersedes the legacy-compatibility requirements in
`AUTO_APPLY_CHUNK_CORRECTION_PLAN.md` and the manual acceptance workflow in
`service-owned-jobs/phase-6-post-index-correction.md`.

Creating this plan changes no application code, volumes, records, or running services.
Implementation and local volume deletion follow the authorization rules in `../AGENTS.md`.
The reset applies only to this Knowledge development Compose project.

## 1. Inventory current consumers before removing contracts

Read these files and their tests:

- `src/app/api/v1/{documents,jobs}.py`, `src/app/api/v1/schemas/{documents,jobs}.py`,
  the API router registration, and `src/app/domain/document.py`.
- `src/app/infrastructure/surreal.py`, `db/schema.surql`, migrations, and
  `src/app/infrastructure/apply_migration.py`.
- `src/app/worker/{correct,index,core,ocr,__main__}.py` and `src/app/jobs/publisher.py`.
- `apps/admin-web/src/features/knowledge/{api,hooks,pages,components}`.
- `docker-compose.yml`, service README, `services/ai-service/docs/upload-pdf-workflow.md`,
  and `docs/database/knowledge_schema_config.md` if present.

Search the entire repository for each removed identifier, including callers outside
the service, tests, scripts, and documentation. Record any additional removal candidate
with its actual writers/readers; remove it only when it has no role in the current flow.

### Required cleanup inventory

| Current contract | Target |
| --- | --- |
| `POST /v1/corrections/{suggestion_id}/accept` and `/reject` | Remove routes and correction-router registration. |
| `accept_suggestion`, `reject_suggestion`, `save_suggestion` | Remove database methods and callers. |
| `finish_chunk_correction` | Remove old review completion path; failure uses `fail_claim`. |
| Admin `acceptSuggestion` and `rejectSuggestion` | Remove client methods and tests for manual review. |
| `job.correction_mode` | Remove schema, job creation, REST/WebSocket fields, Zod field, and worker branches. Every `correct_chunks` job is automatic. |
| `correction_suggestion` and its review terminology | Replace with `chunk_correction_input` for captured input and terminal audit outcomes. |
| Review states `ready`, `accepted`, `rejected`, `outdated` | Replace with `pending`, `applied`, `unchanged`, `failed`. No human decision state remains. |
| `GET .../chunks` nested `suggestion` payload | Replace with durable operation status; omit base/proposed text from this public read model. |
| `job.ocr_draft_id` | Remove redundant pointer and its writers/clear-on-index statements; current worker draft lookup uses `document_id`. Remove from job responses and admin contracts. |
| Fresh-schema `blocked` conversion, revision backfill, and obsolete chunk-field removal statements | Remove upgrade-only statements from fresh bootstrap; define the final schema directly. |

Retain `job.next_job_id`: OCR still uses it to chain to `correct_ocr`.
Retain `job.followup_job_ids`: indexed-page correction requires the full embedding fan-out.
Retain `chunk.active_job_id`, `chunk.last_embedding_job_id`, embedding input/version
fences, job claims/ownership/sequence, and `index_input_id`/confirmation fingerprint.
Retain OCR draft review state, revision, raw/corrected page text, and request
`page_edits[].reviewed_text`. These support the initial review/confirmation workflow.
Audit persisted `ocr_draft.pages.*.reviewed_text` separately: remove it only if the
current browser-local review flow has no writer or required consumer, and remove
its read fallbacks and response fields together. A similar name on the confirmation
request is not evidence that its persisted counterpart is required.

**Done when:** every required removal has a complete caller list and retained fields
have a current behavior that depends on them.

## 2. Define the fresh schema and correction input lifecycle

Replace `correction_suggestion` with `chunk_correction_input` and update record ID
generation, ID validation, queries, indexes, worker methods, and tests consistently.
Use fields `document_id`, `chunk_id`, `job_id`, `position`, `base_text`,
`proposed_text`, `status`, and `created_at`. Keep captured embedding input and
hierarchy/version information necessary to fence changes during model calls.
Name its indexes for the new table and actual access patterns.

Terminal outcomes mean:

- `applied`: valid changed text committed with the parent correction.
- `unchanged`: valid identical text; a child is still required if its vector is stale.
- `failed`: application did not commit; the guarded failure transaction settled the input.

Atomic request creation captures the input and locks the selected chunks. Atomic
application checks document membership, the captured text and relevant embedding
input/version, pending input ownership, and the running parent claim. It commits all
text changes, audit outcomes, required children, and parent completion together.
Remove ready-suggestion supersession and legacy pending-suggestion busy logic;
queued/running operation locks become the durable source of availability.

Remove `correction_mode` predicates from application and reconciliation. Select the
behavior by job type and claim instead. Remove legacy child embedding fallbacks:
every `reembed_chunk` job must carry its captured embedding input and required fence.
Completion must check both claim and chunk ownership/version before replacing a
vector; superseded work must not report successful indexing of newer text.

Use `fail_claim` for worker failures and startup recovery, including releasing only
the failed operation's locks. Keep model deadlines, claim-before-ACK, statement
checking, committed-outcome reconciliation on a fresh connection, queued replay,
and manual-only retry of failed `index_document` jobs.

A reset does not excuse concurrency or recovery defects. In particular, preserve
all child IDs when a commit reply is lost, publish each child independently so one
publication error does not skip later children, and keep child records recoverable
through queued replay.

**Done when:** a fresh schema contains only the automatic correction lifecycle and
all guarded request/application/failure paths operate without legacy mode branches.

## 3. Remove obsolete APIs and update the admin read model

Delete accept/reject endpoints rather than retaining aliases or deprecated handlers.
Remove their OpenAPI entries, imports, client methods, response handling, and mocks.
The retained corrections endpoint remains `POST /v1/documents/{id}/corrections`
with `{chunk_ids: [...]}` and `202 {job_id}`.

Remove `ocr_draft_id` and `correction_mode` from job status responses and WebSocket
messages. Define `followup_job_ids` as an array, including `[]` for no follow-ups,
and update test fixtures and Zod contracts to the new required contract.

Replace chunk `suggestion` with operation data sufficient to recover the latest
correction and indexing outcomes after reload: operation IDs, types, statuses,
bounded errors, and parent/child relationships as needed. An active lock alone
cannot explain a terminal correction failure after its lock has cleared. Prefer
job/input queries over extra mutable chunk status fields when durable state already
contains the answer. Specify and test the final response structure in both clients.

Update the indexed page to use this operation data. It must display Correcting,
Updating index, No changes needed, correction failure, and indexing failure for
the appropriate request/chunk. Refresh text on parent completion and vector state
on child completion; recover through reload/reconnect. Report the selected request
indexed only after all its children succeed. A stale vector without active work
shows a terminal/actionable state instead of an endless Updating index badge.
Enable a new explicit Correct action when the relevant operation has failed.
Keep OCR's single-job chaining behavior in `useIngestionJob` intact.

**Done when:** removed endpoints are absent from routing/OpenAPI, the admin has no
manual correction API or suggestion contract, and reloaded pages explain terminal
failures as well as active work.

## 4. Align bootstrap, historical tools, and local reset instructions

Bootstrap the final schema directly. This cleanup uses a local reset rather than
adding a migration to translate existing review records. Keep historical migration
files as history, clearly excluded from the fresh startup path. Audit migration
runner entries and obsolete central-job migration/recovery tools; remove tools and
configuration proven to serve only retired workflows, with their tests/docs.
Keep current worker ownership recovery and failure reconciliation.

Document the exact reset procedure after resolving Compose configuration and project
identity. Knowledge's logical volumes in the shared Compose file are `surreal_data`,
`minio_data`, and `rabbitmq_data`. Resolve actual names and inspect project labels
and mounts before deletion; do not guess names or use global volume pruning.
Reset all three together so old PDFs and queued envelopes cannot survive a fresh DB.
Report that local PDFs, chunks, vectors, drafts, jobs, and queued messages are erased.

When reset execution is authorized: stop only Knowledge's containers and verify worker
termination, remove only its verified local volumes, rebuild API/workers/admin, then
start Knowledge with its initializer services. Use the service-scoped reset procedure
in `../README.md`; project-wide `down --volumes` also removes unrelated MySQL data
now that all services share the repository-root `docker-compose.yml`. Keep production,
shared services, unrelated projects, bind mounts, and credentials outside this reset.
Verify fresh schema startup, bucket/broker initialization, `/v1/health` and `/v1/ready`
against the actual route definitions, and container status/logs. Determine exact
health paths from source before writing runnable checks.

**Done when:** reset instructions identify the local project and every affected
volume, and a fresh start requires no legacy-data migration.

## 5. Validate the new contracts and document completion

Replace tests that call acceptance or create ready suggestions with automatic-flow
tests; historical migration tests may retain old terms when explicitly labeled.
Run database regressions on an isolated SurrealDB matching the Compose version,
using mocked model responses and valid embedding vectors. Cover:

- Removed routes return 404 and are absent from OpenAPI; removed schema fields
  are absent from fresh database definitions and REST/WebSocket/admin contracts.
- Changed correction, identical current-vector no-op, and identical stale-vector refresh.
- Atomic page application, every child ID, repeated completion, duplicate delivery,
  concurrent requests, changed/deleted input, and stale claims.
- Unusable/model failure/deadline creates no children and preserves original text/vectors.
- Lost commit reply recovers exact children through a fresh connection; publication
  errors preserve queued children and do not suppress the rest of the fan-out.
- Child failure and superseded embedding preserve prior vectors and appropriate
  stale state; a new explicit Correct works after terminal failure.
- Reload/reconnect shows active work and terminal failures per chunk; all children
  must succeed before the selected request is labeled indexed.
- Initial OCR correction/review/one-shot confirmation and failed-index manual retry
  still pass with removed job pointers and cleaned schema.

Run the relevant service suite and admin tests, typecheck, lint, and build. Remove
isolated test artifacts. Report any unavailable checks accurately; completion requires
the database tests as well as frontend checks. Real document correction, model calls,
and local stack reset are separate from isolated verification.

Update the service README, endpoint/schema documentation, and historical-plan
supersession notes to match the final contract. Explain automatic application,
separate text/vector completion, terminal failures, and the local reset policy.
Keep one authoritative workflow description and link older plans to it.

**Done when:** required regressions pass, the runtime and public contracts have no
retired correction workflow, documentation matches the fresh schema, and the handoff
reports exactly what was changed, verified, and reset.
