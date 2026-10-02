# Knowledge API

Knowledge owns source PDFs, document metadata, OCR drafts, and background jobs in one SurrealDB. The API publishes job IDs into the `knowledge` RabbitMQ vhost; worker processes run from the same image and access Knowledge's database and MinIO directly.

## Run locally

Configure `.env` using `.env.example`, then run `docker compose up -d --build` from this directory. Knowledge is served at `http://localhost:8000` and the review UI at `http://localhost:5173`. The OCR worker calls LM Studio on the host at port 1234 by default.

For the API workflow, see [Knowledge upload to OCR](../docs/UPLOAD_TO_OCR_PRESENTATION_GUIDE.md). For the shared architecture rules, see [background jobs](../../../docs/architecture/background-jobs.md). LM Studio must serve OCR, chat-correction, and 768-dimensional embedding models configured in `.env`.

## Job flow

PDF upload stores the source object, then creates the document and `ocr_pdf` job in one SurrealDB transaction. It publishes `{version, type, job_id}` after commit. The worker claims the job before acknowledging the message. OCR chains to `correct_ocr` unless the upload checked `skip_llm_correction`; correction failure still leaves raw OCR reviewable. A reviewer saves and confirms the draft; `index_document` chunks the reviewed/corrected/raw page text, embeds it, and atomically replaces the document's chunks. Indexed documents support `correct_chunks` suggestions and `reembed_chunk` after acceptance. A unique `(document_id, dedupe_key)` index prevents duplicate stages while correction and re-embed attempts receive unique keys.

API flow: `POST /v1/documents` → `GET /v1/jobs/{id}` → `GET/PATCH /v1/documents/{id}/result|review-draft` → `POST /v1/documents/{id}/confirm` → `GET /v1/documents/{id}/chunks` → `POST /v1/documents/{id}/corrections` → `POST /v1/corrections/{id}/accept|reject`. The admin UI exposes the same flow. A stale suggestion never overwrites a newer chunk; the previous vector remains searchable until re-embedding completes.

New job types must be mapped in `app.jobs.routes.JOB_QUEUES` and registered in the worker pool for their queue. Queues represent workload profiles; worker replicas provide throughput.

## Existing installations

For a deployment with central jobs, stop the old worker after in-flight jobs finish and stop the old job API. Run `python -m app.migrate_central_jobs` with `OLD_JOB_SURREAL_*` credentials to copy and verify every Knowledge job row. Start the Knowledge API to replay queued rows, then start `knowledge-worker-ocr`. Rows still `running` require operator review because there is no lease recovery. Fresh installations need no migration.
