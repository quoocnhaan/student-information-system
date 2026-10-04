# Service Contracts

This directory contains the **public contracts shared between microservices** in the Student Information System.

The goal is to let services integrate through stable, versioned contracts **without sharing business logic, database models, repositories, or internal implementation code**.

## Directory Structure

```text
packages/contracts/
├── README.md
├── openapi/
│   └── README.md
└── json-schema/
    └── README.md
```

### `openapi/`

Use this directory for **synchronous HTTP/REST API contracts**.

Examples:

- Enrollment Service exposes course-class and enrollment APIs used by Academic Service.
- User Service exposes profile APIs.
- Auth Service exposes authentication-related HTTP endpoints.

OpenAPI files should describe the public interface only: paths, methods, parameters, request bodies, responses, authentication requirements, and error responses.

### `json-schema/`

Use this directory for **message/event payload contracts and other language-independent data schemas**.

Examples:

- `CourseEnrollmentCreated`
- `CourseEnrollmentCancelled`
- shared authentication-context payloads when a schema is needed

Do not place ORM entities, database tables, internal domain models, repositories, or business logic here.

## Contract Workflow

The team uses a Google Sheet as the realtime **Contract Registry** for coordination.

```text
Draft on Google Sheet
        ↓
Producer + Consumer review
        ↓
Approved
        ↓
Add/update the official schema in Git
        ↓
Implement / integrate services
```

The Google Sheet is for realtime collaboration and review. It is **not the runtime source of truth**.

Once a contract is marked **Approved**, its official machine-readable definition must be committed here before the feature is considered complete.

## Ownership

- The **producer service** owns its public contract.
- Consumer services review the contract before it becomes Approved.
- Consumers must not depend on the producer's internal database or implementation.
- A service may evolve internally without requiring other services to redeploy as long as its public contract remains compatible.

## Versioning

Contracts must be versioned when compatibility matters.

Prefer additive, backward-compatible changes such as adding optional fields.

Examples of breaking changes:

- removing a field
- renaming a field
- changing a field type
- changing required/optional semantics
- changing endpoint or event meaning in an incompatible way

Breaking changes should introduce a new version or include an explicit migration plan.

## Suggested Naming

OpenAPI:

```text
openapi/<service>/v1/openapi.yaml
```

JSON Schema:

```text
json-schema/events/<domain>/<event-name>.v1.schema.json
json-schema/auth/<schema-name>.v1.schema.json
```

Keep contracts small and focused on what crosses a service boundary.
