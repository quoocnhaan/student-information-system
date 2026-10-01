# Knowledge API

Knowledge owns source PDFs, document metadata, and OCR drafts. Background job records live in the separate job service database. The worker service owns OCR execution and receives the PDF through authenticated Knowledge callbacks; it has no Knowledge database or MinIO credentials.

## Run locally

From this directory, configure `.env` using `.env.example`, then run:

```powershell
docker compose up -d --build
```

The stack serves Knowledge at `http://localhost:8000`, job service at `http://localhost:8010`, and the review UI at `http://localhost:5173`. The worker calls LM Studio on the host at port 1234 by default.

For the full API workflow, response outcomes, recovery model, and wire contract, read the canonical [Knowledge upload-to-OCR workflow](../docs/UPLOAD_TO_OCR_PRESENTATION_GUIDE.md). For service implementation details, see [job service](../../job-service/README.md) and [worker service](../../worker-service/README.md).

## Creating Knowledge jobs

Knowledge producers call `JobServiceClient.create(job_type=..., subject_id=..., creation_key=...)`. The client supplies `owner="knowledge"`; each producer supplies its job type, subject, and a stable creation key. The PDF upload producer uses `ocr_pdf` and its document ID for both the subject and creation key.

The Job Service deduplicates creation by `(owner, creation_key)`, across all job types for that owner. A new producer must use a distinct key for each operation and subject (and revision, if applicable), then reuse exactly that key on retries. Keys must be 1–128 characters from `A-Z`, `a-z`, `0-9`, `_`, `.`, `:`, and `-`. Before running a new type, register `knowledge:<type>` in `JOB_REGISTERED_TYPES` and provide an enabled worker handler. The existing Knowledge worker callbacks and public status response remain OCR-specific.

## Existing installations

Migrate or close all legacy Knowledge jobs before running `005_remove_local_jobs`. The migration removes only the old Knowledge `job` table. The Knowledge SurrealDB and MinIO volumes remain in place. In the local cutover, the old job table and queue were verified empty before the migration.
