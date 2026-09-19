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

`process_status`: `processing | review | indexed | failed`

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
      "raw_text": "QUY CHẾ SINH VIÊN...",
      "reviewed_text": "QUY CHẾ SINH VIÊN..."
    }
  ],

  "created_at": "2026-09-17T10:05:00Z",
  "updated_at": "2026-09-17T10:05:00Z"
}
```

`status`: `draft | confirmed`

---

## 3. Chunk

```json
{
  "id": "chunk:01JDEF",
  "document_id": "document:01JXYZ",
  "ocr_draft_id": "ocr_draft:01JABC",

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

`embedding_text` = relevant hierarchy + chunk text.

---

# SurrealDB Configuration

## Docker Compose

```yaml
services:
  surrealdb:
    image: surrealdb/surrealdb:latest
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
