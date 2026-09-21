"""Prometheus metrics shared by the API, worker, and outbox publisher."""

from prometheus_client import Counter, Gauge, Histogram

JOB_CLAIMS = Counter(
    "knowledge_job_claims_total", "Durable job claim decisions", ["result"]
)
CLAIM_CONFLICTS = Counter(
    "knowledge_job_claim_conflicts_total", "SurrealDB job-claim conflicts"
)
EXPIRED_LEASES = Counter(
    "knowledge_expired_leases_total", "Worker leases recovered by the sweeper"
)
JOB_RETRIES = Counter(
    "knowledge_job_retries_total", "Jobs scheduled for another attempt"
)
TERMINAL_FAILURES = Counter(
    "knowledge_terminal_failures_total", "Jobs ending in terminal failure"
)
OUTBOX_PUBLISHES = Counter(
    "knowledge_outbox_publishes_total", "Outbox publish attempts", ["type", "result"]
)
RABBIT_REDELIVERIES = Counter(
    "knowledge_rabbitmq_redeliveries_total", "Redelivered RabbitMQ job messages"
)
OCR_DOCUMENT_SECONDS = Histogram(
    "knowledge_ocr_document_seconds", "End-to-end OCR processor latency"
)
OCR_PAGE_SECONDS = Histogram(
    "knowledge_ocr_page_seconds", "LM Studio OCR latency per page"
)
LMSTUDIO_FAILURES = Counter(
    "knowledge_lmstudio_failures_total", "LM Studio request failures"
)
WEBSOCKET_CLIENTS = Gauge(
    "knowledge_websocket_clients", "Currently connected job-status clients"
)
WEBSOCKET_DROPS = Counter(
    "knowledge_websocket_drops_total", "Closed job-status WebSocket connections"
)
QUEUE_DEPTH = Gauge(
    "knowledge_rabbitmq_queue_depth", "Ready messages in the OCR job queue"
)
JOB_STATE = Gauge("knowledge_jobs", "Current durable jobs by state", ["status"])
ORPHAN_CLEANUP = Counter(
    "knowledge_orphan_cleanup_total",
    "Source-object orphan cleanup decisions",
    ["result"],
)
