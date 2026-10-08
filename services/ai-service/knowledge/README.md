# Knowledge API

Knowledge owns source PDFs, document metadata, OCR drafts, and background jobs in one SurrealDB. The API publishes job IDs into the `knowledge` RabbitMQ vhost; worker processes run from the same image and access Knowledge's database and MinIO directly.

## Run locally

Configure the repository-root `.env` using the root `.env.example`, then run
`docker compose --env-file .env -f docker-compose.yml up -d --build`
from the repository root.
All applications and services share these two root environment files.
Run direct Python commands from the repository root so the settings loader
reads the shared `.env`; set `PYTHONPATH=services/ai-service/knowledge/src` when
the Knowledge package is not installed in your Python environment.
Knowledge is served at `http://localhost:8006` and the review UI at
`http://localhost:5173`. SurrealDB is internal to Docker at
`ws://surrealdb:8000`; no host port is published. The OCR worker calls LM Studio
on the host at port 1234 by default. Workers wait for API health before startup
recovery so the fresh schema is initialized first.

All services are defined directly in the repository-root `docker-compose.yml`; there is no
standalone Knowledge Compose file. To start only Knowledge and its dependencies,
use the same root command with the service names `knowledge-api
knowledge-worker-ocr knowledge-worker-correct knowledge-worker-index admin-web`.

For the API workflow, see [Knowledge upload to OCR](../docs/upload-pdf-workflow.md). For the shared architecture rules, see [background jobs](../../../docs/architecture/background-jobs.md). LM Studio must serve OCR, chat-correction, and 768-dimensional embedding models configured in `.env`.

## Job flow

PDF upload stores the source object, then creates the document and `ocr_pdf` job in one SurrealDB transaction. It publishes `{version, type, job_id}` after commit. The worker claims the job before acknowledging the message. OCR detects metadata from raw pages, then atomically saves the draft and opens manual review. OCR creates no follow-up job. The reviewer keeps metadata, text edits, and page choices locally, then confirms once. That transaction persists final metadata and an immutable temporary `index_input`; `index_document` reads only that selected-page input, chunks it by legal structure, embeds it, and atomically replaces chunks while deleting the input and OCR draft. Failed indexing retains both temporary records for retry. Indexed documents support automatic single-chunk `correct_chunks` requests and optional `reembed_chunk` children. Correct captures one chunk, applies valid output atomically, then queues zero or one embedding child. `followup_job_ids` reports that child; a completed correction means text is durable, while indexing completes after its child succeeds. Failed children retain corrected text and the previous searchable vector as `stale`; Correct again is the explicit refresh request. Raw OCR can affect detected metadata and chunk boundaries. Manual review repairs document structure before confirmation; later chunk correction does not re-chunk.

API flow: `POST /v1/documents` → `GET /v1/jobs/{id}` → `GET /v1/documents/{id}/result` → `POST /v1/documents/{id}/confirm` (revision, final metadata, text edits, selected original page numbers) → `GET /v1/documents/{id}/chunks` → `POST /v1/documents/{id}/corrections`. Correction callers poll or subscribe to the returned job and track the optional `followup_job_ids` child. The correction body is exactly `{ "chunk_id": "chunk:chunk_<32 hexadecimal characters>" }`; batch requests are rejected. Fresh installations apply `db/schema.surql` directly. See the local reset procedure below for this breaking workflow change.

If indexing fails, retry the same retained confirmation input with `POST /v1/jobs/{job_id}/retry`. The action only requeues a failed `index_document` job whose `index_input` remains present; it never accepts replacement browser content.

Jobs persist lifecycle, identity, ownership, and orchestration in the envelope. A required immutable `payload` carries type-specific input:

| Type | Payload |
| --- | --- |
| `ocr_pdf` | `{}` |
| `index_document` | `index_input_id`, `confirmation_fingerprint` |
| `correct_chunks` | `chunk_id`, `correction_input_id` |
| `reembed_chunk` | `chunk_id`, `embedding_text`, `embedding_version` |

Payloads reject unknown fields and invalid inputs at creation and before processing. References are stored as typed records inside a flexible object. Public REST/WebSocket statuses expose `step`, integer `progress`, update `version`, and mandatory `followup_job_ids`, never input payloads, ownership, or page counters. Running progress stays below 100 and cannot decrease within an attempt; completion sets 100, failure retains progress, and manual index retry resets it to zero while preserving the payload.

Each job starts at `version = 1`. Lifecycle updates increment this counter;
progress writes compare the version they read to fence concurrent updates.
WebSocket events and the admin UI accept only newer versions of the same job;
selecting another job resets the comparison. This counter is independent of
RabbitMQ envelope and handler protocol versions, which remain unchanged.
Each successful claim sets a fresh UUID hex `attempt_id`; an obsolete attempt
cannot update, complete, or fail the job after it has been retried and reclaimed.
Manual index retry preserves the job ID, increments its version, and clears
`attempt_id`, `worker_id`, and `worker_run_id` before the next claim.

New job types must be mapped in `app.jobs.routes.JOB_QUEUES` and registered in the worker pool for their queue. Queues represent workload profiles; worker replicas provide throughput.

## Fresh schema and local development reset

This workflow uses a fresh schema. `db/migrations/` is historical reference only;
API startup applies the schema directly (`app.infrastructure.initialize_schema` is
also available as an explicit initializer), and no migration runner,
central-job copy, or legacy recovery command is shipped. The current ownership
recovery described below remains part of startup.

The job schema refactor requires a fresh local database. Applying the schema to
an existing database does not rename or remove its old field definitions. The
local stack cutover requires an explicitly authorized Knowledge reset;
restart the API, all Knowledge workers, and admin-web together after that reset.
Do not run the new contract against the previous database. A shared or production
rollout requires a separate data-preserving plan.

Reset execution requires an explicit request to erase the local Knowledge stack.
It erases local PDFs, chunks, vectors, OCR drafts, jobs, and queued messages together.
The previously inspected local project was `knowledge`, with
`knowledge_surreal_data`, `knowledge_minio_data`, and `knowledge_rabbitmq_data`.
Resolve the actual project and inspect volume labels and consumers again before
a reset. The commands below retain that historical project name; use them only
if inspection confirms it owns the stack being reset. A new shared stack defaults
to project `deploy`; changing the project name selects different containers and
volumes rather than migrating existing data.

Run from the repository root in PowerShell, after reset authorization. Target
only Knowledge services and their verified volumes: a project-wide
`down --volumes` now also removes unrelated services' MySQL data.
Keep credentials, bind mounts, production, and shared resources outside the reset.

```powershell
$composeArgs = @('--env-file', '.env', '-p', 'knowledge', '-f', 'docker-compose.yml', '--profile', 'maintenance')
$knowledgeServices = @('surrealdb', 'minio', 'minio-init', 'rabbitmq', 'rabbitmq-init', 'knowledge-api', 'knowledge-worker-ocr', 'knowledge-worker-correct', 'knowledge-worker-index', 'knowledge-orphan-cleanup', 'admin-web')
$normalServices = $knowledgeServices | Where-Object { $_ -ne 'knowledge-orphan-cleanup' }
# Resolve scope without printing environment secrets.
$config = docker compose @composeArgs config --format json | ConvertFrom-Json
$config.name
$config.volumes.surreal_data.name
$config.volumes.minio_data.name
$config.volumes.rabbitmq_data.name
docker volume inspect knowledge_surreal_data knowledge_minio_data knowledge_rabbitmq_data --format '{{.Name}} {{json .Labels}}'
# Inspect mounts and confirm every target volume has no unrelated consumers.
$containerIds = docker compose @composeArgs ps --all --quiet --orphans=false @knowledgeServices
if ($containerIds) { docker inspect $containerIds --format '{{.Name}} {{json .Mounts}}' }
docker ps -a --filter volume=knowledge_surreal_data --format '{{.Names}}'
docker ps -a --filter volume=knowledge_minio_data --format '{{.Names}}'
docker ps -a --filter volume=knowledge_rabbitmq_data --format '{{.Names}}'
# Stop and verify only Knowledge; preserve other services and MySQL volumes.
docker compose @composeArgs stop @knowledgeServices
if (docker compose @composeArgs ps --quiet --status running --orphans=false @knowledgeServices) { throw 'Knowledge containers still running' }
# rm --volumes removes container-owned anonymous volumes, such as /logs.
docker compose @composeArgs rm --force --volumes @knowledgeServices
docker volume rm knowledge_surreal_data knowledge_minio_data knowledge_rabbitmq_data
# Rebuild/start normal Knowledge services, not the maintenance cleanup job.
docker compose @composeArgs build @normalServices
docker compose @composeArgs up -d @normalServices
docker compose @composeArgs ps --all --orphans=false @knowledgeServices
docker compose @composeArgs logs --tail 100 surrealdb minio-init rabbitmq-init knowledge-api knowledge-worker-ocr knowledge-worker-correct knowledge-worker-index
docker compose @composeArgs exec -T knowledge-api python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/v1/health').status); print(urllib.request.urlopen('http://localhost:8000/v1/ready').status)"
```

Confirm the schema initialized, both initializers exited successfully, and
API/workers/admin are running. Do not substitute global volume pruning.

## Indexed operation contracts

Every chunk from `GET /v1/documents/{id}/chunks` has nullable `correction`:
`{input_id, outcome, job, children, chunk_child_ids}`. `job` and `children` use the
REST job status contract; `children` contains zero or one re-embedding job and
`chunk_child_ids` selects children belonging to that chunk. Errors are bounded to
500 characters. Captured base/proposed text is private to the worker audit record.
`outcome` is `pending`, `applied`, `unchanged`, or `failed`. Jobs always include
`followup_job_ids`, including an empty array. It is the sole field for subsequent
jobs; OCR completes with no children, and correction persists zero or one child.

Correction completion commits text and creates the optional child atomically.
Changed text and unchanged text with a stale vector both require embedding work.
The selected request is indexed only when its child completes. Reload and polling
recover active correction, active indexing, no-op, and terminal failure states.
A stale vector with no active work invites an explicit Correct action. Failure keeps
the previous vector searchable. Chunk locks, captured embedding versions, hierarchy,
document membership, and running claims fence concurrent or superseded work.

## Deadlines and manual retry

Configure timeout durations in the repository-root `.env` (copy the root `.env.example`).
Docker Compose forwards these settings to each worker. All durations are positive seconds;
recreate affected containers after changing configuration. Direct Python workers read the same
`KNOWLEDGE_*` environment variables through `app.config.Settings`.

| Environment setting | Default | Bounds |
| --- | ---: | --- |
| `KNOWLEDGE_DATABASE_TIMEOUT_SECONDS` | 30 | Each database request, connection step, and connection cleanup |
| `KNOWLEDGE_INDEX_COMMIT_TIMEOUT_SECONDS` | 120 | The entire index transaction request |
| `KNOWLEDGE_OCR_TIMEOUT_SECONDS` | 60 | One OCR model request, including elapsed time |
| `KNOWLEDGE_CORRECTION_TIMEOUT_SECONDS` | 120 | One correction model request, including elapsed time |
| `KNOWLEDGE_EMBEDDING_TIMEOUT_SECONDS` | 120 | One embedding model request, including elapsed time |
| `KNOWLEDGE_OCR_PROCESSING_TIMEOUT_SECONDS` | 7200 | A complete OCR job |
| `KNOWLEDGE_CORRECTION_PROCESSING_TIMEOUT_SECONDS` | 14400 | A complete chunk correction job |
| `KNOWLEDGE_INDEX_PROCESSING_TIMEOUT_SECONDS` | 3600 | A complete indexing/reembedding job |
| `KNOWLEDGE_FAILURE_TIMEOUT_SECONDS` | 60 | Fresh-connection reconciliation and failure persistence |
| `KNOWLEDGE_STARTUP_RECOVERY_TIMEOUT_SECONDS` | 120 | The complete startup recovery pass |

For example, set `KNOWLEDGE_INDEX_COMMIT_TIMEOUT_SECONDS=45` to bound the index commit
request at 45 seconds. Processing deadlines should allow all pages/batches plus commit time.
After a processing timeout, connection cleanup and failure persistence have their own bounds;
the durable failed status can therefore appear later than the processing deadline.

Workers acknowledge after claiming and do not automatically retry model requests or failed
processing. Pre-claim database/broker delivery failures may NACK with `requeue=True` because
no processing attempt has started. Queued-job replay delivers already authorized work;
OCR completes directly into manual review. Timeout and recovery paths publish
zero messages. Only clicking **Retry indexing** in the admin UI or explicitly calling
`POST /v1/jobs/{job_id}/retry` changes an eligible failed index job back to queued. Retry
requires the original confirmed input, clears old ownership, and uses a new claim on delivery.
Other job types do not gain manual retry in this change.

Each processing delivery owns a separate database connection. A fault or timeout discards
that connection and reconciles through a fresh connection: completed claims remain completed,
running matching claims become failed, and obsolete claims leave current records untouched.
Failure transactions preserve the source PDF, index input/draft, and existing committed index;
Chunk correction fails its pending snapshot and releases its lock, and
reembedding preserves the existing vector. Database transaction results are checked for every
statement, including errors hidden behind transaction-aborted results. Commit logs include job,
attempt ID, chunk count, and duration without document contents or vectors. Clients receive bounded
safe failure messages.

## Worker identity and startup recovery

Compose defaults to `knowledge-ocr-1`, `knowledge-correct-1`, and `knowledge-index-1`.
Override these with `KNOWLEDGE_OCR_WORKER_ID`, `KNOWLEDGE_CORRECT_WORKER_ID`, and
`KNOWLEDGE_INDEX_WORKER_ID`. Direct workers require `KNOWLEDGE_WORKER_ID`. Every additional
replica needs its own stable identity; do not scale a Compose worker service using one shared
identity. Exactly one live process may use an identity. Stop and verify termination of the
predecessor before starting its replacement; overlapping rolling replacement is unsupported.
A fresh `worker_run_id` identifies each process startup; a unique `attempt_id`
identifies each successful claim.

Before broker connection or consumer registration, one bounded recovery pass fails only this
identity's running jobs from previous runs, fencing ownership and claim inside the transaction.
Queued jobs, other replicas, terminal jobs, remain untouched. Ordinary
operation has no database heartbeat, lease renewal, periodic watchdog, or recurring recovery scan.
WebSocket ping traffic is independent of worker recovery and does not write job heartbeats.

Recovery or failure persistence outages prevent consumption or make the process exit unsuccessfully.
Compose's `restart: unless-stopped` can then retry startup bookkeeping when the database returns.
A failed-state write during recovery never reexecutes processing. Durable failure requires a
reachable database. If a crashed worker never restarts, its rows remain running until an operator
starts its replacement.

Elapsed deadlines require a responsive event loop. Total process freezes require an external
supervisor/liveness system that terminates and replaces the frozen process, or an operator restart.
Docker's unhealthy status alone does not restart a container, and `restart: unless-stopped`
only restarts exited processes.

## Validation evidence

The job schema refactor was verified on 2026-10-06: all 123 Knowledge tests
passed, including database-backed tests against an isolated in-memory SurrealDB
3.2.4 server with fresh schemas. Coverage includes simultaneous claims, stale
attempts and progress versions, manual retry, startup recovery, durable children,
lost commit replies, and REST/WebSocket contracts. All 29 admin-web tests passed;
typecheck, lint, and production build passed. The frontend ordering tests passed
again after a test-only lint fix. Nonblocking output included a Starlette test
client deprecation, React Router future flags, and Vite's bundle-size warning.
The temporary test container was removed. Existing Docker volumes were preserved
during implementation.
Historical plans, migrations, and `CLEANUP_REPORT.md` retain their original terms.

The local cutover completed on 2026-10-06 after explicit reset authorization.
The inspected Compose project was `student-information-system`; only
`deploy_surreal_data`, `deploy_minio_data`, and `deploy_rabbitmq_data` were reset.
The API, all three workers, RabbitMQ initializer, and admin-web were rebuilt;
both initializers exited successfully, health/readiness and the admin UI returned
200, and each Knowledge processing queue had one consumer with zero messages.
The fresh database exposes the new job fields and contains no prior documents or
jobs. All eight unrelated containers retained their IDs and startup times, and
their MySQL volumes were preserved.

Regression tests run against an isolated SurrealDB 3.2.4 instance and use valid 768-dimensional
chunk vectors. They inject hanging commits and committed-but-unanswered responses, verify checked
statement errors, failure effects, ownership recovery, and manual retry/stale-claim races. The
installed SDK's `query()` checks only its first statement result; the adapter now checks all raw
statement results and keeps the actual cause alongside aborted statements.
The earlier historical stall has not been independently reproduced. Run the service suite with
`KNOWLEDGE_TEST_SURREAL_URL` pointing only to an isolated server; never use the production database.
API unit tests require test `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` values (no object I/O occurs).

The payload/single-chunk cutover was verified locally on 2026-10-04: 120 Knowledge tests passed against isolated SurrealDB 3.2.4; 28 admin-web tests, typecheck, lint, and build passed. The fresh Compose stack returned 200 for health/readiness. An API/storage/worker smoke test exercised upload, raw review, manual page edits/selection, indexing, correction, and its embedding child with deterministic model stubs; test records/source were removed afterward. Live model-backed verification also passed using the configured LM Studio endpoint `http://26.199.216.182:1234/v1`: real OCR, raw review, manual text edits and page selection, real indexing, single-chunk correction, and re-embedding all completed. The live smoke fixture and source PDF were removed. An earlier localhost-only probe checked the wrong address; the configured endpoint was reachable from Docker. Remaining removed-contract references in tests intentionally verify rejection or omission; historical plans/migrations remain reference only.
