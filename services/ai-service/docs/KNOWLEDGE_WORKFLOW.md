# PDF upload to OCR result

1. `POST /v1/documents` validates the PDF, saves it to MinIO, and creates a `document` in Knowledge SurrealDB with `process_status=processing`.
2. Knowledge calls `POST /internal/v1/jobs` with owner `knowledge`, type `ocr_pdf`, the document ID as opaque subject, and a stable creation key. Job service stores one queued job in its own SurrealDB and returns its ID. Knowledge returns `202` only after that write succeeds.
3. Job service publishes a persistent trigger to the `jobs.knowledge.ocr_pdf` RabbitMQ queue. Publishing is best effort and does not delay the HTTP response. On its first broker connection or a reconnect, job service scans queued jobs in bounded batches and republishes their triggers.
4. Worker service receives the trigger, atomically claims the job through job service, and ACKs the message. Duplicate triggers cannot process the same job twice.
5. The Knowledge OCR handler fetches the source PDF through a claim-checked internal Knowledge route. It renders pages, calls LM Studio, and posts progress to job service. Each page request has a 60-second elapsed deadline.
6. The worker submits ordered page text to Knowledge. Knowledge validates it, detects metadata, writes the OCR draft, and moves the document to `review`. The worker then marks the central job `completed` with the draft reference. Result submission and terminal updates are idempotent.
7. The UI reads the existing Knowledge `GET /v1/jobs/{id}` and `/v1/ws/jobs/{id}` routes. Knowledge translates job service snapshots and WebSocket events to the existing response shape. The review result is available at `GET /v1/documents/{id}/result`.

Knowledge's document and the central job cannot share one transaction. Creation keys make a retried job creation safe. Orphan cleanup can find an old processing document without a central job after a grace period. Likewise, Knowledge applies the OCR result before the worker marks the job complete. A worker process death between those writes may leave a running job with an existing draft. There is no periodic replay, worker lease, or worker-death recovery in this design.

See [job service](../../job-service/README.md), [worker service](../../worker-service/README.md), and the [implementation plan](../knowledge/plans/INDEPENDENT_WORKER_SERVICE_PLAN.md).
