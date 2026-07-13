# Security and Access Model

This document describes who can use each part of the dashboard, where secrets
live, and how outbound requests are constrained. It documents the implemented
model rather than proposing a future identity system.

For the component and request architecture around these controls, see
[Application architecture](architecture.md).

## Security goals

The current design aims to:

- keep environment-managed CMS bearer secrets out of client bundles, browser
  storage, URLs, and session-cookie payloads;
- ensure visitor traffic cannot accidentally acquire or send a CMS bearer;
- require a valid signed dashboard session for every dashboard page;
- require an account session for all Content, Channel, and EPG routes;
- constrain server-side requests to the configured SaatCMS origin and declared
  public endpoint families;
- preserve backend authorization and concurrency decisions; and
- show useful failures without exposing configuration or raw exceptions.

It is not a general identity provider. Accounts are configured through an
environment variable, editor/admin currently share the same dashboard UI, and
SaatCMS remains the final role authorization authority.

## Principals and capabilities

| Principal | Session contents | Dashboard routes | Upstream bearer |
| --- | --- | --- | --- |
| No session | None | `/` redirects to `/login`; dashboard routes also redirect to login | None |
| Visitor | `kind: visitor`, expiry | Overview, System, Metadata Resolver, Playback Tester | Never |
| Editor account | `kind: account`, actor ID, expiry | Visitor routes plus all CMS screens | Selected editor secret, server-side only |
| Admin account | `kind: account`, actor ID, expiry | Same dashboard screens as editor | Selected admin secret, server-side only |

The identical editor/admin interface is deliberate for this release. For
example, both see Channel deletion, but the backend may reject it for an editor.
UI visibility must not be treated as permission.

## Account configuration and login

`CMS_API_KEYS` is a comma-separated account registry:

```text
<actorId>:<editor|admin>:<secret>,<actorId>:<editor|admin>:<secret>
```

Parsing in [`lib/accounts.ts`](../lib/accounts.ts):

- accepts only `editor` and `admin` roles;
- requires a non-empty actor ID and a secret of at least 32 characters;
- preserves additional colons inside the secret;
- ignores malformed entries;
- rejects duplicate valid actor IDs; and
- fails configuration if no valid dashboard account remains.

The login form posts the actor ID and key to a Server Action. The action looks
up the environment-managed account and compares equal-length byte sequences
without an early exit. Invalid account/secret combinations receive the same
generic response. On success, the action creates a session containing the actor
ID, not the bearer secret.

The key typed by a user necessarily passes through that user's browser and the
HTTPS form submission. The guarantee is that the configured copy and subsequent
bearer handling stay on the server: the application does not put a key in a
client bundle, URL, local storage, or cookie.

## Session cookies

[`lib/session.ts`](../lib/session.ts) creates an eight-hour cookie named
`saatcms_dashboard_session`.

| Property | Implemented behavior |
| --- | --- |
| Integrity | HMAC-SHA-256 signature using `DASHBOARD_SESSION_SECRET` |
| Payload | Account actor ID or visitor discriminator, plus expiry |
| Confidential data | No CMS secret; no account identity in visitor payloads |
| JavaScript access | `HttpOnly` |
| Transport | `Secure` in production |
| Cross-site behavior | `SameSite=Lax` |
| Scope | Entire dashboard (`Path=/`) |
| Lifetime | Eight hours with an explicit expiry |

Every account-session read resolves the actor ID against the current
`CMS_API_KEYS`. Removing an actor therefore invalidates that actor's existing
session on its next use. Invalid signatures, malformed payloads, expired
payloads, and unknown actors are treated as no session.

Visitor login uses the same signed-cookie mechanism but stores no account ID
and does not select an account later. Logging out deletes the cookie. Rotating
`DASHBOARD_SESSION_SECRET` invalidates every current visitor and account
session.

The session is signed, not encrypted. This is appropriate because its payload
contains only the principal discriminator, optional actor ID, and expiry. Do
not add secrets or sensitive profile data to it.

## Route authorization: defense in depth

Visitor isolation is enforced in three separate places:

1. **Navigation:** [`components/app-shell.tsx`](../components/app-shell.tsx)
   removes Content, Channels, and EPG links for visitors.
2. **Route layout:**
   [`app/(dashboard)/(cms)/layout.tsx`](<../app/(dashboard)/(cms)/layout.tsx>)
   calls `requireDashboardAccountSession` for every nested CMS page.
3. **API client:** [`lib/api.ts`](../lib/api.ts) rejects a visitor attempting an
   authenticated request before calling `fetch`.

The outer
[`app/(dashboard)/layout.tsx`](<../app/(dashboard)/layout.tsx>) requires either
visitor or account session. No-session requests go to `/login`; visitor
requests to CMS pages go to `/dashboard?notice=cms-account-required`.

The navigation layer improves clarity but is not a security barrier. The route
guard stops direct URL access, and the API client protects against a future page
being placed in the wrong route group. SaatCMS then applies its own role and
business authorization as the final control.

When adding a protected route, place it under `(cms)`. When adding a new API
operation, keep the API client check enabled even if the page already has an
account guard.

## Outbound request policy

All normal upstream calls go through
[`saatCmsRequest`](../lib/api.ts). The caller supplies a relative path; the
client joins it to the validated `SAATCMS_API_BASE_URL`.

| Request class | Allowed paths | Session behavior | `Authorization` |
| --- | --- | --- | --- |
| Public | `/`, `/health`, `/ready`, `/api/v1/mw/*` | Does not read the dashboard session when `authenticated: false` | Absent |
| CMS | Any safe relative CMS path used by a feature | Requires an account session | `Bearer <account secret>` added by the server |
| Visitor-to-CMS attempt | Not allowed | Rejected locally with `DASHBOARD_ACCOUNT_REQUIRED` | No request is made |
| Unauthenticated-to-nonpublic attempt | Not allowed | Rejected locally | No request is made |

Before any fetch, the client rejects:

- paths without a leading slash;
- protocol-relative paths such as `//example.test`;
- backslashes;
- literal or percent-decoded `.` and `..` traversal segments; and
- any caller-provided `Authorization` header, regardless of header casing.

These checks prevent a feature from turning the server-side client into an open
proxy or overriding bearer selection. The only custom headers currently needed
by a public call are playback context headers (`X-User-Id`,
`X-User-Country`, and `X-Device-Type`).

All upstream requests use `cache: "no-store"`. Protected responses and
operational checks are therefore not intentionally reused between users or
requests by the application fetch cache.

## Secret boundaries

| Value | Source | May appear in browser? | Rotation effect |
| --- | --- | --- | --- |
| CMS account secret | Server `CMS_API_KEYS` | Only while the user manually enters their own key; never returned or persisted by the dashboard | Update backend and dashboard together; removed actors lose session validity |
| Session signing key | Server `DASHBOARD_SESSION_SECRET` | No | Signs out every session |
| Backend origin | `SAATCMS_API_BASE_URL` | Host is intentionally shown on System page | Changes the upstream target |
| Request timeout | `SAATCMS_REQUEST_TIMEOUT_MS` | No sensitive content | Changes when upstream calls abort |

[`lib/env.ts`](../lib/env.ts) imports `server-only`, validates all four values,
and caches the normalized result. It never returns schema details or rejected
values in its public configuration error. The project defines no
`NEXT_PUBLIC_*` secret.

Local `.env` files are ignored by Git. Use placeholders from
[`.env.example`](../.env.example); never paste a real current or retired secret
into source, tests, logs, screenshots, issues, or documentation. On Render,
`CMS_API_KEYS` is a non-synchronized secret and the Blueprint generates a
separate session signing value; see [`render.yaml`](../render.yaml).

## Errors, diagnostics, and data exposure

The API client translates backend and transport failures into a constrained
[`SaatCmsApiError`](../lib/api.ts): HTTP status, error code, safe message, and
optional `X-Request-Id`. It substitutes generic values for non-JSON error
bodies, maps timeouts to `UPSTREAM_TIMEOUT`/504, and maps other network failures
to `UPSTREAM_UNAVAILABLE`/503.

Feature Server Actions return only intentional form state. Unknown exceptions
become generic `UNEXPECTED_ERROR` responses rather than displaying stack traces
or error objects. Some workflows retain the backend request ID for correlation;
it is an identifier, not a credential.

The System page intentionally displays only the configured backend host plus
public health/readiness results. It does not display account entries, keys,
session data, or raw environment objects.

## Browser-facing hardening

[`next.config.ts`](../next.config.ts) disables the framework identification
header and applies these headers to every route:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

These are useful baseline controls, not a complete browser security policy.
There is currently no application-defined Content Security Policy. Any future
third-party scripts or observability browser SDKs should receive a separate
data-exposure and CSP review before adoption.

## Concurrency and destructive operations

Security includes preventing unintended operator actions, not only protecting
credentials.

- Content, Channel, and EPG updates forward the version read from the backend
  as `If-Match`. Conflicts are shown to the operator and are not automatically
  retried.
- Content deletion requires confirmation and does not recursively delete a
  hierarchy. A backend `CONTENT_HAS_CHILDREN` response is explained safely.
- Channel deletion requires typing the exact slug and sends the backend's
  explicit `confirm=true` flag. The backend still enforces admin permission.
- EPG forms validate exact time ranges locally; the backend remains authoritative
  for overlaps and concurrent changes.

See [Application architecture](architecture.md#optimistic-concurrency-with-etags)
for the request flow.

## Verification and maintenance

The most important access invariants have focused regression coverage:

- [`test/accounts.test.ts`](../test/accounts.test.ts): account parsing and
  authentication behavior;
- [`test/session.test.ts`](../test/session.test.ts): payload contents, cookie
  options, signatures, expiry, actor removal, and route guards;
- [`test/api.test.ts`](../test/api.test.ts): safe paths, public allowlist,
  visitor rejection, server-managed bearer headers, timeout, and safe errors;
  and
- [`components/app-shell.test.tsx`](../components/app-shell.test.tsx): visitor
  navigation filtering.

Run the full gates before merging an access-related change:

```powershell
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev
```

For manual release checks and credential rotation steps, follow
[Deployment and operations](deployment-and-operations.md). Do not use
production records for destructive verification.

## Known limits and future review points

- The dashboard account registry is environment-based; it has no password
  recovery, account lifecycle UI, MFA, or external identity provider.
- Editor and admin have the same dashboard controls. Backend authorization is
  required and must not be replaced by UI-only role checks.
- The dashboard does not add its own rate limiter or audit log. Operational
  controls depend on the deployment platform and backend.
- A Content Security Policy and external observability integration are deferred.
- Session cookies are integrity-protected but not encrypted; their payload must
  remain non-sensitive.

Treat any change to these assumptions as a security-model change. Update this
document, its regression tests, and the deployment procedure in the same
cohesive change.
