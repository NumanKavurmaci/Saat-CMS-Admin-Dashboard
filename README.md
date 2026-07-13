# SaatCMS Admin Dashboard

A server-rendered administration dashboard for the SaatCMS Middleware Core. It
provides authenticated Content, Live Channel, and EPG management plus metadata,
playback, and system-status tools against the existing backend.

## Stack

- Next.js App Router and React with strict TypeScript
- Tailwind CSS
- Server Components and Server Actions
- Vitest and React Testing Library
- Vinext production runtime

CMS bearer credentials stay on the dashboard server. The browser receives only
an HMAC-signed, HttpOnly session cookie containing the actor ID and expiry.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Set the copied `.env` values before signing in:

- `SAATCMS_API_BASE_URL`: SaatCMS backend origin, without an API path.
- `CMS_API_KEYS`: the same `<actorId>:<role>:<secret>` entries configured on
  the backend. Dashboard login accepts `editor` and `admin` entries.
- `DASHBOARD_SESSION_SECRET`: an independent random value of at least 32
  characters. Do not reuse a CMS bearer secret.
- `SAATCMS_REQUEST_TIMEOUT_MS`: upstream timeout from 1,000 to 120,000 ms.

The development server is available at `http://localhost:3000`. Real `.env`
files are ignored by Git and must never be committed.

## Available workflows

- `/dashboard`: health/readiness and bounded resource totals
- `/content`: filtered Content CRUD, hierarchy, inherited metadata, playback,
  safe deletion, and ETag conflict recovery
- `/channels`: Live Channel CRUD with explicit destructive confirmation
- `/epg`: channel selector for opening a schedule
- `/channels/[channelId]/epg`: simple day-based EPG scheduling and overlap
  feedback
- `/channels/[channelId]/epg/new`: create a program using local times
- `/channels/[channelId]/epg/[programId]/edit`: edit a program with its ETag
- `/tools/metadata`: resolved middleware metadata tester
- `/tools/playback`: playback authorization tester with country/device headers
- `/system`: configured backend origin, liveness, and readiness

Editors and admins intentionally see the same interface. SaatCMS remains the
authorization source of truth, including admin-only Live Channel deletion.

## Quality gates

```powershell
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev
```

Coverage is enforced at 80% for the selected server actions, forms, shared
components, and library modules in `vitest.config.ts`. GitHub Actions runs the
same production audit, typecheck, lint, coverage, and build gates for pull
requests and pushes to `main`.

Run the production bundle locally with `npm run start`. It binds to `0.0.0.0`
and uses Render's `PORT` environment variable automatically.

## Render deployment

The repository includes [`render.yaml`](render.yaml) for a separate Render web
service. Connect the repository as a Blueprint, then provide `CMS_API_KEYS` when
Render prompts for the `sync: false` secret. The Blueprint generates a separate
`DASHBOARD_SESSION_SECRET` and points to the live SaatCMS backend by default.

Render services do not automatically share environment variables. Keep the
dashboard's `CMS_API_KEYS` synchronized with the backend (or manage both through
a shared Render environment group). Deployments use:

- Build: `npm ci && npm run build`
- Start: `npm run start`
- Health check: `/login`

No Render service is created by this repository alone; deployment remains an
explicit action in the Render dashboard.

### Deploy and verify

1. Create or update the Blueprint from `render.yaml`.
2. Set `CMS_API_KEYS` to the same editor/admin entries configured on the
   backend, then deploy.
3. Confirm `/login` responds, sign in with a disposable reviewer account, and
   exercise status, Content, Channel, EPG, metadata, and playback workflows.
4. Use disposable records for destructive smoke tests and remove them when the
   check is complete.

### Credential rotation

Rotate a CMS credential on both services as one change: update the backend
first, update the dashboard's `CMS_API_KEYS` immediately afterward, then deploy
both services and verify a new login. Existing dashboard sessions for an actor
whose entry was removed become unusable on their next authenticated request.
Rotate `DASHBOARD_SESSION_SECRET` independently when needed; doing so signs out
all dashboard sessions and does not change backend API credentials.

### Rollback

If a dashboard deployment fails, use Render's rollback/redeploy control to
restore the last known-good dashboard deploy. Keep the backend deployment in
place unless the incident originated there. If a credential change is being
rolled back, restore the matching `CMS_API_KEYS` value on both services before
retesting login and one authenticated read. Never put rollback secrets in Git.

## Project documentation

- [High-level project plan](docs/project/plans/admin-dashboard-project-plan.md)
- [Low-level implementation plan](docs/project/plans/admin-dashboard-low-level-implementation-plan.md)
