# SaatCMS Admin Dashboard Low-Level Implementation Plan

## 1. Purpose and Precedence

This document converts the [high-level dashboard plan](admin-dashboard-project-plan.md)
into an implementation-ready backlog. It defines the planned routes, modules,
data flow, task order, acceptance criteria, and Vitest coverage for the first
release.

When documents disagree, use this order:

1. The implemented SaatCMS backend and its OpenAPI contract.
2. Current backend API and domain documentation.
3. This low-level dashboard plan.
4. The high-level dashboard plan.

The dashboard repository is currently documentation-only. Phase 0 creates the
application foundation.

## 2. Locked Decisions

- Use Next.js App Router, React, TypeScript, Tailwind CSS, and Vitest.
- Use React Testing Library for component tests.
- Use Server Components for initial reads and Server Actions for mutations.
- Do not add a client-side global state library in the first release.
- Keep all SaatCMS bearer credentials on the Next.js server.
- Copy the backend's `CMS_API_KEYS` value into the dashboard environment.
- Permit dashboard login only for configured `editor` and `admin` accounts.
- Render the same navigation and management screens for editors and admins.
- Let the backend enforce the admin-only Live Channel deletion rule.
- Use the deployed backend at
  `https://backend-developer-take-home-assignment.onrender.com/` for the shared
  demo.
- Build a simple chronological EPG schedule, not a drag-and-drop calendar.
- Include a dedicated Playback Tester page.
- Treat responsive behavior as a minimum usability requirement, not a design
  priority.
- Do not add Datadog, analytics, audit history, or custom reporting in this
  release.

## 3. Runtime Architecture

```text
Browser
  -> Next.js page or Server Action
       -> validate signed dashboard session
       -> resolve actor from server-only CMS_API_KEYS
       -> server-only SaatCMS API client
            -> Authorization: Bearer <actor secret>
            -> SaatCMS backend
```

Rules:

- The browser never receives a CMS bearer credential.
- Do not create a generic `/api/proxy/*` route.
- Server Components perform read requests directly through the server API
  client.
- Server Actions perform create, update, delete, login, logout, and tester
  requests.
- Every protected Server Action calls `requireSession()` independently.
- CMS and middleware data requests use `cache: "no-store"`.
- Successful mutations call `revalidatePath()` for affected list/detail routes.
- Forms use progressive server submission; client components are limited to
  interactive field behavior, pending state, dialogs, and toast presentation.

## 4. Environment Contract

Create `.env.example`:

```dotenv
SAATCMS_API_BASE_URL="https://backend-developer-take-home-assignment.onrender.com"
CMS_API_KEYS="reviewer:editor:replace-with-at-least-32-characters,owner:admin:replace-with-at-least-32-characters"
DASHBOARD_SESSION_SECRET="replace-with-at-least-32-random-bytes"
SAATCMS_REQUEST_TIMEOUT_MS="30000"
```

Local backend development can override the base URL with
`http://localhost:3000`.

Validation rules:

- `SAATCMS_API_BASE_URL` must be an absolute `http` or `https` URL.
- `CMS_API_KEYS` must contain at least one valid `editor` or `admin` entry.
- Each entry must use `<actorId>:<role>:<secret>`.
- Actor IDs must be unique.
- Dashboard login must reject `reader` accounts for the first release.
- `DASHBOARD_SESSION_SECRET` must contain at least 32 characters.
- Request timeout must be an integer between 1,000 and 120,000 milliseconds.
- No secret variable may use a `NEXT_PUBLIC_` prefix.
- Environment validation must run only in server modules and fail early with a
  non-secret diagnostic message.

## 5. Route and Screen Contract

| Route                       | Screen            | Primary data/actions                                  |
| --------------------------- | ----------------- | ----------------------------------------------------- |
| `/login`                    | Dashboard sign-in | Actor ID and secret login                             |
| `/dashboard`                | Overview          | Health, readiness, totals, type counts, quick actions |
| `/content`                  | Content library   | Filtered/paginated CMS Content list                   |
| `/content/new`              | New Content       | Create Series, Season, Episode, or Movie              |
| `/content/[id]`             | Content detail    | Raw CMS data, resolved metadata, edit, delete         |
| `/channels`                 | Live Channels     | Filtered/paginated list and create action             |
| `/channels/new`             | New Channel       | Create name and slug                                  |
| `/channels/[channelId]`     | Channel detail    | Edit, delete, and EPG entry point                     |
| `/channels/[channelId]/epg` | EPG schedule      | Day window, list, create/edit/delete programs         |
| `/tools/metadata`           | Metadata Resolver | Test `GET /api/v1/mw/content/{contentId}`             |
| `/tools/playback`           | Playback Tester   | Test playback headers and authorization               |
| `/system`                   | System status     | Backend identity, health, readiness, base URL         |

Navigation order:

1. Overview
2. Content
3. Live Channels
4. Metadata Resolver
5. Playback Tester
6. System

The top bar shows the current actor ID and configured role for information only.
The role does not change navigation or normal editing controls. If an editor
attempts admin-only channel deletion, show the backend's `CMS_FORBIDDEN` error.

## 6. Planned Source Structure

```text
src/
  app/
    (auth)/
      login/
        page.tsx
    (dashboard)/
      layout.tsx
      dashboard/page.tsx
      content/
        page.tsx
        new/page.tsx
        [id]/page.tsx
      channels/
        page.tsx
        new/page.tsx
        [channelId]/
          page.tsx
          epg/page.tsx
      tools/
        metadata/page.tsx
        playback/page.tsx
      system/page.tsx
    layout.tsx
    page.tsx
    globals.css
  components/
    layout/
      app-sidebar.tsx
      app-topbar.tsx
      breadcrumb.tsx
    ui/
      alert.tsx
      badge.tsx
      button.tsx
      dialog.tsx
      empty-state.tsx
      field.tsx
      pagination.tsx
      skeleton.tsx
      table.tsx
      toast.tsx
  features/
    auth/
      actions.ts
      login-form.tsx
    content/
      actions.ts
      content-form.tsx
      content-table.tsx
      content-types.ts
      content-validation.ts
    channels/
      actions.ts
      channel-form.tsx
      channel-table.tsx
      channel-validation.ts
    epg/
      actions.ts
      epg-form.tsx
      epg-schedule.tsx
      epg-validation.ts
      time.ts
    overview/
      overview-data.ts
      overview-cards.tsx
    system/
      status-data.ts
    tools/
      metadata-action.ts
      playback-action.ts
      playback-form.tsx
  lib/
    api/
      client.ts
      errors.ts
      response.ts
      types.ts
    auth/
      accounts.ts
      session.ts
      guards.ts
    env/
      server-env.ts
    forms/
      action-state.ts
    urls/
      search-params.ts
  test/
    factories/
    setup.ts
```

Keep feature-specific components and schemas inside `features`. Only promote a
component to `components/ui` after it is reused by at least two features.

## 7. Shared Data Contracts

### API response wrapper

The server client returns metadata separately from the response body:

```ts
type ApiResult<T> = {
  data: T;
  etag: string | null;
  requestId: string | null;
  status: number;
};
```

Expected API failures normalize to:

```ts
type SaatCmsApiError = {
  status: number;
  errorCode: string;
  message: string;
  requestId: string | null;
};
```

Do not pass backend stack traces or raw response bodies to client components.
Unexpected/non-JSON failures become `UPSTREAM_REQUEST_FAILED` with a safe
message.

### Pagination

```ts
type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
```

Dashboard defaults:

- `page=1`
- `pageSize=20`
- allowed UI page sizes: `20`, `50`, `100`
- changing a filter resets `page` to `1`
- invalid URL values fall back to defaults before calling the backend

### Mutation action state

```ts
type ActionState<T = undefined> =
  | { status: "idle" }
  | { status: "success"; data?: T; message: string }
  | {
      status: "error";
      errorCode: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
      requestId?: string | null;
    };
```

Field-level validation failures stay next to the field. Backend domain errors
appear in the form alert or toast, depending on whether the form remains open.

## 8. Phase 0 - Repository Foundation

### AD-001 Scaffold Next.js

Implementation:

- Scaffold Next.js App Router with TypeScript and `src/` layout.
- Enable strict TypeScript.
- Add scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, and
  `test:coverage`.
- Preserve the existing `docs/` folder and replace the placeholder README with
  run instructions after the scaffold succeeds.
- Add `.gitignore` entries for `.env*`, with `.env.example` explicitly allowed.

Acceptance criteria:

- `npm run build`, `npm run typecheck`, and `npm test` exit successfully.
- `/` redirects to `/dashboard` for an authenticated session and `/login`
  otherwise.
- No generated build output or local environment file is committed.

### AD-002 Configure Tailwind and visual tokens

Implementation:

- Define dark slate/navy surface, border, foreground, muted, primary, success,
  warning, and destructive tokens in `globals.css`.
- Use a dark theme only in the first release.
- Add a fixed desktop sidebar and top bar.
- At widths below 1,024px, collapse the sidebar into a menu and allow tables to
  scroll horizontally. Do not create mobile-specific layouts.
- Add accessible focus styles and a skip-to-content link.

Acceptance criteria:

- All routes use the same shell and token system.
- Keyboard focus is visible.
- Content remains usable at 768px without horizontal page overflow except
  inside intentionally scrollable tables.

Tests:

- Sidebar renders all navigation labels.
- Active route receives the active state.
- Collapsed navigation can be opened and closed by keyboard.

### AD-003 Configure Vitest

Implementation:

- Configure Vitest with `jsdom`, React Testing Library, and jest-dom matchers.
- Add the `@/` path alias to Vitest.
- Create deterministic factories for Content, Channel, EPG, session, and API
  error data.
- Enable coverage for `src/**/*.{ts,tsx}` while excluding generated Next.js
  types and passive type-only modules.

Acceptance criteria:

- A component smoke test and a server utility test pass.
- `npm run test:coverage` produces a local report.
- Phase gates require tests for changed behavior; the initial global coverage
  threshold is 80%, raised only after stable coverage evidence exists.

## 9. Phase 1 - Environment, Authentication, and API Client

### AD-101 Validate server environment

Files:

- `src/lib/env/server-env.ts`
- `.env.example`

Implementation:

- Parse environment values once and expose a frozen typed configuration.
- Mark the module server-only.
- Normalize the API base URL by removing the trailing slash.
- Never include secrets in thrown messages.

Tests:

- Valid production URL and local URL are accepted.
- Missing URL, invalid protocol, short session secret, malformed account entry,
  duplicate actor ID, and invalid timeout are rejected.
- Error messages do not contain supplied secrets.

### AD-102 Parse and authenticate CMS accounts

Files:

- `src/lib/auth/accounts.ts`

Implementation:

- Parse `CMS_API_KEYS` into `{ actorId, role, secret }` records.
- Accept backend roles syntactically, but permit dashboard login only for
  `editor` and `admin`.
- Trim actor IDs and roles; do not trim secrets after parsing.
- Compare submitted secrets with `crypto.timingSafeEqual` using equal-length
  buffers.
- Return the same authentication failure for unknown actor, wrong secret, and
  disallowed role.

Tests:

- Editor and admin authenticate.
- Reader, unknown actor, wrong secret, blank fields, and malformed entries fail.
- Authentication does not reveal which credential was invalid.

### AD-103 Implement signed sessions

Files:

- `src/lib/auth/session.ts`
- `src/lib/auth/guards.ts`

Implementation:

- Store `{ actorId, expiresAt }` in an HMAC-SHA-256-signed cookie.
- Use cookie name `saatcms_dashboard_session`.
- Set `HttpOnly`, `SameSite=Lax`, `Path=/`, eight-hour expiry, and `Secure` in
  production.
- Resolve the actor and current role from `CMS_API_KEYS` on every protected
  request; never store the bearer secret in the cookie.
- Reject expired, malformed, tampered, or removed-account sessions.
- `requireSession()` redirects page requests to `/login` and returns an
  authentication action error for mutations.

Tests:

- Valid session round-trip.
- Expired and tampered cookies fail.
- Removing an actor from the parsed account set invalidates the session.
- Cookie options match production and development expectations.

### AD-104 Implement login and logout

Files:

- `src/app/(auth)/login/page.tsx`
- `src/features/auth/login-form.tsx`
- `src/features/auth/actions.ts`

Implementation:

- Login accepts actor ID and secret.
- Return one generic invalid-credentials message.
- On success create the session and redirect to `/dashboard`.
- Logout clears the cookie and redirects to `/login`.
- A signed-in visitor opening `/login` redirects to `/dashboard`.
- Disable repeated submit while pending.

Tests:

- Required field messages.
- Invalid login creates no cookie.
- Valid login creates a cookie and redirects.
- Logout clears the cookie.
- Protected dashboard layout rejects an unauthenticated request.

### AD-105 Implement the SaatCMS API client

Files:

- `src/lib/api/client.ts`
- `src/lib/api/errors.ts`
- `src/lib/api/response.ts`
- `src/lib/api/types.ts`

Implementation:

- Accept relative backend paths only; reject absolute request URLs.
- Resolve the current session account and attach its bearer secret to CMS
  calls.
- Allow unauthenticated server calls only for `/`, `/health`, `/ready`, and
  `/api/v1/mw/*`.
- Set `Accept: application/json`; set `Content-Type` only when sending JSON.
- Forward `If-Match` when provided.
- Capture `ETag` and `X-Request-Id` response headers.
- Use `AbortController` and the configured timeout.
- Parse successful empty `204` responses without attempting JSON parsing.
- Normalize all non-2xx responses to `SaatCmsApiError`.
- Never log request authorization headers or request bodies containing
  playback URLs.

Tests:

- Builds the live and local base URLs correctly.
- Adds the correct editor/admin bearer credential.
- Does not add authorization to public health or middleware reads.
- Sends JSON and `If-Match` correctly.
- Parses `200`, `201`, and `204`.
- Captures ETag and request ID.
- Maps JSON errors, non-JSON errors, network errors, and timeouts safely.
- Rejects absolute URLs and path traversal attempts.

## 10. Phase 2 - Content Management

### Content API mapping

| Operation | Backend request                                                  |
| --------- | ---------------------------------------------------------------- |
| List      | `GET /api/v1/cms/content?type=&parentId=&title=&page=&pageSize=` |
| Create    | `POST /api/v1/cms/content`                                       |
| Get       | `GET /api/v1/cms/content/{id}`                                   |
| Update    | `PATCH /api/v1/cms/content/{id}` with optional `If-Match`        |
| Delete    | `DELETE /api/v1/cms/content/{id}`                                |
| Resolve   | `GET /api/v1/mw/content/{id}`                                    |

### AD-201 Define Content types and validation

Files:

- `src/features/content/content-types.ts`
- `src/features/content/content-validation.ts`

Implementation rules:

- Type is one of `SERIES`, `SEASON`, `EPISODE`, `MOVIE`.
- Quality is `SD`, `HD`, `UHD_4K`, or `null`.
- Series and Movie submit `parentId: null`.
- Season requires a Series parent.
- Episode requires a Season parent.
- Title must be non-empty after trimming.
- Nullable metadata uses an explicit "Inherit" control that submits `null`.
- `isPremium` supports `inherit`, `yes`, and `no`; explicit `false` must not be
  converted to `null`.
- Country codes are uppercased, deduplicated, and validated as two letters.
- When geo override is false, omit `geoBlockCountries` from the request.
- When geo override is true, submit the array even when it is empty.
- Content type is immutable on edit.

Tests:

- Every hierarchy combination.
- `false` premium override remains false.
- Empty geo override list is preserved.
- Invalid quality, country, title, and parent are rejected.
- Create and patch mappers include only allowed fields.

### AD-202 Build the Content list

Files:

- `src/app/(dashboard)/content/page.tsx`
- `src/features/content/content-table.tsx`

Implementation:

- URL parameters: `title`, `type`, `parentId`, `page`, `pageSize`.
- Submit filters through GET navigation.
- Show columns: title, type, parent ID, quality, premium state, updated time,
  and actions.
- Link each row to `/content/[id]`.
- Provide clear loading, empty, backend unavailable, and pagination states.
- Add a `Create Content` action linking to `/content/new`.

Acceptance criteria:

- Refreshing or sharing the URL preserves the list state.
- No unbounded client-side data download occurs.
- Clearing filters returns to page 1.

Tests:

- Search parameter parsing and backend query construction.
- Filter values render from the URL.
- Empty and populated table states.
- Pagination links preserve filters.
- API error state displays code/message and retry link.

### AD-203 Build create/edit Content forms

Files:

- `src/app/(dashboard)/content/new/page.tsx`
- `src/features/content/content-form.tsx`
- `src/features/content/actions.ts`

Implementation:

- Fields: type, title, parent, parental rating, genre, quality, premium,
  playback URL, geo override, and country list.
- Load parent choices from filtered Content list calls:
  `type=SERIES&pageSize=100` for Season and `type=SEASON&pageSize=100` for
  Episode.
- If more than 100 eligible parents exist, provide server-filtered parent
  search instead of silently truncating choices.
- Hide parent selection for Series and Movie.
- Switching type clears an incompatible parent.
- On successful create, redirect to the new detail page and show success state.
- Preserve submitted values when validation or backend errors occur.

Tests:

- Correct fields for each content type.
- Parent field resets when type changes.
- Inheritance controls map to `null`.
- Geo override toggling preserves an intentional empty override.
- Successful and failed create actions.

### AD-204 Build Content detail and update

Files:

- `src/app/(dashboard)/content/[id]/page.tsx`
- reuse `content-form.tsx` and `actions.ts`

Implementation:

- Fetch the raw CMS record and public resolved metadata in parallel.
- Show identity, hierarchy, raw override values, resolved values, timestamps,
  and playback URL only in the authenticated CMS section.
- Do not expect `playbackUrl` from the public metadata response.
- Store the CMS GET ETag in a hidden update field.
- PATCH only mutable fields and send `If-Match`.
- On `CONTENT_WRITE_CONFLICT`, keep the submitted values and show `Reload latest
version`; do not auto-resubmit.

Tests:

- Raw and resolved metadata remain visually distinguishable.
- Public metadata without playback URL renders normally.
- Update forwards ETag.
- Conflict state offers refresh without losing the user's submitted values.
- Missing Content renders the not-found state.

### AD-205 Implement Content deletion

Implementation:

- Require a confirmation dialog containing the Content title.
- Delete only after explicit confirmation.
- On success redirect to `/content`.
- On `CONTENT_HAS_CHILDREN`, explain that child records must be removed first.
- Do not offer recursive deletion.

Tests:

- Cancel performs no request.
- Confirm performs one delete request.
- Leaf success redirects.
- `CONTENT_HAS_CHILDREN`, forbidden, and not-found errors render correctly.

Phase 2 exit criteria:

- All Content CMS operations are available through the dashboard.
- Hierarchy, nullable inheritance, empty geo override, ETag, and leaf deletion
  rules are covered by Vitest.

## 11. Phase 3 - Live Channel Management

### Channel API mapping

| Operation | Backend request                                          |
| --------- | -------------------------------------------------------- |
| List      | `GET /api/v1/cms/channels?name=&slug=&page=&pageSize=`   |
| Create    | `POST /api/v1/cms/channels`                              |
| Get       | `GET /api/v1/cms/channels/{channelId}`                   |
| Update    | `PATCH /api/v1/cms/channels/{channelId}` with `If-Match` |
| Delete    | `DELETE /api/v1/cms/channels/{channelId}?confirm=true`   |

### AD-301 Build Channel list

Implementation:

- URL parameters: `name`, `slug`, `page`, `pageSize`.
- Show name, slug, updated time, EPG link, and edit link.
- Use backend pagination and filtering.

Tests:

- Query parameter mapping.
- Populated, empty, and error states.
- Pagination preserves name and slug filters.

### AD-302 Build Channel create/edit

Implementation:

- Create route: `/channels/new`.
- Detail/edit route: `/channels/[channelId]`.
- Fields: name and slug.
- Lowercase slug input as the user types and validate single-hyphen segments.
- Capture ETag on detail read and forward it on PATCH.
- Provide an EPG button linking to the channel schedule.

Tests:

- Name/slug required validation.
- Slug normalization and invalid slug cases.
- Duplicate slug error.
- ETag forwarding and `LIVE_CHANNEL_WRITE_CONFLICT` recovery.

### AD-303 Implement Channel deletion

Implementation:

- Render the action for both editor and admin users; do not create a separate
  role-specific layout.
- Confirmation text must state that all EPG programs will be deleted.
- Require the user to type the channel slug before enabling confirmation.
- Send `confirm=true` exactly.
- Admin success redirects to `/channels`.
- Editor `CMS_FORBIDDEN` remains on the page with a clear message.

Tests:

- Incorrect typed slug keeps confirm disabled.
- Confirm sends `confirm=true`.
- Admin success, editor forbidden, missing confirmation, and not-found states.

Phase 3 exit criteria:

- Channel list, create, update, schedule navigation, and guarded deletion work.
- The frontend does not pretend editors can bypass backend authorization.

## 12. Phase 4 - Simple EPG Schedule

### EPG API mapping

| Operation | Backend request                                                                    |
| --------- | ---------------------------------------------------------------------------------- |
| List      | `GET /api/v1/cms/channels/{channelId}/epg?windowStart=&windowEnd=&page=&pageSize=` |
| Create    | `POST /api/v1/cms/channels/{channelId}/epg`                                        |
| Get       | `GET /api/v1/cms/channels/{channelId}/epg/{programId}`                             |
| Update    | `PATCH /api/v1/cms/channels/{channelId}/epg/{programId}` with `If-Match`           |
| Delete    | `DELETE /api/v1/cms/channels/{channelId}/epg/{programId}`                          |

### AD-401 Implement EPG day-window utilities

Files:

- `src/features/epg/time.ts`
- `src/features/epg/epg-validation.ts`

Implementation:

- The `date=YYYY-MM-DD` URL parameter represents a day in the browser's local
  timezone.
- A small client boundary calculates local day start/end and navigates with
  explicit `windowStart` and `windowEnd` ISO values.
- The server validates both values as timezone-aware instants before calling
  the backend.
- Display program times in the browser's local timezone and show the UTC value
  in secondary text or a tooltip.
- Forms use `datetime-local`; convert to ISO with `new Date(value).toISOString()`
  before submission.
- Reject invalid dates and `startTime >= endTime` locally while retaining
  backend validation as authoritative.

Tests:

- Day boundary conversion in positive and negative UTC offsets.
- Daylight-saving transition behavior using fixed test timezones.
- Back-to-back time ranges validate.
- Equal, reversed, and invalid times fail.
- ISO serialization includes timezone information.

### AD-402 Build the schedule page

Files:

- `src/app/(dashboard)/channels/[channelId]/epg/page.tsx`
- `src/features/epg/epg-schedule.tsx`

Implementation:

- Fetch Channel detail and the selected EPG window in parallel.
- Provide previous day, today, next day, and date picker controls.
- Render a chronological list with start, end, duration, program name, and
  actions.
- Show overlaps only as backend errors; never visually accept a failed write.
- Use page size 100 for a single-day window and retain pagination if total
  exceeds 100.
- Provide an empty schedule state with `Add program` action.

Tests:

- Requests include required window parameters.
- Programs render in chronological order.
- Navigation generates the correct window.
- Empty, paginated, missing-channel, and backend-error states.

### AD-403 Build EPG create/edit/delete flows

Files:

- `src/features/epg/epg-form.tsx`
- `src/features/epg/actions.ts`

Implementation:

- Use a dialog or dedicated panel with program name, start, and end.
- Create uses the channel from the route; channel movement is not supported.
- Edit fetches the program and ETag before showing the form.
- Patch sends only changed fields and the ETag.
- Delete requires a confirmation dialog and preserves the channel lock.
- After success, revalidate the schedule page without changing the window.
- Map `EPG_OVERLAP`, `INVALID_TIME_RANGE`, `INVALID_DATE_TIME_FORMAT`,
  `EPG_WRITE_CONFLICT`, and `EPG_PROGRAM_NOT_FOUND` to specific UI messages.

Tests:

- Create request mapping and successful refresh.
- Back-to-back programs are not blocked by frontend validation.
- Overlap response keeps the dialog open with entered values.
- Edit excludes channel ID and forwards ETag.
- Conflict provides reload-latest behavior.
- Delete cancel/success/not-found behavior.

Phase 4 exit criteria:

- All EPG endpoints are usable from one channel-scoped chronological schedule.
- Timezone conversion, boundary validity, overlap errors, and ETags are tested.

## 13. Phase 5 - Overview, System, and Middleware Tools

### AD-501 Build Overview

Implementation:

- Fetch `/health`, `/ready`, Content `pageSize=1`, and Channel `pageSize=1` in
  parallel.
- Fetch four Content totals using the type filters for Series, Season, Episode,
  and Movie.
- Show cards for backend state, database readiness, total Content, total
  Channels, and type counts.
- Add quick links for new Content, new Channel, EPG, and Playback Tester.
- Do not claim to show traffic, user, revenue, playback, or audit analytics.
- An upcoming EPG preview is optional and bounded to the first three channels
  and next 24 hours; omit it if it makes the overview noticeably slower.

Tests:

- Totals map from `PageResponse.total`, not `items.length`.
- Partial upstream failure leaves successful cards visible.
- Readiness `503` shows not ready rather than a generic crash.

### AD-502 Build System page

Implementation:

- Show configured backend origin, never credentials.
- Fetch `/`, `/health`, and `/ready` with no-store behavior.
- Display last checked time and a manual refresh control.
- Show request ID for failures when available.

Tests:

- Ready, not-ready, timeout, and malformed upstream response states.
- Secret values never appear in rendered output.

### AD-503 Build Metadata Resolver

Implementation:

- Accept a Content ID and call `GET /api/v1/mw/content/{id}` server-side.
- Display type, title, rating, genre, quality, premium, and blocked countries.
- Explicitly do not display or expect `playbackUrl`.
- Link to the CMS Content detail when the same ID exists.

Tests:

- Successful resolution.
- Empty geo list.
- Missing Content.
- A defensive test proves a stray `playbackUrl` is not rendered.

### AD-504 Build Playback Tester

Files:

- `src/app/(dashboard)/tools/playback/page.tsx`
- `src/features/tools/playback-form.tsx`
- `src/features/tools/playback-action.ts`

Implementation:

- Fields: Content ID, User ID, two-letter country, and device.
- Device is a select with `Mobile`, `SmartTV`, and `Web`.
- Normalize country to uppercase; do not normalize device casing.
- Server Action calls the public playback endpoint with `X-User-Id`,
  `X-User-Country`, and `X-Device-Type`.
- Success displays request context, resolved metadata, and playback URL.
- Failure displays status, error code, message, and request ID without fabricating
  metadata or playback details.
- Keep previous form values so reviewers can quickly switch country/device.

Tests:

- Header mapping and country normalization.
- Allowed playback response.
- `GEO_BLOCKED` and `DEVICE_NOT_SUPPORTED` do not render playback URL.
- Missing header validation, invalid country, invalid device, missing Content,
  timeout, and unavailable backend.

Phase 5 exit criteria:

- Dashboard summaries use only existing bounded API calls.
- Health/readiness and both middleware tools are complete.
- Playback success and protected failure behavior are covered by Vitest.

## 14. Phase 6 - Hardening and Deployment

### AD-601 Failure, loading, and conflict consistency

- Use route-level `loading.tsx` for initial screen loads.
- Add route-level `error.tsx` with retry for unexpected failures.
- Provide explicit empty states for Content, Channels, and EPG.
- Map `401` to session revalidation; if the account no longer exists, clear the
  dashboard session and redirect to login.
- Display `403`, `404`, `409`, `429`, and `503` using shared error presentation.
- For `429`, preserve form state and allow manual retry; do not automatically
  repeat mutations.
- For write conflicts, never silently overwrite or automatically resubmit.

### AD-602 Security and caching

- Confirm no environment secret is imported into a Client Component.
- Add `Cache-Control: no-store` to authentication and sensitive responses.
- Validate same-origin mutation requests where Next.js does not do so
  automatically.
- Avoid rendering bearer tokens in React props, HTML, logs, errors, or source
  maps.
- Add production security headers appropriate for a self-hosted Next.js app.
- Redact credentials from server logging and test snapshots.

Tests:

- Client-rendered output contains no known test secret.
- Mutation with an invalid Origin is rejected.
- Sensitive responses are not cacheable.
- Session invalidation after key rotation redirects to login.

### AD-603 Final verification matrix

Required commands:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Required reviewer journeys against the deployed backend:

1. Editor login and logout.
2. Content filter, create, edit, resolved preview, and leaf delete.
3. Channel create and edit.
4. Editor attempts channel deletion and receives the expected forbidden result.
5. Admin deletes a disposable Channel with explicit confirmation.
6. EPG create, back-to-back create, overlap rejection, edit, and delete.
7. Metadata resolution.
8. Allowed playback.
9. Geo-blocked playback.
10. Device-blocked playback.
11. Backend not-ready/unavailable presentation.

### AD-604 Render deployment

Implementation:

- Create a separate Render web service for the dashboard.
- Configure `SAATCMS_API_BASE_URL` with the live backend URL.
- Configure `CMS_API_KEYS` and `DASHBOARD_SESSION_SECRET` through Render secrets
  or a shared environment group.
- Use `npm run build` and `npm start`.
- Add a simple dashboard health route only if Render requires one; it must not
  call protected backend routes or reveal configuration.
- Verify that backend cold starts produce a pending state and then either data
  or a retryable timeout message.

Acceptance criteria:

- The deployed browser bundle contains no CMS secrets.
- Editor and admin accounts can authenticate.
- Dashboard-to-backend calls succeed without a backend CORS change.
- All reviewer journeys pass using disposable records.

## 15. Vitest Test Inventory

Minimum named test files:

```text
src/lib/env/server-env.test.ts
src/lib/auth/accounts.test.ts
src/lib/auth/session.test.ts
src/lib/api/client.test.ts
src/lib/api/errors.test.ts
src/lib/urls/search-params.test.ts
src/features/auth/login-form.test.tsx
src/features/content/content-validation.test.ts
src/features/content/content-form.test.tsx
src/features/content/content-table.test.tsx
src/features/channels/channel-validation.test.ts
src/features/channels/channel-form.test.tsx
src/features/epg/time.test.ts
src/features/epg/epg-form.test.tsx
src/features/epg/epg-schedule.test.tsx
src/features/tools/playback-form.test.tsx
src/features/overview/overview-data.test.ts
```

Mocking rules:

- Unit tests must not call the live Render backend.
- Mock `fetch` at the server API client boundary.
- Use shared response factories for documented success and error shapes.
- Keep one optional, manually invoked smoke script for the live backend; do not
  run it as part of normal Vitest execution.
- Do not place real credentials in fixtures, snapshots, or CI variables used by
  untrusted pull requests.

## 16. Phase Dependencies and Delivery Order

```text
Phase 0 Foundation
  -> Phase 1 Auth and API client
       -> Phase 2 Content
       -> Phase 3 Channels
            -> Phase 4 EPG
       -> Phase 5 Overview and tools
            -> Phase 6 Hardening and deployment
```

Recommended pull request boundaries:

1. `foundation-and-test-harness`
2. `dashboard-auth-and-api-client`
3. `content-management`
4. `channel-management`
5. `epg-schedule`
6. `overview-system-and-tools`
7. `hardening-and-render-deployment`

Each pull request must include its relevant tests and documentation updates. Do
not postpone all testing to Phase 6.

## 17. First-Release Definition of Done

- Every documented dashboard route is implemented.
- Editor and admin accounts authenticate through environment-managed backend
  credentials.
- CMS credentials never reach browser JavaScript or storage.
- Content, Channel, and EPG CRUD use the current backend contracts.
- All edits preserve ETag/If-Match conflict handling.
- Content inheritance and geo override controls map correctly to nullable API
  fields.
- The EPG schedule handles timezone-aware day windows and back-to-back programs.
- The Playback Tester demonstrates allowed, geo-blocked, and device-blocked
  behavior.
- Health/readiness and partial backend failure states are visible.
- Vitest, typecheck, lint, coverage, and production build pass.
- The dashboard is deployed separately from the backend and communicates with
  the live Render service using server-only requests.
- Datadog and analytics remain intentionally deferred.
