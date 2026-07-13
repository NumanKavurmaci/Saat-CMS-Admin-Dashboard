# Troubleshooting

Use this guide when the dashboard does not behave as expected. Each entry is organized as **Symptom -> likely cause -> fix**. Start with the least invasive check and preserve request IDs before restarting or rolling back anything.

Never paste `.env`, cookies, login form data, bearer headers, `CMS_API_KEYS`, or `DASHBOARD_SESSION_SECRET` into logs, issues, screenshots, or chat.

## Fast triage

Before changing configuration, answer these questions:

1. Does `/login` render?
2. Can a visitor session open `/dashboard`?
3. What does `/system` report for backend liveness and database readiness?
4. Do Metadata and Playback fail too, or only CMS routes?
5. Does the failure affect every account or one actor/role?
6. Is the error a status, stable error code, and request ID from the backend?
7. What changed last: dashboard code, backend code, environment, domain, or data?

This separates dashboard process failures from backend availability, authentication drift, role restrictions, validation errors, and stale-record conflicts.

## Local setup and startup

### `npm ci` reports an unsupported engine

**Symptom:** Installation warns or fails because the current Node.js version does not satisfy the project engine.

**Likely cause:** Node.js is older than 22.13.0.

**Fix:** Install a supported Node.js 22 release, verify `node --version`, and rerun `npm ci`. Use the lockfile; do not work around the engine by deleting `package-lock.json`.

### `npm ci` says the lockfile and package manifest are out of sync

**Symptom:** A clean install fails before downloading all dependencies.

**Likely cause:** `package.json` changed without a corresponding intentional `package-lock.json` update.

**Fix:** On the dependency-changing branch, run `npm install`, review both files, test the result, and commit them together. If you did not intend a dependency change, restore the correct manifest/lockfile pair from the branch rather than generating a new lockfile blindly.

### The application says its server environment is not configured correctly

**Symptom:** A page fails with `SaatCMS dashboard server environment is not configured correctly.` or login reports that dashboard authentication is not configured.

**Likely cause:** `.env` is missing, a required value is absent, the URL is invalid, the session secret is shorter than 32 characters, or the timeout is outside its accepted range.

**Fix:** Copy `.env.example` to `.env`, replace every placeholder, and verify the schema in [Development: Environment reference](development.md#environment-reference). Restart the server after a change because environment values are cached per process. Do not print the file while diagnosing it.

### Login configuration fails even though `CMS_API_KEYS` is present

**Symptom:** The login form reports a configuration problem for every account.

**Likely cause:** No valid editor/admin entry remains after parsing, valid actor IDs are duplicated, a secret is shorter than 32 characters, or commas/colons were used incorrectly.

**Fix:** Check the format manually in the environment manager: `actorId:editor:secret` or `actorId:admin:secret`, separated by commas. Actor IDs must be unique. Colons are allowed inside the secret; commas are not. Do not paste the real value into a terminal command or issue.

### The development server still uses an old environment value

**Symptom:** Editing `.env` does not change the backend origin, timeout, account list, or session behavior.

**Likely cause:** The development process is still running with its validated environment cache.

**Fix:** Stop and restart `npm run dev`. Sign in again if the account list or session signing secret changed.

### Port 3000 is already in use

**Symptom:** The development server cannot bind its default port.

**Likely cause:** Another local server, often an earlier dashboard process, is still running.

**Fix:** Stop the earlier process from the terminal that started it. On Windows, inspect ownership with `Get-NetTCPConnection -LocalPort 3000` before ending anything. Do not terminate every Node.js process because another project might be using one.

## Login and sessions

### Correct-looking credentials are rejected

**Symptom:** Login returns `The supplied credentials are not valid.`

**Likely cause:** Actor ID, role, or secret differs from the dashboard's current `CMS_API_KEYS`; the actor was removed; the account uses an unsupported role; or invisible whitespace was included in the secret.

**Fix:** Compare the actor entry in the dashboard and backend environment managers without copying it into logs. Actor ID and role are trimmed by the parser, but the secret is matched exactly. Confirm the role is `editor` or `admin`, update both services together if needed, then restart/redeploy and try a new login.

### Login succeeds, then the next page returns to `/login`

**Symptom:** The browser appears to authenticate but immediately loses the session.

**Likely cause:** The session cookie is missing, expired, signed by an old `DASHBOARD_SESSION_SECRET`, blocked by browser policy, or invalid because the actor no longer exists.

**Fix:** Confirm the site is opened over its normal HTTPS origin, clear only this dashboard's cookie, and sign in again. Verify that the service has a stable session secret and that the actor still exists. If the signing secret was intentionally rotated, all existing sessions being invalid is expected.

### Every user was signed out after a deployment

**Symptom:** Existing visitor and account sessions all stop working at once.

**Likely cause:** `DASHBOARD_SESSION_SECRET` was replaced, removed, or regenerated.

**Fix:** If rotation was intentional, ask users to sign in again and verify new sessions. If it was accidental, restore the intended secret through Render configuration and redeploy, then review who changed it. Do not replace it with a CMS bearer credential.

### An account session becomes unusable after credential maintenance

**Symptom:** A previously signed-in user gets a login or account-required failure after `CMS_API_KEYS` changed.

**Likely cause:** The signed cookie contains the actor identity, not a frozen secret. The dashboard resolves that actor from current configuration on each protected request. Removing or renaming the actor invalidates the session.

**Fix:** Complete the credential synchronization between dashboard and backend, then sign in again with the current actor ID and secret.

## Visitor behavior

### Content, Channels, and EPG are missing

**Symptom:** The navigation only contains Overview, Metadata Resolver, Playback Tester, and System.

**Likely cause:** The current session is a visitor session.

**Fix:** This is expected. Select **Sign in**, then use an editor/admin account to access CMS management routes.

### A direct CMS URL returns to the dashboard

**Symptom:** Visiting `/content`, `/channels`, `/epg`, or a nested CMS URL redirects to `/dashboard?notice=cms-account-required`.

**Likely cause:** The `(cms)` server layout detected a visitor session.

**Fix:** Sign in with a configured account. Do not move the route outside the protected layout or weaken the API client to bypass this control.

### Visitor Metadata or Playback returns an account-required error

**Symptom:** A public tool reports `DASHBOARD_ACCOUNT_REQUIRED`, or a new visitor feature never reaches the backend.

**Likely cause:** The code called a middleware endpoint without `authenticated: false`, or used a path outside the public allowlist.

**Fix:** For existing tools, confirm the deployed version matches the tested release. For new development, use the shared API client, explicitly set `authenticated: false`, and keep the path within `/api/v1/mw/*`, `/`, `/health`, or `/ready`. Add a regression test proving no `Authorization` header is attached.

## Backend connectivity and health

### `/login` works but `/system` reports liveness unavailable

**Symptom:** Render marks the dashboard healthy, while the System page cannot complete backend `GET /health`.

**Likely cause:** The dashboard process is healthy but the backend is sleeping, deploying, unreachable, or the base URL is wrong.

**Fix:** Check the backend service's Render Events and Logs, open its configured `/health` endpoint directly, and verify `SAATCMS_API_BASE_URL` is an origin without `/api/v1`. Wait for a cold start or deploy to finish before changing dashboard code.

### Liveness is healthy but readiness is not

**Symptom:** `/system` shows the backend service as operational and its database as not ready.

**Likely cause:** Backend `GET /health` succeeds, but `GET /ready` cannot confirm PostgreSQL readiness.

**Fix:** Investigate the backend and database connection, migrations, capacity, and Render status. Do not roll back the dashboard unless its deployed backend origin is wrong.

### `UPSTREAM_UNAVAILABLE` / HTTP 503

**Symptom:** A card or form reports `UPSTREAM_UNAVAILABLE` with HTTP 503.

**Likely cause:** Network failure, DNS/TLS failure, invalid backend origin, or the backend closed the connection before returning an HTTP response.

**Fix:** Check `/system`, the configured origin, and both Render services. Confirm the backend URL uses `http://` or `https://` and does not include an API path. Retry only after connectivity recovers.

### `UPSTREAM_TIMEOUT` / HTTP 504

**Symptom:** A request fails after the configured wait with `UPSTREAM_TIMEOUT`.

**Likely cause:** The backend is cold-starting, overloaded, blocked on its database, or the timeout is too short for the environment.

**Fix:** Check backend latency and readiness first. If normal operations legitimately exceed the current limit, adjust `SAATCMS_REQUEST_TIMEOUT_MS` within `1000`-`120000`, restart/redeploy, and document the reason. Increasing a timeout is not a substitute for fixing sustained backend latency.

### An error includes a request ID

**Symptom:** The UI shows a stable error code and a request identifier.

**Likely cause:** The backend processed the request and returned `X-Request-Id` with an error response.

**Fix:** Record the request ID, timestamp/timezone, route, deployed commit, and HTTP status. Search backend logs for that ID. Do not record the bearer token, cookies, or form secret.

## Authentication and authorization errors

### Protected calls return 401

**Symptom:** Login may work locally, but Content/Channel/EPG reads return an authentication error from the backend.

**Likely cause:** Dashboard and backend `CMS_API_KEYS` drifted, the dashboard is using a stale secret, or the actor was removed on one service.

**Fix:** Compare the two services' effective account entries in their environment managers, update them as one credential rotation, deploy both, and verify a fresh login plus one protected read.

### Protected calls return 403

**Symptom:** A CMS operation is forbidden even though the user is signed in.

**Likely cause:** The backend role does not permit the operation, or the request originated from a visitor session. Admin-only Live Channel deletion is a common example.

**Fix:** Confirm the current actor and role displayed by the dashboard. Use an admin only when the operation requires it. Do not add a client-side bypass; backend authorization is authoritative.

## Content, Channel, and EPG writes

### A save returns a write-conflict error

**Symptom:** Content, Channel, or EPG edit reports `*_WRITE_CONFLICT` and offers a reload path.

**Likely cause:** Another request changed the record after this form loaded, so its ETag is stale.

**Fix:** Copy any unsaved text you need, reload the latest record, review the other change, and submit again using the new ETag. Do not automatically retry with the stale payload or remove `If-Match`.

### Content deletion says the item has children

**Symptom:** Deleting Content returns `CONTENT_HAS_CHILDREN`.

**Likely cause:** The record is a Series or Season with dependent child records.

**Fix:** Remove or move every child deliberately, then delete the now-leaf record. Recursive Content deletion is intentionally unavailable.

### Channel deletion remains disabled or is rejected

**Symptom:** The delete action cannot be submitted, returns `CONFIRMATION_REQUIRED`, or is forbidden.

**Likely cause:** The exact current slug was not entered, the actor is not authorized, or the backend requires the explicit cascade flag.

**Fix:** Use an authorized admin, type the exact slug shown in the form, and confirm the Channel and its EPG schedule are disposable. The dashboard sends `confirm=true`; do not bypass the typed confirmation.

### EPG creation reports an overlap

**Symptom:** An EPG create/edit remains on the form with an overlap error.

**Likely cause:** The proposed UTC interval intersects an existing program for the same Channel.

**Fix:** Return to the Channel's day schedule, compare the existing time window, and choose a non-overlapping interval. Preserve the submitted details while adjusting start/end times.

### EPG appears on the wrong day or hour

**Symptom:** A program's displayed time differs from the entered local time.

**Likely cause:** Browser-local datetime values are converted to ISO/UTC instants, the browser timezone is unexpected, or the original data was created with a different timezone assumption.

**Fix:** Confirm the workstation timezone, inspect the local day selected in the EPG navigation, and compare the stored instant. Test changes around midnight and daylight-saving transitions. Do not append `Z` manually to a local form value.

## Public tools

### Metadata Resolver says a Content ID is required or not found

**Symptom:** The tool returns `CONTENT_ID_REQUIRED` before a request, or a backend not-found error afterward.

**Likely cause:** The field is blank, the ID is wrong, or the record does not exist in the selected backend environment.

**Fix:** Paste an exact Content ID from that backend environment. The resolver URL-encodes the ID and uses public resolved metadata; it does not expose the protected playback URL.

### Playback Tester rejects the input

**Symptom:** The tool returns `INVALID_TEST_INPUT`.

**Likely cause:** Content ID or user ID is blank, country is not a two-letter code, or device is not `Mobile`, `SmartTV`, or `Web`.

**Fix:** Complete all fields, use a two-letter ISO-style country code, and select one of the supported devices. The action uppercases country before sending `X-User-Country`.

### Playback is blocked when metadata resolution succeeds

**Symptom:** Metadata is visible, but Playback returns a blocked decision and no protected URL.

**Likely cause:** Playback applies context-sensitive rules such as premium access, country restrictions, device rules, or backend user policy. Public metadata resolution alone is not authorization.

**Fix:** Review the returned reason/error, Content metadata, user ID, country, and device. Test only with known backend fixtures. Do not make the dashboard fabricate or reveal a playback URL for a blocked decision.

## Tests, lint, and build

### Coverage fails even though all tests pass

**Symptom:** Vitest reports passing tests but exits non-zero on coverage.

**Likely cause:** Branch, function, line, or statement coverage fell below 80% for configured server actions, form components, shared components, or libraries.

**Fix:** Open `coverage/index.html`, find the uncovered behavior introduced by the change, and add meaningful regression tests. Do not lower thresholds or exclude a file just to make CI green.

### A React test contaminates the next test

**Symptom:** A component test passes alone but fails in the full suite due to duplicate elements or stale DOM.

**Likely cause:** A test bypassed the shared setup or left global mocks/state in place.

**Fix:** Keep the test in the existing Vitest environment, rely on the shared DOM cleanup, and restore mocks/environment changes in hooks. Avoid importing a second custom cleanup layer.

### Server-only imports fail under Vitest

**Symptom:** A test throws because the `server-only` package is being loaded outside a React Server Component runtime.

**Likely cause:** The test is not using `vitest.config.ts`, which aliases `server-only` to `test/server-only.ts`.

**Fix:** Run tests through the repository scripts and do not remove the alias. Do not weaken production modules by deleting their `server-only` imports.

### Local checks pass but CI fails

**Symptom:** GitHub Actions fails on install, type-check, lint, coverage, audit, or build while the developer's latest local command passed.

**Likely cause:** Different Node version, a dirty local dependency tree, uncommitted generated/type files, lockfile drift, case-sensitive path differences, or only a subset of gates was run locally.

**Fix:** Use Node 22.13.0, run a clean `npm ci`, then execute the full gate in CI order. Inspect the first failing job step. CI's environment values are safe placeholders and are expected only to satisfy build-time validation.

### `npm audit --omit=dev` fails

**Symptom:** CI reports a production dependency vulnerability.

**Likely cause:** A runtime dependency or its transitive dependency now has an advisory.

**Fix:** Review the advisory and dependency path, update the smallest compatible dependency set on a focused branch, and rerun all gates. Do not use a forced audit fix without reviewing major-version and runtime changes.

### Production build succeeds but `npm run start` does not

**Symptom:** Vinext cannot find the production output or starts with stale files.

**Likely cause:** `npm run build` was not run in the current worktree, or generated output belongs to an older dependency/configuration state.

**Fix:** Stop the server, run `npm run build`, then `npm run start`. If generated state is demonstrably stale, remove only this repository's `dist`, `.vinext`, `.next` (if present), and `.wrangler` output directories before rebuilding; verify the working directory first.

## Render deployment

### The first Blueprint deploy never asks for `CMS_API_KEYS`

**Symptom:** The service starts without a clear CMS credential prompt, or an existing Blueprint sync does not show one.

**Likely cause:** `sync: false` prompts only during initial Blueprint creation and is ignored during updates to an existing Blueprint.

**Fix:** Open the existing dashboard service's **Environment** settings, add/update `CMS_API_KEYS` manually (or link the intended environment group), save, and deploy. Verify login without exposing the value.

### Render cannot detect an open port

**Symptom:** Deploy logs say no port was found or the service never becomes reachable.

**Likely cause:** The production process did not start, exited on configuration, or did not bind Render's `PORT` on `0.0.0.0`.

**Fix:** Confirm the Blueprint start command is `npm run start`, inspect the earliest runtime error, and do not hardcode port 3000 in production. Render normally supplies port 10000 through `PORT`.

### Render health checks fail

**Symptom:** The build completes but the deploy never becomes healthy.

**Likely cause:** `/login` does not return a `2xx`/`3xx` within Render's health-check window, the server is not listening correctly, or startup fails due to dependencies/configuration.

**Fix:** Inspect service logs from process startup, confirm `healthCheckPath: /login`, and verify the same production bundle locally. The `/login` check intentionally does not require backend readiness, so investigate dashboard startup before the backend.

### Environment changes appear to have no effect on Render

**Symptom:** A deploy still uses old accounts, backend origin, timeout, or session behavior.

**Likely cause:** The variable was changed in the wrong service/environment, a service-level value overrides an environment group, or a deploy incorporating the change did not complete.

**Fix:** Verify the dashboard service and environment, inspect linked environment groups and service-level overrides, save the change, and deploy. Confirm the resulting deploy event and sign in again when account/session configuration changed.

### Render serves an older commit

**Symptom:** The UI does not include a merged change.

**Likely cause:** The service tracks another branch, autodeploy is disabled, the push never reached the remote, or a rollback is still active.

**Fix:** Compare Render's deployed commit SHA and branch with the approved release. Review the Events page and autodeploy setting. Re-enable autodeploy only after the rollback cause is fixed, or manually deploy the correct commit.

### A rollback restores code but authentication still fails

**Symptom:** The previous dashboard build is running, but account calls still return 401/403.

**Likely cause:** The incident is configuration drift between dashboard and backend, not dashboard code. Environment groups and the separate backend deployment do not necessarily move with a dashboard code rollback.

**Fix:** Verify the effective `CMS_API_KEYS` and backend origin on both services, restore the intended matching credential set, deploy as required, and test a fresh login plus protected read. Review [Deployment and operations: Rollback](deployment-and-operations.md#rollback).

## Suspected secret leak

### A credential appears in Git, logs, or a screenshot

**Symptom:** A real CMS secret, session secret, cookie, or `.env` value was published or committed.

**Likely cause:** A secret file was force-added, environment output was logged, or diagnostic material captured sensitive data.

**Fix:** Rotate the affected secret immediately, redeploy every service that uses it, verify the old value is rejected, and review access logs. Remove the exposed material from current content and coordinate any shared Git-history rewrite with the repository owner. Never reproduce the secret in the incident record.

## When to escalate

Escalate with safe evidence when:

- backend `/health` or `/ready` remains degraded after its deploy/cold start window
- authentication drift persists after both services are verified and redeployed
- a request repeatedly returns `5xx`, timeout, or an unknown stable error code
- data appears overwritten despite ETag handling
- a credential might have been exposed
- rollback does not restore the known-good behavior

Include timestamp/timezone, route, operation, HTTP status, error code, request ID, dashboard commit, and affected role. Exclude all secrets and personal data.

## Related documentation

- [Documentation home](README.md)
- [Development](development.md)
- [Deployment and operations](deployment-and-operations.md)
- [Project README](../README.md)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
- [Render rollbacks](https://render.com/docs/rollbacks)
- [Render web services](https://render.com/docs/web-services)
