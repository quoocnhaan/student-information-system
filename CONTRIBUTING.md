# Contributing

## Protected branches

`main` and `dev` are integration branches. Direct pushes to either branch are
not allowed.

- `main` contains stable, release-ready code.
- `dev` is the shared integration branch for ongoing development.
- Changes reach these branches only through a pull request (PR).

Repository administrators must enforce these rules with GitHub branch
protection or rulesets for both `main` and `dev`.

## Branch workflow

1. Update your local `dev` branch.
2. Create a feature branch from `dev`.
3. Make and test your changes on that feature branch.
4. Open a PR from the feature branch into `dev`.
5. Merge only after the PR has been reviewed and checks pass.
6. Promote tested work from `dev` to `main` with a separate PR when ready for
   release.

Example:

```bash
git switch dev
git pull origin dev
git switch -c feature/auth-service
```

## Branch naming

Use the following pattern:

```text
feature/<service>
```

Examples:

- `feature/auth-service`
- `feature/student-web`
- `feature/enrollment-service`

Use lowercase letters and hyphens. Choose a name that describes the service or
area being changed.

## Pull requests

- Keep each PR focused on one change.
- Target `dev` for feature work.
- Describe the change and how it was tested.
- Resolve review comments and ensure required checks pass before merging.

