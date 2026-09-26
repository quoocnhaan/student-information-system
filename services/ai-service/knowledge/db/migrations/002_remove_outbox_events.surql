-- Run only after all API, worker, and publisher replicas use job-row dispatch.
REMOVE EVENT IF EXISTS job_status_outbox ON TABLE job;
REMOVE EVENT IF EXISTS job_dispatch_outbox ON TABLE job;
