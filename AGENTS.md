# AGENTS.md

This file contains repository-wide instructions for coding agents working in this project.

## Scope

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Service Ports

Use the following ports for local service and MySQL configuration:

| Service            | Service port | MySQL port                  |
| ------------------ | ------------: | ---------------------------: |
| Auth service       | 8001         | 3301                        |
| User service       | 8002         | 3302                        |
| Academic service   | 8003         | 3303                        |
| Activity service   | 8004         | 3304                        |
| Enrollment service | 8005         | 3305                        |
| AI service         | 8006         | Ai service do not use MySQL |

## Git Branch Protection

Never push directly to `dev` or `main`. Create a pull request for every change intended for either branch.

## Database Schema Ownership

- Keep each service's database schemas, migrations, and seed data in its own
  `db/` folder, beside its code. Nested services keep that folder at their own
  root, such as `services/ai-service/knowledge/db/`.
- Reserve a repository-root `schemas/` folder for genuinely shared definitions
  or integration-test fixtures. Service-owned database assets belong to the
  owning service's `db/` folder.
- Each MySQL initialization seed must target only its owning service's database.
  Configure `docker-compose.yml` to mount that service's seed into its
  own MySQL container's `/docker-entrypoint-initdb.d/` directory, read-only.
- MySQL initialization scripts run on first database initialization, not during
  image build. Copy `db/` into an application image only when the application
  reads those files at runtime, as Knowledge does when applying its schema.
- Create `db/` when database assets exist; services that generate their schema
  through an ORM do not need an empty placeholder folder.
- When adding or moving database assets, update Compose and documentation
  references in the same task. Before finishing, verify that every referenced
  file exists, each seed contains only its owning database's definitions and
  data, and Compose validates. Preserve existing database volumes unless the
  user explicitly requests a reset.

## Docker and Docker Compose Rule

- Use the repository-root `docker-compose.yml` as the only Compose file for
  every application and service. Add services directly to it rather than
  creating service-local, override, or included Compose files.
- When consolidating an existing Compose file, merge its services and resources
  into the shared file, rebase paths relative to the repository root, and preserve runtime
  settings, dependencies, health checks, volumes, networks, and profiles.
  Remove the duplicate and update its documentation and command references.
- Run Compose from the repository root with `--env-file .env -f docker-compose.yml`.
  Before finishing Compose changes, verify that
  this is the only Compose file and that its configuration validates.

Whenever a task creates, adds, or introduces a `Dockerfile` for any application or service, the agent **must also update**:

```text
docker-compose.yml
```

so that the new container can be built and run through the repository's shared Docker Compose setup.

This is part of the same task. Do not consider a Dockerfile-related task complete until the Compose configuration has been checked and updated when necessary.

### Required behavior

1. If the user asks to create a Dockerfile for an app or service:
   - create or update the Dockerfile;
   - inspect `docker-compose.yml`;
   - add the corresponding service to `docker-compose.yml` if it is not already registered;
   - make sure the Compose `build.context` and `build.dockerfile` point to the correct paths;
   - include required ports, environment variables, volumes, dependencies, networks, or health checks when they are necessary for that service to run.

2. If a Dockerfile already exists before the task:
   - inspect `docker-compose.yml`;
   - if that app/service is missing from the Compose file, add it as part of the current task;
   - if an existing Compose entry no longer matches the Dockerfile or service configuration, update it.

3. If the service is already correctly represented in `docker-compose.yml`:
   - do not create a duplicate Compose service;
   - verify that the existing entry still matches the Dockerfile and current service requirements.

## Consistency Requirements

- Use paths relative to the repository-root `docker-compose.yml` correctly.
- Keep Compose service names consistent with the repository's app/service naming conventions.
- Do not expose unnecessary ports.
- Do not hard-code secrets in `docker-compose.yml`.
- Prefer environment variables and the repository's environment-file conventions for configurable values.
- Preserve unrelated Compose services and configuration.
- Do not remove another service from Compose unless the task explicitly requires it.

## Validation

After changing Docker-related files, validate the Compose configuration when the environment allows it.

Preferred command:

```bash
docker compose --env-file .env -f docker-compose.yml config --quiet
```

If Docker/Compose is unavailable, manually verify YAML structure, build paths, Dockerfile paths, port mappings, environment references, and dependencies.

## Completion Check

Before finishing any task that creates or modifies a Dockerfile, confirm:

- the Dockerfile exists and is valid for the target service;
- `docker-compose.yml` has been inspected;
- the corresponding service exists in Compose;
- the Compose entry points to the correct build context and Dockerfile;
- relevant runtime configuration has been included;
- no duplicate service entry was introduced.

A Dockerfile change without the required Docker Compose synchronization is considered incomplete.
