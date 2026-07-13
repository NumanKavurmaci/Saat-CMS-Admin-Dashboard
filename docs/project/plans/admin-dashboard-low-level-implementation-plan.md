# SaatCMS Admin Dashboard Low-Level Implementation Plan

> **Planning record.** This document preserves implementation decisions,
> acceptance criteria, and phase history. For current setup, usage, and
> operations, start with the [documentation handbook](../../README.md).

## 1. Purpose and Status

This document is the implementation-level companion to the
[project plan](admin-dashboard-project-plan.md). It records concrete files,
route behavior, backend mappings, tests, phase gates, and remaining release
work.

Precedence when behavior is unclear:

1. Implemented SaatCMS backend behavior and OpenAPI contract.
2. Current backend API/domain documentation.
3. This low-level plan.
4. The high-level project plan.

Status as of July 13, 2026:

- Phases 0-5 and visitor access are implemented and merged into `main`.
- Typecheck, lint, Vitest coverage, production build, and production dependency
  audit are the required local/CI gates.
- `render.yaml` is implemented, but no external dashboard service is considered
  deployed until Render is connected and smoke tests pass.

## 2. Locked Decisions

- Stack: Next.js App Router, React, strict TypeScript, Tailwind CSS, Vinext,
  Vitest, and React Testing Library.
- Source layout: root-level `app/`, `components/`, `lib/`, and `test/`; there is
  no `src/` directory.
- UI primitives: small local components plus Lucide icons; shadcn/ui is not a
  dependency.
- Data flow: Server Components for protected reads and Server Actions for
  mutations/tester submissions.
- State: URL query parameters, server data, and local component state; no global
  client-state library.
- Authentication: users may start a signed visitor session or sign in with a
  configured `editor` or `admin` account.
- Roles: editor/admin see the same CMS interface; visitors see only routes backed
  by public endpoints. SaatCMS remains the account authorization authority.
- Secrets: backend bearer credentials remain in server-only environment data.
- EPG: chronological channel/day view with local-to-UTC conversion.
- Playback: dedicated tester page.
- Deployment: separate Render web service using the live SaatCMS backend.
- Deferred: Datadog, analytics, audit UI, Playwright, drag-and-drop scheduling,
  and role-specific dashboard behavior.

## 3. Runtime Data Flow

```text
Browser request
  -> root or protected App Router page
       -> requireDashboardSession()
       -> visitor session or actor lookup from CMS_API_KEYS
       -> saatCmsRequest(relativePath)
            -> account bearer for CMS requests, no bearer for public requests
            -> no-store fetch with timeout
            -> SaatCMS backend
```

Mutation flow:

```text
Form
  -> Server Action
       -> validate/map fields
       -> saatCmsRequest(POST|PATCH|DELETE)
       -> send If-Match where required
       -> normalize safe API failure or revalidate affected paths
       -> redirect after success
```

Rules:

- Do not introduce a generic `/api/proxy/*` route.
- Every CMS backend request resolves the current account session again.
- Public unauthenticated calls are restricted to `/`, `/health`, `/ready`, and
  `/api/v1/mw/*`.
- Visitor requests are limited to that public allowlist and never include an
  `Authorization` header.
- API paths must be safe relative paths without traversal, backslashes, or
  protocol-relative forms.
- API errors expose only status, error code, safe message, and request ID.
- Unexpected, timeout, and non-JSON failures map to safe dashboard errors.
- Backend reads use `cache: "no-store"`.
- Successful mutations revalidate affected list/detail routes.

## 4. Environment Contract

`.env.example` is the canonical template:

```dotenv
SAATCMS_API_BASE_URL="https://backend-developer-take-home-assignment.onrender.com"
CMS_API_KEYS="reviewer:editor:replace-with-at-least-32-characters,owner:admin:replace-with-at-least-32-characters"
DASHBOARD_SESSION_SECRET="replace-with-at-least-32-random-characters"
SAATCMS_REQUEST_TIMEOUT_MS="30000"
```

Validation requirements:

- Base URL is absolute HTTP(S), normalized without a trailing slash.
- Account entries use `<actorId>:<role>:<secret>`.
- Only `editor` and `admin` accounts with secrets of at least 32 characters are
  accepted by the dashboard parser.
- Duplicate accepted actor IDs fail configuration parsing.
- At least one accepted dashboard account is required.
- Session secret contains at least 32 characters.
- Timeout is an integer from 1,000 to 120,000 milliseconds.
- Invalid environment errors are diagnostic but never include secret values.
- `.env` and other real environment files stay ignored; `.env.example` remains
  tracked.

Implementation files:

- `lib/env.ts`
- `lib/accounts.ts`
- `.env.example`

## 5. Authentication and Session Contract

Access behavior:

1. **Continue as visitor** creates an eight-hour signed visitor session without
   selecting or exposing a CMS account.
2. Account login accepts actor ID and secret in `app/login/login-form.tsx`.
3. `app/login/actions.ts` compares account secrets without early byte
   comparison and returns one generic invalid-credentials error.
4. Either successful path creates an HMAC-SHA-256 signed session and redirects
   to `/dashboard`.

Cookie settings:

- Name: `saatcms_dashboard_session`
- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- `Secure` in production
- Absolute expiry eight hours after creation

The discriminated session payload contains `kind` and `expiresAt`; account
sessions also contain `actorId`, while visitor sessions contain no actor or CMS
secret. Each account session read requires the actor to still exist in the
current `CMS_API_KEYS` value. Logout (shown as **Sign in** for a visitor) deletes
the cookie and redirects to `/login`.

`app/(dashboard)/layout.tsx` accepts either signed session.
`app/(dashboard)/(cms)/layout.tsx` additionally requires an account session;
visitor access redirects to `/dashboard?notice=cms-account-required`.

Implementation files:

- `app/page.tsx`
- `app/login/page.tsx`
- `app/login/login-form.tsx`
- `app/login/actions.ts`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/(cms)/layout.tsx`
- `lib/accounts.ts`
- `lib/session.ts`

## 6. Shared API Contract

`lib/api.ts` returns:

```ts
type ApiResult<T> = {
  data: T;
  etag: string | null;
  requestId: string | null;
  status: number;
};
```

Expected failures become `SaatCmsApiError` with:

```ts
type ApiErrorShape = {
  status: number;
  errorCode: string;
  message: string;
  requestId: string | null;
};
```

Required request behavior:

- Attach the current actor secret as `Authorization: Bearer ...` only for CMS
  requests from an account session.
- Explicitly public requests never receive an `Authorization` header, including
  when initiated by a visitor.
- Reject visitor CMS requests before making an upstream fetch.
- Add JSON headers only when a body exists.
- Forward `If-Match` when supplied.
- Capture `ETag` and `X-Request-Id`.
- Return `undefined` for successful `204` bodies.
- Abort after `SAATCMS_REQUEST_TIMEOUT_MS`.

## 7. Route Contract

| Route | Access | Implementation |
| --- | --- | --- |
| `/` | Public entry | Redirect to `/dashboard` or `/login` based on session |
| `/login` | Public entry | Account sign-in or visitor-session start |
| `/dashboard` | Visitor/account | Public health/readiness; CMS totals for accounts only |
| `/content` | Account only | Content filters, pagination, and table |
| `/content/new` | Account only | Content create form |
| `/content/[id]` | Account only | Content edit/delete and metadata comparison |
| `/channels` | Account only | Channel filters, pagination, and cards |
| `/channels/new` | Account only | Channel create form |
| `/channels/[channelId]` | Account only | Channel edit/delete and EPG link |
| `/epg` | Account only | Channel selector |
| `/channels/[channelId]/epg` | Account only | Day-window schedule |
| `/channels/[channelId]/epg/new` | Account only | EPG create form |
| `/channels/[channelId]/epg/[programId]/edit` | Account only | EPG edit form |
| `/tools/metadata` | Visitor/account | Public metadata resolution form |
| `/tools/playback` | Visitor/account | Public playback authorization form |
| `/system` | Visitor/account | Public backend origin, liveness, and readiness |

All dashboard routes require a signed session through
`app/(dashboard)/layout.tsx`. CMS routes are nested under
`app/(dashboard)/(cms)/layout.tsx`, are hidden from visitor navigation, and are
server-blocked on direct access. The exact visitor-visible dashboard routes are
`/dashboard`, `/tools/metadata`, `/tools/playback`, and `/system`.

Navigation order:

1. Overview
2. Content
3. Live Channels
4. EPG Schedule
5. Metadata Resolver
6. Playback Tester
7. System

## 8. Phase 0: Foundation — Implemented

### AD-001 Runtime and repository setup

Files:

- `package.json`, `package-lock.json`
- `tsconfig.json`, `next.config.ts`, `vite.config.ts`, `vitest.config.ts`
- `postcss.config.mjs`, `eslint.config.mjs`
- `worker/index.ts`
- `.gitignore`, `.gitattributes`

Implemented acceptance criteria:

- Node.js `>=22.13.0` is declared.
- `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, and
  `test:coverage` scripts exist.
- Strict TypeScript, Tailwind, ESLint, Vitest, and Vinext are configured.
- Real environment files and generated outputs are ignored.

### AD-002 Application shell

Files:

- `app/layout.tsx`, `app/globals.css`
- `app/(dashboard)/layout.tsx`, `loading.tsx`, `error.tsx`
- `app/not-found.tsx`
- `components/app-shell.tsx`
- shared components in `components/`

Implemented acceptance criteria:

- Dark token system and shared panel/form/button styles.
- Desktop sidebar and small-screen drawer.
- Current route indication, actor/role display, logout, and skip-to-content
  target.
- Visitor navigation excludes every CMS route and offers a return to account
  sign-in.
- Scroll containment for wide tables.
- Shared loading, unexpected error, not-found, and API error presentation.

### AD-003 Test and coverage harness

Files:

- `vitest.config.ts`
- `test/setup.ts`, `test/server-only.ts`

Implemented acceptance criteria:

- `jsdom`, React Testing Library, jest-dom, and `@/` alias are configured.
- The `server-only` marker is safely aliased only in tests.
- Coverage includes Server Action files, form components, shared components,
  and library modules.
- Branch, function, line, and statement thresholds are each 80%.
- Passive route pages and type-only modules are not used to inflate or suppress
  the selected core-logic gate.

## 9. Phase 1: Auth and API Client — Implemented

### AD-101 Environment and account parsing

Acceptance criteria:

- Valid editor/admin entries parse.
- Invalid roles and short/malformed entries are ignored.
- Duplicates and an empty accepted account set fail safely.
- Secrets containing additional colons remain intact.
- Authentication returns no actor-specific failure detail.

Tests:

- `test/env.test.ts`
- `test/accounts.test.ts`

### AD-102 Signed sessions and protected routes

Acceptance criteria:

- Session signature, expiry, tamper rejection, cookie flags, logout, and account
  removal behavior are tested.
- Unauthenticated protected requests redirect to login.
- Visitor sessions are signed, contain no actor/CMS secret, and may use general
  dashboard routes.
- Visitor access to nested CMS routes is redirected to the account-required
  dashboard notice.
- CMS secrets are not stored in any session payload.

Tests:

- `test/session.test.ts`
- `app/login/actions.test.ts`
- `app/login/login-form.test.tsx`

### AD-103 Server API client

Acceptance criteria:

- Account Authorization, bearer-free visitor/public routes, body encoding,
  ETags, request IDs, and 204 are covered.
- Absolute, traversal, encoded traversal, backslash, and protocol-relative paths
  are rejected.
- Protected CMS paths cannot be made unauthenticated.
- Visitor sessions cannot call CMS paths and are rejected before upstream fetch.
- Structured, non-JSON, timeout, network, and missing-session failures normalize
  safely.

Tests:

- `test/api.test.ts`

## 10. Phase 2: Content Management — Implemented

Backend mapping:

| UI action | Request |
| --- | --- |
| List/filter | `GET /api/v1/cms/content` |
| Create | `POST /api/v1/cms/content` |
| Detail | `GET /api/v1/cms/content/{id}` |
| Edit | `PATCH /api/v1/cms/content/{id}` with `If-Match` |
| Delete leaf | `DELETE /api/v1/cms/content/{id}` |
| Resolved preview | `GET /api/v1/mw/content/{id}` |

### AD-201 Content model and form mapping

Files:

- `lib/content/model.ts`
- `components/content/content-form.tsx`
- `components/content/parent-search.tsx`

Acceptance criteria:

- Support `SERIES`, `SEASON`, `EPISODE`, and `MOVIE`.
- Season requires a Series parent; Episode requires a Season parent.
- Series/Movie cannot retain a parent.
- Blank inheritable fields map to `null`.
- Premium supports inherit, explicit true, and explicit false.
- Geo override distinguishes inherit from an explicit empty list.
- Protected playback URL remains a CMS-only field.

### AD-202 Content list and detail workflows

Files:

- `app/(dashboard)/(cms)/content/page.tsx`
- `app/(dashboard)/(cms)/content/new/page.tsx`
- `app/(dashboard)/(cms)/content/[id]/page.tsx`
- `lib/content/actions.ts`
- `components/content/metadata-preview.tsx`
- `components/content/delete-content.tsx`

Acceptance criteria:

- URL-backed title/type/parent/page/page-size filtering.
- Backend pagination totals drive navigation.
- Parent search remains backend-bounded and accepts an exact ID.
- Detail reads preserve ETag and compare raw overrides with resolved metadata.
- Patch forwards `If-Match`; conflicts require user recovery.
- Delete requires explicit confirmation and refuses recursive parent deletion.

Tests:

- `lib/content/model.test.ts`
- `lib/content/actions.test.ts`
- `components/content/content-form.test.tsx`
- `components/content/parent-search.test.tsx`
- `components/content/metadata-preview.test.tsx`
- `components/content/delete-content.test.tsx`

## 11. Phase 3: Channels and EPG — Implemented

Channel mapping:

| UI action | Request |
| --- | --- |
| List/filter | `GET /api/v1/cms/channels` |
| Create | `POST /api/v1/cms/channels` |
| Detail | `GET /api/v1/cms/channels/{channelId}` |
| Edit | `PATCH /api/v1/cms/channels/{channelId}` with `If-Match` |
| Delete | `DELETE /api/v1/cms/channels/{channelId}?confirm=true` |

### AD-301 Channel workflows

Files:

- `app/(dashboard)/(cms)/channels/page.tsx`
- `app/(dashboard)/(cms)/channels/new/page.tsx`
- `app/(dashboard)/(cms)/channels/[channelId]/page.tsx`
- `components/channels/actions.ts`
- `components/channels/channel-form.tsx`
- `components/channels/delete-channel-form.tsx`

Acceptance criteria:

- URL-backed name/slug/page/page-size filters.
- Create/edit validation preserves entered data on failure.
- Edit forwards the latest ETag.
- Delete requires the current slug, explains EPG cascade, and sends
  `confirm=true`.
- Editor/admin share controls; backend `CMS_FORBIDDEN` remains authoritative.

Tests:

- `components/channels/actions.test.ts`
- `components/channels/channel-forms.test.tsx`

EPG mapping:

| UI action | Request |
| --- | --- |
| Day schedule | `GET /api/v1/cms/channels/{channelId}/epg` with UTC window |
| Create | `POST /api/v1/cms/channels/{channelId}/epg` |
| Detail | `GET /api/v1/cms/channels/{channelId}/epg/{programId}` |
| Edit | `PATCH /api/v1/cms/channels/{channelId}/epg/{programId}` with `If-Match` |
| Delete | `DELETE /api/v1/cms/channels/{channelId}/epg/{programId}` |

### AD-302 EPG time and CRUD workflows

Files:

- `app/(dashboard)/(cms)/epg/page.tsx`
- `app/(dashboard)/(cms)/channels/[channelId]/epg/page.tsx`
- `app/(dashboard)/(cms)/channels/[channelId]/epg/new/page.tsx`
- `app/(dashboard)/(cms)/channels/[channelId]/epg/[programId]/edit/page.tsx`
- `components/epg/time.ts`
- `components/epg/actions.ts`
- EPG components under `components/epg/`

Acceptance criteria:

- A local date maps to exact local-midnight boundaries serialized as UTC.
- Invalid date/window input falls back safely.
- Schedule includes programs intersecting the selected day and orders them by
  start time.
- Channel selector, previous/today/next navigation, and date input preserve the
  correct UTC window.
- Forms display local values and submit ISO UTC instants.
- Channel ID is route-scoped, not editable form data.
- Edit forwards ETag; overlap/conflict errors preserve values.
- Delete requires browser confirmation.

Tests:

- `components/epg/time.test.ts`
- `components/epg/actions.test.ts`
- `components/epg/epg-components.test.tsx`

## 12. Phase 4: Overview and Tools — Implemented

### AD-401 Overview

File: `app/(dashboard)/dashboard/page.tsx`

Behavior:

- Fetch public `/health` and `/ready` for every session.
- Fetch Content and Channel `pageSize=1` totals only for account sessions.
- Use `PageResponse.total`, not item count, for totals.
- Keep successful cards visible when a sibling request fails.
- Provide quick links for catalog, channels, and playback.
- For visitors, show only links to public metadata, playback, and system tools.
- Do not claim analytics or an EPG preview.

### AD-402 System status

File: `app/(dashboard)/system/page.tsx`

Behavior:

- Show configured backend host, liveness, and readiness.
- Never show credentials or raw environment values beyond the safe host.
- Render liveness and readiness failures independently.

### AD-403 Metadata Resolver

Files:

- `app/(dashboard)/tools/metadata/page.tsx`
- `app/(dashboard)/tools/metadata/actions.ts`
- `app/(dashboard)/tools/metadata/metadata-form.tsx`

Behavior:

- Call `GET /api/v1/mw/content/{id}` server-side.
- Display resolved metadata without rendering a stray playback URL.
- Preserve safe structured status, code, and message errors.

### AD-404 Playback Tester

Files:

- `app/(dashboard)/tools/playback/page.tsx`
- `app/(dashboard)/tools/playback/actions.ts`
- `app/(dashboard)/tools/playback/playback-form.tsx`

Behavior:

- Accept Content ID, user ID, two-letter country, and device.
- Normalize country to uppercase.
- Send `X-User-Id`, `X-User-Country`, and `X-Device-Type` server-side.
- Display playback URL only for successful allowed responses.
- Preserve input and show safe status/code/message on failure.

Tests:

- `app/(dashboard)/tools/metadata/actions.test.ts`
- `app/(dashboard)/tools/metadata/metadata-form.test.tsx`
- `app/(dashboard)/tools/playback/actions.test.ts`
- `app/(dashboard)/tools/playback/playback-form.test.tsx`
- `components/app-shell.test.tsx`
- `test/components.test.tsx`

## 13. Phase 5: Hardening and Release — Local Work Implemented

### AD-501 Failure and security consistency

Implemented:

- Shared route loading and unexpected-error boundaries.
- Explicit empty/API error states across CMS and EPG screens.
- Manual conflict recovery; no automatic mutation replay.
- Safe public-route allowlist and path validation.
- Signed visitor sessions, visitor-filtered navigation, and a nested server-side
  account guard for every CMS route.
- No Authorization header on visitor/public upstream calls.
- No-store upstream requests.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
  `Permissions-Policy` headers.
- CI uses placeholder credentials only.

### AD-502 Automated quality gates

Required commands:

```powershell
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev
```

`.github/workflows/ci.yml` runs the same gates on pull requests and pushes to
`main`. Tests mock `fetch`; normal Vitest execution must never call the live
backend.

### AD-503 Render Blueprint — Configured, Not Deployed

`render.yaml` declares:

- Node web service `saatcms-admin-dashboard`
- Free plan
- Node `22.13.0`
- Build `npm ci && npm run build`
- Start `npm run start`
- Health check `/login`
- Live backend origin
- Prompted `CMS_API_KEYS`
- Generated `DASHBOARD_SESSION_SECRET`
- 30-second upstream timeout

Remaining release steps:

1. Connect the repository as a Render Blueprint.
2. Enter the same editor/admin `CMS_API_KEYS` entries used by the backend.
3. Deploy and confirm `/login` is healthy.
4. Run the manual reviewer matrix below with disposable records.
5. Check browser storage, rendered markup, logs, and error output for secrets.
6. Record the deployed URL and release result after verification.

## 14. Manual Deployed Smoke Matrix

Visitor mode:

1. Start a visitor session and confirm only Overview, Metadata Resolver,
   Playback Tester, and System appear in navigation.
2. Confirm `/dashboard`, `/tools/metadata`, `/tools/playback`, and `/system`
   work.
3. Request `/content`, `/channels`, `/epg`, and representative nested CMS routes
   directly; each redirects to the account-required dashboard notice.
4. Resolve existing and missing metadata; test allowed, geo-blocked, and
   device-blocked playback cases.
5. Confirm server/backend diagnostics show no `Authorization` header for
   visitor public requests, then use **Sign in** to return to `/login`.

Account mode:

1. Editor login/logout works and invalid login remains generic.
2. Overview shows public status plus CMS totals.
3. Content filter, create, edit, resolved preview, conflict handling, and leaf
   delete work with disposable records.
4. Channel create/edit works; editor delete receives the backend forbidden
   response.
5. Admin deletes a disposable Channel using typed slug confirmation.
6. EPG create, adjacent create, overlap rejection, edit, and delete work.
7. Metadata, playback, System, and backend unavailable presentation still work.

Do not run destructive checks against non-disposable records.

## 15. Credential Rotation and Rollback

CMS credential rotation:

1. Prepare the replacement editor/admin entries.
2. Update the backend `CMS_API_KEYS`.
3. Immediately update the dashboard `CMS_API_KEYS` with the matching value.
4. Deploy both services.
5. Verify a new login and one authenticated read for each required actor.
6. Remove obsolete values only after the new path is confirmed.

Session-secret rotation:

- Change only `DASHBOARD_SESSION_SECRET` on the dashboard.
- Expect every existing dashboard session to become invalid.
- Verify a new login after deployment.

Rollback:

- Restore the last known-good dashboard deploy through Render.
- Do not roll back the backend unless the incident originated there.
- If credentials changed, restore a matching `CMS_API_KEYS` value on both
  services before retesting.
- Never commit current or previous secrets to document the rollback.

## 16. Delivery and Git Boundaries

Recommended cohesive commit boundaries for the initial release:

1. Runtime, environment, authentication, API client, and base tests.
2. Application shell, overview, system, and middleware tools.
3. Content management and its tests.
4. Channel/EPG management and their tests.
5. CI, Render configuration, quality hardening, and documentation.

Each commit should remain buildable in sequence where practical and must avoid
unrelated generated output or real environment files. Merge the completed
feature branch to `main` only after the full quality gate passes. Pushing and
external deployment remain separate explicit actions.

## 17. Definition of Done

Implementation complete:

- All documented routes and backend workflows are present.
- Visitor and editor/admin sessions, route guards, and server-only credentials
  behave as specified.
- ETag, inheritance, deletion, time conversion, overlap, and playback failure
  semantics are tested.
- Typecheck, lint, coverage, build, and production audit pass.
- CI, Render Blueprint, README, and operational procedures are present.

Release complete:

- Render dashboard service exists and reports healthy.
- Deployed browser/log checks show no credential exposure.
- Editor and admin authentication works.
- The manual smoke matrix passes against the live backend.
- Deployment URL and release result are documented.

Datadog and analytics remain intentionally deferred.
