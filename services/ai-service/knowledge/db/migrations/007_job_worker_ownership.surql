DEFINE FIELD IF NOT EXISTS worker_id ON TABLE job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS worker_run_id ON TABLE job TYPE option<string>;
DEFINE INDEX IF NOT EXISTS job_worker_ownership ON TABLE job FIELDS worker_id, status, worker_run_id;
