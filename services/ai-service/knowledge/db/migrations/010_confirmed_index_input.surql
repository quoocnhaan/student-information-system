-- One-shot confirmation input. Run after existing queued index jobs have drained
-- or have been backfilled with an index_input record.
DEFINE TABLE IF NOT EXISTS index_input SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS document_id ON TABLE index_input TYPE record<document>;
DEFINE FIELD IF NOT EXISTS pages ON TABLE index_input TYPE array<object>;
DEFINE FIELD IF NOT EXISTS pages.*.page ON TABLE index_input TYPE int;
DEFINE FIELD IF NOT EXISTS pages.*.text ON TABLE index_input TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE index_input TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS index_input_document ON TABLE index_input FIELDS document_id UNIQUE;

DEFINE FIELD IF NOT EXISTS index_input_id ON TABLE job TYPE option<record<index_input>>;
DEFINE FIELD IF NOT EXISTS confirmation_fingerprint ON TABLE job TYPE option<string>;

-- Completed work no longer needs temporary OCR references. Retain failed and
-- queued legacy jobs until their index input has been safely backfilled.
UPDATE job SET ocr_draft_id = NONE WHERE status = 'completed' AND ocr_draft_id IS NOT NONE;
REMOVE FIELD IF EXISTS ocr_draft_id ON TABLE chunk;
