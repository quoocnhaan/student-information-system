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
│   ├── enrollment-service/# Enrollment workflows
│   └── ai-service/        # AI-powered capabilities
├── packages/
│   └── contracts/         # Shared API schemas, events, and types
├── deploy/
│   └── docker-compose.yml # Local container orchestration
├── docs/
│   ├── architecture/      # Architecture decisions and diagrams
│   ├── api/               # API documentation
│   └── database/          # Data model and database documentation
├── .github/
│   └── workflows/         # GitHub Actions workflows
├── .env.example           # Safe environment-variable template
├── CONTRIBUTING.md        # Git workflow and pull-request rules
└── README.md
```

## Development workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. In short, do not
push directly to `main` or `dev`; create a `feature/<service>` branch from
`dev`, open a pull request, and merge it into `dev` after review.
