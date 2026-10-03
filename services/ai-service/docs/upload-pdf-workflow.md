# `upload_pdf()` debugger walkthrough

This follows the internal path started by `upload_pdf()` in
`knowledge/src/app/api/v1/documents.py`. It begins at the first executable
line in the function and follows the durable asynchronous work that the
endpoint schedules. Framework plumbing and third-party implementation details
are intentionally abbreviated.

## Request-thread walkthrough

### 1. Read and validate the uploaded bytes

**F10 - `signature = await file.read(5)`**

The uploaded stream is advanced by five bytes. `signature` receives those
bytes; this is a cheap signature check, not a full PDF parse.

**F10 - `if signature != b"%PDF-"`**

The function stops the upload if those first bytes do not identify a PDF. No
object, document record, or job has been created yet.

**F10 - `await file.seek(0)`**

Rewinds the upload stream so the subsequent full read includes the signature
bytes too.

**F10 - `pdf_data = await file.read()` and `size = len(pdf_data)`**

The complete source becomes an in-memory byte string and `size` becomes its
byte length. An empty value is rejected next. The upload-size guard compares
that same length to `settings.max_upload_bytes`, protecting this service's
memory and later worker processing.

### 2. Build the identities and initial document state

**F10 - generate `record_id`, `job_record_id`, `document_id`, and
`object_key`**

Two UUID-derived identifiers are made: `doc_<uuid>` for the document and
`job_<uuid>` for its initial OCR job. The private source location is
`documents/<record_id>/original.pdf`. `document_id` is the public-facing
`document:<record_id>` form.

**F10 - `filename = Path(file.filename or "document.pdf").name`**

Keeps only the final filename component, preventing a supplied path from
becoming part of stored metadata.

**F10 - construct `document`**

Creates the initial database payload:

- `source` records the object key, original filename, and PDF MIME type.
- `process_status` starts as `processing`.
- `llm_correction` is `skipped` when `skip_llm_correction` is true;
  otherwise it is `enabled`.
- `status` starts as `active`.

### 3. Store the source PDF

**F10 - `await object_store.put_pdf(object_key, BytesIO(pdf_data), size)`**

The byte string is wrapped as a readable in-memory stream and passed to the
application's object-store adapter. A storage error stops here; the database
has not been changed.

**F11 - `MinioObjectStore.put_pdf()`**
in `knowledge/src/app/infrastructure/minio.py`

Purpose: write the validated PDF to the configured private MinIO bucket.

- Inputs: `object_key`, a stream positioned at the beginning, and the exact
  byte `length`.
- Work: it moves the blocking MinIO SDK `put_object` call to a worker thread,
  supplying the configured bucket and `application/pdf` content type.
- Side effect: creates the source object at the generated key.
- Output: `None` on success; wraps an SDK failure as `ObjectStoreError`.

Execution returns to `upload_pdf()`, which converts `ObjectStoreError` into
the endpoint's storage-unavailable failure. The object is deliberately not
removed if the *next* database step has an ambiguous failure; the code relies
on conservative orphan cleanup to reconcile that case.

### 4. Atomically create the document and OCR job

**F10 - `job = await database.create_document_with_job(...)`**

Passes the generated document record ID, initial `document` payload, and job
record ID to SurrealDB. The returned `job` is the durable queued-job row.

**F11 - `SurrealDatabase.create_document_with_job()`**
in `knowledge/src/app/infrastructure/surreal.py`

Purpose: create the source document and its first `ocr_pdf` job as one
transaction.

- Inputs: validated `doc_...` ID, document mapping, and validated `job_...`
  ID.
- First it calls `get_job(job_record_id)` to make retries idempotent.

  **F11 - `SurrealDatabase.get_job()`** in the same file

  It normalizes the job ID, verifies its `job_...` shape, selects the job row
  from SurrealDB, and returns that mapping or `None`. Execution returns to
  `create_document_with_job()`.

- If that ID already exists for this document, it returns the existing job.
  If it belongs to another document, it raises `SurrealDatabaseError`.
- Otherwise, one SurrealDB transaction creates:
  - `document:<record_id>` with the supplied initial mapping; and
  - `job:<job_record_id>` with `type: 'ocr_pdf'`, `status: 'queued'`,
    `step: 'queued'`, `progress: 0`, `processed_pages: 0`, and `sequence: 1`.
- After a successful commit it calls `get_job()` again and returns that row.
  If the query response itself failed, it retries discovery: first by the
  known job ID and then by the document plus `dedupe_key: 'ocr_pdf'`. This
  prevents an ambiguous response from creating a duplicate job.
- Side effects: a durable source-document record and durable queued OCR job
  exist together, or neither does.

Execution returns to `upload_pdf()` with `job`. A database failure leaves the
already-stored source object in place for reconciliation rather than deleting
it on an uncertain cross-store outcome.

### 5. Schedule broker publication after the response work

**F10 - look up `request.app.state.publisher`**

At application startup, `lifespan()` in `knowledge/src/app/main.py` creates a
`JobPublisher`, starts its connection/replay loop, and stores it here when
SurrealDB is enabled. If no publisher is installed, the durable queued job
still exists but this request does not attempt immediate broker publication.

**F10 - `background_tasks.add_task(publisher.publish, job)`**

Registers `JobPublisher.publish(job)` to run after the response work. It is
not executed on this request's current call stack. Because the job is already
durable, `JobPublisher.replay()` can later republish queued rows after a
broker connection or process recovery.

**F10 - construct and return `DocumentUploadAcceptedResponse(...)`**

Returns the `document:<record_id>` and the durable job ID. The PDF processing
continues independently.

## Background publication and worker dispatch

### 6. Publish the queued OCR job

**F11 - `JobPublisher.publish()`**
in `knowledge/src/app/jobs/publisher.py`

Purpose: route one durable job record to its RabbitMQ workload queue.

- Input: the `job` mapping returned by `create_document_with_job()`.
- If the publisher is not connected, it logs and returns without changing the
  database row. The replay loop can try it later.
- It opens a broker channel, then steps into `declare_topology(channel)`.

  **F11 - `declare_topology()`** in the same file

  Declares the durable `jobs.v1` direct exchange, dead-letter exchange and
  queue, and each durable workload queue from `JOB_QUEUES`. Each workload
  queue is bound to its routing key and configured to dead-letter failed
  deliveries. It returns the main exchange to `publish()`.

- `JOB_QUEUES` in `knowledge/src/app/jobs/routes.py` maps `ocr_pdf` to `ocr`.
  `publish()` creates an `Envelope(1, 'ocr_pdf', '<job id>')` and steps into
  `Envelope.encode()`.

  **F11 - `Envelope.encode()`** in `knowledge/src/app/jobs/routes.py`

  It validates the envelope version, recognized job type, and full job-ID
  format; serializes only `version`, `type`, and `job_id` as a small JSON byte
  payload; and returns it. It has no storage side effect.

- The publisher sends that persistent message to RabbitMQ with routing key
  `ocr`, then closes the temporary channel. Execution ends for this background
  task.

### 7. Consume, validate, and claim the message

The `on_message()` callback inside `run()` in
`knowledge/src/app/worker/__main__.py` receives the broker message on
`jobs.ocr`.

**F11 - `Envelope.decode()`** in `knowledge/src/app/jobs/routes.py`

It verifies the bounded JSON payload has exactly the required fields and
reuses `Envelope.encode()` validation. It returns an `Envelope`; malformed or
misrouted messages are rejected by `on_message()`.

**F10 - `registry.get(envelope)`**

`Registry.get()` in `knowledge/src/app/worker/core.py` selects the registered
`OcrPdfHandler` for `(type='ocr_pdf', version=1)` and returns it.

**F10 - `next_job = await execute(envelope, handler, database, message)`**

This transfers control to the claim-before-ACK worker core.

**F11 - `execute()`** in `knowledge/src/app/worker/core.py`

Purpose: ensure a worker owns the queued job before it processes it.

- It generates a unique `claim_id` and calls `database.claim_job(...)`.

  **F11 - `SurrealDatabase.claim_job()`** in
  `knowledge/src/app/infrastructure/surreal.py`

  It conditionally changes only a matching queued job of the expected type to
  `status: 'running'`, `step: 'claimed'`, `progress: 5`, records `claim_id`,
  and increments `sequence`. It retries transaction conflicts with a short
  backoff. It returns the claimed job mapping, or `None` when another worker
  owns or completed it. Execution returns to `execute()`.

- If claiming throws, `execute()` negatively acknowledges the message for
  requeue. If nothing was claimed, it acknowledges the message because it is
  already handled elsewhere.
- For a successful claim it acknowledges the broker message, then calls
  `handler.process(...)`, which is `OcrPdfHandler.process()`.
- If OCR processing raises, it calls the handler's optional `on_failure` when
  present; `OcrPdfHandler` has none, so it steps into `database.fail_job()`.

  **F11 - `SurrealDatabase.fail_job()`** in
  `knowledge/src/app/infrastructure/surreal.py`

  After verifying that this claim owns a running job, one transaction changes
  the document from `processing` to `failed` and the job to `failed`,
  `step: 'failed'`, `progress: 100`, stores a truncated error, and increments
  `sequence`. It handles a repeat/ambiguous outcome by re-reading the job.
  Execution returns to `execute()`, which finishes without reprocessing the
  acknowledged message.

## OCR processing path

### 8. Load and revalidate the stored source

**F11 - `OcrPdfHandler.process()`**
in `knowledge/src/app/worker/ocr.py`

Purpose: turn the stored PDF into page OCR text, track progress, and persist a
review draft.

**F10 - derive `record_id` from `claimed['document_id']`**

Uses the durable document reference from the claimed job to recover the
`doc_...` key.

**F10 - `document = await self.database.get_document(record_id)`**

**F11 - `SurrealDatabase.get_document()`** in
`knowledge/src/app/infrastructure/surreal.py`

Selects and returns the source document mapping from SurrealDB, or `None` if
it was removed. Execution returns to `OcrPdfHandler.process()`; missing
metadata causes the failure path described above.

**F10 - `size = await self.objects.get_size(object_key)`**

**F11 - `MinioObjectStore.get_size()`** in
`knowledge/src/app/infrastructure/minio.py`

Uses MinIO's metadata operation in a worker thread, returns the stored byte
size as an integer, and wraps SDK failures as `ObjectStoreError`. It returns to
the OCR handler, which repeats the configured upload-limit check before
reading bytes.

**F10 - `data = await self.objects.get_bytes(object_key)`**

**F11 - `MinioObjectStore.get_bytes()`** in
`knowledge/src/app/infrastructure/minio.py`

Opens the private MinIO object in a worker thread, reads all bytes, always
closes/releases the SDK response, and returns the bytes. The handler checks
the downloaded length against `max_upload_bytes` again. This protects against
storage-side changes after the request-time validation.

### 9. Render pages and call OCR

**F10 - `count = await to_thread.run_sync(lambda: _page_count(data))`**

The handler uses a worker thread for PDFium work.

**F11 - `_page_count()`** in `knowledge/src/app/worker/ocr.py`

Opens the PDF bytes with `pypdfium2.PdfDocument` and returns its page count.
PDFium is the external renderer; renderer failures become `ValueError`. Back
in `process()`, counts outside `1..settings.ocr_max_pages` take the failure
path.

**F10 - first `database.job_progress(...)` call**

Marks the running job as `step: 'ocr'`, `progress: 10`, with `total_pages`
known and zero processed pages.

**F11 - `SurrealDatabase.job_progress()`** in
`knowledge/src/app/infrastructure/surreal.py`

It verifies allowed fields, rereads the job with `get_job()`, and accepts an
update only when the same claim still owns a running job and neither progress
nor processed-page count would go backwards. It conditionally updates the
specified fields and increments `sequence`, returning the updated row or
`None`. Every later OCR/correction progress call follows this same guarded
path and returns to its handler.

**F10 - each loop iteration: render the page**

`_render(data, index)` is run in a worker thread.

**F11 - `_render()`** in `knowledge/src/app/worker/ocr.py`

It reopens the PDF with PDFium, obtains the indexed page, selects a scale of
at most 200 DPI and no more than 1540 pixels on the longest side, renders it,
and returns PNG bytes. A page-render failure becomes `ValueError` and reaches
`execute()`'s `fail_job()` path.

**F10 - `text = await self._extract_page(client, image)`**

**F11 - `OcrPdfHandler._extract_page()`** in
`knowledge/src/app/worker/ocr.py`

It base64-encodes the PNG into an image-data URL, builds a deterministic
vision-chat request using `settings.lmstudio_ocr_model`, and calls the
configured LM Studio `/chat/completions` service through `httpx`, bounded by
`ocr_timeout_seconds`. It extracts and trims the returned message content;
empty/malformed responses, HTTP failures, and timeouts become a
`RuntimeError`. It returns the page's OCR text to `process()`.

**F10 - append `OcrPage(...)` and update progress**

Adds `{page: index + 1, raw_text: text}` to `pages`, then uses
`job_progress()` to move from 10 toward 85 while incrementing
`processed_pages`. After the loop, another guarded update sets
`step: 'saving_draft'`, `progress: 92`, and all pages processed.

### 10. Detect metadata and commit the OCR result

**F10 - choose `metadata`**

When `llm_correction` was explicitly skipped, the handler immediately derives
deterministic metadata from raw OCR. Otherwise it passes `{}` here because
metadata is derived after the optional correction job.

**F11 - `DocumentMetadataDetector.detect()`**
in `knowledge/src/app/application/document_metadata.py` (skipped-correction
branch only)

Purpose: produce reviewable metadata using deterministic filename/text rules.

- It joins the `OcrPage.raw_text` values, normalizes for matching, and steps
  into `_page_one_title_block(pages)` to collect nonblank first-page heading
  lines until a document-body marker.
- It steps into `_detect_title(pages, original_filename)`: returns the first
  substantive first-page OCR line, or a cleaned filename stem, or `Untitled
  document`.
- It steps into `_detect_document_type(normalized)`: finds the first configured
  keyword rule or returns `other`.
- It steps into `_detect_language(normalized)`: recognizes Vietnamese
  diacritics, then selected English words, otherwise returns `unknown`.
- It optionally calls `_detect_cohort(title_block)` for a valid year/range and
  `_detect_program_scope(title_block)` for the configured language-major rules.

It returns only supported fields (`title`, `document_type`, `language`, and
possible document number/cohort/program scope) to `OcrPdfHandler.process()`;
it does not write storage or the database.

**F10 - `draft_id = f"ocr_{job_id...}"`**

Derives a stable OCR-draft record key from the job. Replays therefore target
the same draft rather than manufacture another one.

**F10 - `await self.database.apply_ocr_result(...)`**

Passes the document key, stable draft key, serialized pages, any metadata, and
the active job/claim ownership pair.

**F11 - `SurrealDatabase.apply_ocr_result()`** in
`knowledge/src/app/infrastructure/surreal.py`

Purpose: persist the immutable first OCR draft and advance all related state
atomically.

- It validates ID/claim combinations and checks whether `ocr_draft:<draft id>`
  already exists. For an existing draft it calls `get_job(job_id)` to verify
  that this claim already completed; then it returns the existing draft ID.
- For a new draft it calls `get_document(document_record_id)` to verify the
  source document and read its `llm_correction` setting.
- In one transaction it creates the draft (`status: 'draft'`, `revision: 1`,
  `pages`, and correction status), updates the document page count, completes
  the OCR job (`step: 'completed'`, `progress: 100`), and increments its
  sequence.
- If correction was skipped, the draft gets `correction_status: 'skipped'`,
  supplied deterministic metadata is merged into the document, and
  `process_status` becomes `review`.
- If correction is enabled, the draft gets `correction_status: 'pending'`, the
  document remains `processing`, and the transaction creates a queued
  `correct_ocr` job. Its ID is saved as the OCR job's `next_job_id`.
- An ambiguous transaction response is resolved by checking for the stable
  draft; it never overwrites an existing draft.

It returns the draft ID to `OcrPdfHandler.process()`.

**F10 - read the completed OCR job and return its next job, if any**

`get_job(job_id)` reads the completed OCR row. When it contains `next_job_id`,
the handler reads and returns that correction-job row; otherwise it returns
`None`. This returns to `execute()`, then to `on_message()`. The callback
steps over `if next_job is not None` and, when present, calls
`publisher.publish(next_job)`, repeating the publication path above with
`type='correct_ocr'` and routing key `correct`.

## Optional correction path

### 11. Correct OCR text and finish in review

The correct-queue worker dispatches through the same `Envelope.decode()`,
`Registry.get()`, `execute()`, `claim_job()`, and `JobPublisher.publish()`
flow. The selected handler is `CorrectOcrHandler` in
`knowledge/src/app/worker/correct.py`.

**F11 - `CorrectOcrHandler.process()`**

**F10/F11 - `document, draft = await self._load(claimed)` / `_load()`**

`_load()` derives the document key from the claimed job and calls
`database.get_document_result(record_id)`. That database method calls
`get_document(record_id)`, then selects the newest `ocr_draft` for that
document, returning `(document, draft)` or `None`. `_load()` rejects a missing
draft and returns both mappings to `process()`.

**F10 - copy draft pages and iterate them**

For every page, the handler steps into `correct_text(raw_text, settings)`.

**F11 - `correct_text()`** in `knowledge/src/app/application/correction.py`

Purpose: conservatively correct OCR errors without changing document meaning.

- Empty text returns `None` immediately.
- It posts a system prompt and the page text to LM Studio's chat-completions
  endpoint using `lmstudio_chat_model`, with a zero-temperature request and
  configured timeout. A transport error gets one retry.
- It returns `None` if the service output is not text, is empty, or falls
  outside 80-120% of the input length. Otherwise it returns trimmed corrected
  text. An internally created `httpx` client is closed before return.

Back in `CorrectOcrHandler.process()`, that return value is assigned to
`page['corrected_text']` (possibly `None`), then `job_progress()` records
`step: 'correcting'`, the incremented page count, and progress from 10 toward
90.

**F10/F11 - `metadata = self._metadata(pages, filename)` / `_metadata()`**

`_metadata()` builds `OcrPage` inputs using `corrected_text` when available,
otherwise raw OCR, then calls `DocumentMetadataDetector.detect()` described
above. It returns the metadata mapping to `process()`.

**F10 - `saved = await self.database.complete_correction_job(...)`**

**F11 - `SurrealDatabase.complete_correction_job()`** in
`knowledge/src/app/infrastructure/surreal.py`

It first uses `get_job()` to verify the running `correct_ocr` claim and obtain
the document reference. One transaction then updates the pending draft pages,
sets `correction_status: 'completed'` plus model/prompt-version provenance,
merges detected metadata into the document and sets `process_status: 'review'`,
and completes the correction job at progress 100. It returns the saved job, or
`None` if ownership/state is no longer valid. `process()` raises if it receives
`None`, letting `execute()` invoke the failure handler.

**F11 - `CorrectOcrHandler.on_failure()`** (only if correction processing
raises)

It reloads the document/draft, detects metadata from *raw* OCR with
`DocumentMetadataDetector.detect()`, then calls `database.fail_correction_job(...)`.

**F11 - `SurrealDatabase.fail_correction_job()`** in
`knowledge/src/app/infrastructure/surreal.py`

After ownership checks, one transaction marks the draft correction as
`failed`, retains the raw pages, merges the fallback metadata, advances the
document to `process_status: 'review'`, and marks the correction job failed at
progress 100 with its error. Thus optional correction failure still leaves the
raw OCR draft available for human review.

## End-to-end presentation summary

1. `upload_pdf()` checks the PDF signature, rejects empty/oversized data, and
   creates stable document, job, and object identifiers.
2. `MinioObjectStore.put_pdf()` stores the source PDF privately in MinIO.
3. `SurrealDatabase.create_document_with_job()` atomically creates the source
   metadata and a queued `ocr_pdf` job.
4. `JobPublisher.publish()` sends the job to RabbitMQ; replay protects queued
   jobs when the broker is temporarily unavailable.
5. The OCR worker claims the job, rechecks/loads the source, renders each PDF
   page, sends each PNG to LM Studio OCR, and persists guarded progress.
6. `apply_ocr_result()` atomically saves an immutable OCR draft and completes
   the OCR job. Skipping correction reaches `review` immediately; enabling it
   creates a `correct_ocr` job.
7. The correction worker optionally improves page text, derives metadata, and
   commits the document to `review`. If correction fails, raw OCR remains in
   review with the correction marked failed.
8. Failures before a draft is committed make the processing document/job
   failed; the claim and monotonic-progress checks prevent competing workers
   or stale updates from corrupting status.

The upload flow ends at the review-ready OCR draft. Indexing is intentionally
not included: it begins only after the separate `confirm_document()` endpoint
creates an `index_document` job.
