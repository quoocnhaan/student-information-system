# Knowledge upload to OCR

This guide follows the service-owned workflow from upload to a reviewable OCR draft.

1. `POST /v1/documents` validates the PDF and stores it in Knowledge's private MinIO bucket. It creates the document and a queued `ocr_pdf` job in one Knowledge SurrealDB transaction, then returns `202 {document_id, job_id}`.
2. The Knowledge publisher sends `{version: 1, type: "ocr_pdf", job_id}` to the `ocr` queue in the `knowledge` RabbitMQ vhost. It replays queued rows on its first successful broker connection and after reconnects.
3. `python -m app.worker` validates the message and atomically claims the job before ACK. A duplicate message is acknowledged without processing. Malformed or wrongly routed messages go to `jobs.dead`.
4. The OCR worker reads the PDF from MinIO, renders each page, and calls LM Studio `/chat/completions`. Each page request has its own elapsed deadline. The worker updates progress in the local job row.
5. Knowledge detects metadata and commits the OCR draft, document `review` state, and completed job together. If OCR fails, the document and job become `failed` together.
6. The admin UI reads `GET /v1/jobs/{job_id}` and follows `WS /v1/ws/jobs/{job_id}`. The WebSocket sends `job.status_snapshot`, then higher-sequence `job.status_changed` events and `ping` heartbeats. `GET /v1/documents/{document_id}/result` provides the draft for human review.

The API is ready only when SurrealDB, MinIO, and the broker connection are available. Publishing is best effort: a lost message leaves a queued row until a later API connection or reconnect replays it. A worker that dies after claim and ACK can leave a job running because there is no lease recovery.
