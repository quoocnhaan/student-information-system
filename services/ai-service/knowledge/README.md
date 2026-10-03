# Knowledge API

Knowledge owns source PDFs, document metadata, OCR drafts, and background jobs in one SurrealDB. The API publishes job IDs into the `knowledge` RabbitMQ vhost; worker processes run from the same image and access Knowledge's database and MinIO directly.

## Run locally

Configure `.env` using `.env.example`, then run `docker compose up -d --build` from this directory. Knowledge is served at `http://localhost:8000` and the review UI at `http://localhost:5173`. The OCR worker calls LM Studio on the host at port 1234 by default.

For the API workflow, see [Knowledge upload to OCR](../docs/UPLOAD_TO_OCR_PRESENTATION_GUIDE.md). For the shared architecture rules, see [background jobs](../../../docs/architecture/background-jobs.md). LM Studio must serve OCR, chat-correction, and 768-dimensional embedding models configured in `.env`.

## Job flow

PDF upload stores the source object, then creates the document and `ocr_pdf` job in one SurrealDB transaction. It publishes `{version, type, job_id}` after commit. The worker claims the job before acknowledging the message. OCR chains to `correct_ocr` unless the upload checked `skip_llm_correction`; correction failure still leaves raw OCR reviewable. The reviewer keeps metadata, text edits, and page choices locally, then confirms once. That transaction persists final metadata and an immutable temporary `index_input`; `index_document` reads only that selected-page input, chunks it by legal structure, embeds it, and atomically replaces chunks while deleting the input and OCR draft. Failed indexing retains both temporary records for retry. Indexed documents support `correct_chunks` suggestions and `reembed_chunk` after acceptance. A unique `(document_id, dedupe_key)` index prevents duplicate stages while correction and re-embed attempts receive unique keys.

API flow: `POST /v1/documents` → `GET /v1/jobs/{id}` → `GET /v1/documents/{id}/result` → `POST /v1/documents/{id}/confirm` (revision, final metadata, text edits, selected original page numbers) → `GET /v1/documents/{id}/chunks` → `POST /v1/documents/{id}/corrections` → `POST /v1/corrections/{id}/accept|reject`. The admin UI exposes the same flow. A stale suggestion never overwrites a newer chunk; the previous vector remains searchable until re-embedding completes.

If indexing fails, retry the same retained confirmation input with `POST /v1/jobs/{job_id}/retry`. The action only requeues a failed `index_document` job whose `index_input` remains present; it never accepts replacement browser content.

New job types must be mapped in `app.jobs.routes.JOB_QUEUES` and registered in the worker pool for their queue. Queues represent workload profiles; worker replicas provide throughput.

## Existing installations

For a deployment with central jobs, stop the old worker after in-flight jobs finish and stop the old job API. Run `python -m app.migrate_central_jobs` with `OLD_JOB_SURREAL_*` credentials to copy and verify every Knowledge job row. Start the Knowledge API to replay queued rows, then start `knowledge-worker-ocr`. Rows still `running` require operator review because there is no lease recovery. Fresh installations need no migration.
