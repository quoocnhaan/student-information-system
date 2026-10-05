> Historical workflow reference. The job payload, raw OCR review, progress, and correction contracts are superseded by [JOB_PAYLOAD_AND_SINGLE_CHUNK_CORRECTION_PLAN.md](JOB_PAYLOAD_AND_SINGLE_CHUNK_CORRECTION_PLAN.md).

> Historical plan: workflow/schema compatibility and manual acceptance requirements
> are superseded by [the current workflow](../README.md) and the obsolete workflow cleanup.

# Automatically apply indexed-chunk corrections

## Objective and boundaries

On the indexed-document page, clicking **Correct** or **Correct page** authorizes AI correction, automatic application, and re-embedding. The user does not review or accept a suggestion between these stages.

This changes post-index `correct_chunks` work only. Preserve the initial PDF upload, OCR review, selected-page confirmation, and `index_document` workflow. Preserve configurable deadlines, claim-before-ACK delivery, stable worker ownership, checked database statements, and manual-only retry of failed index jobs described in [STALLED_JOB_FAILURE_MANUAL_RETRY_PLAN.md](STALLED_JOB_FAILURE_MANUAL_RETRY_PLAN.md).

Creating this plan does not implement or deploy changes, alter existing documents, or enqueue jobs.

## Desired behavior

1. User clicks Correct for one chunk or Correct page for that page's displayed chunks.
2. The API atomically records each current chunk's text as the correction input and creates a queued `correct_chunks` job.
3. The correction worker claims the job, ACKs delivery, and obtains validated corrections for all selected chunks.
4. One transaction applies changed text, rebuilds embedding input, marks affected vectors stale, creates the required queued `reembed_chunk` jobs, and completes the correction job.
5. The worker publishes all committed follow-up jobs. Each embedding worker independently claims its job and replaces the vector only if the chunk still matches the version it embedded.
6. The document page refreshes automatically after correction application and as each embedding job finishes.

The document remains indexed throughout. Existing vectors stay available until their replacements commit. A correction job completing means text has been applied; the UI reports indexing complete only when all relevant follow-up jobs have succeeded.

| Outcome | Required behavior |
| --- | --- |
| Valid changed text | Apply automatically and create one embedding job for that chunk. |
| Valid identical text, current vector | Successful no-op; create no embedding job. |
| Empty, malformed, or implausible correction | Fail the correction request before applying text; preserve selected chunks and vectors. |
| A selected chunk changed or disappeared | Fail the whole correction request before applying text; preserve newer data. |
| Correction/model/commit timeout | Reconcile durable state through a fresh connection; preserve a committed result or apply guarded failure effects. |
| Re-embedding fails after text application | Keep corrected text and the previous vector; show indexing failure with stale vector state. |
| User clicks Correct again after embedding failure | Treat it as a newly authorized correction request. If valid text is identical but its vector is stale, create a new embedding job to refresh that text. |

For Correct page, gather and validate every selected correction before committing. Application is atomic across the selected chunks; embedding jobs subsequently succeed or fail independently. No automatic model reattempts, failed-job requeue, rollback of applied text after embedding failure, or expansion of the existing retry endpoint.

## Implementation steps

### 1. Establish the contracts and migration

Read these current implementations before editing:

- `src/app/worker/{correct,index,core,__main__}.py`
- `src/app/application/{correction,chunking}.py`
- `src/app/infrastructure/{surreal,apply_migration}.py`
- `src/app/jobs/publisher.py`, `db/schema.surql`, and existing migrations
- `src/app/api/v1/{documents,jobs}.py` and their schemas
- `apps/admin-web/src/features/knowledge/{api,hooks,pages}`

Keep `POST /v1/documents/{document_id}/corrections` with `{chunk_ids: [...]}` and its `202 {job_id}` response. Keep existing workload queues and job types.

Add durable `followup_job_ids` to completed correction jobs and expose it through REST/WebSocket job contracts and the admin client. Use an empty list for no follow-ups. Keep OCR's singular `next_job_id` behavior; a page correction must not expose just one of its embedding jobs as if it represented the whole request.

Record `correction_mode = 'automatic'` on new correction jobs. Existing jobs without the marker represent the old review flow. Add optional schema fields and an idempotent migration, register its exact name in `apply_migration.py`, and test both fresh and existing schemas. Choose an unused migration filename after inspecting the directory.

Keep `correction_suggestion` records as durable input/audit records: base text, proposed text, chunk ID, parent job, and terminal outcome. New automatic jobs never stop in `ready`: valid changed results become `accepted` during application; unchanged results become `rejected` as the existing no-op audit state.

**Done when:** request/status contracts represent automatic mode and every follow-up ID; repeated migration preserves existing chunks, vectors, and jobs.

### 2. Make request creation and correction application atomic

Strengthen `request_chunk_correction` so its transaction captures current chunk input and verifies membership, indexed document state, and availability. Reject foreign, duplicate, missing, or busy chunks. Serialize competing requests through guarded writes to the affected chunk records; a check outside the transaction or a predicate read alone is insufficient protection from concurrent requests.

A chunk is busy while its correction or re-embedding job is queued/running. Derive this from durable state or store a guarded active-job reference; whichever approach is chosen must remain correct across worker restarts and terminal failures. A ready legacy suggestion may be superseded only by a new explicit Correct request, atomically marked `outdated`, and retained for audit.

Introduce a database operation for applying all results of a claimed correction job. Within one checked transaction:

- Guard the parent job with `status = 'running'`, expected claim, and automatic mode.
- Verify every selected chunk belongs to the document and still matches its captured input. Fence text and relevant embedding-input changes; use a durable version or guarded comparison instead of trusting an earlier read.
- Guard each input/audit record as pending and owned by this parent job.
- Apply changed text, rebuild `embedding_text` using `build_embedding_text`, update `token_count`, and set `embedding_status = 'stale'`. Preserve chunk identity, hierarchy, position, and existing vector.
- Record the proposed text and terminal audit outcomes.
- Create exactly one queued `reembed_chunk` job per changed chunk, or per unchanged chunk whose vector was already stale. Store the resulting IDs on the parent.
- Complete the parent job in the same transaction.

All model I/O occurs before this transaction. Any conflict rolls back all application and child-job creation. Repeated completion of the same committed claim returns its existing follow-ups instead of creating duplicates. A `None`/lost-claim result is an explicit outcome, not successful processing of a still-running job.

**Done when:** concurrent requests serialize safely; a page commits all selected text or none; obsolete claims cannot alter chunks; repeating completion creates no duplicate embedding jobs.

### 3. Connect worker correction to every embedding job

Update `CorrectChunksHandler` to collect validated results and call the atomic application operation. `correct_text` currently returns `None` for unusable output: interpret this as failure for automatic chunk application while preserving the initial OCR correction caller's existing fallback semantics. An unchanged valid string is a successful no-op, not unusable output.

Retain progress updates and elapsed deadlines. Return all durable follow-up job records after successful application. Update worker delivery/result handling to publish a collection of follow-ups while preserving the existing single OCR follow-up. Publish only after durable completion is verified.

An automatic correction-to-embedding publication is an authorized next stage, not a retry. Failed correction, failure persistence, and startup failure recovery publish zero messages. If a commit succeeds but its response is lost, reconcile the completed parent on a fresh connection and recover its stored follow-up IDs before deciding publication. Extend the current generic reconciliation path deliberately: it currently returns `None` even when durable completion is found.

Queued children remain durable if broker publication fails. Preserve queued-job replay on publisher startup/reconnection, verify that every child can be recovered, and log any publication pending delivery. Duplicate envelopes must not rerun completed/running claims or create more children.

Verify `ReembedChunkHandler` completes only the claimed job and replaces a vector only for the same embedding input/version. A superseded embedding job must not clear a newer stale state or report that newer text is indexed. Return/check durable completion instead of relying on a method's silent return.

**Done when:** one Correct click schedules all necessary embeddings, page follow-ups are all published/replayed, and lost responses or obsolete embedding attempts cannot corrupt or duplicate work.

### 4. Preserve failure behavior and legacy compatibility

Use the shared guarded failure policy in `SurrealDatabase.fail_claim` for exceptions, deadlines, and startup recovery. Before automatic application commits, failure marks pending audit records failed and leaves chunk text/vectors unchanged. After application commits, parent completion remains completed; child embedding failures preserve applied text and prior vectors.

Old review-mode correction jobs must not silently apply results under the new semantics. Fail claimed legacy work with a bounded message directing the user to click Correct again, using ordinary guarded bookkeeping; preserve its inputs/audit history. Existing ready suggestions are superseded only through a new explicit correction request as described above.

Retain `/v1/corrections/{suggestion_id}/accept` and `/reject` only for legacy review-mode suggestions for compatibility. Reject these operations for automatic jobs. The new UI never calls them. Document their legacy status and keep their transactional guards; do not introduce a bulk operation that automatically accepts old suggestions.

**Done when:** each failure path preserves the appropriate data, embedding failure is distinguishable from correction failure, and legacy suggestions/jobs cannot be applied accidentally.

### 5. Update the indexed-document page

Remove suggested-text review panels and Accept, Reject, and Accept all controls from the new flow. Keep Correct and Correct page with a short explanation that corrections apply automatically.

Track parent correction and every follow-up ID. `useIngestionJob` currently follows only one `next_job_id` and stops after terminal status; implement explicit multi-job tracking for the indexed-document view without breaking OCR chaining. Refresh corrected text when the parent completes, then refresh vector status as each child completes/fails. Reconnects and page reloads must recover relevant activity from durable API state rather than an in-memory list alone; extend the chunks response with active/failed operation identifiers where required.

Disable conflicting actions while correction/indexing is queued or running. Show Correcting, Updating index, No changes needed, correction failure, and indexing failure with wording matching durable state. A failed child must not display an endless Re-embedding badge. All follow-ups must reach successful outcomes before the UI declares the entire selected request indexed; terminal failures expose a new explicit Correct action when eligible.

**Done when:** one click updates text and vector state without confirmation, multi-chunk progress is accurate, and refresh/reconnection/failed child cases remain usable.

### 6. Validate and document the change

Add meaningful worker/API/database/UI regressions for:

- One valid changed chunk automatically applies and generates one embedding job; unchanged valid text with a current vector generates none.
- Correct page applies all chunks atomically and schedules/tracks every required child.
- Unusable output, HTTP/model failure, deadline, changed/deleted chunk, and stale claim preserve pre-application text and vectors and create no children.
- Correction commit errors cannot be mistaken for success; committed-but-unanswered application retains its exact child IDs with no duplicates.
- Concurrent Correct requests, duplicate deliveries, and repeated completion preserve one authorized operation per chunk.
- Child publication failure/replay, worker restart, and startup failure recovery respect the existing delivery/retry policy.
- Failed or superseded embedding writes preserve the searchable vector and appropriate stale state; a later explicit Correct can refresh a stale vector.
- Legacy queued/pending/ready records and legacy endpoints behave as specified.
- The UI has no confirmation controls, updates text and all child states, displays terminal failures, and recovers activity after reload.

Run database integration tests on an isolated instance matching the deployed SurrealDB version, including an upgraded schema with existing records; then run the relevant service suite and admin tests, typecheck, lint, and build. Remove isolated artifacts.

Update the service README and endpoint documentation to describe automatic application, separate text/vector completion, failure behavior, legacy compatibility, and unchanged initial OCR review. This plan supersedes the manual suggestion-acceptance behavior in `plans/service-owned-jobs/phase-6-post-index-correction.md` for new indexed-chunk corrections.

Prepare deployment instructions covering worker termination before migration, checked migration execution, rebuilt API/workers/admin images, and health verification. Keep deployment and live model calls within the user's authorization; validation must not automatically correct or retry a real document.

**Done when:** targeted regressions and required checks pass, upgraded-schema validation succeeds, and documentation/deployment instructions match the completed implementation.
