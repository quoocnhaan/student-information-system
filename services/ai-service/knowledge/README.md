# Knowledge API

FastAPI module responsible for source-document lifecycle and retrieval.

## Module layout

- `api/` is the HTTP interface.
- `application/` will contain ingestion and retrieval use cases.
- `domain/` will contain knowledge-domain models and rules.
- `infrastructure/` will contain adapters for vector storage, embeddings,
  source storage, and file parsing.
- `observability/` contains structured logging shared by this module.

The implementation folders are intentionally empty until the storage and
embedding providers are selected.
