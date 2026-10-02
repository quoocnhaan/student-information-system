# Service-owned jobs and ingestion pipeline

Supersedes `INDEPENDENT_WORKER_SERVICE_PLAN.md`. This file is the shared reference for every phase; each phase file holds the steps.

## How to use this plan

Implement **one phase per session**, in order. For a phase, read this README and that phase's file. The phase ends when its "Phase complete when" checks pass; then report back to the user with a summary of what changed and the test results.

| Phase | File | Delivers | Requires |
|---|---|---|---|
| 1 | `phase-1-job-store-and-api.md` | Job table and store, publisher, upload path, job status routes inside Knowledge | — |
| 2 | `phase-2-worker.md` | OCR worker process inside the Knowledge image | 1 |
| 3 | `phase-3-deploy-cutover-cleanup.md` | Compose + RabbitMQ vhost, migration of existing jobs, deletion of `job-service` / `worker-service` | 2 |
| 4 | `phase-4-chaining-and-llm-correction.md` | Stage chaining, automatic LLM correction, skip option | 3 |
| 5 | `phase-5-confirm-and-index.md` | Confirm review, chunk + embed + write | 4 |
| 6 | `phase-6-post-index-correction.md` | Indexed-document view, correct chunk/page, re-embed | 5 |

Phases 1–3 are a refactor: the public Knowledge API, the job and draft ID formats (`job:job_<32 hex>`, `ocr_draft:ocr_job_<32 hex>`), and the admin-web stay unchanged. Between phases 1 and 3 the local Docker stack cannot complete OCR end to end; verify those phases through tests. Phases 4–6 add features.

Run `python -m pytest` in `services/ai-service/knowledge` (and `npx vitest run` in `apps/admin-web` when a phase touches it; plain `npm test` starts vitest in watch mode) after every step; a step is done only when the suites pass.

## Goal

Today Knowledge calls a central `job-service` (own database, port 8010) and a shared `worker-service` processes jobs through HTTP callbacks into Knowledge. Move to **service-owned** jobs: job rows in Knowledge's SurrealDB, publishing to Knowledge's own RabbitMQ vhost, and workers running from the Knowledge image as separate containers with no port. Then build the full pipeline:

```
upload ─► ocr ─► correct (LLM, skippable) ─► human review ─► confirm ─► index (chunk + embed + write) ─► indexed
          job     job                         admin-web        API        job                                │
                                                                                                             ▼
                                        indexed-document view: [Correct chunk] / [Correct page] ─► suggestion ─► Accept ─► re-embed chunk
```

## Architecture rules

These rules apply to Knowledge and to every future service (academic, enrollment, …). Phase 3 copies them into `docs/architecture/background-jobs.md` as the repository source of truth.

1. **Service-owned.** A service owns its job table (in its own database), its queues, its task code, and its worker containers. No shared job service, job database, or shared worker.
2. **One image, many processes.** API, each worker pool, and maintenance processes (e.g. `knowledge-orphan-cleanup`) run from the service's one image; only the container `command` differs. Only the API exposes a port.
3. **One broker, vhost per service.** All services share one RabbitMQ (a cluster in production). Each service connects to its own vhost (`knowledge`) with its own user, permitted only on that vhost.
4. **Queue = workload profile.** Job types that share resource needs (duration, CPU/GPU/RAM vs I/O, rate limits, priority) share a queue; a type with a different profile gets its own queue. A worker pool consumes one or more queues and is sized for them. Scale by adding replicas, not queues.
5. **Messages carry IDs, storage carries data.** A message names a job. The worker loads the job's input from the service's own storage and writes its output back. Workers are processes of the owning service, so they use its database and object store directly.
6. **Cross-service work goes through events or the owner's API.** A service publishes only to its own vhost and imports only its own task code.
7. **Same-database atomicity.** Because the job row lives beside the domain data, write them in one transaction:
   - document + first job at creation;
   - a stage's output + its job completion + the next stage's job;
   - domain state + job failure on error.

## Target layout (after phase 6)

```
RabbitMQ (shared)                       Knowledge image (services/ai-service/knowledge)
  vhost "knowledge"                       knowledge-api              uvicorn, port 8000, publishes jobs
    exchange jobs.v1 (direct)             knowledge-worker-ocr       python -m app.worker  (queue ocr)       phase 3
      queue jobs.ocr      key "ocr"       knowledge-worker-correct   python -m app.worker  (queue correct)   phase 4
      queue jobs.correct  key "correct"   knowledge-worker-index     python -m app.worker  (queue index)     phase 5
      queue jobs.index    key "index"     knowledge-orphan-cleanup   python -m app.orphan_cleanup (profile)
    exchange jobs.dead (topic)
      queue jobs.dead                     Knowledge SurrealDB: document, ocr_draft, chunk, job, correction_suggestion
```

`JOB_QUEUES` (type → queue, in `app/jobs/routes.py`):

| Job type | Queue | Profile | `dedupe_key` | Phase |
|---|---|---|---|---|
| `ocr_pdf` | `ocr` | PDF render (CPU) + LM Studio vision model, slow, per page | `ocr_pdf` | 1–2 |
| `correct_ocr` | `correct` | LM Studio chat model, long per-page LLM calls | `correct_ocr` | 4 |
| `index_document` | `index` | CPU chunking + LM Studio embeddings, batched, short | `index_document` | 5 |
| `correct_chunks` | `correct` | Same LLM correction, on demand, over 1..n chunks | `correct_chunks:<uuid>` | 6 |
| `reembed_chunk` | `index` | One LM Studio embedding call | `reembed_chunk:<uuid>` | 6 |

Pipeline stages use `dedupe_key = type`, so each runs at most once per document; on-demand jobs get a unique key. All stages call the one local LM Studio server, so each worker container runs with concurrency 1 (prefetch 1, one replica) by default. Scale a stage only when LM Studio has capacity.

New modules inside `src/app/`:

| Module | Contents | Phase |
|---|---|---|
| `jobs/routes.py` | `JOB_QUEUES`, envelope encode/decode | 1 |
| `jobs/publisher.py` | Best-effort publish + replay of `queued` rows | 1 |
| `infrastructure/surreal.py` | Job methods on `SurrealDatabase` | 1 |
| `worker/core.py`, `worker/__main__.py` | Registry, claim-before-ACK execution, consumer process | 2 |
| `worker/ocr.py` | `OcrPdfHandler` | 2 |
| `application/correction.py` | `correct_text(text) -> str \| None` | 4 |
| `worker/correct.py` | `CorrectOcrHandler` (phase 4), `CorrectChunksHandler` (phase 6) | 4, 6 |
| `application/chunking.py`, `worker/index.py` | Chunker, `IndexDocumentHandler` (phase 5), `ReembedChunkHandler` (phase 6) | 5, 6 |

## Envelope

Persistent JSON, `message_id` = job ID, ≤ 1 KiB:

```json
{"version": 1, "type": "ocr_pdf", "job_id": "job:job_<32 hex>"}
```

- The vhost identifies the owner, so the envelope carries no `owner`.
- Publish to exchange `jobs.v1` with routing key = `JOB_QUEUES[type]`.
- Reject without requeue (→ `jobs.dead`): malformed envelopes, unknown `(type, version)`, and types not routed to the consuming queue.
- Options and inputs (e.g. "skip LLM correction") live in the database, never in the envelope.

## Text of record and states

Until indexing, the **draft pages** hold the text; the reviewer edits pages, and `reviewed_text ?? corrected_text ?? raw_text` is the page's text. From indexing on, the **chunks** hold the text: the indexed-document view is built from chunks, and post-index corrections edit chunks. Draft pages are then historical and never edited again.

```
document.process_status: processing ──ocr──► processing ──correct──► review ──confirm──► indexing ──index──► indexed
                                     └─ ocr failed ─► failed      (correct failed ─► review, raw text)   (index failed ─► failed)
ocr_draft.status:                         draft ─────────────────────────────────────► confirmed
ocr_draft.correction_status:              pending ──► completed | failed      (or skipped, chosen at upload)
chunk.embedding_status:                                                                     ok ◄──► stale (post-index correction)
```

Phases 1–3 keep today's flow (`processing ──ocr──► review`); phase 4 introduces the correction step.

## Accepted limits

- Publishing has no confirms, so a silent publish loss leaves a job `queued` until the next API restart or broker reconnect replays it.
- A worker that dies after claim and ACK leaves its job `running`, because there is no lease or automatic recovery. The UI shows the stored state as it is.
- Each pipeline stage runs at most once per document. Re-running a whole stage (a new correction prompt, a new embedding model) needs a later plan; a full re-index would also replace chunks and discard post-index chunk corrections unless that plan writes them back.
- After indexing, draft pages and chunks can differ, because post-index corrections edit chunks only. Chunks are authoritative for search and the indexed-document view.
