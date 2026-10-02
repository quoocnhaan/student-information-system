Superseded by service-owned-jobs/README.md.

# Generic Knowledge job creation plan

## Objective

Allow Knowledge producers to create different central job types, including future
embedding and indexing jobs, through one `JobServiceClient.create` method. Keep
the current PDF upload creating an `ocr_pdf` job with the same response and
retry behavior. This plan prepares the creation seam; it does not implement
embedding or indexing processors.

## Current behavior and constraints

- `app.infrastructure.job_service.JobServiceClient.create(document_id)` sends
  `owner=knowledge`, `type=ocr_pdf`, and uses `document_id` for both `subject_id`
  and `creation_key`. The PDF upload endpoint is its only current caller.
- The Job Service authenticates the owner and accepts only `(owner, type)` pairs
  in `JOB_REGISTERED_TYPES`. Its unique key is `(owner, creation_key)`, not
  `(owner, type, creation_key)`. Reusing a document ID as the creation key for
  another type returns a conflict.
- `JobServiceClient.verify` checks for `ocr_pdf` because the existing internal
  source, result, and failure callbacks perform OCR-specific document actions.
  The public job-status adapter also has an OCR-specific response shape.
- `orphan_cleanup.py` looks up pending OCR creation using the bare document ID.
  Existing OCR creation keys must retain that form unless the cleanup and
  migration behavior are changed together.

## Target contract

Expose an explicit creation method, for example:

```python
async def create(
    self, *, job_type: str, subject_id: str, creation_key: str
) -> dict: ...
```

The adapter always supplies `owner="knowledge"`; the producer supplies the
job type, subject, and stable creation key. Avoid a default job type so a new
producer must choose one deliberately. Pass the values through to the central
Job Service without silently rewriting them.

Use `job_type="ocr_pdf"`, `subject_id=document_id`, and
`creation_key=document_id` for the existing PDF upload. Future producers must
choose distinct, stable keys for each operation and subject, such as
`embed:<document-id>:<revision>` and `index:<document-id>:<revision>`, within
the Job Service's 128-character `[A-Za-z0-9_.:-]` key constraint. If a producer
uses a revision, it must define where that revision comes from and how retries
recover the same value. Do not use a random key on each retry.

## Implementation steps

1. Change `JobServiceClient.create` in
   `services/ai-service/knowledge/src/app/infrastructure/job_service.py` to the
   explicit keyword-only contract. Keep the existing HTTP error translation.
   Keep the owner fixed to Knowledge because the configured bearer token is
   the Knowledge owner's token.
2. Update `POST /v1/documents` in `app/api/v1/documents.py` to pass the three
   OCR values explicitly. Update its test fake and assertions in
   `tests/api/test_documents.py`. Preserve the current document ID creation
   key so retries and orphan cleanup continue to find OCR jobs.
3. Add a focused HTTP-adapter test that captures the outgoing JSON for an OCR
   creation and one different job type. Assert that owner is Knowledge, each
   supplied type and subject is forwarded, and a distinct creation key is
   forwarded unchanged. Test that a central-service error still becomes
   `JobServiceError`.
4. Keep OCR-specific claim verification in place. If adding another worker
   callback later, give that callback an explicit expected type and validate
   it before it accesses or mutates Knowledge data. Do not relax the current
   OCR check merely to make creation generic.
5. Document the new method contract in the Knowledge service README, including
   the uniqueness scope and retry-safe creation-key rule. Keep the public OCR
   status response unchanged for this change.

## Verification

- Run the Knowledge service tests and confirm PDF upload still returns 202 and
  creates an `ocr_pdf` job with the document ID as its creation key.
- Confirm the adapter test sends a second type and its distinct creation key
  without a code change to `JobServiceClient.create`.
- Confirm OCR callbacks still reject a claim for another job type.
- Review `git diff` for unrelated behavior changes.

## Follow-up for real embedding or indexing jobs

Before submitting a new type in a running deployment, register
`knowledge:<type>` in `JOB_REGISTERED_TYPES`, supply a worker handler and enable
it in `WORKER_ENABLED_HANDLERS`, and define its Knowledge-side producer and
result handling. Add type-appropriate status/API contracts if the UI will show
those jobs. These are separate from making the creation adapter generic.
