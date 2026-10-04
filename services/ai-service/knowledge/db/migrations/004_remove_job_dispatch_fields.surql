-- Apply only after the new API and worker replace the dispatcher and old queue messages drain.
REMOVE INDEX IF EXISTS job_dispatch_due ON TABLE job;
REMOVE INDEX IF EXISTS job_claimable ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_generation ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_published_at ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_publish_attempts ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_last_error ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_next_publish_at ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_lease_owner ON TABLE job;
REMOVE FIELD IF EXISTS dispatch_lease_expires_at ON TABLE job;
REMOVE FIELD IF EXISTS attempts ON TABLE job;
REMOVE FIELD IF EXISTS max_attempts ON TABLE job;
REMOVE FIELD IF EXISTS next_attempt_at ON TABLE job;
REMOVE FIELD IF EXISTS lease_expires_at ON TABLE job;
UPDATE job UNSET dispatch_generation, dispatch_published_at, dispatch_publish_attempts,
  dispatch_last_error, dispatch_next_publish_at, dispatch_lease_owner,
  dispatch_lease_expires_at, attempts, max_attempts, next_attempt_at,
  lease_expires_at;
