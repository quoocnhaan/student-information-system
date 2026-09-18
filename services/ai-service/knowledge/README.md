# Knowledge API

FastAPI module responsible for source-document lifecycle and retrieval.

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

The service accepts PDFs up to 50 MiB and 100 pages by default. Poll
`GET /v1/jobs/{job_id}` to update the UI with `queued`, `downloading`, `ocr`,
`saving_draft`, `completed`, or `failed` progress.

The worker's first rule set derives a title, document type, document number,
cohort, programme scope, and language from OCR text and the filename. These
values are deliberately placed in `review` status before they are used for
retrieval.
