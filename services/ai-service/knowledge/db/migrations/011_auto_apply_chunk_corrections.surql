-- Automatic indexed-chunk correction.  Safe to run repeatedly and preserves
-- existing chunks, vectors, and legacy review-mode jobs.
DEFINE FIELD IF NOT EXISTS followup_job_ids ON TABLE job TYPE array<record<job>> DEFAULT [];
DEFINE FIELD IF NOT EXISTS correction_mode ON TABLE job TYPE option<string>
  ASSERT $value IS NONE OR $value INSIDE ['automatic'];
DEFINE FIELD IF NOT EXISTS embedding_text ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS active_job_id ON TABLE chunk TYPE option<record<job>>;
DEFINE FIELD IF NOT EXISTS last_embedding_job_id ON TABLE chunk TYPE option<record<job>>;
UPDATE job SET followup_job_ids = [] WHERE followup_job_ids IS NONE;
