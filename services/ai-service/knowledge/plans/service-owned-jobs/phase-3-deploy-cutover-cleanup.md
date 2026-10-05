> Historical plan: workflow/schema compatibility and manual acceptance requirements
> are superseded by [the current workflow](../../README.md) and the obsolete workflow cleanup.
> Deployment now uses only the repository-root `docker-compose.yml` and the root environment
> files. Historical commands and worker-scaling instructions below are not current
> run instructions; use the service README for deployment and reset procedures.

# Phase 3: deploy, cut over existing jobs, delete the central services

**Read first:** `README.md` (architecture rules, target layout).
**Requires:** phase 2 complete (worker runs from the Knowledge package).
**Working directory:** repository root; Knowledge files are under `services/ai-service/knowledge`.

## Scope

Wire the Knowledge worker into Docker Compose with an isolated RabbitMQ vhost, migrate jobs stored in the central `job-surrealdb` into Knowledge, then delete `job-service`, `worker-service`, and every piece of the HTTP callback layer. At the end of this phase the system runs end to end on service-owned jobs.

## Steps

1. **Compose and broker isolation.** In `docker-compose.yml`:
   - Add a one-shot `rabbitmq-init` service, modelled on `minio-init`. It uses the RabbitMQ management HTTP API to create vhost `knowledge` and user `${KNOWLEDGE_RABBITMQ_USER}` with permissions on that vhost only.
   - Add `knowledge-worker-ocr`:
     - `build: .`, `command: python -m app.worker`, `KNOWLEDGE_WORKER_QUEUES=ocr`;
     - no `ports`, `stop_grace_period: 5m`, `extra_hosts` for LM Studio;
     - database, MinIO, broker, and OCR env;
     - `depends_on`: rabbitmq-init, surrealdb, minio-init.
   - Give `knowledge-api` the broker env (`KNOWLEDGE_RABBITMQ_URL` on vhost `knowledge`) and `depends_on` rabbitmq-init.
   - Keep `job-service`, `job-surrealdb`, and `worker-service` defined until step 2 has run.
   - Add `KNOWLEDGE_RABBITMQ_USER`, `KNOWLEDGE_RABBITMQ_PASSWORD`, and `KNOWLEDGE_WORKER_QUEUES` to both `.env.example` files (repository root and Knowledge).

   *Done when:*
   - *`docker compose up` gets a PDF upload to `review` in the admin-web with live progress;*
   - *`knowledge-worker-ocr` has no published port;*
   - *`docker compose up --scale knowledge-worker-ocr=2` processes two uploads in parallel;*
   - *the `knowledge` RabbitMQ user is refused on vhost `/`.*

2. **Cutover of existing jobs.** Add `app/migrate_central_jobs.py`, a one-shot script that is the inverse of `services/job-service/src/job_service/migrate_knowledge.py`:
   - It reads `OLD_JOB_SURREAL_*` and copies every central `job` row whose owner is `knowledge` into Knowledge's `job` table.
   - It **preserves the record ID, `sequence`, status, step, and progress**, maps `subject_id → document_id` and `result_ref → ocr_draft_id`, and sets `type = ocr_pdf` and `dedupe_key = ocr_pdf`.
   - It skips rows that already exist and verifies every copied row field by field.

   Document the run order in `knowledge/README.md`:
   1. Stop `worker-service` after its in-flight jobs finish.
   2. Stop `job-service`.
   3. Run the migration.
   4. Start `knowledge-api`; its replay publishes the migrated `queued` rows into vhost `knowledge`.
   5. Start `knowledge-worker-ocr`.

   Rows still `running` stay `running`, which matches the no-recovery policy; the script prints them so an operator can close them. Delete the old `jobs.knowledge.ocr_pdf` queue on vhost `/` only after the counts match.

   *Done when a test with a fake old store proves ID, sequence, and status preservation and idempotent re-runs, and a local run shows the copied count equal to the central knowledge-row count and every pre-cutover job ID returning the same snapshot from `GET /v1/jobs/{id}`.*

3. **Delete the central services.**
   - Compose: remove `job-service`, `job-surrealdb`, `worker-service`, the `job_surreal_data` volume, and the job-service env from `knowledge-api` and `knowledge-orphan-cleanup`.
   - Both `.env.example` files: remove every `JOB_*`, `WORKER_*`, `KNOWLEDGE_JOB_SERVICE_*`, and `KNOWLEDGE_WORKER_CALLBACK_TOKEN`.
   - Delete `services/job-service/` and `services/worker-service/`, including the committed `__pycache__` folders.
   - Delete `api/internal_jobs.py`, `infrastructure/job_service.py`, the `job_client` lifespan wiring and settings (`job_service_url`, `job_service_owner_token`, `worker_callback_token`), and their tests (`test_internal_jobs.py`, `test_job_service.py`).
   - Delete the missing-job audit in `application/orphan_cleanup.py` (`JobLookup`, `_cleanup_documents_without_jobs`) and its wiring in `app/orphan_cleanup.py`, because phase 1 makes a document without a job impossible. Keep the source-object orphan cleanup and its tests.

   *Done when this search returns nothing outside `plans/`, `db/migrations/`, and `migrate_central_jobs.py`:*
   ```
   rg -i "job-service|worker-service|job_service|job_client|JOB_OWNER_TOKENS|WORKER_JOB_TOKEN|callback_token"
   ```

4. **Docs.**
   - Write `docs/architecture/background-jobs.md` from the README's "Architecture rules".
   - Rewrite `services/ai-service/docs/WORKER.md` and the job sections of `PDF_UPLOAD_TO_OUTPUT_FLOW.md`, `KNOWLEDGE_WORKFLOW.md`, and `knowledge/README.md` to describe the service-owned flow.
   - Add `Superseded by service-owned-jobs/README.md.` as the first line of `INDEPENDENT_WORKER_SERVICE_PLAN.md`, `SHARED_JOB_QUEUE_PLAN.md`, `EXTENSIBLE_JOB_ROUTING_PLAN.md`, and `GENERIC_KNOWLEDGE_JOB_CREATION_PLAN.md`.

   *Done when every doc above describes the current flow without mentioning job-service or worker-service except as history.*

## Phase complete when

- All four steps' checks pass, the test suites are green, and `docker compose up` (fresh volumes) runs upload → OCR → review end to end.
- The README's phase 1–3 behaviour holds: the public API, the ID formats, and the admin-web are unchanged.
