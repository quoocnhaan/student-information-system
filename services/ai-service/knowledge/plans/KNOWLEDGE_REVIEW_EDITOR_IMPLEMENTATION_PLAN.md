# Knowledge review editor implementation plan

## Objective

Implement the human-review stage for completed OCR jobs. The completed-job page
must render the source PDF, let a reviewer edit detected metadata and per-page
OCR text, preview the OCR as rendered Markdown, and persist review-draft edits.

Complete all four outcomes:

1. The source PDF renders inside the production admin container.
2. Every detected metadata value is editable and persisted.
3. Every OCR page is editable and persisted in `reviewed_text` while
   `raw_text` remains immutable.
4. The OCR pane has accessible **Edit Markdown** and **Preview** tabs.

Saving a draft does not confirm, index, or publish the document. Those workflow
transitions are outside this plan.

## Known facts

- `GET /v1/documents/{document_id}/source` is healthy. A full request returns
  `200 application/pdf`; a range request returns `206` with valid range headers.
- The production build contains the hashed PDF.js `.mjs` worker, but Nginx
  serves it as `application/octet-stream`. Chrome rejects the module worker,
  which produces the current `Unable to render the source PDF` error.
- Detected metadata is stored on the `document` record.
- OCR pages are stored inside the related `ocr_draft` record.
- `ocr_draft.pages[].reviewed_text` already exists in the schema, but the API
  has no review write operation and the UI is read-only.
- OCR output contains Markdown, LaTeX-style math, and some HTML tables. Preview
  handling must account for all three without permitting executable HTML.

## Execution steps

### 1. Lock down the PDF failure, then fix the production MIME type

Add a production-image regression check that opens an existing completed review
page through Nginx and fails when either condition is true:

- The PDF.js worker response is not a JavaScript MIME type.
- The review page contains `Unable to render the source PDF` or has no rendered
  PDF page canvas.

Update `apps/admin-web/nginx.conf` so `.mjs` assets are served as
`application/javascript` or `text/javascript`. Preserve the MIME types of all
other static assets and retain byte-range proxying for the source PDF.

Keep **Open original PDF** as a fallback. Pass the real `react-pdf` load error
to a safe diagnostic log and show **Retry** plus **Open original PDF** in the
inline error state.

Completion: through the built Nginx container, the worker has a JavaScript MIME
type, the source request still returns a valid `206`, a PDF canvas appears, and
the inline render error is absent.

### 2. Add a revision to the persisted review draft

In `db/schema.surql`, add `ocr_draft.revision` as an integer with default `1`
and an assertion that it is at least `1`. Backfill existing draft records before
code relies on the field.

Expose the revision in the OCR draft portion of
`GET /v1/documents/{document_id}/result`.

Update the domain and response models. Keep `raw_text` server-owned and
immutable.

Write schema and result-contract tests before changing implementation behavior.

Completion: existing drafts read with revision `1`, new drafts start at
revision `1`, and the result endpoint returns the revision without changing its
existing fields.

### 3. Add the review-draft save contract

Add:

```text
PATCH /v1/documents/{document_id}/review-draft
```

The request contains:

- `expected_revision`: the revision last read by the reviewer.
- `metadata`: the complete editable metadata form.
- `pages`: only pages whose reviewed Markdown changed.

Do not accept document IDs, draft IDs, `raw_text`, draft status, or document
process status in the body.

Validate requests with bounded Pydantic models. Reuse the existing `Cohort`,
`ProgramScope`, and enum invariants. Add explicit maximum lengths for metadata
strings and reviewed page text. Require unique positive page numbers and reject
page numbers that are not present in the draft. An empty `reviewed_text` is
valid because a reviewer may intentionally clear a page.

Return the refreshed full document result after a successful save. Use these
status meanings:

| Status | Meaning |
| --- | --- |
| `200` | Metadata and changed pages were saved. |
| `404` | The document or its OCR draft does not exist. |
| `409` | The document/draft is not editable or the revision is stale. |
| `422` | Metadata or page input is invalid. |
| `503` | Persistence is unavailable. |

Write API tests for every status before implementing the route.

Completion: the route contract is covered by tests, invalid input cannot reach
persistence, and a successful response has the same shape as the GET result
with a newer revision.

### 4. Persist metadata and reviewed pages atomically

Add a focused method in `src/app/infrastructure/surreal.py`, such as
`update_document_review(...)`. It must:

1. Resolve the OCR draft from the URL document; never trust a client-provided
   draft identity.
2. Require `document.process_status = 'review'` and
   `ocr_draft.status = 'draft'`.
3. Guard the write with `ocr_draft.revision = expected_revision`.
4. Merge changed `reviewed_text` by page number.
5. Preserve all `raw_text` and every omitted page.
6. Update document metadata and OCR reviewed text in one transaction.
7. Increment the revision exactly once when the transaction succeeds.
8. Change neither record when validation, the revision guard, or either write
   fails.

Return a distinct conflict outcome so the API can map it to `409` without
treating an expected concurrency conflict as infrastructure failure.

Test valid updates, partial page updates, an intentionally empty reviewed page,
unknown/duplicate pages, stale revisions, non-editable records, raw-text
preservation, and rollback.

Completion: every persistence branch above has an automated test and a stale
writer cannot overwrite a newer review.

### 5. Add frontend contracts and one shared review state

Extend the Zod result contract with `ocr_draft.revision`. Add a typed request
contract and `knowledgeClient.saveDocumentReviewDraft(...)`.

Create `DocumentReviewWorkspace.tsx` as the owner of:

- The baseline server result and revision.
- Editable metadata.
- Editable OCR Markdown keyed by page number.
- Current page and selected OCR tab.
- Dirty metadata and dirty-page tracking.
- Save state: idle, saving, saved, error, or conflict.

Render it from `IngestionPage.tsx` after the completed result loads. Child
components receive controlled values and callbacks; metadata and OCR components
must not maintain separate server snapshots.

Initialize each page editor with:

```text
reviewed_text ?? raw_text
```

Preserve unsaved edits while moving between pages. After a successful save,
replace the baseline with the returned result and clear dirty flags. Warn before
browser navigation or reload when unsaved edits exist.

Completion: component tests demonstrate that page navigation does not discard
edits, save requests use the current revision, and successful saves adopt the
returned revision.

### 6. Replace detected metadata display with an editor

Replace or refactor `MetadataPanel.tsx` into controlled form fields:

| Field | Control |
| --- | --- |
| Title | Text input |
| Document type | Text input; do not invent a closed taxonomy |
| Document number | Text input |
| Language | Text input with validation hint |
| Description | Textarea |
| Cohort | From-year and optional to-year number inputs |
| Programme scope | Scope select and programme list for `specific_programs` |

Pre-fill controls with detected values. Use the heading **Detected metadata -
review and correct**. Show validation next to the responsible field. Normalize
empty optional form values to `null` before saving.

Completion: all metadata displayed by the current page can be edited, invalid
cohort/scope combinations are explained inline, and saved values survive a page
reload.

### 7. Add the per-page Markdown editor and safe preview

Keep the source PDF on the left. Add two tabs to the OCR pane on the right:

- **Edit Markdown**: a controlled textarea editing the current page value.
- **Preview**: renders the current textarea value, including unsaved changes.

Use `react-markdown`, `remark-gfm`, `remark-math`, and `rehype-katex`. Existing
OCR contains HTML tables, so parse raw HTML only through this strict pipeline:

1. `rehype-raw` parses the OCR HTML.
2. `rehype-sanitize` applies a narrow allowlist for basic formatting and table
   elements (`table`, sections, rows, cells, `br`, and safe span attributes).
3. `rehype-katex` renders math after untrusted HTML has been sanitized.

Strip scripts, event handlers, inline styles, unsafe protocols, iframes, and
other active content. Never call `dangerouslySetInnerHTML`. Override image
rendering so OCR references such as `image_1.png` show a non-fetching placeholder
until the system has an explicit extracted-image endpoint.

Implement WAI-ARIA tab behavior: `tablist`, `tab`, and `tabpanel` roles;
`aria-selected`; keyboard Left/Right/Home/End navigation; visible focus; and a
stable tab selection while changing pages.

Completion: tests show headings, GFM tables, allowed OCR HTML tables, and math
render correctly from unsaved text, while scripts, handlers, unsafe links, and
remote image requests cannot execute.

### 8. Add a single save workflow

Add one **Save review draft** action for both metadata and changed OCR pages.

- Disable it when the form is clean or a save is active.
- Show `Saving...` and then a non-intrusive saved state.
- Keep all local edits after network or validation failure.
- On `409`, explain that a newer review exists and offer **Reload latest
  version**. Never overwrite automatically.
- On reload-latest, require confirmation when local edits would be discarded.
- Do not change the draft to `confirmed`.

Completion: tests cover clean, dirty, saving, success, server error, validation
error, and revision-conflict states; a failed save never clears local edits.

### 9. Verify the complete flow and update documentation

Run the existing backend test suite and the frontend test, lint, typecheck, and
production-build commands. Rebuild the API and admin images before the final
browser check so cached containers cannot hide missing changes.

The production browser check must:

1. Open a completed OCR job.
2. Render the source PDF.
3. Edit at least one metadata field.
4. Edit OCR Markdown on two different pages.
5. Preview a heading, a table, and math.
6. Save once.
7. Reload and verify all edits persist.
8. Verify the original `raw_text` values did not change.

After verification, update `services/ai-service/docs/PDF_UPLOAD_TO_OUTPUT_FLOW.md`
with the review-draft save branch and endpoint.

Completion: all automated checks pass, the production browser flow passes, the
documentation matches the implemented behavior, and no debug instrumentation or
temporary artifacts remain.

## API reference

### Result shape addition

```json
{
  "document_id": "document:doc_...",
  "metadata": {},
  "ocr_draft": {
    "id": "ocr_draft:ocr_job_...",
    "status": "draft",
    "revision": 1,
    "pages": [
      {
        "page": 1,
        "raw_text": "Original OCR",
        "reviewed_text": null
      }
    ]
  }
}
```

### Save request example

```json
{
  "expected_revision": 1,
  "metadata": {
    "title": "Corrected title",
    "document_type": "regulation",
    "document_number": "274/2006/QD-TTg",
    "description": null,
    "cohort": {
      "from_year": 2023,
      "to_year": null
    },
    "program_scope": {
      "type": "all",
      "programs": []
    },
    "language": "vi"
  },
  "pages": [
    {
      "page": 1,
      "reviewed_text": "# Corrected Markdown"
    }
  ]
}
```

## File map

Backend:

- `db/schema.surql`
- `src/app/domain/document.py`
- `src/app/api/v1/schemas/documents.py`
- `src/app/api/v1/documents.py`
- `src/app/infrastructure/surreal.py`
- `tests/api/test_document_review.py`
- `tests/infrastructure/test_schema.py`
- A focused infrastructure test for review updates

Frontend:

- `apps/admin-web/nginx.conf`
- `apps/admin-web/package.json`
- `apps/admin-web/src/features/knowledge/api/contracts.ts`
- `apps/admin-web/src/features/knowledge/api/knowledgeClient.ts`
- `apps/admin-web/src/features/knowledge/pages/IngestionPage.tsx`
- `apps/admin-web/src/features/knowledge/components/DocumentReviewWorkspace.tsx`
- `apps/admin-web/src/features/knowledge/components/MetadataPanel.tsx` or
  `MetadataEditor.tsx`
- `apps/admin-web/src/features/knowledge/components/PdfComparisonWorkspace.tsx`
- `apps/admin-web/src/features/knowledge/components/OcrMarkdownEditor.tsx`
- `apps/admin-web/src/styles/global.css`
- Focused API, state, editor, preview-security, and production-browser tests

## Final acceptance gate

Implementation is complete only when every statement is true:

- The source PDF renders inline through production Nginx.
- The worker is served with a JavaScript MIME type and source range requests
  still return correct PDF headers.
- Every detected metadata field is editable and persists after reload.
- Every OCR page is editable; reviewed text persists after reload.
- `raw_text` remains unchanged after every review save.
- Edit and Preview tabs work by mouse and keyboard.
- Preview renders current unsaved Markdown, math, GFM tables, and sanitized OCR
  HTML tables without active content.
- One atomic save covers metadata and changed pages.
- A stale revision produces a visible conflict and cannot overwrite newer data.
- Backend tests, frontend tests, lint, typecheck, production build, and the
  production browser flow all pass.

