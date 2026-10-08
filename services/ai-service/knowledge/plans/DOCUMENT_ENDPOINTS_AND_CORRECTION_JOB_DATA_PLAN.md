# Document endpoint separation and correction data on jobs

## Outcome and authority

Implement two related simplifications:

1. Store the correction snapshot and result on `job`, removing the
   `chunk_correction_input` table and its runtime dependencies.
2. Separate draft and indexed-document routes. Loading an indexed document's
   detail returns its metadata and page-grouped chunks together.

Include metadata viewing and editing according to
`INDEXED_DOCUMENT_METADATA_VIEW_EDIT_PLAN.md`. That plan remains authoritative
for field validation, atomic metadata saves, conflict handling, and editor UX;
this plan defines the correction storage model and route organization.

Follow the service `AGENTS.md` and repository-root instructions. This request
authorizes planning only. It does not authorize implementation, database deletion,
volume resets, or deployment. Preserve unrelated working changes when later
implementing this plan.

## Current implementation

- `src/app/api/v1/documents.py` owns upload, library listing, OCR `/result`,
  confirmation, source streaming, chunk listing, and correction requests.
- `src/app/infrastructure/surreal.py::request_chunk_correction` captures a chunk
  under a durable lock and creates a job plus a separate correction input.
- `src/app/domain/job.py::CorrectionPayload` contains `chunk_id` and
  `correction_input_id`. `job.payload` is READONLY in `db/schema.surql`.
- `src/app/worker/correct.py` reads `correction_inputs`, runs the model against
  `base_text`, and applies the result through `apply_chunk_corrections`.
- Correction commits compare captured text, hierarchy, embedding input/version,
  embedding status, and the owning job/attempt. The commit also creates the
  re-embedding child when required. These safety properties must survive.
- `indexed_chunks` looks up the latest input for each chunk to provide the UI's
  correction operation. `fail_claim` marks correction inputs failed.
- `IndexedDocumentPage.tsx` initially loads only chunks and polls them every
  1.5 seconds. The review client calls `/result`.

Backend paths below are relative to the Knowledge service root. Frontend paths
are relative to repository root under `apps/admin-web/src/features/knowledge/`.

## Target correction model

Keep existing job types and execution state. Extend only the correction data:

| Location | Fields and responsibility |
| --- | --- |
| `job.payload` for `correct_chunks` | `chunk_id`, `base_text`, `embedding_text`, `embedding_version`, `embedding_status`, `hierarchy`; immutable snapshot |
| `job.result` for `correct_chunks` | `outcome` (`applied`, `unchanged`, `failed`) and nullable `proposed_text`; persisted outcome |
| Existing job fields | Document ownership, execution status, attempt fencing, error, version, and follow-up IDs |

The job's existing `document_id` supplies document ownership. Queued/running
correction jobs have no terminal result; expose outcome `pending` in the safe UI
projection. Failed jobs persist outcome `failed`. An unchanged model response has
outcome `unchanged` even when a stale embedding requires a child refresh.

The generic job-status HTTP response must continue exposing execution information
without the captured document text or model result. Only the chunk correction
projection needs the safe outcome and associated job/children.

## 1. Change schema and domain contracts

- Remove the correction-input table's definitions, fields, and indexes from the
  active `db/schema.surql`. Add an optional `job.result` object with validated
  correction outcome fields. Other job types leave it absent.
- Replace `CorrectionPayload.correction_input_id` with the captured fields above.
  Keep strict validation, a typed hierarchy contract, and SDK record-ID
  normalization for `chunk_id`. Define validation for persisted correction
  results. Payload stays immutable; workers write only `result` and execution
  fields, never payload.
- Update schema assertions and tests that currently expect an exact set of job
  fields. A fresh schema must contain no `chunk_correction_input` table.

Completion: a fresh isolated database supports the new correction job contract,
and domain tests reject incomplete snapshots and malformed results.

## 2. Capture correction input and lock the chunk atomically

Refactor `request_chunk_correction` to read the selected chunk directly rather
than fetching every enriched chunk in the document. In one transaction:

1. Verify that the document is indexed and the selected chunk belongs to it.
2. Conditionally acquire `chunk.active_job_id` only when it is unlocked.
3. Build and create the immutable job payload from the locked row's exact values.
4. Commit the chunk lock and queued job together.

The lock may reference the generated job ID before the job is created within the
same transaction. Any failed check rolls back both operations. Do not capture a
snapshot from an earlier unguarded read or lock the chunk in a separate commit.
Use bound variables and typed record references throughout.

Completion: two competing requests produce one queued job and one lock, and a
chunk from another document cannot be corrected through this document's route.

## 3. Apply results and preserve recovery behavior

Replace the correction-input read and ID-keyed result mapping with a single-chunk
operation using the claimed job payload and the model's corrected text.

The correction worker calls the model using captured `base_text`. The final
transaction must fence the current attempt and verify the chunk still matches
every captured mutable field and the owning job lock. It then:

- Persists `job.result` with the corrected text and outcome.
- Applies changed text, marks its embedding stale, increments embedding version,
  and creates exactly one `reembed_chunk` child with its immutable embedding input.
- For unchanged text with a stale embedding, creates the refresh child without
  incrementing the text's embedding version.
- For unchanged text with a healthy embedding, releases the lock without a child.
- Completes the parent and records its follow-up IDs in the same transaction.

Retain duplicate-delivery safety, attempt ownership, and response-loss recovery:
a committed completion is read back with its existing children, without applying
the correction twice. Failure reconciliation writes the failed result and releases
the appropriate lock atomically; it must not undo a completed correction or steal
a child/newer job's lock. Remove correction-table access from `fail_claim`, worker
failure handling, startup recovery, and all other executable paths.

Completion: crash, timeout, duplicate-delivery, stale-input, stale-attempt, and
unchanged-result tests preserve the existing correction/re-embedding guarantees.

## 4. Build correction projections from jobs

Refactor `indexed_chunks` to find the newest `correct_chunks` job for each chunk
using its document ID and `payload.chunk_id`. Order by creation time with an ID
tie-breaker; return the latest operation, including failed jobs. Batch these
lookups and follow-up reads where practical rather than adding per-chunk queries.
Add a job index matching this lookup if measurements/query planning justify it.

Remove `input_id` from `ChunkCorrectionOperation` and the corresponding frontend
Zod contract. The existing nested `job.id` identifies the operation. Keep outcome,
parent status, child statuses, and child IDs used by the current detail UI. Source
the outcome from `job.result`, or derive `pending` from queued/running status.
Do not expose captured text or payload in the public projection.

Completion: chunk status remains correct across multiple correction requests,
failed corrections, and pending/completed re-embedding children.

## 5. Separate document routes

Use three routers under the same `/documents` prefix:

| Module | Routes owned |
| --- | --- |
| `document_drafts.py` | `POST /documents`, `GET /documents/{id}/draft`, `POST /documents/{id}/confirm` |
| `indexed_documents.py` | `GET /documents`, `GET /documents/{id}`, `PUT /documents/{id}/metadata`, `GET /documents/{id}/chunks`, `POST /documents/{id}/corrections` |
| `documents.py` | Shared `GET /documents/{id}/source` and `GET /documents/metadata-options` |

Mount all three in `src/app/api/v1/router.py`. Extract shared record-ID validation
and response conversion into focused helpers without route-module dependency
cycles. Register static paths such as `/metadata-options` before the generic
`/{id}` GET route, so they cannot be mistaken for IDs.

Rename the OCR read route `/result` to `/draft`. It returns the existing safe
metadata/source/page-count/OCR-draft content only when the document is in review
with a usable draft. Update all clients and tests together and remove the old
route; the target workflow does not require a legacy alias.

The new `GET /documents/{id}` is for indexed documents and returns:

- Document identity, process status, safe source summary, page count, timestamps,
  and metadata-edit version, as defined in the linked metadata plan.
- The seven editable metadata fields in `metadata`.
- `pages`, using the existing `IndexedPageResponse`/`IndexedChunkResponse` shapes
  and updated safe correction projections.

Assemble detail metadata and chunks from a coherent database read; avoid loading
the same document multiple times or implementing divergent chunk serializers.
Exclude object keys, vectors, embedding inputs, internal job payloads, and OCR
draft text from this response. Keep `/chunks` as a smaller progress refresh route.

Use 404 for invalid/missing IDs, 409 for the wrong lifecycle state or stale
metadata version, 422 for invalid updates, and 503 for database unavailability.
The metadata update response contains saved metadata/header/version, without
requiring the client to reload every chunk. See the linked plan for validation
and conditional-write details.

Completion: the OpenAPI route inventory has separate draft/indexed contracts;
the indexed detail response includes both metadata and chunks.

## 6. Update frontend flows

- Add combined indexed-detail schemas/client methods in `api/contracts.ts` and
  `api/knowledgeClient.ts`. Rename the OCR read method and its callers to reflect
  `/draft`, including ingestion hooks and review conflict reload.
- Load combined detail once on entry to `pages/IndexedDocumentPage.tsx`. Render
  the metadata panel/editor from the linked plan above its initial chunks.
- Keep chunk polling on `/chunks`; its responses replace only chunk state, never
  the saved metadata or dirty draft. Metadata reload uses the detail endpoint but
  only changes the draft after the user accepts discarding edits.
- Remove correction `input_id` assumptions from UI contracts/fixtures. Preserve
  the existing parent/child progress and correction controls.
- Continue fetching metadata editor option values from `/metadata-options` and
  all stored/business data from endpoints. Preserve route-change cancellation,
  metadata save conflict handling, and library refresh behavior.

Completion: indexed detail shows metadata and content from the combined response,
and correction polling cannot erase unsaved metadata edits.

## 7. Validate and document the new model

Update affected tests in domain, API, worker/application, and infrastructure,
particularly `test_job.py`, `test_automatic_chunk_correction.py`,
`test_chunk_correction_integration.py`, `test_owned_jobs_integration.py`,
`test_stalled_jobs_integration.py`, and obsolete-contract tests. Add combined
detail and route-order tests. Run the metadata plan's validation checks too.

Required evidence includes immutable snapshots, correct SDK record IDs, atomic
locking/result application, no-op behavior, failed jobs, manual Correct-again,
response-loss recovery, no duplicated child jobs, and no stale vector overwrite.
UI tests verify one initial detail fetch, draft-route use, metadata save/cancel,
and progress polling independent of metadata drafts.

Run relevant backend tests against a fresh isolated SurrealDB database, frontend
tests, type checking, lint, and production build. Update active README, upload
workflow, and database documentation. Historical plans may describe the old table;
mark superseded instructions rather than treating them as active implementation
requirements. Search runtime code, active schema, and current contracts to confirm
there are no correction-input table/ID dependencies and no `/result` route.

## Local cutover and destructive-action boundary

The persisted correction contract changes. Do not run new workers against queued
jobs with the old payload. Prepare and validate the target code/schema using
isolated databases first. Do not add dual-payload compatibility or automatically
drop a populated table while bootstrapping the schema.

For this local development stack, prepare a clean Knowledge-volume reset procedure
as directed by `AGENTS.md`; execute it only after the user explicitly authorizes
resetting the relevant volumes for the implementation task. This plan request
and earlier rebuild authorization do not authorize a reset. Before that step,
identify exact Knowledge data volumes and broker queues, explain what data will
be lost, and verify the procedure preserves unrelated service volumes. A reset
must also account for stale broker envelopes and documents that will need
re-upload/reindexing. Never use a repository-wide `down -v`.

After authorized local cutover, rebuild/restart the Knowledge API, affected
workers, schema initialization service if present, and admin frontend as a
consistent version through the repository-root Compose file. Inspect service
names/profiles rather than guessing them; run commands with
`--env-file .env -f docker-compose.yml`. Validate Compose, readiness, a fresh
upload/review/index cycle, combined detail, metadata editing, and correction.
Shared/production environments require a separate data-preserving rollout plan;
the local reset rule does not apply there.

## Final acceptance

A fresh target database has no correction-input table. Correction snapshots and
outcomes live on jobs with the original safety/recovery guarantees. Draft and
indexed-document routes are separate, indexed detail contains metadata and chunks,
metadata can be saved and reopened, and all required checks pass. Application
data and volumes remain intact until an explicitly authorized cutover.
