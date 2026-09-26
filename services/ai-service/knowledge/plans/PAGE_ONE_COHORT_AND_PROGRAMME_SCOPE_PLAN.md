# Page-one cohort and programme-scope detection plan

## Objective

Populate the existing `cohort` and `program_scope` review fields from the
document's title and applicability text on OCR page 1. For a title/subtitle
such as `Áp dụng đối với sinh viên chương trình Hoa Sen Elite từ khoá 2023 trở
về sau`, detect `cohort = {"from_year": 2023, "to_year": null}`. For `đối với
các ngành không chuyên ngữ`, detect
`program_scope = {"type": "non_language_major", "programs": []}`.

An open-ended phrase such as `trở về sau` does not specify a cohort end year.
Set `to_year` only when the page-one title/applicability text states an explicit
upper bound. All detected values remain editable in the existing review form.

## Current path and constraints

- OCR stores each page as `OcrPage(page, raw_text)`; the worker calls
  `DocumentMetadataDetector.detect(pages, original_filename)` before saving the
  review draft. The domain, API, database schema, and editor already support
  `cohort.from_year`, optional `cohort.to_year`, and
  `program_scope.type = non_language_major`.
- `document_metadata.py` currently scans every page for the first cohort year.
  Its scope rule does not recognize `không chuyên ngữ`, so that phrase falls
  back to `all`; an unrelated `ngôn ngữ` or `ngoại ngữ` mention anywhere in the
  document can instead produce `language_major`. `_detect_title` takes the
  first substantive OCR line, which can be a letterhead rather than the actual
  document heading.
- OCR currently supplies text without page coordinates. The implementation
  must define a conservative, testable title/applicability block using page-one
  lines. If the block or a value cannot be identified confidently, leave that
  value undetected for the reviewer; do not infer it from later pages.

## Execution steps

### 1. Lock the page-one contract with fixtures

Add focused cases in `tests/application/test_document_metadata.py` using the
request's Vietnamese phrases and realistic page-one line order: letterhead,
document number, heading, parenthesized applicability clause, then body text.
Include `khoá`/`khóa` spelling and OCR whitespace or line breaks where useful.
Use a redacted real OCR page-one sample if one is available; otherwise keep the
fixture synthetic and make the title-block boundary explicit in the test.

Assert all of these outcomes:

| Page-one title/applicability text | Cohort | Programme scope |
| --- | --- | --- |
| `Hoa Sen Elite từ khoá 2023 trở về sau` plus `đối với các ngành không chuyên ngữ` | `2023` to `null` | `non_language_major` |
| Explicit cohort range, e.g. `khóa 2023 đến khóa 2025` | `2023` to `2025` | Based on an explicit scope phrase, if present |
| No cohort or scope evidence in the title block | Undetected | Undetected |

Add adversarial cases: a different cohort or scope mentioned only in the
page-one body or on page 2 must not override the title; `không chuyên ngữ`
must never become `language_major`; a bare issue year or document number must
not become a cohort year. Keep the existing document type, number, title, and
language behavior covered by the current test.

Completion: the new tests fail against the current detector for the specific
wrong values, and each expected value is backed by page-one title evidence.

### 2. Extract one page-one title/applicability block

In `src/app/application/document_metadata.py`, isolate a helper that takes the
`OcrPage` with `page == 1` and returns the heading plus attached applicability
lines. Ignore letterhead/document-number lines and stop at the first body
section. Preserve the OCR text used as evidence rather than replacing it with
the filename. If the title block cannot be bounded reliably, return no
title-derived metadata and let review handle the case.

Keep the existing `title` fallback behavior unless a test proves it wrongly
selects the letterhead for the target documents; if so, adjust the title
selection using the same block. Do not make a PDF layout or OCR prompt change
unless the page-one text lacks the required phrases in a representative sample.

Completion: title-derived detection sees only the bounded page-one block, and
tests show body/page-two distractors have no effect.

### 3. Parse cohort bounds and programme scope conservatively

Normalize case, Vietnamese accent variants (`khoá`/`khóa`), Unicode form, and
OCR whitespace for matching while retaining the original OCR text. Recognize
cohort years only when attached to cohort wording such as `khóa`/`khoá`; parse
an explicit start/end range into `from_year`/`to_year`. For `từ khoá 2023 trở
về sau`, use `from_year=2023` and `to_year=None`. Reject reversed ranges and
ambiguous multiple ranges instead of guessing.

Match an explicit `không chuyên ngữ` / `các ngành không chuyên ngữ` qualifier
before any positive language-major rule, so negated wording cannot produce
`language_major`. Use only the bounded page-one title/applicability block for
scope. When that block has no explicit scope, emit no `program_scope` rather
than asserting `all` or `language_major` from unrelated content. Preserve the
existing domain values and validation; no database migration is needed.

Completion: the fixture matrix passes, and unknown or ambiguous values remain
unset in the detector result.

### 4. Preserve unknown values through review and verify the worker path

Check `MetadataEditor.tsx` and `DocumentReviewWorkspace.tsx`: a null
`program_scope` currently displays as `all` in the select. Add an explicit
empty/undetected choice if needed so the UI does not silently turn unknown
scope into `all` on save. Keep the existing manual cohort and scope controls.

Add a focused worker-level test using OCR pages with the target page-one title,
then assert the metadata passed to `update_document_after_ocr` has the expected
cohort and scope. Confirm `GET /v1/documents/{id}/result` exposes those values
and that the review save still accepts them. Use existing fakes or a narrow
integration fixture; no live LM Studio call is required.

Completion: worker output, result response, and review form agree on the two
detected values; an undetected scope remains visibly unknown until reviewed.

## Verification and acceptance

Run the focused metadata and worker tests, then the knowledge-service test
suite. Run the admin-web tests/build if its editor changes. The work is done
when the exact two phrases in the objective produce `from_year=2023`,
`to_year=null`, and `non_language_major` in a completed OCR document, while
body text and later pages cannot supply or override those title-derived
values. No reprocessing of existing documents is implied by this plan; the
new rules apply when OCR jobs run after deployment.
