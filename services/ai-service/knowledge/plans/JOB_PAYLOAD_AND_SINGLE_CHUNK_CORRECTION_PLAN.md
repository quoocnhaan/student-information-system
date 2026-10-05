# Job payloads and single-chunk correction

Status: ready for implementation. This document authorizes no implementation or
data reset by itself; implement when the user asks to implement this plan.

## Outcome and scope

Use one job envelope for lifecycle and orchestration, with validated inputs in a
type-specific `payload`. Report progress using only `progress` and `step`.
Correction targets exactly one indexed chunk per request.

This plan includes removing both the indexed view's **Correct page** action and
automatic `correct_ocr` processing before review. The resulting flow is:

```text
Upload -> OCR -> manual review/edit/select pages -> confirm -> index
Indexed chunk -> Correct -> apply text -> re-embed if needed
```

Manual review retains metadata edits, page text edits, page selection, original
page numbers, and one-shot confirmation. Chunk correction remains automatic after
the user requests it; there is no suggestion acceptance step.

Read `AGENTS.md`, the current `README.md`, and the working implementation before
editing. Earlier plans describe historical workflows. This plan supersedes their
job input layout, page counters, automatic OCR correction, and batch correction
requirements; preserve current ownership, deadline, and manual index retry rules.
The working tree already contains substantial changes: implement against those
files and preserve unrelated work.

## Target contracts

### Persisted jobs

Keep these envelope fields at the top level:

- Identity and scope: `id`, `type`, `document_id`, `dedupe_key`.
- Lifecycle: `status`, `step`, `progress`, `sequence`, `error`, `created_at`,
  `updated_at`.
- Ownership: `claim_id`, `worker_id`, `worker_run_id`.
- Orchestration: `next_job_id`, `followup_job_ids`.
- Inputs: required `payload` object, including `{}` for OCR.

`next_job_id` remains a generic optional job link but is no longer populated by
OCR. `followup_job_ids` remains a generic array; single-chunk correction produces
zero or one child. Keeping these links avoids an unrelated orchestration contract
redesign. Worker ownership stays private to persistence.

Use existing job type identifiers to avoid a separate naming change:

| Persisted type | Required payload | Queue |
| --- | --- | --- |
| `ocr_pdf` | `{}`; source is resolved through `document_id` | `ocr` |
| `index_document` | `index_input_id`, `confirmation_fingerprint` | `index` |
| `correct_chunks` | `chunk_id`, `correction_input_id` | `correct` |
| `reembed_chunk` | `chunk_id`, `embedding_text`, `embedding_version` | `index` |

`correct_chunks` retains its identifier but processes exactly one chunk. Remove
`correct_ocr` from accepted types, queue routing, worker registration, deadlines,
response mapping, and failure/recovery dispatch.

Move job-level `index_input_id`, `confirmation_fingerprint`, `chunk_id`,
`embedding_text`, and `embedding_version` into payload. Domain fields such as
`chunk.embedding_version` stay on their existing records.

Define Python payload models selected by job type, rejecting unknown fields and
invalid/missing inputs. Validate on job creation and before worker processing.
Keep the payload immutable through progress, completion, failure, and retry;
retry preserves the original index input and fingerprint. Centralize validation
so handlers do not each implement an ad hoc dictionary contract.

Declare a document-style payload object in `db/schema.surql`, with nested values
retained by SurrealDB. Use typed record references for references written by the
adapter. Verify the actual persisted/read-back values in schema integration
tests; application validation alone cannot establish that nested fields survive
the SCHEMAFULL schema.

Keep `index_input` and `chunk_correction_input` as durable input records.
The latter retains captured base text, hierarchy, embedding text/version/status,
and correction outcome. The correction payload references the exact snapshot;
avoid copying mutable text into two authoritative locations. Each correction job
has exactly one snapshot; remove snapshot ordering `position` if no current
consumer needs it after batch processing is removed.

### Job status and progress

REST, WebSocket snapshots/events, and embedded correction job statuses share the
existing public status contract, minus `total_pages` and `processed_pages`.
Internal payloads, captured document text, fingerprints, and ownership are not
included in public job status. Public type aliases may stay as they are for the
remaining types. Derive `retry_available` from `payload.index_input_id`.

- `progress` is an integer from 0 to 100 for the current job, not the entire
  upload/review/index workflow.
- Queued jobs start at 0. Running updates remain below 100; successful completion
  commits 100 with output and completed status.
- Within a claim, progress cannot decrease. An explicit eligible index retry
  resets progress to 0 and advances sequence, with fresh ownership on claim.
- Failure retains the last progress value and reports failed status/error.
- Page and chunk counters remain local worker variables for percentage
  calculation. `document.page_count` remains document metadata.
- Keep claim/status fencing and ordered `sequence` updates. Removing page counters
  also removes their database predicates, not the remaining concurrency checks.

Integer rounding can make consecutive page updates report the same percentage.
That is acceptable: progress is presentation, not a checkpoint or worker liveness
signal. Preserve the current ownership-based recovery behavior.

### Correction request

Keep `POST /v1/documents/{document_id}/corrections`, with the new body:

```json
{"chunk_id": "chunk:chunk_<32 hexadecimal characters>"}
```

Return `202 {"job_id": "job:..."}`. Reject legacy `chunk_ids` bodies, including
ones containing a single ID, using strict request validation. A foreign,
unavailable, or locked chunk and a non-indexed document retain the existing
conflict behavior. Validate membership again inside the transaction.

Retain the indexed chunk response's `correction` operation shape, including
`children` and `chunk_child_ids`, but each operation now concerns one chunk and
has zero or one embedding child. Completion of correction means corrected text
is durable; show the operation as fully indexed only when its child completes.

## Implementation sequence

### 1. Introduce the payload contract and update persistence

Primary files: `db/schema.surql`, `src/app/infrastructure/surreal.py`, and a shared
job model module under `src/app/domain/`.

Update every job constructor, input loader, transaction guard, retry eligibility
check, child-to-chunk lookup, failure cleanup, and startup recovery path to use
the typed payload. Cover nested field reads in SurrealQL as well as Python reads.
Retain the unique document/dedupe index and worker/status indexes.

For correction creation, allocate the snapshot ID first and create the job,
snapshot, and durable chunk lock in one transaction. Resolve processing inputs
through that job's `correction_input_id`; check snapshot job/chunk/document
membership before applying results.

Done when all remaining job types round-trip their payloads, creation rejects
invalid payloads, and indexing retry plus re-embedding guards use captured inputs
without any top-level job input fallback.

### 2. Make progress percentage-only

Primary files: `surreal.py`, `worker/ocr.py`, `worker/correct.py`, `worker/index.py`,
`api/v1/schemas/jobs.py`, and `api/v1/jobs.py`.

Remove page counters from schema, creation defaults, progress updates, retry
resets, response serialization, and progress validation. Keep progress monotonic
within an active claim and advance sequence only for meaningful changes. Update
REST and WebSocket tests together.

Done when all job status paths omit both counters and regressions prove stale
claims and decreasing progress cannot update a running job.

### 3. Complete OCR directly into review

Primary files: `worker/ocr.py`, `worker/correct.py`, `worker/core.py`,
`worker/__main__.py`, `jobs/routes.py`, `surreal.py`, `domain/document.py`, and
`api/v1/documents.py` plus its request/response schemas.

Always detect metadata from raw OCR pages. In one transaction, save the draft,
set document status to `review`, persist detected metadata, and complete OCR.
OCR returns no follow-up correction job. Remove `CorrectOcrHandler`, its
completion/failure database methods, and recovery branches.

Remove `skip_llm_correction` upload input, `document.llm_correction`, draft
correction status/model/prompt fields, and draft-page `corrected_text`. Review
loads raw text and applies submitted manual `page_edits` when assembling the
immutable confirmed index input. Keep chat model and correction timeout settings:
single-chunk correction still uses them.

Done when upload reaches review after OCR, metadata is available without a chat
correction call, manual text edits and selected-page confirmation still work,
and no active route or worker can dispatch `correct_ocr`.

### 4. Restrict indexed correction to one chunk

Primary files: `api/v1/documents.py`, `api/v1/schemas/documents.py`, `surreal.py`,
`worker/correct.py`, and `application/correction.py` where needed.

Replace list-based request/storage processing with one chunk and one captured
snapshot. Call the model once, then atomically apply a valid result, complete the
snapshot/job, and create any necessary re-embedding child.

Preserve these behaviors:

- Changed text creates one child with captured embedding text and version.
- Unchanged text with a fresh vector completes without a child.
- Unchanged text with a stale vector creates one refresh child.
- Invalid model output or a processing failure fails the correction and releases
  its lock without changing committed text/vector.
- Membership, captured text/hierarchy/version, active lock, and running claim
  checks prevent stale or superseded writes.
- Re-embedding failure preserves corrected text and the previous searchable
  vector as stale; Correct again remains the explicit refresh action.
- A committed-but-unanswered parent transaction is reconciled and its existing
  child recovered without duplicate work.

Done when every new correction has one snapshot, affects one chunk, and creates
at most one child, with the behaviors above covered by transaction tests.

### 5. Update admin-web

Work under `apps/admin-web/src/features/knowledge/`:

- Update `api/contracts.ts` and `api/knowledgeClient.ts` for counter-free status,
  raw draft pages, and `{chunk_id}` correction requests.
- Remove the skip-correction checkbox and upload argument in `pages/UploadPage.tsx`.
- Remove draft correction notices and corrected-text fallbacks in review code;
  retain local edits, metadata edits, selection, and confirmation behavior.
- Remove **Correct page** from `pages/IndexedDocumentPage.tsx`; keep per-chunk
  correction, cross-page continuation labels, lock state, child progress,
  refresh-after-reload behavior, and bounded errors.
- Make `components/JobProgress.tsx` show percentage and step, with a generic job
  progress accessibility label. Remove page-count-pending and page counter text.
- Update `hooks/useIngestionJob.ts`, `model/jobPresentation.ts`, and ingestion
  screens where they assume OCR chains into automatic correction.

Done when UI tests cover upload -> raw OCR review -> edited/selected confirmation,
single-chunk correction -> child completion, no-op, failed correction, stale
embedding, and reload while work is active. No page-level correction or skip
correction control remains.

### 6. Verify, document, and run the implemented behavior

Update existing tests rather than retaining old workflow expectations. Focus on
API contract rejection, schema payload round-trips, transaction races, ownership
recovery, timeout/ambiguous-commit reconciliation, manual indexing retry, and the
UI workflows above. Run the Knowledge pytest suite and admin-web test, typecheck,
lint, and build scripts. Use an isolated SurrealDB instance for database tests.

Update `README.md`, `docs/database/knowledge_schema_config.md`, and current upload
workflow documentation. Mark conflicting earlier plans historical where needed;
historical migrations are reference only. Search runtime code, active docs, and
test fixtures for removed fields/type/actions and account for every remaining
occurrence. Record that raw OCR can affect metadata and chunk boundaries: manual
review is the structural repair stage; later chunk correction does not re-chunk.

This is a fresh-schema change under the existing local workflow. Implement the
new schema directly, without adding legacy payload or batch adapters. Applying
`DEFINE FIELD IF NOT EXISTS` to an old database does not remove old definitions
or convert existing jobs, so rebuilding alone is not a schema cutover.

Local volume deletion requires a separate explicit reset request; creating or
implementing this plan does not grant that permission. Complete code and isolated
verification first. If no reset is authorized, report the existing-volume cutover
as outstanding and retain user data. After applicable verification, rebuild the
Knowledge Compose services using the command in `AGENTS.md`, verify status and
health/readiness, and report any schema incompatibility explicitly. When reset
is explicitly authorized, follow the README's scoped inspection/reset procedure,
then initialize the fresh schema and smoke-test upload/review/index/correction.

Done when relevant checks pass, current docs match the contracts, and the local
runtime runs the new behavior, or the exact remaining reset/runtime dependency
is reported without claiming deployment completion.

## Acceptance checklist

- All four remaining job types use a required, validated payload; internal
  captured inputs stay private to workers.
- Job status reports only step and percentage for progress; counts live only in
  worker calculations and document metadata.
- OCR commits raw draft text and metadata directly into manual review.
- Review still edits text/metadata, selects pages, and confirms immutable input.
- Correction accepts one `chunk_id`, automatically applies valid output, and
  produces zero or one re-embedding child.
- Claim fencing, version guards, durable locks, replay/reconciliation, searchable
  stale vectors, and manual index retry remain verified.
- Admin-web and active documentation expose the same workflow as the backend.
