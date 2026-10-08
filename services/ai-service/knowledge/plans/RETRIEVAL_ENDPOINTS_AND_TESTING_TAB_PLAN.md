# Retrieval endpoints and testing tab

Status: proposed plan, rewritten for the simple first version. Implementation
begins when the user asks to implement this plan.

## Outcome and scope

Add semantic search, structured article/clause lookup, exact text lookup, and an
admin-web Retrieval tab. Apply document-level cohort and major applicability
filters consistently across all three modes.

Use Knowledge-owned string values for major applicability. This version has no
Academic API dependency, program-ID mapping, catalog synchronization, or local
copy of Academic's major table. Other teams' services remain unchanged.

Use the writing-for-agents skill when editing this implementation plan. Before
implementation, read applicable AGENTS.md files and inspect the working tree;
preserve existing unrelated changes.

## 1. Define the simple applicability model

Keep the existing document fields and chunk-to-document relationship:

- `cohort: { from_year, to_year }`; absent upper bound means ongoing.
- `program_scope: { type, programs }`.
- Scope types: `all`, `non_language_major`, `specific_programs`.
- `programs` contains Knowledge-owned major keys such as `english` and `chinese`.
- Chunks inherit applicability through their existing `document_id`; add no
  chunk-level cohort or major fields.

For this first version, define three student applicability choices:

| Stored student major key | UI label | Meaning |
| --- | --- | --- |
| `english` | English major | English-language major |
| `chinese` | Chinese major | Chinese-language major |
| `non_language` | Non-language major | Aggregate group for other, non-language majors |

The last key is an applicability group, not a new academic major or a specific
program identifier. It keeps this version simple without enumerating other majors
or treating arbitrary strings as non-language. This is the initial scope
assumption; extend the explicit choices if the school needs another language major.

Examples:

```json
{
  "cohort": { "from_year": 2023, "to_year": null },
  "program_scope": { "type": "specific_programs", "programs": ["chinese"] }
}
```

```json
{
  "program_scope": { "type": "non_language_major", "programs": [] }
}
```

Define these allowed values once in the Knowledge domain and expose them through
API metadata options. Validate keys on review confirmation, indexed metadata edits,
and retrieval requests. Trim/lowercase submitted keys before validating; reject
unknown values. `specific_programs` requires a nonempty, deduplicated list of
`english` and/or `chinese`; other scopes require an empty list.

Remove `language_major` from active schema assertions, domain enums, OCR
detection, API options, tests, and documentation. Detect specific applicability
from clear heading statements about English or Chinese majors, resolving to the
simple keys. Keep the non-language rule ahead of language-specific matching;
mentions of an English requirement in body text must not classify the document as
English-major-only. Ambiguous text leaves scope unset for reviewer selection.

Use an API-backed multiselect instead of arbitrary comma-separated program names
in the metadata editor. Options show readable labels but persist the simple keys.
The existing field name `programs` can remain to minimize changes.

Completion: document metadata accepts only the supported scopes and keys, UI
options come from Knowledge endpoints, and no Academic integration remains.

## 2. Define shared eligibility

Accept optional `student_context: { cohort: 2023, major: "chinese" }`.
Require both fields when supplied; cohort is an integer from 1900 to 9999 and
major is one of the three explicit applicability keys.

| Condition | Eligibility |
| --- | --- |
| Always | Parent document is active and indexed |
| Cohort restriction present | Student cohort is within inclusive from/to bounds |
| Document cohort absent | No cohort restriction |
| Scope all | Any supported student major choice |
| Scope non_language_major | Student major is non_language |
| Scope specific_programs | Student major occurs in programs |
| Document scope absent, context supplied | Exclude as unknown applicability |
| Student context omitted | Admin exploration without cohort/major filtering |

Combine cohort and scope conditions with AND. A document issued in 2021 can
remain relevant to a 2023 cohort when its applicability starts in 2021 and has no
end bound. Never use publication year as a cohort proxy.

Centralize this policy so all retrieval paths behave identically. Metadata edits
affect eligibility immediately without re-embedding. Return the effective filters
with results and explain in the UI that context-free searches are admin exploration.

Completion: inclusive cohort boundaries, ongoing applicability, all scope types,
missing metadata, and invalid student context are covered by meaningful tests.

## 3. Implement retrieval endpoints

Inspect current code before editing:

- Knowledge `db/schema.surql` and `src/app/domain/document.py`.
- `src/app/application/document_metadata.py`.
- `src/app/infrastructure/surreal.py` and `src/app/worker/index.py`.
- `src/app/api/v1/router.py` and `src/app/api/v1/schemas/documents.py`.
- Admin-web Knowledge API contracts/client and `MetadataEditor.tsx`.
- Admin-web `src/app/App.tsx` and `router.tsx`.

Add dedicated retrieval contracts, routes, application logic, and database methods.
Use bound query parameters and bounded inputs.

| Endpoint | Required input | Optional input |
| --- | --- | --- |
| POST /v1/retrieval/search | query | mode: semantic or hybrid, student_context, document_ids, limit |
| POST /v1/retrieval/lookup | document_number, article | clause, student_context, document_id discriminator, pagination |
| POST /v1/retrieval/exact | query | case_sensitive, student_context, document_ids, pagination |
| GET /v1/retrieval/options | none | none |

Extend existing metadata-options to expose supported scopes and major keys/labels.
Retrieval options expose supported modes, defaults, limits, and document-filter
choices from persisted indexed documents. Frontend business choices come from APIs.

Shared results expose chunk ID/text, source document ID/title/number, cohort/scope,
hierarchy, page range, chunk index, embedding status, and source link using the
existing document-source endpoint. Omit vectors and private job fields.

Search exposes rank and named score components. Lookup/exact expose ordered matches
and pagination totals. Exact results include occurrence offsets in original text;
define Unicode code-point offsets and convert them correctly in JavaScript.
Reject blank/whitespace-only queries with 422. Successful searches with no matches
return 200 and an empty list. Dependency failures return a clear 503.

### Semantic search and optional hybrid

Extract the embedding HTTP helper from the indexing worker into a reusable
infrastructure module. Preserve indexing behavior and share configured model,
timeout, dimensionality, and finite-number validation. The inspected index uses
768-dimensional cosine embeddings; verify this against the current files.
Check model-specific query/document prefixes before applying them consistently.
Exclude incompatible embedding-model documents or report model mismatch clearly.

Filter eligibility before selecting final top results. Start with exact cosine
ranking over eligible chunks for correctness. Evaluate filtered HNSW against the
deployed SurrealDB version before adopting it; filtering a small global top-k
afterward can lose every relevant student result. Keep a filtered exact fallback
when approximate search cannot supply results, and document performance limits.

Semantic mode is required. Hybrid is optional: add a Vietnamese-appropriate
full-text analyzer/index, then combine keyword and vector ranks with reciprocal
rank fusion. Use identical eligibility filters in both branches, deduplicate by
chunk ID, and break ties deterministically. Verify database syntax against official
documentation for the deployed version and with integration tests. Advertise only
implemented modes in options. Scores are ranking measures, not probabilities.

### Structured lookup

Match trimmed document number as an identifier, preserving meaningful punctuation.
Match integer article and optional clause against existing hierarchy fields.
Omitting clause returns all article chunks; a multi-chunk clause returns every
matching chunk. Order by document, page, and chunk index, with pagination.

Document numbers need not be unique. Group matches by document and allow an
optional document-ID discriminator; never silently choose one document version.

### Exact lookup

Use literal substring matching in indexed `chunk.text`. Default to
case-insensitive matching; allow case-sensitive mode. Preserve accents,
punctuation, and whitespace. Treat regex/wildcard characters as literal input.
Return every occurrence offset in original text and test normalization that changes
string length. Order deterministically and paginate.

State the first-version boundary: phrases spanning separate chunks and pages
omitted during indexing are outside exact lookup's searchable content.

Completion: all three endpoints apply identical eligibility rules, actual database
queries pass integration checks, and structured/exact lookup work without LM Studio.

## 4. Build the Retrieval tab

Add `/knowledge/retrieval` and a Retrieval navigation item in admin-web.
Provide three search modes and their relevant input fields. Show hybrid only if
the API advertises it. Add an optional student-context toggle with cohort and an
API-backed major selector, plus document filters where supported.

Use existing client/Zod/query conventions. Cancel stale requests when switching
modes or submitting another query. Show loading, empty, validation, and dependency
error states. Render scores for semantic search, exact-match highlights for literal
lookup, and document/page/article/clause metadata for all modes. Link results to
indexed document detail and source PDFs.

Use existing sanitized text-rendering conventions; highlighting must not introduce
raw HTML. Keep labels readable, including the grouped Non-language major choice.
The testing UI holds only unsaved input and API response caches, with no browser
storage used as a business-data source.

Completion: reviewers can exercise all modes, compare filtered/unfiltered results,
inspect source passages, and distinguish no matches from request failure.

## 5. Validate and document

Cover these behaviors with meaningful tests:

- Ineligible high-ranking documents cannot crowd out eligible student results.
- 2023 onward includes 2023/later and excludes 2022.
- Older-issued documents remain eligible when their cohort applicability matches.
- English, Chinese, and non-language student choices match each scope correctly.
- Unknown keys, empty specific-program lists, unsupported language_major scope,
  absent scope, and inactive/unindexed documents behave consistently.
- Article/clause boundaries, duplicate document numbers, and multi-chunk clauses.
- Vietnamese literal matches, punctuation, repeated occurrences, case mode,
  pagination, and Unicode highlight offsets.
- Invalid vectors, embedding-model mismatch, dependency errors, and hybrid
  deduplication when hybrid is implemented.
- UI mode switching, student-context validation, API-backed choices, result links,
  highlights, stale requests, and errors.

Run relevant Knowledge tests and admin-web test/typecheck/lint/build scripts.
Use deployed-version SurrealDB integration checks to verify filtering and ranking;
record unavailable checks honestly. Confirm the feature adds no changes to other
teams' services or dependencies on their APIs.

Update Knowledge README, API examples, and
`docs/database/knowledge_schema_config.md` with the simple keys, supported scopes,
cohort behavior, endpoints, exact-match boundaries, and testing page.

Keep Knowledge schema assets in its own `db/` folder. This plan authorizes no
volume deletion. Document schema/reset implications; perform a local reset only
when separately requested. Avoid adding legacy-scope compatibility automatically.

Configure new settings through repository conventions. If Docker files change,
synchronize the root Compose entry and validate with
`docker compose --env-file .env -f docker-compose.yml config --quiet`.

Completion: report delivered modes, verification results, and remaining retrieval
limitations. Application implementation is a separate request.
