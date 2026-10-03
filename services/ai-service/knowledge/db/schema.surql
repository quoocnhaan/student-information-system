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
  ASSERT $value INSIDE ['processing', 'review', 'indexing', 'indexed', 'blocked', 'failed'];
UPDATE document SET process_status = 'failed' WHERE process_status = 'blocked';
DEFINE FIELD OVERWRITE process_status ON TABLE document TYPE string
  ASSERT $value INSIDE ['processing', 'review', 'indexing', 'indexed', 'failed'];
DEFINE FIELD IF NOT EXISTS page_count ON TABLE document TYPE option<int>;
DEFINE FIELD IF NOT EXISTS embedding_model ON TABLE document TYPE option<string>;
DEFINE FIELD IF NOT EXISTS llm_correction ON TABLE document TYPE string DEFAULT 'enabled'
  ASSERT $value INSIDE ['enabled', 'skipped'];
DEFINE FIELD IF NOT EXISTS status ON TABLE document TYPE string
  ASSERT $value INSIDE ['active', 'inactive'];
DEFINE FIELD IF NOT EXISTS created_at ON TABLE document TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE document TYPE datetime VALUE time::now();
DEFINE INDEX IF NOT EXISTS document_source_object_key ON TABLE document FIELDS source.object_key UNIQUE;

DEFINE TABLE IF NOT EXISTS ocr_draft SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE ocr_draft TYPE record<document>;
DEFINE FIELD IF NOT EXISTS status ON TABLE ocr_draft TYPE string ASSERT $value INSIDE ['draft', 'confirmed'];
DEFINE FIELD IF NOT EXISTS revision ON TABLE ocr_draft TYPE int DEFAULT 1 ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS pages ON TABLE ocr_draft TYPE array<object>;
DEFINE FIELD IF NOT EXISTS pages.*.page ON TABLE ocr_draft TYPE int;
DEFINE FIELD IF NOT EXISTS pages.*.raw_text ON TABLE ocr_draft TYPE string;
DEFINE FIELD IF NOT EXISTS pages.*.reviewed_text ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS pages.*.corrected_text ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS correction_status ON TABLE ocr_draft TYPE option<string>
  ASSERT $value INSIDE ['pending', 'completed', 'failed', 'skipped'];
DEFINE FIELD IF NOT EXISTS correction_model ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS correction_prompt_version ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE ocr_draft TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE ocr_draft TYPE datetime VALUE time::now();
UPDATE ocr_draft SET revision = 1 WHERE revision IS NONE;
DEFINE INDEX IF NOT EXISTS ocr_draft_document ON TABLE ocr_draft FIELDS document_id;

-- Immutable, temporary input assembled at the one-shot review confirmation.
DEFINE TABLE IF NOT EXISTS index_input SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE index_input TYPE record<document>;
DEFINE FIELD IF NOT EXISTS pages ON TABLE index_input TYPE array<object>;
DEFINE FIELD IF NOT EXISTS pages.*.page ON TABLE index_input TYPE int;
DEFINE FIELD IF NOT EXISTS pages.*.text ON TABLE index_input TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE index_input TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS index_input_document ON TABLE index_input FIELDS document_id UNIQUE;

DEFINE TABLE IF NOT EXISTS job SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS type ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS dedupe_key ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE job TYPE record<document>;
DEFINE FIELD IF NOT EXISTS status ON TABLE job TYPE string ASSERT $value INSIDE ['queued', 'running', 'completed', 'failed'];
DEFINE FIELD IF NOT EXISTS step ON TABLE job TYPE string;
DEFINE FIELD IF NOT EXISTS progress ON TABLE job TYPE int ASSERT $value >= 0 AND $value <= 100;
DEFINE FIELD IF NOT EXISTS total_pages ON TABLE job TYPE option<int>;
DEFINE FIELD IF NOT EXISTS processed_pages ON TABLE job TYPE int DEFAULT 0;
DEFINE FIELD IF NOT EXISTS sequence ON TABLE job TYPE int DEFAULT 1;
DEFINE FIELD IF NOT EXISTS claim_id ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS index_input_id ON TABLE job TYPE option<record<index_input>>;
DEFINE FIELD IF NOT EXISTS confirmation_fingerprint ON TABLE job TYPE option<string>;
-- Legacy OCR jobs retain this only until their worker completion clears it.
DEFINE FIELD IF NOT EXISTS ocr_draft_id ON TABLE job TYPE option<record<ocr_draft>>;
DEFINE FIELD IF NOT EXISTS next_job_id ON TABLE job TYPE option<record<job>>;
DEFINE FIELD IF NOT EXISTS chunk_id ON TABLE job TYPE option<record<chunk>>;
DEFINE FIELD IF NOT EXISTS error ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE job TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE job TYPE datetime VALUE time::now();
DEFINE INDEX IF NOT EXISTS job_document_dedupe ON TABLE job FIELDS document_id, dedupe_key UNIQUE;
DEFINE INDEX IF NOT EXISTS job_status_created ON TABLE job FIELDS status, created_at;

DEFINE TABLE IF NOT EXISTS chunk SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE chunk TYPE record<document>;
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
DEFINE FIELD IF NOT EXISTS hierarchy.chapter_heading ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS hierarchy.article_no ON TABLE chunk TYPE option<int>;
DEFINE FIELD IF NOT EXISTS hierarchy.article_title ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS hierarchy.article_heading ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS hierarchy.clause_no ON TABLE chunk TYPE option<int>;
DEFINE FIELD IF NOT EXISTS hierarchy.clause_title ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS hierarchy.clause_heading ON TABLE chunk TYPE option<string>;
DEFINE FIELD IF NOT EXISTS token_count ON TABLE chunk TYPE int;
DEFINE FIELD IF NOT EXISTS embedding_status ON TABLE chunk TYPE string DEFAULT 'ok'
  ASSERT $value INSIDE ['ok', 'stale'];
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE chunk TYPE datetime VALUE time::now();
DEFINE FIELD IF NOT EXISTS created_at ON TABLE chunk TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS chunk_document_position ON TABLE chunk FIELDS document_id, position.chunk_index UNIQUE;
DEFINE INDEX IF NOT EXISTS chunk_embedding_hnsw ON TABLE chunk FIELDS embedding
  HNSW DIMENSION 768 DIST COSINE TYPE F32;

DEFINE TABLE IF NOT EXISTS correction_suggestion SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE correction_suggestion TYPE record<document>;
DEFINE FIELD IF NOT EXISTS chunk_id ON TABLE correction_suggestion TYPE record<chunk>;
DEFINE FIELD IF NOT EXISTS job_id ON TABLE correction_suggestion TYPE record<job>;
DEFINE FIELD IF NOT EXISTS position ON TABLE correction_suggestion TYPE int;
DEFINE FIELD IF NOT EXISTS base_text ON TABLE correction_suggestion TYPE string;
DEFINE FIELD IF NOT EXISTS suggested_text ON TABLE correction_suggestion TYPE option<string>;
DEFINE FIELD IF NOT EXISTS status ON TABLE correction_suggestion TYPE string
  ASSERT $value INSIDE ['pending', 'ready', 'accepted', 'rejected', 'outdated', 'failed'];
DEFINE FIELD IF NOT EXISTS created_at ON TABLE correction_suggestion TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS suggestion_job ON TABLE correction_suggestion FIELDS job_id;
DEFINE INDEX IF NOT EXISTS suggestion_chunk_status ON TABLE correction_suggestion FIELDS chunk_id, status;
