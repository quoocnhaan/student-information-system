# Clause-based chunking with hierarchy embeddings

## Outcome and scope

Index each complete khoản as one chunk. A khoản starts at its own heading and
ends immediately before the next khoản, điều, chương, or end of document. Its
paragraphs, lettered subpoints, and page continuations stay together at any
length. Store the khoản heading and body in `text`; preserve line breaks and
blank lines. Build `embedding_text` from the complete parent headings followed
by `text`, with each structural heading appearing once.

For example, one chunk stores `text` beginning at `Khoản 1` and embeds the
following complete input:

```text
Chương I. Student Affairs
Điều 1. Student Records
Khoản 1. Required information

a) Full name
b) Date of birth
c) Student ID
```

Keep the source's Roman chapter label in the heading used for embeddings and
its normalized integer in `hierarchy.chapter_no`. Keep applicability in the
existing schema fields for database filtering. Retrieval behavior, document
level embeddings, vector model and dimension changes, and rebuilding existing
indexes are separate work.

### Content outside a khoản

Use these defaults to retain all content. Report them in the implementation
handoff because the original requirement did not specify this content.

- Emit an article chunk for an điều with no khoản and for an article preamble
  before its first khoản. Include its own heading in `text` when present.
- Emit a chapter chunk for a chapter's own body outside articles, and a fallback
  chunk for unstructured text outside chapters or articles.
- A parent heading with no own body supplies context to descendants; a
  heading-only khoản still emits a khoản chunk.

## Implementation steps

Paths below are relative to `services/ai-service/knowledge/`. Read the affected
files and find their callers before changing code. Complete each step before
moving to the next.

### 1. Parse headings and retain source context

In `src/app/application/chunking.py`, recognize chương headings with valid Roman
or Arabic numbers and điều/khoản headings with Arabic numbers. Recognize
numbered khoản lines such as `1. ...` within an article. Treat `a)`, `b)`, and
similar lettered lines as body. Strip surrounding whitespace and Markdown
wrappers only for recognition; preserve the content's line structure in `text`.

Add optional `chapter_heading`, `article_heading`, and `clause_heading` to
`ChunkHierarchy` in `src/app/domain/document.py` and to the `chunk.hierarchy`
fields in `db/schema.surql`. Use these source headings as embedding context;
retain the existing `*_no` and `*_title` fields for compatibility. Normalize
Roman chapter numbers to integers. A bare chapter heading takes the next
nonblank ordinary line as its title, even across a page boundary. A subsequent
structural heading begins a new section instead. Keep a numbered khoản's entire
opening line in `clause_heading`; its prose belongs to that khoản, not to an
inferred semantic title.

Done when heading fixtures cover Roman and Arabic chapters, bare chapter
titles, Markdown wrappers, explicit and numbered khoản, and lettered body
lines; the model and schema accept both new headings and legacy hierarchy
records without them.

### 2. Emit complete structural chunks

Replace paragraph packing and word slicing in `chunk_pages()` with a structural
accumulator. Sort pages numerically and use `reviewed_text`, then
`corrected_text`, then `raw_text`, following the current nonempty-value
precedence. Flush at every heading event and at end of input. A chapter clears
article and khoản context; an article clears khoản context. Repeated headings
still start new blocks. Continue a block across pages until a boundary occurs.
Apply the outside-khoản rules above so every nonblank body line belongs to
exactly one chunk.

Keep `position.chunk_index` zero based. Calculate `page_start` and `page_end`
from each chunk's own heading and body, excluding inherited parent headings.
Keep `token_count` as a whitespace-delimited word count for compatibility; it
is informational and never splits a chunk. Preserve paragraph and list line
breaks in `text`.

Done when adjacent and repeated khoản create distinct chunks, a khoản longer
than 512 words stays whole across pages, all outside-khoản content is retained,
and chunk text, order, page spans, and word counts match the source.

### 3. Use one embedding-text builder

Update `build_embedding_text()` to prefer the new source heading fields and
fall back to number/title reconstruction for legacy records. Assemble context
in chương → điều → khoản order. Include the active heading once whether it is
already at the start of `text` or must be supplied from hierarchy. Use the same
rule for article, chapter, and unstructured fallback chunks.

In `src/app/infrastructure/surreal.py`, update `accept_suggestion()` to rebuild
`embedding_text` with that helper and recalculate `token_count` from the
accepted `text` in the same update. Preserve the existing stale-vector and
reembedding job workflow.

Done when initial indexing and accepted corrections embed the complete context
without duplicate headings, while legacy records still produce embedding
text and accepted corrections update their word count.

### 4. Wire indexing and check embedding capacity

Remove `max_tokens` from `chunk_pages()` and its caller in
`src/app/worker/index.py`. Remove `chunk_max_tokens` from active settings and
active configuration documentation; leave `embedding_batch_size` as the number
of chunks per request. Ensure `complete_index_job()` persists the new hierarchy
fields and the schema initializer accepts them.

Inspect the configured embedding model and server's input limit and truncation
behavior. Send a representative long khoản as a complete input. A rejected or
unsupported input must fail through the existing indexing error path before
index publication. Record an unverified backend limit as an open deployment
check; do not claim complete-clause embeddings until capacity is established.

Done when no active caller or setting imposes a word-splitting limit, complete
embedding inputs reach the backend, all vectors succeed before atomic index
publication, and the backend capacity check has a recorded outcome.

### 5. Verify behavior and hand off

Replace splitting expectations in `tests/application/test_chunking.py` and add
focused behavior coverage for:

- The contract example; adjacent and repeated headings; hierarchy resets.
- A khoản over 512 words with paragraphs, lettered subpoints, and page
  continuations.
- Roman chapters, titles on following lines and pages, Markdown wrappers,
  explicit khoản headings, and numbered khoản lines.
- Article-only, article-preamble, chapter-only, unstructured, heading-only,
  and empty content.
- Text precedence, page ordering and spans, line preservation, and word counts.
- Index worker inputs, persisted heading metadata, accepted correction and
  reembedding, and embedding failure before publication.

Run the affected tests and service suite in the configured environment. Run
database integration and actual-backend checks when their dependencies are
available; name skipped checks and their missing dependencies in the handoff.

Done when each contract rule and fallback has a behavior assertion, applicable
checks pass, and the handoff records changed behavior, fallback assumptions,
backend limits, and remaining checks.

## Existing-index handoff

New code does not change existing chunks or vectors. Before proposing a rebuild,
inspect the supported reindex workflow and pending correction references.
`confirm_review()` deduplicates `index_document` jobs, while
`complete_index_job()` requires a valid claim and an indexing document, so
reconfirming a review is not a reliable rebuild operation. Use a supported
reindex operation if one exists; otherwise record a separately scoped follow-up.
Keep old chunks until replacement vectors are ready for atomic publication and
account for correction references before chunk IDs change. Report whether
existing documents need a rebuild. Executing that rebuild is outside this plan.
