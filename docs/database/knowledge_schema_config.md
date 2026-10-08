# RAG Knowledge Storage Schemas

## 1. Document

```json
{
  "id": "document:01JXYZ",
  "title": "Student Academic Regulations 2026",
  "document_type": "regulation",
  "document_number": "REG-2026-01",
  "description": "Academic regulations for undergraduate students",

  "cohort": {
    "from_year": 2026,
    "to_year": null
  },

  "program_scope": {
    "type": "non_language_major",
    "programs": []
  },

  "language": "vi",

  "source": {
    "object_key": "documents/01JXYZ/original.pdf",
    "original_filename": "quy_che_sinh_vien_2026.pdf",
    "mime_type": "application/pdf"
  },

  "process_status": "processing",
  "page_count": 42,
  "status": "active",

  "created_at": "2026-09-17T10:00:00Z",
  "updated_at": "2026-09-17T10:10:00Z"
}
```

`program_scope.type`: `all | non_language_major | language_major | specific_programs`

`process_status`: `processing | review | indexing | indexed | failed`

`embedding_model` records the model used for indexed chunks.

`status`: `active | inactive`

---

## 2. OCR Draft

```json
{
  "id": "ocr_draft:01JABC",
  "document_id": "document:01JXYZ",
  "status": "draft",

  "pages": [
    {
      "page": 1,
      "raw_text": "QUY CHẾ SINH VIÊN..."
    }
  ],

  "created_at": "2026-09-17T10:05:00Z",
  "updated_at": "2026-09-17T10:05:00Z"
}
```

`status`: `draft | confirmed`. Draft pages retain raw OCR output, with no automatic correction before review. Reviewer edits are not saved into the draft: confirmation creates a temporary `index_input` containing only selected original page numbers and their final text. Indexing reads that input, so omitted pages cannot become chunks; successful indexing deletes both temporary records atomically.

---

## 3. Chunk

```json
{
  "id": "chunk:01JDEF",
  "document_id": "document:01JXYZ",

  "text": "Sinh viên phải hoàn thành tối thiểu 120 tín chỉ...",

  "embedding_text": "Chương 1: Quy định chung\nĐiều 3: Điều kiện tốt nghiệp\nKhoản 2\n\nSinh viên phải hoàn thành tối thiểu 120 tín chỉ...",

  "embedding": [
    0.012,
    -0.031,
    0.082
  ],

  "position": {
    "chunk_index": 12,
    "page_start": 5,
    "page_end": 5
  },

  "hierarchy": {
    "chapter_no": 1,
    "chapter_title": "Quy định chung",
    "article_no": 3,
    "article_title": "Điều kiện tốt nghiệp",
    "clause_no": 2,
    "clause_title": null
  },

  "token_count": 187,
  "created_at": "2026-09-17T10:10:00Z"
}
```

`embedding_text` = relevant hierarchy header lines (`Chương`, `Điều`, `Khoản`) followed by a blank line and chunk text. Every vector has 768 dimensions. `embedding_status` is `ok | stale`; `updated_at` changes when a chunk is edited. A stale chunk remains searchable with its previous vector until `reembed_chunk` succeeds.

`chunk_correction_input` captures `document_id`, `chunk_id`, `job_id`, `base_text`, optional `proposed_text`, embedding text/version/status, and hierarchy. Its audit status is `pending | applied | unchanged | failed`. Each correction job captures exactly one snapshot. It applies automatically in one guarded transaction and creates zero or one embedding child. Public chunk responses expose operation outcomes and job relationships, without captured text. See [the authoritative workflow and reset guide](../../services/ai-service/knowledge/README.md).

## 4. Persisted jobs

Jobs keep identity (`id`, `type`, `document_id`, `dedupe_key`), lifecycle (`status`, `step`, `progress`, `version`, `error`, timestamps), private ownership (`attempt_id`, `worker_id`, `worker_run_id`), and orchestration (`followup_job_ids`) in the envelope. `payload` is required, validated by type, and read-only:

| Type | Payload |
| --- | --- |
| `ocr_pdf` | `{}`; source resolves through the document |
| `index_document` | typed `index_input_id`, `confirmation_fingerprint` |
| `correct_chunks` | typed `chunk_id`, typed `correction_input_id` |
| `reembed_chunk` | typed `chunk_id`, `embedding_text`, `embedding_version` |

`payload` is `TYPE object FLEXIBLE READONLY`, preserving nested values in a SCHEMAFULL table. The adapter writes references as records. `chunk_correction_input.job_id` is unique; snapshot ordering is unnecessary. Public job status exposes percentage and step, keeps captured inputs and ownership private, and offers index retry only against the retained input. Failure retains progress; retry resets it to zero. OCR opens review directly and leaves its generic next-job link empty.

Raw OCR can affect metadata and chunk boundaries. Manual review is the structural repair stage; indexed correction does not re-chunk. Fresh local volumes are required for this schema change; historical migrations do not convert old jobs.

---

# SurrealDB Configuration

## Docker Compose

```yaml
services:
  surrealdb:
    image: surrealdb/surrealdb:v3.2.4
    # Local-only: root can initialise the Docker named volume at /data.
    user: "0:0"
    command: start --user root --pass root rocksdb:///data/database.db
    ports:
      - "8000:8000"
    volumes:
      - surreal_data:/data

volumes:
  surreal_data:
```

---

## Tables

```sql
DEFINE TABLE document SCHEMAFULL;
DEFINE TABLE ocr_draft SCHEMAFULL;
DEFINE TABLE chunk SCHEMAFULL;
```

---

## Vector Field

The embedding model used by this project produces **768-dimensional vectors**.

```sql
DEFINE FIELD embedding
ON TABLE chunk
TYPE array<float, 768>;
```

---

## HNSW Vector Index

```sql
DEFINE INDEX chunk_embedding_hnsw
ON TABLE chunk
FIELDS embedding
HNSW
DIMENSION 768
DIST COSINE
TYPE F32;
```

SurrealDB uses its default HNSW parameters unless `M` or `EFC` are explicitly configured.

Optional tuning:

```sql
DEFINE INDEX chunk_embedding_hnsw
ON TABLE chunk
FIELDS embedding
HNSW
DIMENSION 768
DIST COSINE
TYPE F32
M 16
EFC 150;
```

Start with the default configuration and tune only after retrieval benchmarking.
