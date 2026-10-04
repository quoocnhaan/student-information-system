# AI Knowledge Storage Options

## Decision

Use **PostgreSQL with pgvector plus S3-compatible object storage** for the
first knowledge-service deployment. Run PostgreSQL and MinIO locally; use a
managed PostgreSQL service and an S3-compatible object store in production
when operating the infrastructure is not desired.

This is the smallest stack that meets the current needs while keeping document
ingestion, OCR, retrieval, and future chat history in one transactional system
of record. Raw PDFs must not be stored as database rows; store them in object
storage and keep only their immutable object key, checksum, media type, and
access metadata in PostgreSQL.

```text
FastAPI knowledge service
  |-- PostgreSQL + pgvector: documents, chunks, embeddings, OCR drafts,
  |                          ingestion jobs, chat sessions/messages
  `-- S3 / MinIO: original PDFs and any derived page images
```

## Suggested ownership

| Need | Store | Notes |
| --- | --- | --- |
| PDF originals and rendered page images | Private S3/MinIO bucket | Address by a generated object key, never a user-provided filename. |
| Document metadata and ingestion state | PostgreSQL | Include owner/tenant, checksum, object key, MIME type, processing status, and timestamps. |
| OCR draft and its review/version state | PostgreSQL | Store draft text in `text`; use `jsonb` for page/block/bounding-box data only when needed. |
| Searchable chunks and embeddings | PostgreSQL + pgvector | A chunk references its document and OCR-draft/version. Add an HNSW index after realistic data exists. |
| Chat history | PostgreSQL | Normalized `chat_sessions` and `chat_messages` tables; keep retrieval citations and model metadata alongside each assistant message. |

The object store should be private. The API can authorize a request and issue a
short-lived download/upload URL instead of proxying every file.

## Why this is the default

PostgreSQL supplies relations and transactions for document status, OCR
versions, vector rows, and chat messages. pgvector adds vector columns and
nearest-neighbor indexing in that same database. Its official documentation
supports HNSW and IVFFlat indexes; HNSW has a better speed/recall trade-off,
while IVFFlat builds faster and uses less memory. Index parameters and recall
must be measured against the actual corpus rather than assumed in advance.

S3 stores arbitrary objects as a bucket plus object and metadata, which fits
PDF originals and image derivatives. MinIO is appropriate for local Docker
development because the application can use the S3 API; production can retain
the same object-store adapter and point it at S3 or another compatible provider.

## Alternative: Qdrant + PostgreSQL + S3/MinIO

Choose this three-service design only when retrieval becomes the clear scaling
or feature driver: very large vector collections, dedicated vector operations,
or a requirement for Qdrant-specific dense, sparse, or multi-vector retrieval.
Qdrant collections contain vectors plus optional JSON payload and support
payload filtering; it persists vectors on disk. It is not a relational source
of truth for chat history, document lifecycle, or OCR revisions, so PostgreSQL
and object storage remain necessary.

This alternative adds operational work and cross-store consistency. Keep
PostgreSQL as the source of truth, use stable chunk UUIDs as Qdrant point IDs,
and make indexing retryable/idempotent. A document delete must delete its
object, relational rows, and vector points through an explicit job/outbox flow;
it cannot be a single cross-database transaction.

## Managed shortcut: Supabase

Supabase is a reasonable managed implementation of the default for a small
team: every project has PostgreSQL, pgvector is available as an extension, and
its Storage service exposes S3-compatible storage with object metadata in
PostgreSQL. It also provides row-level security for database and storage
access. Use the FastAPI service as the privileged server-side client; do not
place a service-role key in a browser application.

Supabase is a deployment choice, not a required application dependency. Keep
the code behind `VectorStore`, `ObjectStore`, and repository interfaces so a
move to self-managed PostgreSQL/MinIO or Qdrant does not alter API contracts.

## Initial operational guardrails

- Require tenant/owner filtering on every document, chunk, and chat query.
- Encrypt object storage and database backups; restrict originals and OCR text
  as student data according to the project's retention policy.
- Store a file checksum and make ingestion idempotent to avoid duplicate PDFs
  and embeddings.
- Treat OCR output as versioned, reviewable data. Do not overwrite a reviewed
  draft when reprocessing a source file.
- Store embedding model name, dimensions, distance metric, and chunking
  version with each index generation so re-embedding is traceable.
- Back up PostgreSQL and object storage together, then test restoration. If
  Qdrant is later adopted, include its collection snapshots in that runbook.

## Sources

- [pgvector README: vector types, HNSW, IVFFlat, query and indexing guidance](https://github.com/pgvector/pgvector/blob/master/README.md)
- [PostgreSQL documentation: JSON types](https://www.postgresql.org/docs/current/datatype-json.html)
- [Amazon S3: working with buckets and objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/uploading-downloading-objects.html)
- [MinIO: S3 compatibility](https://min.io/product/s3-compatibility)
- [Qdrant: collections](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant: payload metadata and filtering](https://qdrant.tech/documentation/manage-data/payload/)
- [Qdrant: snapshots and S3 snapshot storage](https://qdrant.tech/documentation/snapshots/)
- [Supabase: PostgreSQL database and pgvector extension](https://supabase.com/docs/guides/database/overview)
- [Supabase: vector columns with pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Supabase Storage: S3-compatible storage and access controls](https://supabase.com/docs/guides/storage)
