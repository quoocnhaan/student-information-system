# Obsolete workflow cleanup

The [service README](README.md) defines the current workflow and reset procedure.
The implementation uses a fresh schema and preserves the existing in-progress
automatic-correction, deadline, worker-ownership, and confirmation work.

## Consumer inventory

Repository-wide searches covered runtime code, admin, tests, scripts, schemas,
configuration, and documentation. Historical plans and migration SQL retain old
terms as history and link to the current workflow.

| Removed contract | Writers/readers and disposition |
| --- | --- |
| Accept/reject routes and correction router | `api/v1/documents.py`, `api/v1/router.py`, admin `api/knowledgeClient.ts`; handlers, registration, and client methods removed. OpenAPI and 404 regressions added. |
| `save_suggestion`, `accept_suggestion`, `reject_suggestion`, `finish_chunk_correction` | `infrastructure/surreal.py`, chunk worker failure handler, owned-job and stalled-job integration tests; removed and replaced with atomic application or `fail_claim`. |
| `correction_mode` | Fresh schema, correction request writer, application/reconciliation queries, worker handler/core, REST/WebSocket mapper, job response model, admin Zod, worker tests; removed. Job type and running claim select automatic behavior. |
| `correction_suggestion`, review statuses, public `suggestion` | Schema/indexes, request/application/failure writers, indexed-chunk and worker readers, admin contracts/page, worker/database/frontend tests, schema docs; replaced by `chunk_correction_input`, `pending/applied/unchanged/failed`, and durable public `correction` operations. |
| `job.ocr_draft_id` | Schema, OCR chain creation/completion and index clear writer, REST/WebSocket mapper/model, admin Zod, central-job copy script; removed. OCR worker already looks up drafts through document ID. |
| Persisted `pages.*.reviewed_text` | No current browser-local review writer; obsolete readers in confirmation preparation/validation, chunking, domain/API responses, admin contracts/review workspace, fixtures; removed together. Confirmation `page_edits[].reviewed_text` remains and writes captured `index_input.pages.*.text`. |
| Fresh-schema upgrade statements | Blocked-to-failed conversion, draft revision backfill, obsolete required chunk link removal; removed from bootstrap. Historical migration regression explicitly reads historical SQL. |
| Upgrade-only executable tools | `migrate_central_jobs.py` (central copy and its unit test), `apply_migration.py` (historical allowlist), `worker/recover_legacy.py` (unowned legacy recovery and its regression), and executable README commands; removed. Historical SQL files remain outside startup. |

## Retained contracts

`next_job_id` is written by OCR completion and read by the OCR handler/admin
ingestion hook for its single correction chain. `followup_job_ids` is written by
atomic chunk application, recovered on a fresh connection after lost replies,
published independently, and read by the admin to track all children.

Chunk locks and `last_embedding_job_id` protect queued/running operations.
Captured embedding text/version, hierarchy, document membership, audit ownership,
and job claims fence application and vector replacement. Claims, worker ownership,
sequence, statement checking, deadlines, startup recovery, queued replay, retained
confirmation input/fingerprint, and manual failed-index retry remain active.
OCR review state, revision, raw/corrected pages, local browser edits, and confirmation
request edits remain part of the initial review workflow.

## Verification and reset scope

Verification uses an isolated in-memory SurrealDB **3.2.4**, matching Compose,
mocked correction models, and valid 768-dimensional vectors. It covers atomic
fan-out, unchanged current/stale vectors, duplicate completion/delivery,
concurrent requests, changed/deleted inputs, stale claims, model faults/deadlines,
lost commit replies, independent publication, queued recovery, and failed or
superseded child vectors. Frontend regressions cover durable reload outcomes,
actionable stale vectors, and completion of every selected request child.

The local project/labels/mounts were inspected: `knowledge_surreal_data`,
`knowledge_minio_data`, `knowledge_rabbitmq_data`, plus the SurrealDB container's
anonymous `/logs` volume. The README records the exact procedure and health paths.
No development volume reset, live document correction, or real model call was
performed. Only isolated verification resources are removed after checks.

Final checks: **102 service tests passed**, including real database regressions;
**25 admin tests passed**; admin typecheck, lint, and production build passed;
the service Docker image build and `git diff --check` passed. The service has no
configured Python lint/typecheck script. Existing Starlette/React Router notices
and the Vite bundle-size advisory remain. Temporary test containers and the
verification image were removed; the development stack and its volumes remain.
