# Indexed document metadata: view and edit

## Objective

On `/knowledge/documents/:documentId`, show the stored document metadata above
the indexed content. Let the user edit it, save it through the API, and see the
saved values after refreshing or returning from the document library.

This file is an implementation plan. Creating it does not authorize application
changes or a Docker rebuild.

For correction storage and route separation, implement this alongside
`DOCUMENT_ENDPOINTS_AND_CORRECTION_JOB_DATA_PLAN.md`. The indexed read endpoint
is `GET /v1/documents/{document_id}`, returning metadata and chunks together.

## Current behavior and relevant files

- `apps/admin-web/src/features/knowledge/pages/IndexedDocumentPage.tsx` fetches
  `/v1/documents/{document_id}/chunks` and renders indexed content and correction
  controls. It does not fetch document metadata.
- `src/app/api/v1/documents.py` exposes `/result` for OCR review only. That endpoint
  returns 409 after indexing and cannot serve as the indexed metadata endpoint.
- `document` stores the metadata directly. Its schema is in `db/schema.surql`;
  `src/app/domain/document.py` defines `Cohort` and `ProgramScope` validation.
- `src/app/api/v1/schemas/documents.py` contains `DocumentMetadataResponse` and
  `ReviewMetadataRequest`. Reuse their field definitions and domain invariants,
  while giving post-index editing its own HTTP contract.
- The frontend `MetadataEditor.tsx` provides the existing fields but labels them
  as an OCR draft and hard-codes programme-scope options. `MetadataPanel.tsx`
  also requires an OCR result and displays nested metadata as JSON.
- `DocumentReviewWorkspace.tsx` contains metadata normalization that can be
  extracted into a shared helper when introducing the indexed editor.
- Embeddings are built from chunk hierarchy and text in
  `src/app/application/chunking.py` and `src/app/worker/index.py`. Document metadata
  is not part of the current embedding input.

Paths without the `apps/` prefix are relative to the Knowledge service root.
Read the current files before implementing; preserve unrelated working changes.

## Required behavior

The detail page initially displays a read-only metadata panel with an **Edit
metadata** button. Show these editable fields:

| Field | Display and editing behavior |
| --- | --- |
| Title | Text; use the filename as the page-heading fallback when unset |
| Document type | Text using the existing free-text model |
| Document number | Text |
| Description | Multiline text |
| Language | Text using the existing language length constraint |
| Cohort | Start year and optional end year; render a readable range |
| Programme scope | API-provided scope options; programmes required for `specific_programs` |

Show original filename, page count, upload date, last update, and process status
as read-only information from the API. Use “Not set” for absent editable values.
Render programme scope and programme names in readable text rather than raw JSON.

Editing offers **Save metadata** and **Cancel**. Cancel restores the saved values.
Successful saving returns to read mode and shows a success message. Failed saving
retains the user's input. Disable duplicate submissions while saving and disable
Save when unchanged or locally invalid. Show validation errors near the fields.

All stored values, document information, and business option values must come from
endpoints, following `AGENTS.md`. Local state holds the user's unsaved draft;
static labels and presentation text can remain in the frontend.

## 1. Add metadata API contracts

In `src/app/api/v1/schemas/documents.py`, introduce an indexed detail response:

- `document_id`, `process_status`, `source` using safe `SourceSummary` fields,
  nullable `page_count`, `created_at`, `updated_at`, and `metadata`.
- An opaque `version` string for optimistic concurrency. Use the database's
  exact string representation of `document.updated_at`; do not round-trip it
  through a Python datetime that could lose database timestamp precision.
- `pages`, reusing indexed page/chunk contracts and their safe correction state.
  Keep a separate metadata-save response for the saved header/metadata/version
  so saving does not require returning all chunks.

Introduce an update request containing `expected_version` and the complete
editable `metadata` object. Use full replacement semantics for the seven editable
fields: explicit null clears a field; every editable field is included by the
client. Reject unknown fields, including attempts to change source, lifecycle,
timestamps, embedding model, or identity. Apply the existing length constraints,
cohort year/range checks, and programme-scope invariants. Normalize whitespace-only
optional text to null on the server as well as in the client. Reject an end year
without a start year rather than silently dropping it.

Add these routes in `src/app/api/v1/indexed_documents.py`, with shared metadata
options in `documents.py`, following the companion plan's route registration:

| Route | Contract |
| --- | --- |
| `GET /v1/documents/{document_id}` | Return metadata, safe document information, and page-grouped chunks for an indexed document |
| `PUT /v1/documents/{document_id}/metadata` | Validate and conditionally replace editable metadata; return saved metadata/header and new version |
| `GET /v1/documents/metadata-options` | Return allowed programme-scope values generated from `ProgramScopeType` |

Use existing generated-document ID validation. Return 404 for malformed/missing
documents, 409 for a document that is not indexed or a stale version, 422 for
invalid input, and 503 for database unavailability. Distinguish stale-version and
wrong-state conflicts in the response detail so the UI can explain the next step.
Use `/draft` for OCR reads, replacing `/result` as specified in the companion
plan; keep `/confirm` scoped to the existing OCR workflow.

Completion: response schemas expose no object-store keys or credentials, and the
options endpoint provides the values required by the editor.

## 2. Persist edits atomically

Add metadata read and update methods to `src/app/infrastructure/surreal.py`.
Project the version directly with `type::string(updated_at)` in the database.
Use parameter-bound metadata values and a typed document ID. The update must
compare both `process_status = 'indexed'` and the exact version string in its
database predicate, then return the committed record. A read-then-unconditional
write is insufficient: two simultaneous editors must not overwrite each other.

Explicitly update only the editable fields. Verify SurrealDB clearing semantics
for optional strings and nested objects against the real database; use NONE where
the schema requires absence. Preserve `created_at`, source, process status, page
count, OCR drafts, immutable index inputs, jobs, chunks, and vectors. Let the
existing schema update `updated_at`. Map an unsuccessful conditional write to a
missing-document or state/version conflict using a fresh read, without retrying
the write with an unverified newer version.

Metadata-only changes do not enqueue OCR, correction, or embedding jobs. The
library query already reads metadata from `document`, so title searches and
type/language options should reflect edits on the next API read.

Completion: real-database tests prove atomic conflict handling, nullable-field
clearing, and durable edits without changing indexed content. This design uses
the existing schema and requires no volume reset or new compatibility layer.

## 3. Add frontend client and reusable metadata fields

In `apps/admin-web/src/features/knowledge/api/contracts.ts` and `knowledgeClient.ts`,
add Zod response/request contracts and methods for metadata reads, updates, and
options. Encode document IDs and support abort signals for reads. Keep HTTP
status information available through `KnowledgeError`.

Extract the existing editor's field rendering and normalization into reusable
pieces. Give the indexed editor neutral headings such as “Document metadata”;
keep the OCR-review wrapper's existing draft wording. Feed programme-scope option
values from the options endpoint into shared fields and adapt OCR review to use
the same source. Preserve a stored option in the draft while options load and
block saving if required options cannot be loaded. Do not substitute a hard-coded
business option list on request failure.

Completion: both metadata editing contexts use the same field invariants and
endpoint-supplied option values, with appropriate headings for each context.

## 4. Integrate the indexed detail panel

Add an indexed metadata panel/workspace to `IndexedDocumentPage.tsx`, above the
chunk list. Fetch combined indexed detail on entry and load editor options from
their endpoint. Show useful loading, unavailable, and retry states; preserve
already loaded content on refresh failure. Initialize metadata and chunks from
the detail response and update the page heading from its title or filename.

Keep saved metadata/version separate from the editable draft. The existing
1.5-second chunk polling must not reinitialize or overwrite unsaved metadata.
Ignore aborted/stale read responses when navigating between documents. Reset
document-specific drafts and messages when the route ID changes.

On success, use the update response as the new saved baseline and version. On
409, keep the draft and explain that the stored document changed; offer **Reload
latest metadata** with explicit confirmation before discarding dirty input. An
uncertain network result must not trigger an automatic overwrite: reload the
stored metadata/version and let the user resolve differences. Warn on browser
reload/tab close while dirty and protect internal navigation away from the edit
session using a mechanism compatible with the current React Router setup.

Completion: the user can view, edit, save, cancel, and resolve stale edits without
interfering with chunk correction progress.

## 5. Verify and document

Add focused API, real-SurrealDB, client, and UI tests covering:

- All metadata fields and safe read-only information are returned and displayed.
- Successful edits persist after reload and appear in library searches/options.
- Clearing optional fields, invalid lengths, invalid cohort ranges, invalid scope,
  and attempts to change server-owned fields behave as specified.
- Competing saves with one version allow only one commit; missing/wrong-state
  documents and database errors receive the specified HTTP responses.
- Save/cancel, disabled duplicate saves, retained drafts on failure/conflict,
  retry/reload, and navigation between document IDs work correctly.
- Chunk polling during editing preserves the draft; metadata saving leaves chunk
  contents/vectors and correction behavior unchanged.
- OCR review remains functional after shared editor changes.

Use distinct Python test filenames across test directories to avoid pytest module
collisions. Use the existing isolated-database test pattern; never reset local
application volumes for these tests. Run the relevant backend tests, frontend
tests, type checking, lint, and production build. Update Knowledge README endpoint
and workflow documentation with the final read/edit behavior.

If a local Docker rebuild is requested at implementation time, validate the shared
Compose configuration and rebuild only the affected API/frontend services from
the repository root with `--env-file .env -f docker-compose.yml`. Verify the page,
metadata read/update endpoints, and persistence after refresh.

## Acceptance criteria

Implementation is complete when an existing indexed document opens with readable
metadata; each editable field can be saved or cleared and remains correct after
refresh; concurrent editing is protected; library searches and filters use the
new stored values; every UI business value comes from an endpoint; chunk viewing,
correction, and OCR review still work; and all required checks pass.
