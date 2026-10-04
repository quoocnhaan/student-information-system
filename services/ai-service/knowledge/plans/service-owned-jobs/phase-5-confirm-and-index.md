> Historical plan: workflow/schema compatibility and manual acceptance requirements
> are superseded by [the current workflow](../../README.md) and the obsolete workflow cleanup.

# Phase 5: confirm review, then index (chunk + embed + write)

**Read first:** `README.md` (architecture rules, `JOB_QUEUES`, text of record and states), and `docs/database/knowledge_schema_config.md` (chunk format).
**Requires:** phase 4 complete (chaining helper, `useIngestionJob` follows jobs).
**Working directory:** `services/ai-service/knowledge`, plus `apps/admin-web`.

## Scope

A reviewer confirms the draft. That creates an `index_document` job, which chunks the reviewed text, embeds each chunk, and writes the `chunk` rows. "Index" is a single job: writing the rows updates the existing HNSW index `chunk_embedding_hnsw` automatically.

```
review ─► confirm (API) ─► index_document (queue index) ─► indexed
```

## Design

**Schema** (migration `008_confirm_and_index.surql` + `schema.surql`; update `docs/database/knowledge_schema_config.md`):
- `document.process_status` gains `indexing`.
- `document.embedding_model`: `option<string>`.

**Public contract additions:**
- `POST /v1/documents/{id}/confirm`, with body `{expected_revision}`, returns `202 {document_id, job_id}`.
- `type` maps `index_document → "index"`.

**Text to index:** for each page, `reviewed_text ?? corrected_text ?? raw_text`.

## Steps

1. **Confirm endpoint.**
   - Apply migration 008 and add `DocumentProcessStatus.INDEXING`.
   - Add `POST /v1/documents/{id}/confirm`. In one transaction, guarded by `expected_revision`, `draft.status = 'draft'`, and `document.process_status = 'review'`, it:
     - sets the draft to `confirmed`;
     - sets the document to `indexing`;
     - creates the `index_document` job (`dedupe_key index_document`).

     It then publishes the job and returns `202`.
   - A stale revision returns `409`, matching `PATCH review-draft`. A repeated confirm returns the existing `job_id`. Confirmed drafts are read-only: `PATCH review-draft` returns `409`.

   *Done when API tests cover success, a stale revision, a double confirm returning the same `job_id`, a confirm on a non-review document, and an edit after confirm.*

2. **Chunker (`app/application/chunking.py`).** Pure functions over the pages' text:
   - Split on the legal hierarchy: `Chương <n>` (chapter), `Điều <n>` (article), `<n>.` / `Khoản <n>` (clause). Track `page_start` and `page_end`, and fill `hierarchy` numbers and titles.
   - Split oversized sections at paragraph boundaries to ≤ `KNOWLEDGE_CHUNK_MAX_TOKENS` (default 512, counted with a whitespace-token approximation). Merge tiny trailing pieces into the previous chunk of the same article.
   - `build_embedding_text(hierarchy, text)` = hierarchy header lines + chunk text, exactly as in `docs/database/knowledge_schema_config.md`. Phase 6 reuses this function.

   *Done when unit tests cover chapter / article / clause boundaries, a chunk spanning two pages, oversized splits, and text with no hierarchy markers, using text in the style of `pdf_files/24.7.29-QD-...pdf`.*

3. **`IndexDocumentHandler` (`app/worker/index.py`, queue `index`).**
   - Chunk the document.
   - Embed in batches (`KNOWLEDGE_EMBEDDING_BATCH_SIZE`, default 16) through LM Studio `/embeddings` with `LMSTUDIO_EMBEDDING_MODEL`. Reject any vector that is not 768-dim. Retry temporary transport errors up to 3 times with backoff.
   - Report progress per batch.
   - **On success, in one transaction:**
     - delete the document's existing `chunk` rows;
     - insert all new chunks with `ocr_draft_id`;
     - set `document.embedding_model`;
     - move the document to `indexed` and complete the job.
   - **On failure:** in one transaction, the document becomes `failed` and the job `failed`.
   - Map `JOB_QUEUES["index_document"] = "index"` and register the handler.

   *Done when tests prove a repeat run leaves exactly one set of chunks, a wrong-dimension vector fails the job, and a failure leaves the document `failed`.*

4. **Admin-web and Compose.**
   - Admin-web: add a "Confirm and index" action to `DocumentReviewWorkspace`. It saves pending edits first, then confirms, then shows index progress through `useIngestionJob` with the returned `job_id`. Show `indexing` / `indexed` document states.
   - Compose: add `knowledge-worker-index` (`KNOWLEDGE_WORKER_QUEUES=index`).

   *Done when the admin-web test drives confirm → indexing progress → indexed.*

## Phase complete when

- All four steps' checks pass and both test suites are green.
- With `docker compose up`, a real run of upload → correct → review → confirm → index ends `indexed`, with chunks whose `embedding` length is 768.
- A SurrealDB KNN query (`embedding <|5,COSINE|> $vector`) for a sample question returns chunks from that document.
