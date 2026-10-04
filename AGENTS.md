# AGENTS.md

This file contains repository-wide instructions for coding agents working in this project.

## Scope

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Docker and Docker Compose Rule

Whenever a task creates, adds, or introduces a `Dockerfile` for any application or service, the agent **must also update**:

```text
deploy/docker-compose.yml
```

so that the new container can be built and run through the repository's shared Docker Compose setup.

This is part of the same task. Do not consider a Dockerfile-related task complete until the Compose configuration has been checked and updated when necessary.

### Required behavior

1. If the user asks to create a Dockerfile for an app or service:
   - create or update the Dockerfile;
   - inspect `deploy/docker-compose.yml`;
   - add the corresponding service to `deploy/docker-compose.yml` if it is not already registered;
   - make sure the Compose `build.context` and `build.dockerfile` point to the correct paths;
   - include required ports, environment variables, volumes, dependencies, networks, or health checks when they are necessary for that service to run.

2. If a Dockerfile already exists before the task:
   - inspect `deploy/docker-compose.yml`;
   - if that app/service is missing from the Compose file, add it as part of the current task;
   - if an existing Compose entry no longer matches the Dockerfile or service configuration, update it.

3. If the service is already correctly represented in `deploy/docker-compose.yml`:
   - do not create a duplicate Compose service;
   - verify that the existing entry still matches the Dockerfile and current service requirements.

## Consistency Requirements

- Use paths relative to `deploy/docker-compose.yml` correctly.
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
docker compose -f deploy/docker-compose.yml config
```

If Docker/Compose is unavailable, manually verify YAML structure, build paths, Dockerfile paths, port mappings, environment references, and dependencies.

## Completion Check

Before finishing any task that creates or modifies a Dockerfile, confirm:

- the Dockerfile exists and is valid for the target service;
- `deploy/docker-compose.yml` has been inspected;
- the corresponding service exists in Compose;
- the Compose entry points to the correct build context and Dockerfile;
- relevant runtime configuration has been included;
- no duplicate service entry was introduced.

A Dockerfile change without the required Docker Compose synchronization is considered incomplete.
