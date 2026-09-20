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

RabbitMQ is only a low-latency trigger. SurrealDB stores jobs, leases, retries,
status sequences, and an outbox. Run the API, outbox publisher, and worker with:

```powershell
docker compose up -d --build
```

Scale workers only after checking the loaded LM Studio model's concurrent
prediction limit and GPU headroom:

```powershell
docker compose up -d --scale knowledge-worker=2
```

Start with the database polling fallback enabled. Once broker outage, duplicate
delivery, worker crash, and reconnect tests pass in the deployment environment,
set `KNOWLEDGE_DATABASE_POLL_FALLBACK_ENABLED=false`. Prometheus metrics are
available at `GET /metrics`; RabbitMQ management is available locally on port
15672. Worker and outbox containers expose their process metrics on port 9100
inside the Compose network. GPU memory/utilization should be collected from the
host's NVIDIA/DCGM exporter because LM Studio owns the GPU process.

The standalone repository does not yet contain the parent application's user
authentication or browser UI. `KNOWLEDGE_WEBSOCKET_AUTH_TOKEN` can protect the
WebSocket endpoint with a deployment-wide bearer token until that integration
is supplied; user/document authorization must replace it before multi-tenant
production use.

The worker's first rule set derives a title, document type, document number,
cohort, programme scope, and language from OCR text and the filename. These
values are deliberately placed in `review` status before they are used for
retrieval.
