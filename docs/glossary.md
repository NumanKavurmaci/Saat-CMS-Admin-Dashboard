# Glossary

This glossary defines the project-specific terms used throughout the SaatCMS
Dashboard documentation.

## Access and security

**Actor:**
The identifier for an editor or admin account configured in `CMS_API_KEYS`. The
actor ID is the username entered on the dashboard login form.

**Bearer credential:**
The secret used in an HTTP `Authorization: Bearer …` header for protected
SaatCMS CMS endpoints. The dashboard server selects and attaches it; visitor
requests never contain one.

**Principal:**
The identity represented by the current signed dashboard session. A principal
is either a visitor or an editor/admin account.

**Visitor:**
A signed dashboard session that has no CMS account or bearer credential. It can
use only Overview, Metadata Resolver, Playback Tester, and System.

**Public endpoint:**
A SaatCMS endpoint that the dashboard may call without a bearer credential. The
dashboard API client restricts these calls to `/`, `/health`, `/ready`, and
`/api/v1/mw/*`.

## Content and programming

**CMS:**
Content management system. In this project, CMS endpoints create, read, update,
and delete editorial Content, Live Channels, and EPG Programs.

**Content:**
A Series, Season, Episode, or Movie record. Series and Movies are root records;
Seasons belong to Series; Episodes belong to Seasons.

**Inherited metadata:**
Metadata an Episode or Season receives from the nearest ancestor that defines a
value. A local override takes precedence over inherited data.

**Resolved metadata:**
The final public metadata after SaatCMS applies the Content inheritance rules.
It intentionally excludes protected playback URLs.

**Live Channel:**
The stable channel identity that owns an EPG schedule. Deleting a channel also
deletes every EPG Program on its schedule when the backend authorizes the
operation.

**EPG:**
Electronic Program Guide: the time-based schedule of programs for a Live
Channel.

**Program window:**
The `windowStart` and `windowEnd` instants used to request programs that
intersect a selected day. The dashboard derives the UTC window from the
operator's local calendar day.

## Requests and concurrency

**ETag:**
A version identifier returned with a Content, Channel, or EPG resource. The
dashboard preserves it while the resource is being edited.

**If-Match:**
The request header that sends the previously read ETag with an update. SaatCMS
rejects the update if the resource has changed in the meantime.

**Write conflict:**
A safe rejection caused by editing an out-of-date resource version. Reload the
latest data, review it, and apply the change again; the dashboard does not
silently overwrite newer work.

**Request ID:**
An identifier returned by the backend for correlating a dashboard error with
server diagnostics. It is not a credential.

## Runtime and operations

**Middleware endpoint:**
A public SaatCMS API that exposes resolved Content metadata or makes a playback
decision for a supplied user, country, and device context.

**Server Action:**
A server-side function invoked by a dashboard form. Actions validate submitted
data and call SaatCMS without placing credentials or backend logic in browser
JavaScript.

**Liveness:**
Whether the backend process is running and responding, reported by `/health`.

**Readiness:**
Whether the backend is ready for database-backed work, including PostgreSQL and
migration checks, reported by `/ready`.

**Blueprint:**
Render's infrastructure-as-code definition. This repository's `render.yaml`
describes the dashboard web service, commands, health check, and environment
variable names.
