# Worker service

The independent [worker service](../../worker-service/README.md) consumes durable RabbitMQ queues. It validates a versioned `{version, owner, type, job_id}` envelope and selects an exact `(owner, type, version)` handler. Each handler has its own queue and consumer channel with prefetch one.

The Knowledge OCR handler claims the job through job service, then ACKs the trigger. It fetches the PDF from an authenticated Knowledge endpoint, renders each page, calls LM Studio with a 60-second elapsed deadline per page request, and reports progress to job service. It sends ordered OCR text back to Knowledge. Knowledge stores the draft and moves the document to review before the worker completes the central job.

Duplicate triggers cannot claim a running or terminal job and are acknowledged. Invalid or unsupported envelopes are dead-lettered. A caught OCR error marks the Knowledge document and central job failed without retry. If the worker dies after claim and ACK, the job can remain running because this design has no lease or automatic worker-death recovery.

The worker has no SurrealDB or MinIO access. A second owner can add a handler and its own authenticated input/result callbacks without modifying the generic delivery loop.
