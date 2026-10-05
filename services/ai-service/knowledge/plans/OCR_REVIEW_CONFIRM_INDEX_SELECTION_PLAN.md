> Historical workflow reference. The job payload, raw OCR review, progress, and correction contracts are superseded by [JOB_PAYLOAD_AND_SINGLE_CHUNK_CORRECTION_PLAN.md](JOB_PAYLOAD_AND_SINGLE_CHUNK_CORRECTION_PLAN.md).

> Historical plan: workflow/schema compatibility and manual acceptance requirements
> are superseded by [the current workflow](../README.md) and the obsolete workflow cleanup.

# Confirm OCR review once, index selected pages, and remove temporary drafts

## Outcome

After OCR (and optional automatic correction), Knowledge stores one temporary
`ocr_draft` for the review screen. The reviewer can edit page text and metadata
and choose which pages to index. Those changes stay in browser state until the
reviewer confirms. Confirmation saves the final metadata and a temporary,
durable indexing input in one transaction with the indexing job. Once the index
is committed, Knowledge deletes the indexing input and OCR draft. The source PDF,
document metadata, indexed chunks, and job history remain.

The public review flow is `GET /v1/documents/{id}/result` followed by
`POST /v1/documents/{id}/confirm`. Remove the review-draft `PATCH` route and its
Save review draft button. OCR creation, optional automatic OCR correction, and
successful-index cleanup are internal writes to temporary records.

## Invariants

- The review screen starts with every OCR page selected. A reviewer may exclude
  any page; at least one selected page must contain indexable text.
- A page number always means its original PDF page number. Excluded page text
  never appears in chunks or embeddings. Gaps remain gaps; do not join text
  across an excluded page as though the pages were adjacent.
- Unchanged page text uses `reviewed_text` if present, then `corrected_text` if
  present, then `raw_text`. A submitted edit overrides that value, including an
  intentional empty string. Validate indexability after applying edits.
- The confirmation transaction is the commit point for reviewer changes. The
  worker reads a database record, never browser state or a job message body.
- Failed indexing retains the draft and indexing input for diagnosis and retry.
  Successful indexing removes both in the same transaction that publishes
  chunks and completes the job.
- A repeated confirmation with the same normalized request returns the same
  indexing job without replacing its input. A stale or different confirmation
  returns 409, including after temporary records have been deleted.

## Implementation steps

Paths below are relative to `services/ai-service/knowledge/` unless prefixed
with `apps/admin-web/`. Read current callers and tests before editing. Preserve
unrelated working-tree changes.

### 1. Define the one-shot confirmation contract

Change `src/app/api/v1/schemas/documents.py` and `src/app/api/v1/documents.py`.
Make `POST /v1/documents/{id}/confirm` accept `expected_revision`, final
`metadata`, `page_edits` (`page`, `reviewed_text`) and `selected_pages` (original
page numbers). Require a nonempty, unique selected-page list and unique edit
page numbers; verify every number belongs to the current OCR draft. Keep the
existing metadata validation and enforce the same page-text size limits as the
old review request. Return 422 for invalid page choices/content and 409 for a
stale revision or already confirmed content that differs. Keep the existing
accepted response shape with `job_id`.

Remove `PATCH /v1/documents/{id}/review-draft`, its request types, and the
`update_document_review()` database method. Continue to expose the draft via
the existing result GET only while the document is in `review` state.

Done when API tests cover unchanged confirmation, edited text and metadata,
selected pages, unknown/duplicate/empty page choices, stale revision, and
repeat submission; the PATCH route is absent.

### 2. Persist a temporary indexing input at confirmation

Add an `index_input` record in `db/schema.surql` and the next migration. It
belongs to one document and stores only the selected pages as `{page, text}`
with original page numbers. Add an optional `index_input_id` reference to the
index job and a persistent fingerprint of the normalized confirmation request
for idempotent repeats. Keep the job message ID-only. Store final metadata on
`document`.

Replace `confirm_review()` in `src/app/infrastructure/surreal.py` with one
transaction that checks document state and draft revision, merges edits against
the OCR page values, validates selected text, creates `index_input`, changes
document state to `indexing`, and creates the deduplicated index job. Guard the
transaction itself against concurrent confirms; do not rely solely on an
earlier read. Keep `ocr_draft` until index completion as requested. Its page
content remains the OCR/automatic-correction output; reviewer edits live in
`index_input` after confirmation.

Done when an integration test shows that metadata, index input, document state,
and job appear together or none do, and duplicate confirms create one job and
one input.

### 3. Index from the confirmed input and clean up atomically

Change `src/app/worker/index.py` to load `index_input` through the job and pass
its selected pages to `chunk_pages()` using the final page text. Keep the
chunker's original page numbers and structural context within each contiguous
selected run; flush context at excluded-page gaps so chunks cannot span them.
Reject an empty chunk result before publishing anything.

In `complete_index_job()`, replace the document's chunks, mark the document
indexed, complete the claimed job, clear historical `job.ocr_draft_id` references
for that document, and delete its `index_input` and `ocr_draft` in the same
transaction. Remove `chunk.ocr_draft_id` from new writes, the domain model, and
the schema; indexed chunk correction already uses chunk and document IDs. A
claim conflict or database failure must roll back all writes and retain both
temporary records. Preserve them in `fail_index_job()` as well.

Done when tests show that only selected pages become chunks, page numbers stay
accurate, selected gaps split chunk context, successful completion removes both
temporary records and leaves no draft references, and failed/duplicate worker
completion leaves a consistent state.

### 4. Make the review UI one-shot

In the repository-root `apps/admin-web/src/features/knowledge/`, hold metadata edits, page text
edits, and selected page numbers in local React state. Add a clear per-page
"Include in index" control to `DocumentReviewWorkspace` /
`PdfComparisonWorkspace`, defaulted on. Show the selected count in the
confirmation button and disable it when no selected page has text. Keep the
existing unsaved-change navigation warning, including page selection changes.

On Confirm, send the final metadata, changed page text, selected pages, and
revision in one request. Remove the Save review draft button, client PATCH
method, update contract, save-state logic, and tests for draft saving. On 409,
offer reload of the latest OCR result; reloading intentionally discards local
edits after user confirmation. Preserve the current job-progress navigation.

Done when UI tests show local edits cause no write before Confirm, confirmation
sends one complete request, page selection survives navigation, and a conflict
can be reloaded without silently losing edits.

### 5. Migrate existing data and update documentation

Update `README.md`, repository-root `docs/database/knowledge_schema_config.md`, and any current
flow guide that describes the PATCH/save flow. Add a migration for the new
record and references. Before switching workers, let existing running index
jobs finish. Backfill `index_input` for queued legacy index jobs from their
confirmed drafts using the existing text precedence and all pages selected;
verify counts before starting the new worker. Remove `ocr_draft_id` from legacy
chunks and clear stale references on completed jobs. After validating indexed
documents still have chunks and no draft-dependent code paths, remove their
old OCR drafts in batches. Preserve failed and unprocessed drafts for recovery.

Document how to requeue a failed index job against its retained input using the
existing job ID and dedupe key. If the current job machinery has no safe failed
job requeue operation, add an explicit guarded operator action and test it.

Done when existing indexed documents and in-flight jobs remain readable across
deployment, failed jobs can be retried without resubmitting browser edits, and
no public documentation mentions saving a review draft.

## Verification

Run the Knowledge Python tests and admin-web Vitest suite. Run the SurrealDB
integration tests with a real database for confirmation atomicity, index
completion/deletion, and migration of a queued legacy job. Verify manually with
a multi-page PDF: edit metadata and one page, exclude another page, confirm,
inspect chunk page positions, then verify the draft and input are gone after
the job completes. Also exercise an embedding failure and retry to verify the
temporary records remain available until success.
