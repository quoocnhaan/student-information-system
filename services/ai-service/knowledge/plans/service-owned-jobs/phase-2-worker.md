# Phase 2: OCR worker inside the Knowledge image

**Read first:** `README.md` (architecture rules, envelope, `JOB_QUEUES`).
**Requires:** phase 1 complete (job store methods, `app/jobs/routes.py`, publisher).
**Working directory:** `services/ai-service/knowledge`.

## Scope

Add a worker process, `python -m app.worker`, to the Knowledge package. Port it from `services/worker-service/` (`core.py`, `main.py`, `ocr.py`) and replace every HTTP callback with direct calls: job state through the phase 1 store methods, the PDF through `MinioObjectStore`, results through `apply_ocr_result` / `fail_job`. Docker Compose wiring comes in phase 3; verify this phase through tests.

## Steps

1. **Settings and dependencies.**
   - Add `pypdfium2`, `pillow`, and `anyio` to `pyproject.toml`.
   - Add to `Settings`:
     - `LMSTUDIO_OCR_MODEL`, with an alias, following the existing `LMSTUDIO_*` pattern;
     - `KNOWLEDGE_OCR_MAX_OUTPUT_TOKENS` (default 4096);
     - `KNOWLEDGE_OCR_TIMEOUT_SECONDS` (default 60);
     - `KNOWLEDGE_WORKER_QUEUES` (comma-separated, default `ocr`).

     The worker also uses the existing `LMSTUDIO_BASE_URL` and `KNOWLEDGE_OCR_MAX_PAGES`.

   *Done when settings tests cover the defaults and env overrides.*

2. **Delivery core (`app/worker/core.py`).**
   - `Registry` keyed by `(type, version)`, with a duplicate-registration error.
   - `execute()` uses **claim-before-ACK**: `claim_job` → ACK → `handler.process`.
     - Claim returns nothing (duplicate, running, or terminal job) → ACK and skip.
     - Database error during claim → NACK with requeue.
     - Handler exception → `fail_job` with the bounded error.

   Port `test_routing.py`, using a fake second **type** on a second queue in place of the fake second owner. *Done when tests prove: exact routing by `(type, version)`, a duplicate delivery processes once, and an unknown version is rejected.*

3. **OCR handler (`app/worker/ocr.py`).** Port `KnowledgeOcrHandler` as `OcrPdfHandler`:
   - Read the PDF via `MinioObjectStore`, using the document's `source.object_key` and respecting `max_upload_bytes`.
   - Render pages and call LM Studio as today, keeping the page limit and the 60-second elapsed deadline per page call.
   - Report progress with `job_progress` (same steps and percentages as today).
   - Finish with `detect metadata → apply_ocr_result`, or with `fail_job` on any caught error. There is no OCR retry.

   Port `test_ocr_timeout.py`. *Done when tests prove the deadline fails the job and document together and a successful run produces one draft with the document in `review`.*

4. **Consumer process (`app/worker/__main__.py`).** Port `worker-service/main.py`:
   - Connect with `KNOWLEDGE_RABBITMQ_URL` and declare the topology the publisher declares.
   - Consume each queue in `KNOWLEDGE_WORKER_QUEUES` on its own channel with `prefetch_count=1`.
   - Validate envelopes; malformed input or a type not routed to this queue → reject without requeue.
   - Drain in-flight tasks on SIGTERM.
   - At startup, fail fast unless every type routed to its queues has a registered handler.

   *Done when tests prove a malformed envelope and a wrongly routed type are dead-lettered and startup fails for a queue with an unhandled type.*

## Phase complete when

- All four steps' checks pass and the test suite is green.
- `rg -i "httpx|JobClient|KnowledgeClient|callback" src/app/worker` finds only the LM Studio HTTP client.
