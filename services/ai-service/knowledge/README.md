# Knowledge API

FastAPI module responsible for source-document lifecycle and retrieval.

For a component-by-component explanation of why the ingestion architecture is
structured this way and how requests, jobs, events, retries, and reconnects move
through it, read the [knowledge ingestion workflow](../docs/KNOWLEDGE_WORKFLOW.md).

## Module layout

- `api/` is the HTTP interface.
- `api/v1/schemas/` contains versioned HTTP request/response contracts.
- `application/` will contain ingestion and retrieval use cases.
- `domain/document.py` contains document-domain models and rules.
- `infrastructure/` will contain adapters for vector storage, embeddings,
  source storage, and file parsing.
- `observability/` contains structured logging shared by this module.

## Upload a source PDF

Start the local stack with `docker compose up --build`, then send a multipart
request to `POST /v1/documents`. The endpoint stores the original PDF in the
private MinIO bucket and creates a SurrealDB `document` plus a durable OCR
`job`. It returns `202 Accepted` immediately; the `knowledge-worker` service
renders each page, submits it to `lightonocr-2-1b` through LM Studio, and
creates the unreviewed `ocr_draft`.

```powershell
curl.exe -X POST http://localhost:8000/v1/documents `
  -F "file=@C:\path\to\document.pdf;type=application/pdf"
```

The service accepts PDFs up to 50 MiB and 100 pages by default. Read the
durable snapshot from `GET /v1/jobs/{job_id}`, then connect to
`/v1/ws/jobs/{job_id}` for sequenced live updates. After a reconnect, fetch the
REST snapshot again and ignore events whose `sequence` is not newer.

RabbitMQ carries durable job triggers. SurrealDB stores the authoritative job,
dispatch lease, retries, and progress sequence. The dispatcher subscribes to job
changes and scans on startup and at a bounded interval to recover missed changes.
The API subscribes to job changes for WebSocket progress. Run the API,
dispatcher, and worker with:

```powershell
docker compose up -d --build
```

Scale workers only after checking the loaded LM Studio model's concurrent
prediction limit and GPU headroom:

```powershell
docker compose up -d --scale knowledge-worker=2
```

RabbitMQ is mandatory for worker admission. The API can still accept an upload
while RabbitMQ is unavailable; its queued job remains in SurrealDB and the
dispatcher publishes it after broker recovery. `/v1/ready` checks the database
and source-object store, which are required to accept the upload.

For an existing database, apply the additive schema and existing-job backfill
before starting the new dispatcher. With SurrealDB running, use the new image:

```powershell
docker compose run --rm --no-deps knowledge-dispatcher python -m app.infrastructure.initialize_schema
docker compose run --rm --no-deps knowledge-dispatcher python -m app.infrastructure.apply_migration 001_job_row_dispatch_backfill
```

After all old API, worker, and outbox replicas have stopped, run migration
`002_remove_outbox_events` through the same `apply_migration` command. Archive
old outbox rows after verifying dispatch and worker recovery, then run
`003_remove_outbox_table` as a separate cleanup. These commands use the
dispatcher service's SurrealDB settings; run them from this service directory.

## Review web application

The Compose stack also serves the React review UI at
`http://localhost:5173` by default. Set `ADMIN_WEB_PORT` to use another host
port. Upload a PDF there to follow its OCR job and, once it completes, compare
the original PDF page-by-page with its OCR draft.

For frontend-only development:

```bash
cd ../../../apps/admin-web
npm ci
npm run dev
```

The Vite development server proxies `/v1` REST and WebSocket traffic to the
knowledge API on port 8000.
Prometheus metrics are available at `GET /metrics`; RabbitMQ management is
available locally on port 15672. Worker and dispatcher containers expose their
process metrics on port 9100 inside the Compose network. GPU memory/utilization
should be collected from the host's NVIDIA/DCGM exporter because LM Studio owns
the GPU process.
The dispatcher exposes `knowledge_job_dispatch_pending`,
`knowledge_job_dispatch_active_leases`, `knowledge_job_dispatch_errors`, and
`knowledge_job_dispatch_delayed` for cutover and outage checks.

Source-object cleanup is a separate, opt-in maintenance service. Run a dry run
first with `docker compose --profile maintenance up knowledge-orphan-cleanup`
and inspect `orphan_cleanup_dry_run_candidate` logs. It is disabled by default;
deletion requires both `KNOWLEDGE_ORPHAN_CLEANUP_ENABLED=true` and
`KNOWLEDGE_ORPHAN_CLEANUP_DRY_RUN=false`.

The standalone repository does not yet contain the parent application's user
authentication or browser UI. `KNOWLEDGE_WEBSOCKET_AUTH_TOKEN` can protect the
WebSocket endpoint with a deployment-wide bearer token until that integration
is supplied; user/document authorization must replace it before multi-tenant
production use.

The worker's first rule set derives a title, document type, document number,
cohort, programme scope, and language from OCR text and the filename. These
values are deliberately placed in `review` status before they are used for
retrieval.
