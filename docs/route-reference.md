# SaatCMS Dashboard Route and Endpoint Reference

This is the concise map from dashboard pages to SaatCMS backend endpoints. Read the [product and feature guide](feature-guide.md) for operator workflows and field behavior.

All backend paths below are relative to `SAATCMS_API_BASE_URL`.

## Access legend

| Label | Meaning |
| --- | --- |
| Anonymous | No dashboard session is required. |
| Session | Either a signed visitor session or an editor/admin account session. The page uses only public upstream endpoints. |
| Account | A signed editor or admin account session is required. Protected upstream calls receive that account's bearer key from the dashboard server. |
| Admin action | The page is visible to account users, but the named destructive operation is authorized only for an admin by SaatCMS. |

“Session” does not mean the dashboard page itself is anonymously public. A visitor must first use **Continue as visitor** on `/login`; the resulting upstream requests remain unauthenticated and contain no bearer credential.

## Dashboard routes

| Dashboard route | Access | Purpose | Main backend calls |
| --- | --- | --- | --- |
| `/` | Anonymous | Sends an existing session to `/dashboard`; otherwise sends the user to `/login`. | None |
| `/login` | Anonymous | Starts an account or visitor session. An existing session is redirected to Overview. | None; account credentials are checked against server configuration. |
| `/dashboard` | Session | Shows liveness, readiness, workspace shortcuts, and the active security boundary. Account sessions also see CMS totals. | `GET /health`, `GET /ready`; accounts also call `GET /api/v1/cms/content?page=1&pageSize=1` and `GET /api/v1/cms/channels?page=1&pageSize=1`. |
| `/content` | Account | Lists, filters, and pages through Content. | `GET /api/v1/cms/content` |
| `/content/new` | Account | Creates Series, Season, Episode, or Movie records. | Parent choices: `GET /api/v1/cms/content`; submit: `POST /api/v1/cms/content` |
| `/content/[id]` | Account | Shows raw/resolved metadata, edits the record, and deletes a leaf. | `GET`, `PATCH`, or `DELETE /api/v1/cms/content/{id}`; public preview: `GET /api/v1/mw/content/{id}`; parent choices: Content list endpoint |
| `/channels` | Account | Lists and filters Live Channels. | `GET /api/v1/cms/channels` |
| `/channels/new` | Account | Creates a Live Channel. | `POST /api/v1/cms/channels` |
| `/channels/[channelId]` | Account; delete is an Admin action | Edits channel identity, opens its EPG, or explicitly deletes the channel and full schedule. | `GET` or `PATCH /api/v1/cms/channels/{channelId}`; delete uses `DELETE /api/v1/cms/channels/{channelId}?confirm=true` |
| `/epg` | Account | Chooses a channel whose schedule should be opened. | `GET /api/v1/cms/channels?page=1&pageSize=100` |
| `/channels/[channelId]/epg` | Account | Shows one channel's selected-day schedule and provides day/channel navigation. | Channel reads plus `GET /api/v1/cms/channels/{channelId}/epg?windowStart=...&windowEnd=...&page=...&pageSize=100` |
| `/channels/[channelId]/epg/new` | Account | Creates one schedule entry using local inputs converted to UTC. | `GET /api/v1/cms/channels/{channelId}`; `POST /api/v1/cms/channels/{channelId}/epg` |
| `/channels/[channelId]/epg/[programId]/edit` | Account | Loads and updates one EPG Program using its latest ETag. | `GET /api/v1/cms/channels/{channelId}`; `GET` and `PATCH /api/v1/cms/channels/{channelId}/epg/{programId}` |
| `/tools/metadata` | Session | Resolves public inherited metadata for a Content ID. | `GET /api/v1/mw/content/{contentId}` without bearer |
| `/tools/playback` | Session | Tests a public playback decision for a user, country, and device. | `GET /api/v1/mw/playback/{contentId}` with context headers and without bearer |
| `/system` | Session | Shows backend liveness, database readiness, and configured host. | `GET /health`, `GET /ready`, both without bearer |

Visitors who request `/content`, `/channels`, `/epg`, or any nested CMS route are redirected to `/dashboard?notice=cms-account-required`. Those routes are also omitted from visitor navigation.

## Useful dashboard query parameters

These are normal URL query parameters, so filtered and dated views can be bookmarked.

| Dashboard route | Parameter | Meaning |
| --- | --- | --- |
| `/content` | `title` | Case-insensitive title search forwarded to the backend. |
| `/content` | `type` | One of `SERIES`, `SEASON`, `EPISODE`, or `MOVIE`. |
| `/content` | `parentId` | Exact parent Content ID. |
| `/content` | `page`, `pageSize` | Positive page number and a page size up to 100. The UI offers 10, 20, 50, and 100. |
| `/content/new`, `/content/[id]` | `parentSearch` | Backend title search for eligible Series and Season parents when the catalog exceeds 100 records. |
| `/channels` | `name`, `slug` | Case-insensitive channel filters. The slug is normalized to lowercase. |
| `/channels` | `page`, `pageSize` | Positive page number and a page size capped at 100. |
| `/channels/[channelId]/epg` | `date` | Display date in `YYYY-MM-DD` form. |
| `/channels/[channelId]/epg` | `windowStart`, `windowEnd` | Timezone-aware ISO instants for the selected local-day window. The dashboard generates and carries these values automatically. |
| `/channels/[channelId]/epg` | `page` | Schedule page; each page requests up to 100 programs. |
| `/dashboard` | `notice=cms-account-required` | Internal notice used after a visitor attempts to open a CMS page. |

Success flags such as `saved`, `deleted`, and their values are generated by completed server actions to show confirmation banners. They are not part of the backend API contract.

## Backend endpoint matrix

### Public endpoints

Public requests never receive an `Authorization` header from the dashboard.

| Method and endpoint | Dashboard use | Important input/output |
| --- | --- | --- |
| `GET /health` | Overview and System | Process liveness. |
| `GET /ready` | Overview and System | Database connectivity and migration readiness. |
| `GET /api/v1/mw/content/{contentId}` | Metadata Resolver and Content detail preview | Resolved public metadata; excludes `playbackUrl`. |
| `GET /api/v1/mw/playback/{contentId}` | Playback Tester | Requires `X-User-Id`, `X-User-Country`, and `X-Device-Type`; returns playback data only when every gate passes. |

### CMS Content endpoints

| Method and endpoint | Dashboard operation | Concurrency or safety behavior |
| --- | --- | --- |
| `GET /api/v1/cms/content` | List/filter Content and load parent choices | Supports `type`, `parentId`, `title`, `page`, and `pageSize`. |
| `POST /api/v1/cms/content` | Create Content | Backend generates the Content ID and validates the hierarchy. |
| `GET /api/v1/cms/content/{id}` | Open Content detail | Returns the ETag captured by the edit form. |
| `PATCH /api/v1/cms/content/{id}` | Save Content changes | Sends `If-Match`; stale versions return `CONTENT_WRITE_CONFLICT`. Type is immutable. |
| `DELETE /api/v1/cms/content/{id}` | Delete a leaf | A record with children returns `CONTENT_HAS_CHILDREN`; no recursive deletion occurs. |

### CMS Live Channel endpoints

| Method and endpoint | Dashboard operation | Concurrency or safety behavior |
| --- | --- | --- |
| `GET /api/v1/cms/channels` | List/filter channels and populate EPG channel selectors | Supports `name`, `slug`, `page`, and `pageSize`. |
| `POST /api/v1/cms/channels` | Create a channel | Creates the channel's internal schedule lock; duplicate slugs return `LIVE_CHANNEL_SLUG_CONFLICT`. |
| `GET /api/v1/cms/channels/{channelId}` | Open channel detail or EPG form | Returns the ETag captured by the edit form. |
| `PATCH /api/v1/cms/channels/{channelId}` | Save name/slug changes | Sends `If-Match`; stale versions return `LIVE_CHANNEL_WRITE_CONFLICT`. |
| `DELETE /api/v1/cms/channels/{channelId}?confirm=true` | Delete a channel | Admin only. Cascades the channel's EPG Programs and schedule lock. The UI additionally requires the exact slug. |

### CMS EPG endpoints

| Method and endpoint | Dashboard operation | Concurrency or safety behavior |
| --- | --- | --- |
| `GET /api/v1/cms/channels/{channelId}/epg` | List the selected-day schedule | Requires timezone-aware `windowStart`/`windowEnd`; returns programs intersecting that half-open window. |
| `POST /api/v1/cms/channels/{channelId}/epg` | Add a program | Requires name and timezone-aware start/end instants. Same-channel overlaps return `EPG_OVERLAP`; back-to-back programs are valid. |
| `GET /api/v1/cms/channels/{channelId}/epg/{programId}` | Open the program editor | Channel-scoped and returns the ETag. |
| `PATCH /api/v1/cms/channels/{channelId}/epg/{programId}` | Save changed program fields | Sends `If-Match`; stale versions return `EPG_WRITE_CONFLICT`. The program cannot move channels. |
| `DELETE /api/v1/cms/channels/{channelId}/epg/{programId}` | Delete one program | Preserves the channel and all other schedule entries. |

## Headers managed by the dashboard

| Header | When it is sent | Source |
| --- | --- | --- |
| `Authorization: Bearer ...` | Protected CMS calls from editor/admin sessions only | Selected server-side account; never accepted from browser-supplied request options. |
| `If-Match` | Content, Channel, and EPG PATCH requests | ETag from the latest detail response. |
| `X-User-Id` | Playback test | User ID entered in the form. |
| `X-User-Country` | Playback test | Two-letter country entered in the form, normalized to uppercase. |
| `X-Device-Type` | Playback test | `Mobile`, `SmartTV`, or `Web`. |

## Common response handling

| Condition | Dashboard behavior |
| --- | --- |
| Successful create/update/delete | Revalidates the affected list/detail route, redirects to the relevant view, and shows a confirmation when applicable. |
| Expected backend failure | Preserves the page and shows the backend `errorCode` with its readable message. Page-level failures also show HTTP status. |
| Content/Channel/EPG write conflict | Offers a link to reload the latest resource rather than silently retrying a stale mutation. |
| Request exceeds the configured upstream timeout | Normalizes the failure to `UPSTREAM_TIMEOUT` with HTTP 504. |
| Backend cannot be reached | Normalizes the failure to `UPSTREAM_UNAVAILABLE` with HTTP 503. |
| Missing or expired account context during a CMS call | Returns `DASHBOARD_SESSION_REQUIRED` or `DASHBOARD_ACCOUNT_REQUIRED`; page navigation returns the user to the appropriate login/account-required flow. |

The dashboard accepts only safe relative backend paths. Unauthenticated calls are restricted to `/`, `/health`, `/ready`, and `/api/v1/mw/*`; visitor calls cannot be redirected through the API client to a CMS endpoint.
