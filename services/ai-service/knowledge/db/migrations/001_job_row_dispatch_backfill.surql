-- Run after the additive job schema and before starting knowledge-dispatcher.
-- Populate both required integer fields together. Existing running and terminal
-- rows need these fields too, or their next update fails schema validation.
-- A row with a counter already set belongs to the new dispatch path and is
-- left untouched, so rerunning cannot clear a broker confirmation.
UPDATE job SET
  dispatch_generation = 1,
  dispatch_published_at = NONE,
  dispatch_publish_attempts = 0,
  dispatch_last_error = NONE,
  dispatch_next_publish_at = NONE,
  dispatch_lease_owner = NONE,
  dispatch_lease_expires_at = NONE
WHERE dispatch_generation IS NONE AND dispatch_publish_attempts IS NONE;
-- Preserve a generation already assigned by the older worker/outbox workflow.
UPDATE job SET
  dispatch_published_at = NONE,
  dispatch_publish_attempts = 0,
  dispatch_last_error = NONE,
  dispatch_next_publish_at = NONE,
  dispatch_lease_owner = NONE,
  dispatch_lease_expires_at = NONE
WHERE dispatch_generation IS NOT NONE AND dispatch_publish_attempts IS NONE;
