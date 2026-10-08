# Knowledge retrieval API

The admin testing page is `http://localhost:5173/knowledge/retrieval`.
Knowledge serves these endpoints at `http://localhost:8006`.
`GET /v1/retrieval/options` supplies implemented modes, defaults, limits,
Knowledge-owned major choices and active indexed document filters.
`GET /v1/documents/metadata-options` supplies scope types and major labels for editors.
This first version supports semantic ranking only; hybrid is not advertised.

## Semantic search

`POST /v1/retrieval/search`:

```json
{
  "query": "What English requirements apply to my cohort?",
  "mode": "semantic",
  "student_context": { "cohort": 2023, "major": "chinese" },
  "limit": 10
}
```

`document_ids` optionally restricts to up to 100 document IDs returned by options.
Omitting this field searches all eligible documents; `[]` restricts to none.
The limit defaults to 10 and is capped at 100; queries have 1–4000 characters
and cannot be whitespace-only. Exact cosine scoring happens after eligibility.
Results include `rank` and `scores.cosine`; these scores are not probabilities.
Incompatible models/task profiles are excluded with a warning. Nomic's task prefixes
are applied consistently to documents and queries. Old unprefixed indexes require
re-indexing for semantic retrieval; no automatic destructive reset is performed.

## Article and clause lookup

`POST /v1/retrieval/lookup`:

```json
{
  "document_number": "QD/2021-01",
  "article": 3,
  "clause": 2,
  "student_context": { "cohort": 2023, "major": "non_language" },
  "page": 1,
  "page_size": 20
}
```

Numbers are trimmed identifier strings; punctuation and case are meaningful.
Article/clause are positive integers. Omit clause to return all article chunks.
Every matching chunk of a clause is returned. Duplicate numbers are never resolved
silently: `groups` reports each matching document and total count. Optional
`document_id` selects a specific version. Results order by document ID, page start,
chunk index and chunk ID. Pages start at 1; page size defaults to 20, maximum 100.

## Exact text lookup

`POST /v1/retrieval/exact`:

```json
{
  "query": "Điều 3.",
  "case_sensitive": false,
  "student_context": { "cohort": 2023, "major": "english" },
  "page": 1,
  "page_size": 20
}
```

Optional `document_ids` works as in semantic search. Case-insensitive matching is
the default and uses Unicode casefold. Accents, punctuation and whitespace are
preserved; regex/wildcards are literal. Every occurrence, including overlaps,
has a zero-based inclusive `start` and exclusive `end` counting Unicode code points
in the original text. Length-changing casefolds such as `Straße` → `strasse` keep
correct original offsets; partial matches inside one folded code point are excluded.
JavaScript highlighting uses `Array.from(text)` before slicing. Matching is confined
to indexed chunk text: cross-chunk phrases and pages omitted at indexing are not
searchable. Pagination counts matching chunks, not occurrences, in the same order
as structured lookup. Structured and exact lookup do not call LM Studio.

## Eligibility and common response

Student context is optional; if provided, both cohort (integer 1900–9999) and
major (`english`, `chinese`, `non_language`) are required. Keys are trimmed and
lowercased; unknown keys are rejected. These are Knowledge applicability values,
with no Academic service dependency. `non_language` is an aggregate group.
Parent documents must always be active and indexed. Context combines inclusive
document cohort bounds with major scope. A null end year is ongoing, and no cohort
field means unrestricted years. Scope `all` matches any supported choice,
`non_language_major` matches only `non_language`, and `specific_programs` requires
membership in its English/Chinese list. Missing scope is excluded with context.
Without context, results are explicitly admin exploration. An older-issued document
may apply to a newer cohort; publication year never substitutes for applicability.
Metadata edits affect eligibility immediately without re-embedding.

Responses contain `items`, effective `filters`, `total`, optional `page/page_size`,
document `groups` for lookup, and `warnings`. Semantic `total` is the returned top
result count. Each item exposes `chunk_id`, `text`, `document_id`, title and number,
cohort/scope, hierarchy, page range, chunk index, embedding status, a source URL
using `/v1/documents/{id}/source`, optional rank, named scores and occurrence offsets.
Vectors, storage keys and private job inputs are omitted.
The UI links documents to indexed detail and PDFs to the result's start page.

Invalid input returns 422, successful no-match searches return 200 with `items: []`,
and database/embedding dependency failures return a readable 503. Exact scans use
bounded database batches and an overall configured database deadline; eligible-corpus
size still determines work. Semantic ranking is linear in eligible vectors.
Timeouts return failure rather than partial/truncated matches. Approximate filtered
HNSW and Vietnamese hybrid ranking remain future performance work.

Query syntax was checked against [SurrealDB record links](https://surrealdb.com/docs/reference/query-language/language-primitives/record-links)
and [vector functions](https://surrealdb.com/docs/reference/query-language/functions/database-functions/vector),
and exercised on the repository's SurrealDB 3.2.4 image. Task-prefix behavior follows
the [Nomic model card](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5).
