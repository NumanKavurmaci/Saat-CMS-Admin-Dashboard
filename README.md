# SaatCMS Admin Dashboard

SaatCMS Admin Dashboard is the operations interface for the SaatCMS Middleware
Core. Editors and administrators can manage Content, Live Channels, and EPG
schedules; visitors can safely explore the public metadata, playback, and
system-status endpoints without a CMS credential.

The dashboard is server-rendered. A key entered at login is submitted to a
Server Action, then discarded by the browser; the configured account registry
and all upstream bearer handling stay on the server. Keys are never stored in
browser storage, placed in session cookies, or exposed through public
environment variables.

## Start here

| I want to…                                   | Read                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Run the dashboard locally                    | [Development guide](docs/development.md)                       |
| Learn what each screen does                  | [Feature guide](docs/feature-guide.md)                         |
| Understand visitor, editor, and admin access | [Security and access](docs/security-and-access.md)             |
| Understand the system design                 | [Architecture](docs/architecture.md)                           |
| Contribute a change                          | [Contributing guide](CONTRIBUTING.md)                          |
| Deploy or operate it on Render               | [Deployment and operations](docs/deployment-and-operations.md) |
| Diagnose a problem                           | [Troubleshooting](docs/troubleshooting.md)                     |
| Browse all documentation                     | [Documentation index](docs/README.md)                          |

## Five-minute local setup

Requirements: Node.js 22.15 or newer and npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Configure the copied `.env` before signing in. The committed
[`.env.example`](.env.example) contains safe placeholders; real `.env` files are
ignored by Git.

Open [http://localhost:3000](http://localhost:3000). From the login screen:

- Choose **Continue as visitor** to use only public backend endpoints.
- Sign in with a configured editor or admin actor to use CMS management.

See the [Development guide](docs/development.md) for the complete environment
reference, commands, and repository conventions.

## What is included

- A public-aware Overview with backend health and database readiness.
- Content CRUD for Series, Seasons, Episodes, and Movies, including hierarchy,
  inherited metadata, safe deletion, and ETag conflict recovery.
- Live Channel CRUD with explicit destructive confirmation.
- Simple day-based EPG scheduling with local-time conversion and overlap errors.
- Public Metadata Resolver and Playback Tester tools.
- Signed HttpOnly visitor and account sessions.
- A server-only SaatCMS API client with a strict public-route allowlist.
- Vitest/React Testing Library coverage, GitHub Actions CI, and a Render
  Blueprint.

The complete route and access matrix is in the
[Route reference](docs/route-reference.md).

## Technology

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS
- Server Components and Server Actions
- Vinext/Vite production runtime
- Vitest and React Testing Library
- Zod for server environment validation

## Quality checks

```powershell
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev
```

CI runs the same checks for pull requests and pushes to `main`. Coverage
thresholds are enforced in [`vitest.config.ts`](vitest.config.ts).

## Deployment status

[`render.yaml`](render.yaml) defines a separate Render web service that targets
the deployed SaatCMS backend. The repository does not create or modify a Render
service by itself; connecting the Blueprint and supplying secrets are explicit
operator actions.

Follow [Deployment and operations](docs/deployment-and-operations.md) for setup,
smoke testing, credential rotation, and rollback.

## Project status and plans

The dashboard implementation is complete through local production verification.
External deployment and deployed smoke testing remain separate release actions.

Planning records are preserved under [`docs/project/plans`](docs/project/plans):

- [Project plan](docs/project/plans/admin-dashboard-project-plan.md)
- [Low-level implementation plan](docs/project/plans/admin-dashboard-low-level-implementation-plan.md)

For current operational guidance, prefer the [documentation index](docs/README.md)
and its linked guides.
