# Job service

This service owns background job rows in a dedicated SurrealDB database, publishes RabbitMQ triggers, and serves job status. It never stores source PDFs or OCR drafts.

## Wire contract

`POST /internal/v1/jobs` accepts `{owner,type,subject_id,creation_key}` using the owner's bearer token. `(owner,creation_key)` is unique, so a repeated request for the same subject returns the same job. `GET /v1/jobs/{id}` and `WS /v1/ws/jobs/{id}` expose snapshots and sequence-numbered updates.

The worker uses its bearer token for `POST /internal/v1/jobs/{id}/claim`, `PATCH .../progress`, and `POST .../complete` or `.../fail`. A random `claim_id` guards all updates. Knowledge verifies a claim with the owner-authenticated `GET /internal/v1/jobs/{id}/claims/{claim_id}` before releasing a source or accepting a result.

RabbitMQ messages are persistent JSON: `{"version":1,"owner":"knowledge","type":"ocr_pdf","job_id":"job:..."}`. Job service declares the `jobs.v1` exchange, one durable queue per owner/type, and a dead-letter exchange. It publishes after storing the job; it does not wait for publisher confirmation. It scans queued rows on its first broker connection and after reconnect, with `JOB_REPLAY_BATCH_SIZE` as a page size. There is no timer scan.

## Local deployment

The Knowledge Compose file builds this image and starts `job-surrealdb` with volume `job_surreal_data`. Configure `JOB_SURREAL_*`, `JOB_WORKER_TOKEN`, `JOB_OWNER_TOKENS_JSON`, and `JOB_REGISTERED_TYPES` through deployment environment. Only job service gets job database credentials. Run tests from this directory with `python -m pytest` after installing the dev dependencies.
