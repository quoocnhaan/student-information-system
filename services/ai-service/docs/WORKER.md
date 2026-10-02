# Knowledge workers

`python -m app.worker` runs from the Knowledge image. Each worker pool consumes a workload queue in RabbitMQ's `knowledge` vhost, validates `{version, type, job_id}`, and claims the job in Knowledge's SurrealDB before acknowledging the message. Compose runs OCR (`ocr_pdf`), correction (`correct_ocr`, `correct_chunks`), and indexing (`index_document`, `reembed_chunk`) pools with prefetch one.

The OCR handler reads the PDF from Knowledge's MinIO bucket, renders pages, and calls LM Studio with a 60-second elapsed deadline per page. It reports progress in the local job row. OCR then queues optional LLM correction, which falls back to raw text on failure. Confirmation queues indexing; indexing embeds 768-dimensional vectors in batches and atomically replaces chunks. Post-index correction writes suggestions only; acceptance changes the chunk and queues re-embedding. A failed re-embed leaves the chunk marked `stale` while the document remains indexed.

Duplicate triggers are acknowledged without processing. Invalid messages are dead-lettered. A worker death after claim and ACK can leave a job running; there is no lease recovery yet.
