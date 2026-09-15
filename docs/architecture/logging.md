# API Logging Standard

## Requirement

Every API request handled by the API gateway or a backend service must emit one
structured log entry when the request finishes. Errors must include an
additional structured error log with safe diagnostic details.

## Where logs are stored

Services must write structured JSON logs to standard output (`stdout` and
`stderr`), rather than writing shared files or each service managing a local
log file. The deployment platform collects these logs and sends them to one
central logging system (for example, Grafana Loki, Elasticsearch, or a cloud
logging service).

This gives each service ownership of its emitted logs while allowing operators
to search all services in one place. In containers, local log files are
ephemeral and should not be the source of truth.

## Required fields

Each request log must include:

- `timestamp` — UTC time in ISO 8601 format.
- `level` — for example, `info`, `warn`, or `error`.
- `service` — the emitting service, such as `auth-service`.
- `environment` — such as `development`, `staging`, or `production`.
- `requestId` — generated at the API gateway and forwarded to every downstream
  service.
- `traceId` — distributed-tracing identifier when tracing is enabled.
- `method`, `route`, and `statusCode`.
- `durationMs`.

For errors, also include a stable `errorCode` and safe error details. Do not
log raw request bodies by default.

## Security and retention

Never log passwords, authorization headers, access tokens, refresh tokens,
session cookies, database connection strings, or sensitive personal data.
Audit events, such as login failures and changes to student records, should be
sent to a separate restricted audit-log stream with an explicit retention
policy.
