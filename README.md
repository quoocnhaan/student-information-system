# Student Information System

Monorepo for the Student Information System. It groups the web applications,
backend services, shared contracts, deployment files, and project documentation
in one repository.

## Repository structure

```text
student-information-system/
├── apps/
│   ├── student-web/       # Student-facing web application
│   ├── mlearning-web/     # Micro-learning web application
│   └── admin-web/         # Administration web application
├── services/
│   ├── api-gateway/       # Public API entry point and routing
│   ├── auth-service/      # Authentication and authorization
│   ├── user-service/      # User profiles and account data
│   ├── academic-service/  # Academic records and curriculum data
│   │   └── db/academic.sql # Academic database schema and seed
│   ├── activity-service/  # Learning activities and assessments
│   │   └── db/activity.sql # Activity database schema and seed
│   ├── enrollment-service/# Enrollment workflows
│   └── ai-service/        # AI-powered capabilities
│       └── knowledge/db/schema.surql # Knowledge database schema
├── packages/
│   └── contracts/         # Shared API schemas, events, and types
├── deploy/
│   └── docker-compose.yml # Local container orchestration
├── docs/
│   ├── architecture/      # Architecture decisions, diagrams, and logging standard
│   ├── api/               # API documentation
│   ├── database/          # Data model and database documentation
│   └── planning/          # Mandatory delivery plan and sprint backlog
├── .github/
│   └── workflows/         # GitHub Actions workflows
├── .env.example           # Safe environment-variable template
├── CONTRIBUTING.md        # Git workflow and pull-request rules
└── README.md
```

## Run with Docker Compose

Use only the repository-root `.env` and `.env.example` for all applications and services.
Keep the root example synchronized whenever environment settings change.

If the root `.env` does not exist, copy the root `.env.example` to `.env`.
Fill in the blank passwords and a JWT secret of at least 32 characters.
Then run from the repository root:

```bash
docker compose --env-file .env -f deploy/docker-compose.yml config --quiet
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

`deploy/docker-compose.yml` is the repository's only Compose file. It directly
defines the AI stack and registers every existing application/service Dockerfile.

| Component | Local port |
| --- | ---: |
| Academic API / MySQL | 8003 / 3303 |
| Activity API / MySQL | 8004 / 3304 |
| Enrollment API / MySQL | 8005 / 3305 |
| AI Knowledge API | 8006 |
| Admin / Student / Micro-learning web | 5173 / 5174 / 5175 |

Auth, User, and the gateway currently contain only placeholders;
their reserved ports in `AGENTS.md` remain available for future implementations.
SurrealDB is reachable inside Docker at `ws://surrealdb:8000`.
MinIO and RabbitMQ keep their existing local development ports.

Database assets belong to their service's `db/` folder. Academic initializes
from `services/academic-service/db/academic.sql`; Activity initializes from
`services/activity-service/db/activity.sql`. Compose mounts each seed read-only
into its owning MySQL container, so each seed creates only that service's
database. The table definitions and seed data are preserved from the former
combined seed.

MySQL runs these scripts on first database initialization, not during image
build. Named volumes persist contents between restarts; initialization scripts
do not rerun on existing volumes. Moving the files does not change existing
database contents or reset volumes.

Knowledge includes its service-local `db/` folder in its application image and
applies `db/schema.surql` during application startup. Reserve a root `schemas/`
folder for genuinely shared definitions or integration-test fixtures.

Enrollment creates its own tables through Hibernate and uses the same
`SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` settings as the
other Spring services. Its `mysql-data` volume name is retained from the
upstream deployment configuration.

## Development workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. In short, do not
push directly to `main` or `dev`; create a `feature/<service>` branch from
`dev`, open a pull request, and merge it into `dev` after review.
