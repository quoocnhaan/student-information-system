# OpenAPI Contracts

Store **HTTP/REST contracts exposed by microservices** in this directory.

## Purpose

OpenAPI defines how another service or frontend communicates with a service over HTTP without depending on that service's implementation.

A contract may include:

- endpoint path
- HTTP method
- path/query parameters
- request body
- response body
- authentication requirements
- status codes
- error responses

## Suggested Structure

```text
openapi/
├── auth-service/
│   └── v1/
│       └── openapi.yaml
├── user-service/
│   └── v1/
│       └── openapi.yaml
├── enrollment-service/
│   └── v1/
│       └── openapi.yaml
├── academic-service/
│   └── v1/
│       └── openapi.yaml
└── activity-service/
    └── v1/
        └── openapi.yaml
```

## Rules

1. The producer service owns its OpenAPI contract.
2. Add or update the contract after the related entry in the Google Sheet Contract Registry is Approved.
3. Do not expose database/ORM models directly as public API schemas.
4. Prefer backward-compatible changes.
5. Version breaking changes instead of silently changing a contract used by consumers.
6. The implementation should conform to the committed OpenAPI contract.
