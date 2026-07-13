# Contributing

Thank you for improving the SaatCMS Admin Dashboard. This file is the short
contribution checklist; the [Development guide](docs/development.md) explains
the repository and commands in detail.

## Before you start

1. Read the relevant section of the [documentation handbook](docs/README.md).
2. Confirm the backend contract in the companion SaatCMS backend documentation.
3. Create a focused branch from an up-to-date `main`.
4. Keep real `.env` values, CMS keys, session secrets, cookies, and private
   playback URLs out of commits, tests, screenshots, and logs.

This repository is the only Git history in scope for dashboard work. Do not
change the backend repository or another project's history unless that work is
requested explicitly.

## Branches and commits

Use descriptive branches such as:

- `feature/visitor-access`
- `fix/epg-time-conversion`
- `docs/project-handbook`

Prefer cohesive commits that tell the implementation story. A useful commit
contains one complete concern—behavior plus its tests—without mixing unrelated
cleanup. Avoid both catch-all commits and a long sequence of cosmetic fragments.

Use an imperative Conventional Commit-style subject when it fits:

```text
feat: add signed visitor sessions
fix: preserve EPG form values after conflicts
docs: document deployment recovery
```

## Required checks

Before merging, run:

```powershell
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev
```

The repository enforces at least 80% coverage for the selected actions, forms,
components, and libraries. New behavior should have focused regression tests;
do not raise coverage with assertions that do not verify outcomes.

## Change checklist

- Keep CMS and session secrets in server-only modules.
- Preserve the public API allowlist and visitor no-bearer guarantee.
- Preserve `ETag`/`If-Match` behavior on editable resources.
- Normalize backend failures without exposing raw responses or stack traces.
- Update the relevant handbook page when routes, environment variables,
  access rules, workflows, or deployment behavior change.
- Use disposable records for destructive manual tests.
- Keep the feature branch clean and merge to `main` only after all gates pass.

## Pull request description

Explain:

1. What changed and why.
2. Which access modes and routes are affected.
3. How the change was tested.
4. Whether environment or Render configuration changed.
5. Any deployment, rollback, or follow-up considerations.
