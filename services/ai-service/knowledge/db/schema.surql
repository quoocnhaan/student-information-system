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
