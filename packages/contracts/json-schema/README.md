# JSON Schema Contracts

Store **event/message payload schemas and other language-independent shared payload contracts** in this directory.

This is especially useful for RabbitMQ/event-driven communication between services.

## Suggested Structure

```text
json-schema/
├── events/
│   └── enrollment/
│       ├── course-enrollment-created.v1.schema.json
│       └── course-enrollment-cancelled.v1.schema.json
└── auth/
    └── auth-context.v1.schema.json
```

## Event Contract Example

An event contract should define only the data consumers need.

For example, `CourseEnrollmentCreated` may contain identifiers such as:

```json
{
  "event_type": "CourseEnrollmentCreated",
  "version": 1,
  "student_id": "SV001",
  "course_class_id": "CLC001"
}
```

The exact fields must be agreed in the Contract Registry before the schema is marked Approved.

## Rules

1. Do not publish a database entity or ORM model directly as an event.
2. Map internal models to an explicit public event payload.
3. Every event should have a clear producer, consumer(s), and version.
4. Consumers should be tolerant of backward-compatible additive fields.
5. Breaking changes require a new schema version or an explicit migration plan.
6. Event consumers should be designed for duplicate delivery when the messaging system can redeliver messages.
