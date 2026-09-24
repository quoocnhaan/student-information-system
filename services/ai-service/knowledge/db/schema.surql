-- Knowledge-service schema. All statements are safe to run repeatedly.

DEFINE TABLE IF NOT EXISTS document SCHEMAFULL;
-- Metadata is absent while OCR and rule detection are in progress.
DEFINE FIELD OVERWRITE title ON TABLE document TYPE option<string>;
DEFINE FIELD OVERWRITE document_type ON TABLE document TYPE option<string>;
DEFINE FIELD IF NOT EXISTS document_number ON TABLE document TYPE option<string>;
DEFINE FIELD IF NOT EXISTS description ON TABLE document TYPE option<string>;
DEFINE FIELD OVERWRITE cohort ON TABLE document TYPE option<object>;
DEFINE FIELD OVERWRITE cohort.from_year ON TABLE document TYPE option<int>;
DEFINE FIELD IF NOT EXISTS cohort.to_year ON TABLE document TYPE option<int>;
DEFINE FIELD OVERWRITE program_scope ON TABLE document TYPE option<object>;
DEFINE FIELD OVERWRITE program_scope.type ON TABLE document TYPE option<string>
  ASSERT $value INSIDE ['all', 'non_language_major', 'language_major', 'specific_programs'];
DEFINE FIELD OVERWRITE program_scope.programs ON TABLE document TYPE option<array<string>>;
DEFINE FIELD OVERWRITE language ON TABLE document TYPE option<string>;
DEFINE FIELD IF NOT EXISTS source ON TABLE document TYPE object;
DEFINE FIELD IF NOT EXISTS source.object_key ON TABLE document TYPE string;
DEFINE FIELD IF NOT EXISTS source.original_filename ON TABLE document TYPE string;
DEFINE FIELD IF NOT EXISTS source.mime_type ON TABLE document TYPE string;
-- Keep this transition so existing databases can migrate from the old terminal
-- status before the final assertion removes it.
DEFINE FIELD OVERWRITE process_status ON TABLE document TYPE string
  ASSERT $value INSIDE ['processing', 'review', 'indexed', 'blocked', 'failed'];
UPDATE document SET process_status = 'failed' WHERE process_status = 'blocked';
DEFINE FIELD OVERWRITE process_status ON TABLE document TYPE string
  ASSERT $value INSIDE ['processing', 'review', 'indexed', 'failed'];
DEFINE FIELD IF NOT EXISTS page_count ON TABLE document TYPE option<int>;
DEFINE FIELD IF NOT EXISTS status ON TABLE document TYPE string
  ASSERT $value INSIDE ['active', 'inactive'];
DEFINE FIELD IF NOT EXISTS created_at ON TABLE document TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE document TYPE datetime VALUE time::now();
DEFINE INDEX IF NOT EXISTS document_source_object_key ON TABLE document FIELDS source.object_key UNIQUE;

DEFINE TABLE IF NOT EXISTS job SCHEMAFULL;
-- Job processors define their own types and steps (for example: ocr, embed, index).
DEFINE FIELD OVERWRITE type ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE job TYPE record<document>;
DEFINE FIELD IF NOT EXISTS ocr_draft_id ON TABLE job TYPE option<record<ocr_draft>>;
DEFINE FIELD IF NOT EXISTS status ON TABLE job TYPE string
  ASSERT $value INSIDE ['queued', 'running', 'completed', 'failed'];
DEFINE FIELD OVERWRITE step ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS progress ON TABLE job TYPE int ASSERT $value >= 0 AND $value <= 100;
DEFINE FIELD IF NOT EXISTS total_pages ON TABLE job TYPE option<int>;
DEFINE FIELD IF NOT EXISTS processed_pages ON TABLE job TYPE int DEFAULT 0;
DEFINE FIELD IF NOT EXISTS sequence ON TABLE job TYPE int DEFAULT 1 ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS dispatch_generation ON TABLE job TYPE int DEFAULT 1 ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS error ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS attempts ON TABLE job TYPE int DEFAULT 0 ASSERT $value >= 0;
DEFINE FIELD IF NOT EXISTS max_attempts ON TABLE job TYPE int DEFAULT 3 ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS next_attempt_at ON TABLE job TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS claimed_at ON TABLE job TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS worker_id ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS lease_expires_at ON TABLE job TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE job TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE job TYPE datetime VALUE time::now();
UPDATE job SET sequence = 1 WHERE sequence IS NONE;
UPDATE job SET dispatch_generation = 1 WHERE dispatch_generation IS NONE;
DEFINE INDEX IF NOT EXISTS job_document ON TABLE job FIELDS document_id;
DEFINE INDEX IF NOT EXISTS job_status_created ON TABLE job FIELDS status, created_at;
DEFINE INDEX IF NOT EXISTS job_claimable ON TABLE job FIELDS status, next_attempt_at, created_at;

-- Durable events are published to RabbitMQ by the outbox service. SurrealDB
-- table events make the job update and its notification one database commit.
DEFINE TABLE IF NOT EXISTS outbox_event SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS type ON TABLE outbox_event TYPE string
  ASSERT $value INSIDE ['job.queued', 'job.status_changed'];
DEFINE FIELD IF NOT EXISTS job_id ON TABLE outbox_event TYPE record<job>;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE outbox_event TYPE record<document>;
DEFINE FIELD IF NOT EXISTS sequence ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS dispatch_generation ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS available_at ON TABLE outbox_event TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS status ON TABLE outbox_event TYPE option<string>;
DEFINE FIELD IF NOT EXISTS step ON TABLE outbox_event TYPE option<string>;
DEFINE FIELD IF NOT EXISTS progress ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS processed_pages ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS total_pages ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS attempts ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS max_attempts ON TABLE outbox_event TYPE option<int>;
DEFINE FIELD IF NOT EXISTS error ON TABLE outbox_event TYPE option<string>;
DEFINE FIELD IF NOT EXISTS job_updated_at ON TABLE outbox_event TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE outbox_event TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS published_at ON TABLE outbox_event TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS publish_attempts ON TABLE outbox_event TYPE int DEFAULT 0 ASSERT $value >= 0;
DEFINE FIELD IF NOT EXISTS last_error ON TABLE outbox_event TYPE option<string>;
DEFINE INDEX IF NOT EXISTS outbox_pending ON TABLE outbox_event FIELDS published_at, created_at;
DEFINE INDEX IF NOT EXISTS outbox_job ON TABLE outbox_event FIELDS job_id, type;

DEFINE EVENT OVERWRITE job_status_outbox ON TABLE job
  WHEN $event = "CREATE" OR $after.sequence != $before.sequence
  THEN (
    CREATE outbox_event SET
      type = 'job.status_changed',
      job_id = $after.id,
      document_id = $after.document_id,
      sequence = $after.sequence,
      status = $after.status,
      step = $after.step,
      progress = $after.progress,
      processed_pages = $after.processed_pages,
      total_pages = $after.total_pages,
      attempts = $after.attempts,
      max_attempts = $after.max_attempts,
      error = $after.error,
      job_updated_at = $after.updated_at
  );

DEFINE EVENT OVERWRITE job_dispatch_outbox ON TABLE job
  WHEN ($event = "CREATE" AND $after.status = 'queued')
    OR ($after.status = 'queued' AND $after.dispatch_generation != $before.dispatch_generation)
  THEN (
    CREATE outbox_event SET
      type = 'job.queued',
      job_id = $after.id,
      document_id = $after.document_id,
      dispatch_generation = $after.dispatch_generation,
      available_at = $after.next_attempt_at
  );

DEFINE TABLE IF NOT EXISTS ocr_draft SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE ocr_draft TYPE record<document>;
DEFINE FIELD IF NOT EXISTS status ON TABLE ocr_draft TYPE string ASSERT $value INSIDE ['draft', 'confirmed'];
DEFINE FIELD IF NOT EXISTS revision ON TABLE ocr_draft TYPE int DEFAULT 1 ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS pages ON TABLE ocr_draft TYPE array<object>;
DEFINE FIELD IF NOT EXISTS pages.*.page ON TABLE ocr_draft TYPE int;
DEFINE FIELD IF NOT EXISTS pages.*.raw_text ON TABLE ocr_draft TYPE string;
DEFINE FIELD IF NOT EXISTS pages.*.reviewed_text ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE ocr_draft TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE ocr_draft TYPE datetime VALUE time::now();
UPDATE ocr_draft SET revision = 1 WHERE revision IS NONE;
DEFINE INDEX IF NOT EXISTS ocr_draft_document ON TABLE ocr_draft FIELDS document_id;

DEFINE TABLE IF NOT EXISTS chunk SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE chunk TYPE record<document>;
DEFINE FIELD IF NOT EXISTS ocr_draft_id ON TABLE chunk TYPE record<ocr_draft>;
DEFINE FIELD IF NOT EXISTS text ON TABLE chunk TYPE string;
DEFINE FIELD IF NOT EXISTS embedding_text ON TABLE chunk TYPE string;
DEFINE FIELD IF NOT EXISTS embedding ON TABLE chunk TYPE array<float, 768>;
DEFINE FIELD IF NOT EXISTS position ON TABLE chunk TYPE object;
DEFINE FIELD IF NOT EXISTS position.chunk_index ON TABLE chunk TYPE int;
DEFINE FIELD IF NOT EXISTS position.page_start ON TABLE chunk TYPE int;
DEFINE FIELD IF NOT EXISTS position.page_end ON TABLE chunk TYPE int;
DEFINE FIELD IF NOT EXISTS hierarchy ON TABLE chunk TYPE object;
DEFINE FIELD IF NOT EXISTS hierarchy.chapter_no ON TABLE chunk TYPE option<int>;
DEFINE FIELD IF NOT EXISTS hierarchy.chapter_title ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS hierarchy.article_no ON TABLE chunk TYPE option<int>;
DEFINE FIELD IF NOT EXISTS hierarchy.article_title ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS hierarchy.clause_no ON TABLE chunk TYPE option<int>;
DEFINE FIELD IF NOT EXISTS hierarchy.clause_title ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS token_count ON TABLE chunk TYPE int;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE chunk TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS chunk_document_position ON TABLE chunk FIELDS document_id, position.chunk_index UNIQUE;
DEFINE INDEX IF NOT EXISTS chunk_embedding_hnsw ON TABLE chunk FIELDS embedding
  HNSW DIMENSION 768 DIST COSINE TYPE F32;
