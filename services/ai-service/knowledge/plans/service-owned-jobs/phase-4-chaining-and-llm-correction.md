# Phase 4: stage chaining and automatic LLM correction

**Read first:** `README.md` (architecture rules, `JOB_QUEUES`, text of record and states).
**Requires:** phase 3 complete (service-owned jobs running end to end).
**Working directory:** `services/ai-service/knowledge`, plus `apps/admin-web`.

## Scope

After OCR, a `correct_ocr` job runs an LLM over each page before human review. The user can skip it at upload. This phase also adds the generic mechanism that lets one stage create the next.

```
upload ─► ocr ─► correct_ocr ─► review          (skip_llm_correction: upload ─► ocr ─► review)
```

## Design

**Chaining.** A stage's completing transaction also creates the next stage's `queued` job (`dedupe_key = type`) and sets `next_job_id` on the completed job. After the commit, the worker publishes the next job, using the phase 1 publisher class with its own broker connection. If that publish is lost, the API's replay delivers it on the next API restart or broker reconnect. Claim atomicity makes double publishes safe.

**States.**
- OCR now leaves the document in `processing`. The document reaches `review` when correction finishes, fails, or is skipped.
- Correction is an enhancement. When it fails, the document still goes to `review`, and the reviewer works from `raw_text` with a notice.
- The option is stored on the document (`document.llm_correction`), never in a message.

**Schema** (migration `007_chaining_and_correction.surql` + `schema.surql`; update `docs/database/knowledge_schema_config.md`):
- `job.next_job_id`: `option<record<job>>`.
- `document.llm_correction`: `string`, one of `enabled | skipped`, default `enabled`.
- `ocr_draft.pages.*.corrected_text`: `option<string>`.
- `ocr_draft.correction_status`: `option<string>`, one of `pending | completed | failed | skipped`.
- `ocr_draft.correction_model` and `ocr_draft.correction_prompt_version`: `option<string>`.

**Public contract additions** (additive):
- `JobStatusResponse.next_job_id: str | None`.
- `type` maps `correct_ocr → "correct"`.
- Page responses gain `corrected_text`.
- The draft response gains `correction_status`.
- `POST /v1/documents` gains the optional form field `skip_llm_correction` (default `false`).

## Steps

1. **Chaining mechanism.**
   - Apply migration 007 and update the domain models (`OcrPage.corrected_text`, the draft correction fields).
   - Add `next_job_id` to `JobStatusResponse`.
   - Add a store helper `complete_job_and_enqueue(...)` that, inside the caller's transaction, completes the current job, creates the next `queued` job, and sets `next_job_id`.
   - Let `handler.process` return an optional next job, which `worker/__main__.py` publishes after the commit.
   - Admin-web:
     - when a job completes with `next_job_id`, `useIngestionJob` follows it with a fresh snapshot and WebSocket;
     - `jobPresentation` labels steps per type (OCR / correcting).

   *Done when a test chain of two fake types runs end to end, a lost post-commit publish is recovered by replay, and the admin-web hook test follows `next_job_id` across two jobs.*

2. **Skip option and OCR branching.**
   - `upload_pdf` reads `skip_llm_correction` and stores `document.llm_correction` in the same transaction that creates the document and job.
   - `apply_ocr_result` still creates the draft and completes the OCR job in one transaction, then branches on `document.llm_correction`:
     - `enabled`: set draft `correction_status: pending`, enqueue `correct_ocr` via `complete_job_and_enqueue`, and leave the document `processing`. Metadata detection moves to the correction step.
     - `skipped`: set draft `correction_status: skipped`, detect metadata on raw text, and move the document to `review`. No next job.

   *Done when tests prove a skipped upload reaches `review` straight from OCR with no `correct_ocr` job, and an enabled upload leaves the document `processing` with one queued `correct_ocr` job.*

3. **Correction function (`app/application/correction.py`).** `correct_text(text) -> str | None`, reused in phase 6:
   - It calls LM Studio `/chat/completions` with `LMSTUDIO_CHAT_MODEL`, temperature 0, and a versioned system prompt (`CORRECTION_PROMPT_VERSION` constant). The prompt tells the model to:
     - fix only OCR errors (Vietnamese diacritics, broken words, misread characters, merged or split lines);
     - preserve wording, numbering (`Chương`, `Điều`, `Khoản`, list markers), tables, and Markdown structure;
     - output only the corrected text.
   - **Guard:** return the output only if it is non-empty and its length is within ±20% of the input; otherwise return `None`, so the caller keeps the original.
   - **Deadline:** each call has its own elapsed deadline (`KNOWLEDGE_CORRECTION_TIMEOUT_SECONDS`, default 120). It retries a temporary transport error once.

   *Done when tests with a fake LM Studio cover: normal output, empty output, over-long output, a timeout, and one transport-error retry.*

4. **`CorrectOcrHandler` (`app/worker/correct.py`, queue `correct`).**
   - It calls `correct_text(raw_text)` for each draft page and reports progress per page.
   - **On success, in one transaction:**
     - write `corrected_text` (the result, or `null`) for every page;
     - set `correction_status: completed` plus the model and prompt version;
     - detect metadata (existing `DocumentMetadataDetector`) on corrected-else-raw text;
     - move the document to `review` and complete the job.
   - **On failure** (deadline or LM Studio error), in one transaction:
     - set `correction_status: failed`;
     - detect metadata on raw text;
     - move the document to `review`, with the job `failed`.
   - Map `JOB_QUEUES["correct_ocr"] = "correct"` and register the handler.

   *Done when tests prove: a page whose guard returns `None` keeps raw text; a deadline puts the document in `review` with the job `failed`; a duplicate delivery corrects once; `reviewed_text` is never written.*

5. **Admin-web and Compose.**
   - Admin-web:
     - a "Skip LLM correction" checkbox on the upload page;
     - the editor baseline becomes `reviewed_text ?? corrected_text ?? raw_text`;
     - a "LLM correction failed — showing raw OCR" notice when `correction_status` is `failed`, and a "LLM correction skipped" badge when it is `skipped`.
   - Compose: add `knowledge-worker-correct` (same shape as `knowledge-worker-ocr`, `KNOWLEDGE_WORKER_QUEUES=correct`).

   *Done when the admin-web tests cover the checkbox, baseline, notice, and badge, and a real upload reaches `review` showing corrected text.*

## Phase complete when

- All five steps' checks pass and both test suites are green.
- With `docker compose up`, one upload with correction and one with the skip option both reach `review`, with progress shown across every job of each.
