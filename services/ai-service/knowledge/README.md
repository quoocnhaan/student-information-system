# Knowledge API

Knowledge owns source PDFs, document metadata, and OCR drafts. Background job records live in the separate job service database. The worker service owns OCR execution and receives the PDF through authenticated Knowledge callbacks; it has no Knowledge database or MinIO credentials.

## Run locally

From this directory, configure `.env` using `.env.example`, then run:

```powershell
docker compose up -d --build
```

The stack serves Knowledge at `http://localhost:8000`, job service at `http://localhost:8010`, and the review UI at `http://localhost:5173`. The worker calls LM Studio on the host at port 1234 by default.

Upload with `POST /v1/documents` as a multipart `file`. Knowledge saves the PDF and document, then creates an idempotent job in job service. It returns `202 {document_id, job_id}` after the job is durable. Read progress from `GET /v1/jobs/{job_id}` or `/v1/ws/jobs/{job_id}`; these routes adapt the central job service response for the existing UI. The completed OCR draft can be read at `GET /v1/documents/{document_id}/result`.

Job service publishes the durable RabbitMQ trigger after creation. It replays queued jobs on its first broker connection and after reconnect. There is no periodic job scan or worker lease. A caught OCR error marks the document and central job failed. A worker process death after claim can leave a job running; that is the current recovery limit.

For deployment details and the wire contract, see [job service](../../job-service/README.md), [worker service](../../worker-service/README.md), and [workflow](../docs/KNOWLEDGE_WORKFLOW.md).

## Existing installations

Migrate or close all legacy Knowledge jobs before running `005_remove_local_jobs`. The migration removes only the old Knowledge `job` table. The Knowledge SurrealDB and MinIO volumes remain in place. In the local cutover, the old job table and queue were verified empty before the migration.
