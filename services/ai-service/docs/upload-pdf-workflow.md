# Knowledge PDF upload, review, and indexing

The authoritative runtime and local reset instructions are in [Knowledge README](../knowledge/README.md). The schema is [db/schema.surql](../knowledge/db/schema.surql). Historical plans and migrations describe earlier workflows.

## Upload and OCR

`POST /v1/documents` accepts a PDF multipart `file` and returns `202 {document_id, job_id, status}`. The service stores the original in MinIO and atomically creates a document plus `ocr_pdf` job with `payload: {}`. RabbitMQ messages contain only `{version, type, job_id}`. Source data is resolved through `document_id`.

Workers claim before acknowledgment. OCR renders and reads each PDF page, computes local page percentages, and detects metadata from the raw text. One transaction saves raw draft pages, detected metadata, document `page_count`, review status, and completed OCR status. OCR performs no chat correction and creates no follow-up job.

REST `GET /v1/jobs/{id}` and WebSocket `/v1/ws/jobs/{id}` share a status contract: `step`, integer `progress`, ordered `version`, lifecycle/error, and orchestration links. Captured inputs and worker ownership stay private. Running progress stays below 100 and never decreases within a claim. Completion sets 100; failure preserves progress.

## Manual review and one-shot confirmation

`GET /v1/documents/{id}/result` returns raw OCR pages, original page numbers, draft revision, and detected metadata. The admin compares the source PDF with the editable draft and keeps metadata edits, page text edits, and selections locally.

`POST /v1/documents/{id}/confirm` submits `expected_revision`, final `metadata`, `page_edits` (`page`, `reviewed_text`), and `selected_pages`. One transaction validates revision and review status, saves metadata, marks the draft confirmed, creates an immutable `index_input` containing only selected original page numbers and final text, and queues `index_document`. Its payload contains a typed `index_input_id` and a confirmation fingerprint. Identical replay returns the existing job; conflicting confirmation is rejected.

Raw OCR can affect metadata and legal-structure chunk boundaries. Manual review repairs those structures before confirmation. Later correction edits one existing chunk and does not re-chunk the document.

## Indexing and explicit retry

The index worker loads only its captured confirmed input, chunks legal structure across selected pages, embeds text and hierarchy, then atomically replaces indexed chunks and deletes the draft/input. A failed transaction preserves the original searchable index, draft, and input. Claim/status fencing prevents old work from committing after a retry.

`POST /v1/jobs/{id}/retry` requeues an eligible failed index job against the same input/fingerprint, resets percentage to zero, advances version, and clears ownership for a new claim. It never accepts replacement browser content. Model failures do not trigger automatic processing retries.

## Single indexed-chunk correction

`GET /v1/documents/{id}/chunks` exposes indexed chunks with durable operation status. Each chunk has its own **Correct** action, continuation labels, and lock state.

`POST /v1/documents/{id}/corrections` accepts exactly:

```json
{"chunk_id": "chunk:chunk_0123456789abcdef0123456789abcdef"}
```

It returns `202 {job_id}`. Legacy batch bodies are rejected. A foreign, missing, locked chunk or a non-indexed document returns conflict. One transaction revalidates membership, creates a durable lock and exactly one `chunk_correction_input` snapshot, and queues `correct_chunks` with typed `chunk_id` and `correction_input_id` payload fields.

The worker resolves that exact snapshot and calls the model once. A guarded transaction applies valid text, completes the snapshot and parent, and creates zero or one `reembed_chunk` child. Changed text or unchanged text with a stale vector needs a child; unchanged text with a fresh vector does not. The child captures chunk ID, embedding text, and version in its payload.

Invalid output or correction failure releases the lock and preserves committed text/vector. Re-embedding failure preserves corrected text and the previous searchable vector as stale; Correct again explicitly refreshes it. Captured text, hierarchy, version, document membership, locks, and running claims fence superseded writes. Lost commit replies reconcile against durable state and recover an existing child without duplicating it.

Public operation shape remains `{input_id, outcome, job, children, chunk_child_ids}`. Parent completion means text is durable; fully indexed means its child completed. Reload/polling recovers active jobs, no-op, terminal failures, and stale-vector state.

## Recovery and schema cutover

A bounded worker startup pass fails only that identity's abandoned claims. Each delivery uses an independent database connection; timeouts discard it and reconcile through a fresh connection. Sequence ordering, private worker run IDs, claim fencing, and manual retry behavior remain active.

Apply the fresh schema directly. Rebuilding against an old volume does not remove old definitions or convert jobs. A local volume reset requires explicit user authorization and scoped inspection as described in the README; preserve bind mounts and credentials.

Validation uses an isolated SurrealDB instance, the Knowledge pytest suite, and admin-web tests, typecheck, lint, and build. Runtime verification checks initializers, service health/readiness, and upload -> raw review -> edited/selected confirmation -> index -> single correction.
