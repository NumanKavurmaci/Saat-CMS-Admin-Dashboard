# SaatCMS Admin Dashboard: Product and Feature Guide

This guide explains the dashboard as an operator uses it: what each workspace is for, who can open it, and how to complete the common tasks safely. For exact dashboard routes and backend endpoint mappings, see the [route reference](route-reference.md).

## What the dashboard does

The dashboard is the operating surface for the SaatCMS Middleware Core. It brings three kinds of work into one place:

- editorial work: Content, Live Channels, and EPG schedules;
- middleware verification: resolved metadata and playback decisions;
- operational checks: backend liveness and database readiness.

A CMS key entered at login passes once through the browser form to a Server Action, but it is not stored in browser storage or a session cookie. The configured account registry stays on the server, which selects and attaches credentials to protected backend requests. Public middleware and health requests are sent without a bearer credential.

## Access modes

The dashboard supports account and visitor sessions. Both are signed, HttpOnly sessions that last eight hours.

| Access mode | What is visible | Backend credential behavior |
| --- | --- | --- |
| Signed out | Login page only | No backend request is made until a session is started. |
| Visitor | Overview, Metadata Resolver, Playback Tester, and System | Only public backend endpoints are used. No CMS bearer credential is selected or sent. |
| Editor | All visitor pages plus Content, Live Channels, and EPG | The editor key stays on the server and is attached to CMS requests. |
| Admin | The same dashboard interface as an editor | The admin key stays on the server and also permits the backend's admin-only channel deletion operation. |

The editor and admin interfaces are intentionally almost identical. SaatCMS remains the final authorization authority. In particular, the channel deletion control is visible to account users, but the backend permits the destructive cascade only for an admin credential.

### Start a visitor session

1. Open `/login`.
2. Select **Continue as visitor**.
3. Use Overview, Metadata Resolver, Playback Tester, or System.
4. Select **Sign in** in the header when you want to leave visitor mode and return to the login page.

Content, Live Channels, and EPG links are hidden in visitor mode. Opening one of those URLs directly redirects to Overview with an account-required notice. The server-side API client provides a second boundary and rejects visitor attempts to use a CMS endpoint before contacting the backend.

### Sign in with an account

1. Open `/login`.
2. Enter the configured actor ID and its CMS access key.
3. Select **Open control center**.
4. Select **Sign out** in the header when finished.

Credentials are checked against the server environment; they are not stored in browser storage. If an account is removed from the server configuration, its session can no longer resolve that actor on the next request.

## Overview

Overview answers two questions quickly: “Is the middleware healthy?” and “Where should I work next?”

Every session sees:

- backend process health from `GET /health`;
- PostgreSQL and migration readiness from `GET /ready`;
- shortcuts to the workspaces available in the current access mode;
- an explanation of the active security boundary.

Account sessions also see total Content and Live Channel counts. Those totals use protected CMS list endpoints with a page size of one; only the aggregate total is shown. Visitor sessions do not make these protected requests.

If a visitor follows a saved CMS link, Overview shows an account-required notice instead of exposing the protected page.

## Content library

Content management is available to editor and admin accounts. The library contains four record types and enforces this hierarchy:

| Type | Parent rule | Typical role |
| --- | --- | --- |
| Series | Root record; no parent | Top of an episodic catalog tree |
| Season | Must belong to a Series | Groups Episodes within a Series |
| Episode | Must belong to a Season | Playable episodic item |
| Movie | Root record; no parent | Standalone playable item |

Content type is chosen at creation and cannot be changed later. Reparenting is allowed only when the resulting hierarchy remains valid; the backend also rejects hierarchy cycles.

### Find content

1. Open **Content**.
2. Search by title, choose a type, or enter an exact parent ID.
3. Choose a page size between 10 and 100.
4. Select a title or **View** to open its detail page.

An empty result is a valid state: the library offers a clear-filters action rather than treating it as a failure.

### Create content

1. Select **Create content**.
2. Choose Series, Season, Episode, or Movie and enter a title.
3. For a Season, choose or paste a Series ID. For an Episode, choose or paste a Season ID.
4. Add only the metadata that should be owned by this record.
5. Select **Create content**.

The parent picker loads eligible Series and Seasons. When either parent catalog contains more than 100 records, a backend title search appears. An exact parent ID can always be pasted.

### Work with inherited metadata

Each metadata field resolves independently from the closest ancestor. For an Episode, resolution proceeds from Episode to Season to Series until a value is found.

| Field | How to inherit | How to override |
| --- | --- | --- |
| Parental rating | Leave blank | Enter a rating such as `16+` |
| Genre | Leave blank | Enter the local genre |
| Quality | Choose **Inherit** | Choose SD, HD, or UHD 4K |
| Premium | Choose **Inherit** | Choose **Yes** or **No**; an explicit **No** is a real override |
| Playback URL | Leave blank | Enter the protected asset URL |
| Geo-block countries | Leave **Override geo-block countries here** off | Turn it on and enter two-letter country codes |

Geo-blocking has one important special case: an enabled override with an empty country list means “clear inherited blocks.” It is different from leaving the override disabled, which means “keep looking at the parent.” Country codes can be separated by spaces or commas; the dashboard normalizes them to uppercase, removes duplicates, and requires two letters.

On a Content detail page, **Raw overrides vs. resolved metadata** compares the values stored on the record with the public values returned after inheritance. Playback URLs are never included in this public preview.

### Edit without overwriting someone else's work

1. Open the Content detail page.
2. Review the current raw and resolved values.
3. Change the editable fields and select **Save changes**.

The detail request captures the resource's ETag. The dashboard sends it back as `If-Match` on save. If another request changed the record first, SaatCMS returns `CONTENT_WRITE_CONFLICT`; the form keeps the failed state and offers **Reload latest version**. Reload, review the newer data, and apply the intended change again.

### Delete content safely

1. Open a Content detail page and select **Delete**.
2. Read the confirmation and select **Delete leaf permanently**.

Only a leaf record can be deleted. A Series with Seasons or a Season with Episodes returns `CONTENT_HAS_CHILDREN`. Move or delete every child first. The operation never recursively removes descendants; deleting a leaf removes only that Content record and its own geo-block rows.

## Live Channels

Live Channels are the stable identities that own EPG schedules. Channel management is available to editor and admin accounts.

### Find or create a channel

1. Open **Live Channels**.
2. Filter by channel name or slug if needed.
3. Select **New channel**.
4. Enter a human-readable name and a stable slug.
5. Select **Create channel**.

Slugs are lowercased and may contain letters, numbers, and single hyphens between segments, for example `saat-news`. They should be treated as durable identifiers. The backend rejects duplicate slugs with `LIVE_CHANNEL_SLUG_CONFLICT`.

### Edit a channel

Open a channel card, change the name or slug, and save. Channel updates use the same ETag/`If-Match` pattern as Content. If the version is stale, `LIVE_CHANNEL_WRITE_CONFLICT` appears with a link to reload the latest channel before retrying.

### Delete a channel and its schedule

Channel deletion is deliberately more destructive than Content deletion:

1. Open the channel detail page with an admin account.
2. Type the exact channel slug into the confirmation field.
3. Select **Delete channel**.

The dashboard sends the backend's required `confirm=true` flag. A successful delete atomically removes the channel, every EPG program on its schedule, and its internal schedule lock. This action requires an admin credential; an editor receives the backend's permission error and no data is changed.

## EPG schedule

The EPG workspace is a simple day-based editor for one channel at a time. It is available to editor and admin accounts.

### Open a schedule

1. Open **EPG Schedule** and choose a channel, or select **EPG** on a Live Channel card.
2. Use the channel selector to switch schedules.
3. Choose a date, or use **Previous day**, **Today**, and **Next day**.

The schedule shows programs that intersect the selected local day, including a program that starts before midnight and ends during that day. It lists up to 100 programs per page in chronological order.

### Understand local time and UTC

The form uses the browser's local wall-clock time so operators can enter familiar values. Before submission, each value is converted to an ISO 8601 UTC instant. The form and schedule show the exact UTC values underneath the local display for verification.

This distinction matters around timezone offsets and daylight-saving transitions. The selected day is sent to the backend as a half-open UTC window representing local midnight up to, but not including, the next local midnight.

### Add a program

1. Open the intended channel and day.
2. Select **Add program**.
3. Enter the program name, local start time, and local end time.
4. Check the displayed UTC range.
5. Select **Add program**.

The end must be later than the start. Back-to-back ranges such as 10:00–11:00 and 11:00–12:00 are allowed. A real overlap on the same channel returns `EPG_OVERLAP`; the program is not created. The same time range on another channel is valid.

### Edit or delete a program

Use the pencil action to edit a program. The edit form loads the current ETag and sends it with the changed fields. Saving without any changes is rejected locally. If another operator changed the program first, `EPG_WRITE_CONFLICT` offers a reload link.

Use the trash action to delete one program and confirm the browser prompt. Deleting a program leaves the channel and every other schedule entry intact.

## Metadata Resolver

The Metadata Resolver is available to visitors and account users because it calls the public middleware endpoint without a bearer credential.

1. Open **Metadata Resolver**.
2. Enter a Content ID.
3. Select **Resolve metadata**.

The result shows type, title, parental rating, genre, quality, premium status, and resolved geo-block countries. It is useful for confirming that Series, Season, and Episode overrides produce the expected public result. Protected playback data is intentionally absent.

Missing content and other backend failures appear with their stable error code and readable message.

## Playback Tester

The Playback Tester is also available to visitors and account users. It exercises the public playback gatekeeper with the same context headers a client would send.

1. Enter a Content ID and User ID.
2. Enter a two-letter country code.
3. Choose Web, SmartTV, or Mobile.
4. Select **Authorize playback**.

The dashboard normalizes the country to uppercase and sends `X-User-Id`, `X-User-Country`, and `X-Device-Type`. It does not send a CMS bearer credential.

If every rule passes, the result contains the playback URL, request context, and resolved metadata. Common denied decisions include:

- `GEO_BLOCKED` when the resolved country list blocks the request;
- `DEVICE_NOT_SUPPORTED` when premium UHD 4K content is requested on Mobile;
- `CONTENT_NOT_FOUND` for an unknown Content ID.

A denied result never displays a playback URL or protected asset details.

## System status

System is available to every signed dashboard session and uses only public endpoints. It shows:

- process liveness from `/health`;
- database and migration readiness from `/ready`;
- the configured backend host.

“Operational” means the backend process answered its liveness check. “Ready” additionally means its PostgreSQL readiness gate passed. A service can therefore be alive but not ready to serve database-backed work.

## Loading, empty, error, and conflict states

The dashboard treats recovery as part of each workflow.

| State | What the operator sees | Recommended response |
| --- | --- | --- |
| Loading | A skeleton that preserves the page shape | Wait for the server-rendered view to complete. |
| Empty Content search | “No content matches” with **Clear filters** | Clear or broaden the filters, or create a record. |
| Empty channel search | “No channels match” | Clear or broaden the name/slug filters. |
| No channels for EPG | A prompt to create a channel first | Create the owning channel, then return to EPG. |
| Empty schedule day | “No programs on this day” | Add the first program; back-to-back ranges are valid. |
| Idle tool | An instructional placeholder | Supply the requested context and run the tool. |
| Expected backend error | A readable message plus stable error code; page-level errors also show HTTP status | Correct the input or permission issue and retry. Use the error code when reporting a problem. |
| Upstream timeout | `UPSTREAM_TIMEOUT` / HTTP 504 | Retry after a short delay. |
| Backend unavailable | `UPSTREAM_UNAVAILABLE` / HTTP 503 | Check System and the backend deployment. |
| Stale edit | A resource-specific `*_WRITE_CONFLICT` | Reload the latest version, review it, and reapply the change. |
| Unexpected view error | A protected error screen with **Retry view** | Retry the read. The dashboard does not automatically repeat a mutation. |
| Unknown route | A 404 page with **Back to overview** | Return to Overview and navigate from a known resource. |

Content mutation errors can also show the backend request ID when available. Preserve that value with the error code when asking for backend diagnostics.

## Safety principles operators should know

- Visitor traffic is limited to the public allowlist and never carries a CMS bearer.
- CMS credentials are attached only by the dashboard server and cannot be supplied by a browser caller.
- Protected playback URLs do not appear in public metadata or failed playback responses.
- ETags prevent a stale form from silently overwriting a newer Content, Channel, or EPG version.
- Content deletion is non-recursive; channel deletion is an explicit admin-only cascade.
- EPG overlap protection is enforced by the backend even when concurrent requests race.
