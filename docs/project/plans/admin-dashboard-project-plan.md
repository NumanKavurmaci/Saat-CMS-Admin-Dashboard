# SaatCMS Admin Dashboard Project Plan

## Objective

Build a separate desktop-first Next.js admin dashboard for the SaatCMS backend. The dashboard will provide a polished dark SaaS interface for managing content, live channels, and EPG schedules, while also exposing lightweight tools for testing metadata and playback endpoints.

The dashboard will be maintained in a new repository and deployed as a separate Render web service alongside the existing backend and PostgreSQL database.

## Product Direction

### Accepted decisions

- Framework: React with Next.js App Router and TypeScript.
- Product style: professional SaaS administration interface.
- Primary viewport: desktop; mobile-specific optimization is out of scope for the first release.
- Theme: dark by default, using a restrained slate/navy palette with blue accents.
- Accounts: a small set of environment-managed users maintained by the project owner.
- Roles: reuse the backend's existing `reader`, `editor`, and `admin` roles without building a separate permissions system.
- Data: the existing backend remains the only application data source.
- Deployment: a separate Render web service in the same Render environment as the backend.
- Statistics: useful summary data only; no analytics system or reporting database.
- Middleware endpoint tools: included after the core CMS workflows.

### Working repository name

`saatcms-admin-dashboard`

The name can be changed before the repository is created without affecting the architecture.

## Architecture

```text
Browser
  -> Next.js dashboard on Render
       -> signed HttpOnly dashboard session
       -> server-only SaatCMS API client
            -> SaatCMS backend on Render
                 -> PostgreSQL
```

The browser will communicate with the Next.js application on the same origin. Next.js Server Components, Server Actions, and explicit Route Handlers will call the SaatCMS backend.

This design is intentionally small:

- No user database.
- No registration, invitations, password reset, or email verification.
- No OAuth provider.
- No public generic API proxy.
- No backend CORS change.
- No bearer token in browser JavaScript, local storage, or session storage.

The server-side API layer is part of the dashboard application, not an additional deployed service.

## Authentication Decision

### Account format

Reuse the backend credential format:

```dotenv
CMS_API_KEYS="numan:admin:<secret>,reviewer:editor:<secret>"
```

For dashboard login:

- `actorId` is the username.
- `secret` is the password and the backend bearer token.
- `role` is the access level enforced by the backend.

The dashboard Render service will receive its own copy of `CMS_API_KEYS`. Render services do not automatically share environment variables, so the value must be configured on both services or supplied through a shared Render environment group.

### Session behavior

1. The login form posts the username and password to a dashboard-only server action.
2. The server parses `CMS_API_KEYS` and compares the submitted credentials using timing-safe comparison.
3. On success, the server creates a signed HttpOnly session cookie containing only the actor ID and expiry time.
4. On each backend request, the server resolves the current account from `CMS_API_KEYS` and attaches its secret as `Authorization: Bearer <secret>`.
5. Removing an account from the environment invalidates its next authenticated request.
6. Logout clears the session cookie.

Session defaults:

- Maximum lifetime: 8 hours.
- Cookie flags: `HttpOnly`, `Secure` in production, `SameSite=Lax`, and `Path=/`.
- Signing secret: at least 32 random bytes supplied through `DASHBOARD_SESSION_SECRET`.
- Authentication errors must not reveal whether the username or password was incorrect.
- Mutation handlers must accept only same-origin requests.

This is deliberately simpler than a production identity platform while keeping credentials out of client-side storage.

### Role behavior

All authenticated users see the same dashboard navigation and resource screens. The backend remains the authorization source of truth:

- Readers can view and list.
- Editors can create, update, and delete Content and EPG Programs.
- Admins can also delete Live Channels.

The dashboard may disable an action that the current role cannot perform, but it must never rely on the UI for enforcement. Backend `401` and `403` responses remain authoritative and are shown as clear notifications.

## Environment Contract

The dashboard repository will include `.env.example` with placeholders only:

```dotenv
SAATCMS_API_BASE_URL=http://localhost:3000
CMS_API_KEYS="numan:admin:replace-with-at-least-32-characters,reviewer:editor:replace-with-at-least-32-characters"
DASHBOARD_SESSION_SECRET=replace-with-a-long-random-secret
```

Rules:

- None of these values use the `NEXT_PUBLIC_` prefix.
- `.env*` files containing real secrets remain ignored by Git.
- Environment validation runs on server startup and fails with a useful configuration error.
- Logs must never include passwords, bearer tokens, cookies, or the raw `CMS_API_KEYS` value.

## Interface Structure

### Global shell

- Fixed dark sidebar with product name, primary navigation, and active-route state.
- Compact top bar with page title, backend health indicator, current username/role, and logout menu.
- Desktop content area with a maximum readable width where appropriate.
- Consistent breadcrumbs on detail and edit screens.
- Toast notifications for successful mutations and recoverable errors.
- Confirmation dialogs for destructive operations.
- Skeletons for initial loading and clear empty states for new installations.

### Visual system

- Dark slate/navy surfaces rather than pure black.
- Blue primary accent for actions and selected navigation.
- Green, amber, red, and muted gray reserved for semantic status.
- Dense but readable data tables with strong alignment and restrained borders.
- Cards used only for dashboard summaries and grouped forms, not every element.
- Accessible focus rings, keyboard navigation, labels, and contrast.
- Icons support labels rather than replacing them.

## Routes and Screens

| Dashboard route             | Purpose                                                             | Priority |
| --------------------------- | ------------------------------------------------------------------- | -------- |
| `/login`                    | Username/password sign-in                                           | P0       |
| `/dashboard`                | Overall status, totals, upcoming schedule snapshot, quick actions   | P0       |
| `/content`                  | Search, filter, paginate, inspect, create, edit, and delete content | P0       |
| `/content/new`              | Create Series, Season, Episode, or Movie                            | P0       |
| `/content/[id]`             | Content detail, edit form, hierarchy, and resolved metadata preview | P0       |
| `/channels`                 | Search, paginate, create, edit, and delete live channels            | P0       |
| `/channels/[channelId]`     | Channel details and EPG entry point                                 | P0       |
| `/channels/[channelId]/epg` | Time-window schedule, create, edit, and delete programs             | P0       |
| `/system`                   | Backend identity, liveness, and readiness checks                    | P1       |
| `/tools/metadata`           | Test resolved middleware content metadata                           | P2       |
| `/tools/playback`           | Test playback authorization with request headers                    | P2       |

## Dashboard Overview

The home screen will provide a quick operational summary without introducing new analytics endpoints:

- Backend liveness and database readiness.
- Total Content count from the paginated Content response.
- Total Live Channel count from the paginated Channel response.
- Content-type breakdown using the existing type filters.
- Upcoming EPG preview for a small number of visible channels and a bounded time window.
- Quick actions: create Content, create Channel, and open EPG schedule.
- Clear warning when the backend is unavailable or returns a configuration error.

Recent activity, audit history, traffic analytics, and business metrics are excluded because the backend does not currently expose those data sets.

## Search and Filtering

The dashboard will use existing server-side backend filters rather than downloading complete tables:

- Content: case-insensitive title search, type, parent ID, page, and page size.
- Live Channels: case-insensitive name and slug search, page, and page size.
- EPG Programs: channel, required time window, page, and page size.

Search state will be represented in URL query parameters so filtered views can be refreshed and shared. Input changes will be debounced where appropriate.

Global cross-resource search is not included because the backend has no single cross-resource search endpoint. It can be added later only if it becomes useful.

## Backend Endpoint Coverage

| Backend capability                            | Dashboard use                   |
| --------------------------------------------- | ------------------------------- |
| `GET /`                                       | Backend identity on System page |
| `GET /health`                                 | Liveness indicator              |
| `GET /ready`                                  | Database readiness indicator    |
| `GET /api/v1/mw/content/{contentId}`          | Resolved metadata preview/tool  |
| `GET /api/v1/mw/playback/{contentId}`         | Playback authorization tool     |
| Content CMS create/list/get/patch/delete      | Content management screens      |
| Live Channel CMS create/list/get/patch/delete | Channel management screens      |
| EPG CMS create/list/get/patch/delete          | Schedule management screens     |

The implementation must preserve backend-specific behavior:

- Capture response `ETag` headers on resource reads and mutations.
- Send `If-Match` on edits to prevent overwriting newer changes.
- Show a refresh-and-retry flow for `CONTENT_WRITE_CONFLICT`, `LIVE_CHANNEL_WRITE_CONFLICT`, and `EPG_WRITE_CONFLICT`.
- Require explicit confirmation before Live Channel deletion and send `confirm=true`.
- Explain that channel deletion also removes its EPG schedule.
- Display structured backend error messages without exposing internal stack traces.
- Send the required user, country, and device headers from the Playback tool.

## Frontend Technology Decisions

- Next.js App Router and TypeScript.
- React Server Components for protected layouts and initial reads.
- Server Actions or explicit Route Handlers for mutations and interactive data requests.
- Tailwind CSS for layout and theme tokens.
- shadcn/ui primitives for accessible dashboard components.
- Lucide icons.
- Zod schemas for environment, form, and API-boundary validation.
- A small typed server-only API client built from the repository's OpenAPI contract and API documentation.
- Vitest and React Testing Library for unit/component tests.
- Playwright for critical login and CRUD journeys.

Avoid adding a global state library until a concrete need appears. URL state, server data, and local component state are sufficient for the first release.

## Proposed Repository Structure

```text
src/
  app/
    (auth)/
      login/
    (dashboard)/
      dashboard/
      content/
      channels/
      system/
      tools/
    api/
      session/
  components/
    layout/
    ui/
    tables/
    forms/
  features/
    auth/
    content/
    channels/
    epg/
    system/
    tools/
  lib/
    auth/
    api/
    env/
    validation/
  types/
```

Feature-specific forms, schemas, and presentation components stay within their feature folder. Reusable visual primitives stay in `components/ui`. Backend credentials and API calls stay in server-only modules.

## Delivery Plan

### Phase 1 — Repository foundation

- Create the new repository with Next.js, TypeScript, linting, and tests.
- Configure Tailwind, theme tokens, shadcn/ui, icons, and fonts.
- Add `.env.example`, environment validation, and server-only module boundaries.
- Build the dark application shell and responsive minimum-width behavior.

Exit criteria: the application builds, tests run, and the shell renders on desktop without backend credentials leaking into the client bundle.

### Phase 2 — Login and backend client

- Parse environment-managed accounts.
- Implement login, signed session cookie, protected routes, session expiry, and logout.
- Implement the typed SaatCMS API client with authorization, error normalization, ETag support, and request timeouts.
- Add system health/readiness calls.

Exit criteria: valid users can sign in and call the backend; invalid users cannot access protected pages; secrets never appear in browser storage or logs.

### Phase 3 — Content management

- Build searchable, filterable, paginated Content table.
- Build create and edit forms for all supported content types.
- Support hierarchy, nullable inherited metadata, geo-block countries, and validation.
- Add detail, resolved metadata preview, optimistic concurrency, and safe deletion.

Exit criteria: every Content CMS endpoint is usable through the dashboard.

### Phase 4 — Live Channels and EPG

- Build Channel list, search, creation, editing, and deletion flow.
- Build channel-scoped EPG schedule with time-window navigation.
- Add EPG create/edit dialogs, overlap errors, ETags, and deletion.
- Make admin-only channel deletion state clear.

Exit criteria: every Live Channel and EPG CMS endpoint is usable through the dashboard.

### Phase 5 — Overview and middleware tools

- Build the overview cards and bounded EPG preview.
- Add backend identity and status screen.
- Add resolved metadata tester.
- Add playback tester with user ID, country, and device controls.

Exit criteria: all non-CMS backend endpoints are represented in the dashboard.

### Phase 6 — Quality and deployment

- Add component, integration, and end-to-end coverage for critical paths.
- Verify keyboard navigation, contrast, loading, empty, error, and offline states.
- Add production headers and prevent sensitive caching.
- Create the Render web service and configure shared secrets.
- Run smoke tests against the deployed backend.
- Document local development, account rotation, deployment, and rollback.

Exit criteria: the dashboard is deployed on Render and all priority workflows pass smoke tests.

## Acceptance Criteria

- An account listed in `CMS_API_KEYS` can log in using its actor ID and secret.
- Invalid credentials return a generic error and create no session.
- Protected routes redirect unauthenticated visitors to `/login`.
- Content, Channel, and EPG CRUD workflows use the current backend endpoints.
- Backend filtering and pagination drive the tables.
- ETag conflicts produce a recoverable refresh flow.
- The dashboard shows backend health, readiness, Content total, and Channel total.
- The default UI is a polished, consistent dark desktop SaaS dashboard.
- The browser never receives the raw `CMS_API_KEYS` configuration.
- No bearer token is written to local storage or session storage.
- Reader/editor/admin restrictions continue to be enforced by the backend.
- The production dashboard and backend communicate successfully on Render.

## Testing Strategy

### Unit tests

- Credential parsing and malformed configuration.
- Timing-safe credential validation.
- Session signing, expiry, and tamper rejection.
- API error normalization and role helpers.
- Form schemas and request mapping.

### Integration tests

- Protected route behavior.
- Login and logout lifecycle.
- Backend client authorization headers.
- ETag capture and `If-Match` forwarding.
- Content, Channel, and EPG form submissions.
- Structured handling of `400`, `401`, `403`, `404`, `409`, `429`, and `503` responses.

### End-to-end tests

- Admin login and logout.
- Content search, create, edit, and delete.
- Channel create and edit.
- Admin channel deletion confirmation.
- Reviewer/editor login and blocked admin-only deletion.
- EPG create, overlap rejection, edit, and delete.
- Backend unavailable state.

## Out of Scope for the First Release

- Self-service account management.
- Database-backed users or sessions.
- Password reset or email flows.
- OAuth, SSO, MFA, or external identity providers.
- Fine-grained dashboard permissions beyond backend roles.
- Audit-history UI.
- Analytics, charts, or custom statistics endpoints.
- Global cross-resource search.
- Media upload or image management.
- Full mobile redesign.
- Real-time WebSocket updates.
- Internationalization.

## Risks and Controls

| Risk                                      | Control                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Dashboard and backend credentials drift   | Use a Render environment group or update both services during rotation                        |
| Bearer token exposure                     | Keep API access in server-only modules and never use `NEXT_PUBLIC_` secrets                   |
| Session tampering                         | Sign session data and reject invalid or expired signatures                                    |
| Stale edits overwrite changes             | Preserve `ETag` and `If-Match` behavior                                                       |
| Destructive channel deletion              | Role-aware UI, explicit consequence text, confirmation dialog, and `confirm=true`             |
| Dashboard summary triggers too many calls | Use paginated totals and a bounded EPG preview only                                           |
| Backend unavailable                       | Short request timeout, clear status UI, retry control, and no misleading cached success state |

## Source Contracts

- [CMS CRUD API](../../api/cms-crud-api.md)
- [CMS OpenAPI contract](../../api/cms-crud-openapi.yaml)
- [CMS EPG Program API](../../api/cms-epg-program-api.md)
- [Content Metadata API](../../api/content-metadata-api.md)
- [Middleware Playback API](../../api/mw-playback-api.md)
- [Next.js Backend for Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js environment variable guide](https://nextjs.org/docs/app/guides/environment-variables)
- [Tailwind CSS dark mode](https://tailwindcss.com/docs/dark-mode)
