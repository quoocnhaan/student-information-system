# Phase 6: indexed-document view, correct chunk/page, re-embed

**Read first:** `README.md` (architecture rules, `JOB_QUEUES`, text of record and states).
**Requires:** phase 5 complete (chunks exist; `correct_text` from phase 4; `build_embedding_text` from phase 5).
**Working directory:** `services/ai-service/knowledge`, plus `apps/admin-web`.

## Scope

For **every** `indexed` document, whether automatic correction ran or was skipped, the user opens a document view built from chunks and asks the LLM to correct one chunk or a whole page. Results come back as suggestions; an accepted suggestion updates that chunk and re-embeds it. Chunks are the text of record here; draft pages are never edited. The review screen gets no LLM buttons.

```
indexed doc view ─► [Correct chunk | Correct page] ─► correct_chunks job ─► suggestions ─► Accept ─► reembed_chunk job
```

## Design

**Schema** (migration `009_post_index_correction.surql` + `schema.surql`; update `docs/database/knowledge_schema_config.md`):
- `chunk.embedding_status`: `string`, one of `ok | stale`, default `ok`. The migration sets `ok` on existing rows.
- `chunk.updated_at`: `datetime VALUE time::now()`.
- New table `correction_suggestion`:
  - fields: `document_id`, `chunk_id: record<chunk>`, `job_id: record<job>`, `base_text`, `suggested_text: option<string>`, `status`, `created_at`;
  - `status` is one of `pending | ready | accepted | rejected | outdated | failed`;
  - indexes on `job_id` and on `chunk_id, status`.

**Jobs:** `correct_chunks` (queue `correct`) and `reembed_chunk` (queue `index`), each with `dedupe_key = <type>:<uuid>`, so they can run any number of times. `type` maps `correct_chunks → "correct_chunks"` and `reembed_chunk → "reembed"`.

**Endpoints:**

| Endpoint | Behaviour |
|---|---|
| `GET /v1/documents/{id}/chunks` | For an `indexed` document, returns the pages in order. Each page lists its chunks (grouped by `page_start`, ordered by `chunk_index`) with `id`, `text`, `hierarchy`, `page_start`, `page_end`, `embedding_status`, `updated_at`, and the chunk's latest non-terminal suggestion. |
| `POST /v1/documents/{id}/corrections` `{chunk_ids: [...]}` | Returns `202 {job_id}`. One id means "Correct chunk"; all ids of a page means "Correct page". |
| `POST /v1/corrections/{suggestion_id}/accept` | Applies a `ready` suggestion. |
| `POST /v1/corrections/{suggestion_id}/reject` | Marks a `ready` suggestion `rejected`. |

## Steps

1. **Schema and read endpoint.** Apply migration 009 and add `GET /v1/documents/{id}/chunks`. A chunk spanning pages appears under `page_start` with `page_end` set. Any document that is not `indexed` returns `409`.

   *Done when API tests cover ordering, a multi-page chunk, a non-indexed document, and an attached suggestion.*

2. **Request correction.** `POST /v1/documents/{id}/corrections`:
   - It is allowed only when the document is `indexed` and every id belongs to it.
   - A chunk that already has a `pending` or `ready` suggestion returns `409`.
   - In one transaction it creates one `pending` suggestion per chunk (`base_text = chunk.text`) and a `correct_chunks` job, then publishes the job.

   *Done when API tests cover success, a foreign chunk id, a conflicting suggestion, and a non-indexed document.*

3. **`CorrectChunksHandler` (`app/worker/correct.py`, queue `correct`).**
   - Load the job's suggestions in order and call phase 4's `correct_text(base_text)` for each.
   - Set `suggested_text` with `status: ready`. If the result is `None` or equals `base_text`, set `status: rejected` instead.
   - Report progress per chunk and complete the job.
   - On job failure (deadline or LM Studio error), every still-`pending` suggestion of the job becomes `failed`, in the same transaction as the job failure.
   - It never writes `chunk.text`.

   *Done when tests prove suggestions are produced for one chunk and for a page, `chunk.text` is unchanged, and a failure marks the remaining suggestions `failed`.*

4. **Accept / reject and re-embed.**
   - **Accept**, in one transaction:
     - if `chunk.text != base_text`, mark the suggestion `outdated` and return `409`;
     - otherwise set `chunk.text = suggested_text`;
     - rebuild `embedding_text` with phase 5's `build_embedding_text`;
     - set `embedding_status: stale` and mark the suggestion `accepted`;
     - create a `reembed_chunk` job.

     It then publishes the job. Search keeps using the old vector until re-embedding finishes, and the document stays `indexed` throughout.
   - **`ReembedChunkHandler`** (`app/worker/index.py`, queue `index`):
     - embed the chunk's current `embedding_text`;
     - in one transaction, write the vector, set `embedding_status: ok`, and complete the job, only if `embedding_text` is unchanged since the read; otherwise complete without writing, because a newer `reembed_chunk` job owns the update;
     - retry temporary transport errors up to 3 times; on final failure the chunk stays `stale` and the job is `failed`.
   - Phase 5's `IndexDocumentHandler` now inserts chunks with `embedding_status: ok`.

   *Done when tests prove:*
   - *Accept updates the text and creates exactly one re-embed job;*
   - *Accept on a chunk edited since the suggestion returns `409` and marks it `outdated`;*
   - *two quick accepts on one chunk end with the vector of the latest text;*
   - *Reject never changes the chunk.*

5. **Admin-web.**
   - An indexed-document view: pages, each showing its chunks; a chunk spanning pages is labelled "continues on page X".
   - Per chunk, a "Correct" button; per page, "Correct page". Progress through `useIngestionJob`.
   - For each `ready` suggestion, a diff (current vs suggested) with Accept / Reject. "Accept all" on a page accepts its `ready` suggestions one by one.
   - An "Outdated" state when accept returns `409`, and a "Re-embedding…" badge while `embedding_status` is `stale`.
   - The review screen stays free of LLM buttons.

   *Done when the admin-web test drives correct → diff → accept → re-embedded, plus the outdated path.*

## Phase complete when

- All five steps' checks pass and both test suites are green.
- With `docker compose up`, correcting a chunk on an indexed document and accepting it updates the view. A KNN query afterwards finds the corrected wording, and search returns results throughout.
