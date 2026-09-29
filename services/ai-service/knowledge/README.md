# Knowledge API

Knowledge owns source PDFs, document metadata, and OCR drafts. Background job records live in the separate job service database. The worker service owns OCR execution and receives the PDF through authenticated Knowledge callbacks; it has no Knowledge database or MinIO credentials.

## Run locally

From this directory, configure `.env` using `.env.example`, then run:

```powershell
docker compose up -d --build
```

The stack serves Knowledge at `http://localhost:8000`, job service at `http://localhost:8010`, and the review UI at `http://localhost:5173`. The worker calls LM Studio on the host at port 1234 by default.

For the full API workflow, response outcomes, recovery model, and wire contract, read the canonical [Knowledge upload-to-OCR workflow](../docs/UPLOAD_TO_OCR_PRESENTATION_GUIDE.md). For service implementation details, see [job service](../../job-service/README.md) and [worker service](../../worker-service/README.md).

## Existing installations

Migrate or close all legacy Knowledge jobs before running `005_remove_local_jobs`. The migration removes only the old Knowledge `job` table. The Knowledge SurrealDB and MinIO volumes remain in place. In the local cutover, the old job table and queue were verified empty before the migration.
