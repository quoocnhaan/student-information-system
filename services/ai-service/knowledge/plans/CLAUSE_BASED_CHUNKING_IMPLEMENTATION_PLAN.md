# Complete khoản chunks with hierarchy embeddings

## Contract

Produce one complete chunk per khoản, ending at the next khoản, điều, chương,
or end of document. Keep paragraphs, alphabetic subpoints, and page continuations
inside the khoản, regardless of length.

Store the khoản heading and its body in `text`, preserving list lines and
paragraph breaks. Build `embedding_text` by adding its complete parent headings,
each structural heading occurring once. For example:

```text
Chương I. Student Affairs
Điều 1. Student Records
Khoản 1. Required information

a) Full name
b) Date of birth
c) Student ID
```

This entire example is one embedding input. Its stored text starts at Khoản 1.
Retain original Roman chapter labels in embedding text and normalized integers
in hierarchy metadata. Applicability remains in existing schema fields for WHERE
filtering; retrieval changes and document-scope embeddings are outside this task.

### Fallback assumptions

The conversation did not settle content outside khoản. Use these defaults to
preserve text, and identify them in the implementation handoff:

- An điều without khoản becomes one complete article chunk.
- Introduction before the first khoản becomes an article-level chunk.
- Chapter-only body and unstructured text become complete fallback chunks for
  their structural regions.
- Parent headings with no own body supply context. A heading-only khoản still
  produces a khoản chunk.

## Implementation sequence

Paths are relative to `services/ai-service/knowledge/`. Read the current files
and search callers before editing. Implement the contract through these steps.

### 1. Recognize headings and retain context

In `src/app/application/chunking.py`, parse heading events for Chương with valid
Roman or Arabic numbers, and Điều/Khoản with Arabic numbers. Retain numbered
clauses such as `1. ...` within an article; treat a), b), c) as body lines.
Normalize surrounding whitespace and Markdown wrappers for heading recognition
while preserving content line structure.

Add optional `chapter_heading`, `article_heading`, and `clause_heading` strings
to ChunkHierarchy in `src/app/domain/document.py` and to hierarchy fields in
`db/schema.surql`. They store source headings and become canonical embedding
context. Retain existing *_no and *_title fields; normalize Roman chapter
numbers to integers in chapter_no.

For a bare chapter heading, treat the next nonblank ordinary line as its title,
including across pages. A following structural heading starts its own section.
Preserve a numbered khoản's entire opening line as clause_heading; its prose
remains clause content rather than a separately inferred semantic title.

Completion: fixtures recognize Roman/numeric headings, Markdown wrappers, and
numbered clauses. Domain/schema checks accept new headings and legacy records
with those optional fields absent.

### 2. Accumulate structural blocks

Replace paragraph packing and word slicing in chunk_pages() with an accumulator.
Read pages in numeric order using existing text precedence: reviewed_text,
corrected_text, raw_text.

Flush on heading events. A chapter resets article/clause context; an article
resets clause context; a khoản starts its own block. Append body lines and blank
separators, continue across pages, and flush at end of input. Apply the fallback
rules above to content outside khoản. Heading events are boundaries even if
their numbers/titles equal a previous section's values.

Retain zero-based chunk order. page_start/page_end cover the chunk's own
heading/body, excluding inherited headings. Keep token_count as the existing
whitespace-word statistic for compatibility; document its meaning alongside
its calculation. It is informational and imposes no splitting threshold.

Completion: adjacent khoản remain separate; a >512-word khoản and its page
continuations remain complete; every body line appears in exactly one chunk,
preserving internal paragraph/list structure.

### 3. Share embedding construction with corrections

Update build_embedding_text() to use original heading fields, falling back to
existing number/title reconstruction for legacy records. Assemble context in
Chương → Điều → Khoản order. Include the active heading once, whether text already
contains it or contains only its body. Apply this to article/fallback chunks too.

Review accept_correction() in `src/app/infrastructure/surreal.py`: rebuild
embedding_text through the shared helper and update token_count from accepted
text. Retain the stale-vector/reembed job workflow.

Completion: initial indexing and accepted corrections produce full context
without duplicate heading prefixes. Legacy records still build embedding text.

### 4. Integrate indexing and establish backend capacity

Remove the max_tokens argument from chunk_pages(), update callers in
`src/app/worker/index.py`, and retire chunk_max_tokens from active configuration
and configuration documentation. Keep embedding batch size independent of
structural boundaries. Verify new heading fields survive complete_index_job()
and the schema initializer.

Inspect the configured embedding backend's input capacity and truncation
behavior using actual configuration and a representative long khoản. Send the
complete input. Rejected or unsupported input must surface through the existing
indexing failure path. If full-input embedding cannot be established, report
that limit rather than claiming successful complete-clause embedding.
Model/vector-dimension changes require a separately scoped decision.

Completion: active callers/configuration no longer depend on the splitting
limit. Embedding requests carry full content/context, with atomic index
publication after all vectors succeed. Backend capacity is verified or recorded
as an unresolved deployment check.

### 5. Verify the contract

Replace word-splitting expectations in `tests/application/test_chunking.py`.
Add behavior tests for the completion criteria above and these cases:

- The contract example; adjacent khoản; hierarchy resets; repeated headings.
- >512-word khoản, a), b), c), multiple paragraphs, and page continuations.
- Roman chapters and following-line titles, including page boundaries.
- Article-only, introductory, chapter-only, unstructured, and empty content.
- Text precedence, page sorting/ranges, line preservation, and word counts.
- Index-worker embedding input and persistence of heading metadata.
- Accepted correction/reembedding and embedding failure before index publication.

Run focused affected tests, then the service suite in its configured environment.
Run database integration checks and the actual-backend check when dependencies
are available; report skipped checks explicitly.

Completion: each contract rule and fallback has a behavior assertion; applicable
tests pass and external checks have recorded outcomes. Authoring or revising
this plan changes only the plan document.

## Existing-index handoff

When applying this behavior to already indexed documents, inspect the supported
reindex workflow before proposing a rebuild. New code leaves existing chunks
and vectors unchanged.

confirm_review() deduplicates index_document jobs; complete_index_job() requires
a valid claim and an indexing document. Reconfirming review is therefore not a
reliable rebuild procedure. Use a supported reindex operation if available;
otherwise record a separately scoped follow-up. Preserve the old index until
replacement vectors are ready for atomic publication, and resolve pending
correction references before changing chunk IDs.

Handoff completion: report changed behavior, verification outcomes, fallback
assumptions, backend limits, and whether existing documents need a rebuild.
Executing a rebuild of existing data is a separate task.
