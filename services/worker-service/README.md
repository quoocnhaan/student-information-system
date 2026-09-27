# Worker service

The worker consumes versioned job triggers for multiple originating services. Its generic loop validates an exact `(owner,type,version)` handler, claims a central job before ACK, and delegates processing. Each registered handler has a separate durable queue and channel with prefetch one. Malformed or unsupported messages go to `jobs.dead`.

The current production handler is `knowledge:ocr_pdf:1`. It fetches the source through Knowledge's authenticated, claim-checked callback; renders PDF pages locally; calls LM Studio with a 60-second elapsed deadline per page; posts progress to job service; and submits ordered OCR text to Knowledge. Knowledge saves its draft before the worker completes the central job. Caught errors fail both document and job without OCR retry.

The worker has no SurrealDB client, MinIO client, or credentials for either. New services add their own handler and authenticated callbacks, plus a registered owner/type and queue. The fake second owner in `tests/test_routing.py` verifies that the generic loop is not Knowledge-specific.

Configure `WORKER_RABBITMQ_URL`, `WORKER_JOB_SERVICE_URL`, `WORKER_JOB_TOKEN`, `WORKER_ENABLED_HANDLERS`, and handler-specific settings. The local stack builds this image through the Knowledge Compose file. Run tests from this directory with `python -m pytest` after installing the dev dependencies.
