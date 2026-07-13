# Development guide

This guide is for contributors working on the SaatCMS Admin Dashboard. It explains how to run the application, where code belongs, how authentication is kept server-side, and which checks should pass before a change is merged.

For production releases and incidents, use [Deployment and operations](deployment-and-operations.md). For known failure modes, use [Troubleshooting](troubleshooting.md).

## What this application is

The dashboard is a server-rendered administration client for the separate SaatCMS backend. It does not own a database and it is not a generic API proxy.

```text
Browser
  -> SaatCMS Admin Dashboard (Next.js/Vinext)
       -> signed HttpOnly dashboard session
       -> server-only API client
            -> SaatCMS backend
                 -> PostgreSQL
```

The browser talks to the dashboard. Server Components and Server Actions talk to the backend. CMS bearer credentials stay in the dashboard's server environment and are never returned to browser JavaScript.

The project uses:

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS for the interface
- Server Components and Server Actions for data access and mutations
- Vitest, React Testing Library, and V8 coverage
- Vinext as the development and production runtime

## Prerequisites

- Node.js 22.15.0 or newer
- npm, using the version bundled with a supported Node.js release
- Access to a SaatCMS backend
- Editor or admin credentials only if you need to test CMS management flows

Check your local tools before installing:

```powershell
node --version
npm --version
```

Use `npm ci` for a clean, lockfile-exact install. Use `npm install` only when intentionally changing dependencies.

## First-time setup

From the repository root in PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

On macOS or Linux, copy the example with `cp .env.example .env` instead.

Replace every placeholder in `.env` before relying on the application. The development server is normally available at [http://localhost:3000](http://localhost:3000). Open `/login` and either sign in with a configured account or choose **Continue as visitor**.

Real `.env` files are ignored by Git. Never add them with a force flag, paste their contents into an issue, or include them in logs or screenshots.

## Environment reference

This is a safe example, not a working credential set:

```dotenv
SAATCMS_API_BASE_URL="https://backend-developer-take-home-assignment.onrender.com"
CMS_API_KEYS="reviewer:editor:replace-with-at-least-32-characters,owner:admin:replace-with-at-least-32-characters"
DASHBOARD_SESSION_SECRET="replace-with-an-independent-random-value-at-least-32-characters"
SAATCMS_REQUEST_TIMEOUT_MS="30000"
```

| Variable                     | Required | Accepted value                                | Purpose                                                                                                                                   |
| ---------------------------- | -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `SAATCMS_API_BASE_URL`       | Yes      | An `http://` or `https://` origin             | Base origin for the backend. Do not append `/api/v1`; one trailing slash is removed automatically.                                        |
| `CMS_API_KEYS`               | Yes      | Comma-separated `actorId:role:secret` entries | Dashboard accounts and the bearer credentials used for protected backend calls. At least one valid `editor` or `admin` entry is required. |
| `DASHBOARD_SESSION_SECRET`   | Yes      | At least 32 characters                        | Signs dashboard session cookies. It must be random and independent from every CMS credential.                                             |
| `SAATCMS_REQUEST_TIMEOUT_MS` | No       | Integer from `1000` through `120000`          | Backend request timeout in milliseconds. Defaults to `30000`.                                                                             |

`CMS_API_KEYS` parsing has a few deliberate rules:

- Actor IDs must be unique.
- Only `editor` and `admin` entries are accepted by the dashboard.
- Each secret must contain at least 32 characters.
- A secret may contain colons because everything after the role is rejoined.
- A secret cannot contain a comma because commas separate accounts.
- Malformed entries are ignored, but startup/authentication fails if no usable account remains. Duplicate valid actor IDs are treated as configuration errors.

None of these variables may use the `NEXT_PUBLIC_` prefix. They are server-only. Restart the development server after changing `.env`; the validated configuration is cached for the life of the process.

`PORT` and `NODE_VERSION` are deployment/runtime settings rather than part of the application environment schema. Render supplies `PORT`, and `render.yaml` pins `NODE_VERSION`.

## Access modes and security boundary

There are two session types:

### Visitor

A visitor gets a signed, eight-hour, HttpOnly session with no actor or bearer secret. Visitors can use:

- `/dashboard`
- `/tools/metadata`
- `/tools/playback`
- `/system`

CMS navigation is hidden. Direct access to `/content`, `/channels`, `/epg`, or nested CMS routes redirects to `/dashboard?notice=cms-account-required`. The API client independently rejects visitor calls to protected endpoints before making a backend request.

Public upstream calls are restricted to `/`, `/health`, `/ready`, and `/api/v1/mw/*`. They are made with `authenticated: false` and do not receive an `Authorization` header.

### Editor or admin account

Account login compares the submitted actor ID and secret against `CMS_API_KEYS` on the server. The cookie stores only the account identity, session kind, and expiry. Each protected request resolves the account again and adds its bearer secret on the server.

Editor and admin currently see the same screens. The backend remains the authorization authority; for example, Live Channel deletion can still be rejected when the account lacks permission.

Sessions use an HMAC-SHA-256 signature and expire after eight hours. Cookies are `HttpOnly`, `SameSite=Lax`, scoped to `/`, and `Secure` in production.

## Code organization

```text
app/
  login/                         Login, visitor entry, and logout actions
  (dashboard)/                   Any signed dashboard session required
    (cms)/                       Editor/admin account session required
      content/                   Content routes
      channels/                  Channel and channel-scoped EPG routes
      epg/                       EPG channel selector
    dashboard/                   Overview
    system/                      Backend liveness/readiness
    tools/                       Public metadata and playback tools
components/
  content/                       Content forms and supporting UI
  channels/                      Channel forms and mutations
  epg/                           EPG forms, schedule UI, and time helpers
lib/
  content/                       Content mapping and server actions
  accounts.ts                    Account parsing and authentication
  api.ts                         Server-only backend client
  env.ts                         Environment validation
  session.ts                     Signed account/visitor sessions and guards
  types.ts                       Shared backend response types
test/                            Cross-cutting test setup and library tests
worker/                          Vinext worker entry point
```

Parenthesized App Router groups organize access control without appearing in the URL. The `(dashboard)` layout requires any valid dashboard session. Its nested `(cms)` layout requires an editor/admin account, which means visitor restrictions are enforced on the server before a CMS page renders.

## Implementation conventions

Keep changes small enough to review but large enough to represent one coherent behavior.

### Data access

- Use `saatCmsRequest` in `lib/api.ts`; do not call the backend directly from a Client Component.
- Keep backend credentials and environment reads in modules marked `server-only`.
- Pass safe relative paths only. The API client rejects absolute URLs, protocol-relative paths, backslashes, and traversal segments.
- Set `authenticated: false` only for a route on the explicit public allowlist.
- Never construct or accept an `Authorization` header outside the shared API client.
- Preserve backend `ETag`, `If-Match`, `X-Request-Id`, error code, and HTTP status behavior.
- Keep reads uncached unless a feature has an explicit, reviewed caching design. The current client uses `cache: "no-store"`.

### Server and client components

- Prefer Server Components for protected layouts and initial reads.
- Use Client Components only for browser interaction and local UI state.
- Use Server Actions for login, mutations, and interactive middleware tools.
- Validate and normalize form data at the server-action/domain boundary. Client validation improves feedback but is not an authorization boundary.
- Revalidate affected routes after a successful mutation and redirect to an unambiguous result page.

### Domain behavior

- Content hierarchy is `Series -> Season -> Episode`; Movies remain top-level.
- Blank nullable metadata means inheritance. An explicit `false` premium value and an intentionally empty geo-block override must not be collapsed into inheritance.
- Content type is immutable during edit.
- Never make Content deletion recursive. A parent with children must fail safely.
- Channel deletion requires the exact slug and the backend `confirm=true` flag.
- EPG edit requests must carry the current ETag. Convert local form times to ISO instants at the boundary.
- Treat write conflicts as a reload-and-review workflow, not an automatic retry.

### Errors and secrets

- Show safe backend messages and stable error codes. Include the backend request ID when available so operators can correlate logs.
- Normalize unknown exceptions to a generic message. Do not expose stack traces to users.
- Never log passwords, bearer tokens, cookies, raw `CMS_API_KEYS`, or full request headers.
- Do not duplicate backend contracts into another source of truth. The backend repository remains authoritative for endpoint behavior.
- Do not modify the backend repository or its Git history unless a task explicitly places it in scope.

### Styling and accessibility

- Reuse the existing dark theme tokens and shared component classes in `app/globals.css`.
- Keep semantic state colors consistent: green for healthy/success, amber for degraded/conflict, red for destructive/error, and slate for neutral state.
- Preserve visible focus styles, form labels, keyboard operation, and alert semantics.
- Responsive refinement is welcome, but desktop workflows are the current product priority.

## Commands

| Command                 | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Starts the local Vinext development server.             |
| `npm run build`         | Produces the production bundle.                         |
| `npm run start`         | Runs the built production bundle. Build first.          |
| `npm test`              | Runs the Vitest suite once.                             |
| `npm run test:watch`    | Runs Vitest in watch mode while developing.             |
| `npm run test:coverage` | Runs tests with V8 text and HTML coverage reports.      |
| `npm run typecheck`     | Runs strict TypeScript checking without emitting files. |
| `npm run lint`          | Runs the Next.js/TypeScript ESLint configuration.       |
| `npm audit --omit=dev`  | Audits runtime dependencies used in production.         |

## Tests and coverage

Tests live beside feature code when they exercise a specific form/action and under `test/` for cross-cutting server foundations. The shared test setup installs `jest-dom` matchers and cleans the DOM after each test. `server-only` is aliased to a test shim so server modules can be exercised under Vitest without weakening the production boundary.

The coverage gate includes:

- `app/**/actions.ts`
- `app/**/*-form.tsx`
- `components/**/*.{ts,tsx}`
- `lib/**/*.{ts,tsx}`

Type declarations and `lib/types.ts` are excluded. Branch, function, line, and statement coverage must each remain at or above 80%. The HTML report is written to `coverage/index.html`.

For a complete local gate, run:

```powershell
npm audit --omit=dev
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

For changes that affect runtime behavior, also verify the production bundle:

```powershell
npm run build
npm run start
```

Add regression tests at the closest useful boundary. Important examples in the current suite include session tampering/expiry, visitor authorization isolation, safe API paths, ETag forwarding, inheritance mapping, destructive confirmation, EPG time conversion, and public-tool request headers.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. It uses Node.js 22.15.0 and performs:

1. `npm ci`
2. `npm audit --omit=dev`
3. type-checking
4. linting
5. tests with coverage
6. a production build

CI uses non-secret placeholder credentials that satisfy the environment schema. They are not valid backend credentials and must never be reused outside CI.

## Git workflow

Use `main` as the stable, deployable branch. A typical change should follow this shape:

1. Start from an up-to-date `main`.
2. Create a focused branch such as `feature/content-bulk-filter`, `fix/epg-timezone`, or `docs/operator-handbook`.
3. Keep unrelated user changes intact and never stage an ignored `.env` file.
4. Commit cohesive units with clear subjects such as `feat:`, `fix:`, `test:`, `docs:`, or `chore:`.
5. Avoid both all-project “mega commits” and one-line commits that only make sense when squashed with their neighbors.
6. Run the complete quality gate before requesting review.
7. Merge only when the branch is complete and CI is green. A no-fast-forward merge is useful for preserving the phase or feature boundary when the branch contains several meaningful commits.

Before committing, inspect exactly what will be included:

```powershell
git status --short
git diff --check
git diff --cached
```

Never rewrite shared history, force-push, publish, deploy, or modify another repository unless the task explicitly authorizes it.

## Adding a feature safely

Use this checklist when extending the dashboard:

- Confirm whether the backend endpoint is public or CMS-authenticated.
- Place its route beneath the correct access-control layout.
- Reuse the server-only API client and existing error normalization.
- Model ETag and destructive confirmation requirements before building the form.
- Add success, validation, authorization, backend-error, and conflict tests as applicable.
- Update the human-facing documentation when routes, variables, runbooks, or operational behavior change.
- Run all local gates and the relevant browser smoke path.

## Related documentation

- [Documentation home](README.md)
- [Project README](../README.md)
- [Deployment and operations](deployment-and-operations.md)
- [Troubleshooting](troubleshooting.md)
- [Low-level implementation plan](project/plans/admin-dashboard-low-level-implementation-plan.md)
- [High-level project plan](project/plans/admin-dashboard-project-plan.md)
