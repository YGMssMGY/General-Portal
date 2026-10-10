# Security

## Threat model

Multi-tenant clubs platform, one database per site. Primary risks: cross-tenant reads via a spoofed `portal` cookie, privilege escalation through unwalled mutations, session theft, SSRF through link previews and health checks, malicious uploads, and secret leakage into logs. Every control below maps to one of these. Report issues privately to the deployment operator; include portal slug, route, and timestamp, never session tokens.

## Headers and CSP

Middleware mints a 16-byte nonce per request and sets `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<v>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. Always set: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. HSTS (`max-age=31536000; includeSubDomains`) only when `X-Forwarded-Proto: https` or production. `dangerouslySetInnerHTML` and `eval` are ESLint errors.

## Authorization matrix

Every `/api/*` route calls `requireTenant`. Reads require membership plus the module flag; writes add the permission shown (derived from the `requireTenant` args in each route file). Object-level ownership checks inside handlers supplement these where no permission arg exists (e.g. task, proposal, and thread detail routes verify creator or assignee).

| Family | Read | Write permission |
|---|---|---|
| account, me, dashboard, calendar, activity, search | session | session (no extra permission) |
| admin/users | `manage_users` | `manage_users` |
| members | `view_members` | `manage_users` (role changes, history) |
| tasks | session + `create_task` on POST | `create_task` (create, subtasks, comments, attachments); `manage_all_tasks` for approval-style flows; `manage_time` for time entries |
| events | session | `create_event` (create, annual plan); `manage_all_events` (approve/reject) |
| proposals | session + `create_proposal` on POST | `create_proposal`; `approve_proposal` (approve/reject, templates) |
| messages | session | `send_message` (threads, replies) |
| meetings, agenda, minutes | session | `manage_meetings` (meetings, agenda, codes); `manage_minutes`; RSVP and check-in are session-level |
| attendance | `check_in` | `manage_attendance` (record, codes) |
| finance | session | `manage_finance` |
| budget | session | `manage_budget` |
| purchase-requests | session | session to file; `manage_purchase_requests` to review |
| dues, assets | session | `manage_dues`; `manage_assets` |
| volunteers | session | `manage_volunteer_slots` (slots); signups session-level |
| files, links | session (`files` / `files` module) | session to upload; `manage_files` for versions |
| subgroups | session | `manage_subgroups` |
| cooperation (partnerships) | session | session to file; `manage_partnerships` to review |
| workflows, approvals, decisions | session | `manage_workflows`; `manage_decisions`; approvals session-level |
| polls, goals | session | session to vote and view; `manage_goals` for goal writes; `create_task` for goal creation |
| kudos | session | `send_kudos` |
| webhooks, api-tokens | `manage_webhooks` / `manage_api_tokens` | same |
| custom-fields, saved-views, notification-prefs | session | `manage_custom_fields` for custom fields |
| settings | `manage_settings` | `manage_settings` |
| audit, audit export | `view_audit` | read-only |
| trash | session | session (restore/purge scoped to workspace) |
| reports | `view_reports` | `manage_reports` |
| showcase, public, health, link-preview | session or public | `manage_showcase` for showcase writes |

Role defaults: member holds 14 low-risk permissions (view, create, send, signup, RSVP, check-in, time); officer adds all management permissions except `manage_users`, `manage_roles`, `manage_settings`, `view_audit`; admin adds those four. Custom roles override per role row.

## Tenant isolation

Session-derived, always. The `portal` cookie is a hint: `resolvePortalSlug` normalizes it and `getSession` binds the session token to that portal's database, workspace row, and membership. A valid session for site A against site B's slug finds no membership and gets 401/404, never data (covered by the smoke cross-portal check). Anonymous API access returns 401; anonymous pages redirect to login.

## Uploads

10 MB max, allowlist `image/*`, `application/pdf`, `text/plain` only, stored under `UPLOADS_DIR/<portal>/` with random filenames and sha256 recorded on the attachment row. Downloads serve `application/octet-stream` with `attachment` disposition, never inline. File versions pin per attachment id (`manage_files` for new versions).

## SSRF guards

Link preview (`GET /api/link-preview`) and the link-health worker resolve DNS first and block loopback, link-local, private ranges (`10/8`, `172.16/12`, `192.168/16`), `169.254`, `0/8`, and IPv6 equivalents; only `http/https` targets; 2 MB body cap; 10s abort. Failures are fail-closed (`400 Blocked`, `502 Failed to fetch URL`) with generic messages.

## Rate limits

In-memory buckets in middleware: 100/min global per IP plus path, 10/min for `/api/auth/*`, `/api/link-preview`, `/api/search`, 60s window, `Retry-After` on 429. Auth forms add a second per-provider limiter (`src/lib/auth/rate-limit.ts`). Buckets live in process memory: a restart resets them, and limits do not coordinate across instances.

## Secrets

Typed access via `src/config/index.ts`; `process.env` anywhere else is an ESLint error outside the exempted paths (config, db, logger, tui, scripts, instrumentation, playwright config, e2e tests). Pino redacts token hashes, verifiers, passwords, secrets, client secrets, tokens, and cookie/authorization headers (`remove: true`). Never log session tokens or OTP codes.

## Audit and deletion safety

Audit rows are hash-chained and verified by `verifyAuditChain`, surfaced on the admin audit page. Deletes are soft with trash restore; purge and danger actions require typed confirmation and write audit entries. Reporting: contact the operator with slug, route, and time; do not attach tokens or database URLs.
