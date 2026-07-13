# SaatCMS Dashboard Documentation

This handbook explains how to use, develop, secure, deploy, and operate the
SaatCMS Admin Dashboard. Pick the guide that matches the job you are doing; you
do not need to read the documentation in order.

## Documentation map

### Using the dashboard

- [Feature guide](feature-guide.md) — visitor and account workflows for every
  dashboard screen.
- [Route reference](route-reference.md) — route-by-route access and backend
  endpoint mapping.
- [Security and access](security-and-access.md) — visitor, editor, and admin
  behavior; sessions; bearer-token boundaries.
- [Glossary](glossary.md) — project terms such as actor, EPG, ETag, bearer,
  principal, and resolved metadata.

### Developing the dashboard

- [Development guide](development.md) — setup, environment variables, project
  structure, commands, tests, and contribution workflow.
- [Contributing guide](../CONTRIBUTING.md) — branch, commit, quality, security,
  and pull-request checklist.
- [Architecture](architecture.md) — runtime components, request flows, data
  boundaries, concurrency, and error handling.
- [Troubleshooting](troubleshooting.md) — common local, authentication,
  upstream, build, and deployment problems.

### Deploying and operating

- [Deployment and operations](deployment-and-operations.md) — Render setup,
  configuration, smoke tests, credential rotation, and rollback.
- [Troubleshooting](troubleshooting.md) — symptom-to-cause-to-fix reference for
  production and local failures.

### Planning records

These files record original decisions, implementation phases, and acceptance
criteria. They are useful historical context, but they are not the primary
operator or contributor guides.

- [High-level project plan](project/plans/admin-dashboard-project-plan.md)
- [Low-level implementation plan](project/plans/admin-dashboard-low-level-implementation-plan.md)

## System at a glance

```text
Browser
  -> SaatCMS Dashboard
       -> signed HttpOnly visitor or account session
       -> server-only API client
            -> public request: no Authorization header
            -> CMS request: current account bearer header
                 -> SaatCMS backend
                      -> PostgreSQL
```

Visitors can use Overview, Metadata Resolver, Playback Tester, and System.
Editors and admins can also manage Content, Channels, and EPG. The backend is
always the authorization authority.

## Documentation principles

- Describe current behavior; label future or external work explicitly.
- Never include real CMS keys, session secrets, cookies, or playback URLs from
  private data.
- Link to the implementation when a rule is security-sensitive or easy to
  misunderstand.
- Update the relevant guide in the same change as user-visible behavior,
  environment contracts, routes, or deployment procedures.
- Keep planning records for decision history; put current instructions in the
  handbook guides above.

If a guide and the application disagree, treat the implementation and backend
contract as authoritative, then correct the documentation.
