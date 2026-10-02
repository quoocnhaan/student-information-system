DEFINE FIELD IF NOT EXISTS llm_correction ON TABLE document TYPE string DEFAULT 'enabled'
  ASSERT $value INSIDE ['enabled', 'skipped'];
DEFINE FIELD IF NOT EXISTS pages.*.corrected_text ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS correction_status ON TABLE ocr_draft TYPE option<string>
  ASSERT $value INSIDE ['pending', 'completed', 'failed', 'skipped'];
DEFINE FIELD IF NOT EXISTS correction_model ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS correction_prompt_version ON TABLE ocr_draft TYPE option<string>;
DEFINE FIELD IF NOT EXISTS next_job_id ON TABLE job TYPE option<record<job>>;
