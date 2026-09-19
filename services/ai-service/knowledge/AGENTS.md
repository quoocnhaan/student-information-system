# Knowledge service guide

## Long-running ingestion

Treat multi-step document ingestion as a durable job.

- Persist the `document` and its `job` before returning from a create endpoint.
- Return `202 Accepted` with `document_id`, `job_id`, and `status: processing`.
- A worker owns processing and updates the job after every meaningful step:
  `queued`, `downloading`, `ocr`, `detecting_metadata`, `saving_draft`, then
  `completed` or `failed`.
- Upload endpoints accept source files only. OCR and deterministic rules derive
  document metadata; detected values enter human review rather than being trusted
  as final truth.
- Store `status`, `step`, `progress`, page counts, and a safe error message on the
  job so the frontend can poll it through `GET /v1/jobs/{job_id}`.
- Keep document status aligned with the job: `processing` while active, `review`
  after OCR draft creation, and `failed` when processing fails.
- Make a failed job retryable from its original PDF in MinIO; do not require the
  client to upload the file again.

Completion: the API returns promptly, job state survives an API restart, and the
UI can obtain meaningful progress and terminal status without inspecting logs.
