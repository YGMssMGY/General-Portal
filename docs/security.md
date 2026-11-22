# Security

## Threat model

Multi-tenant clubs platform, one database per site. Primary risks: cross-tenant reads via a spoofed `portal` cookie, privilege escalation through unwalled mutations, session theft, SSRF through link previews and health checks, malicious uploads, and secret leakage into logs. The operator API adds a second surface: a leaked or over-scoped Bearer token, spoofed forwarded headers, and destructive commands run without confirmation. Every control below maps to one of these. Report issues privately to the deployment operator; include portal slug, route, and timestamp, never session or operator tokens.

## Headers and CSP

Middleware mints a 16-byte nonce per request and sets `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<v>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. Always set: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. HSTS (`max-age=31536000; includeSubDomains`) only when `X-Forwarded-Proto: https` or production. `dangerouslySetInnerHTML` and `eval` are ESLint errors.

Middleware also performs origin CSRF checks: a `POST`, `PUT`, `PATCH`, or `DELETE` to `/api/*` carrying the session cookie is rejected with `403` when an `Origin` header is present and its host differs from the request host. Bearer-authenticated calls and auth callbacks (`/api/auth/callback/*`, `/api/auth/bcallback`, `/api/auth/saml/*`) are exempt.

## Authorization matrix

Every `/api/*` route calls `requireTenant`. Reads require membership plus the module flag; writes add the permission shown (derived from the `requireTenant` args in each route file). Object-level ownership checks inside handlers supplement these where no permission arg exists (e.g. task, proposal, and thread detail routes verify creator or assignee).

| Family | Read | Write permission |
| --- | --- | --- |
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

10 MB max, allowlist `image/*`, `application/pdf`, `text/plain` only, stored under `UPLOADS_DIR/<portal>/` with random filenames and sha256 recorded on the attachment row. `streamFileToDisk` (`src/lib/uploads.ts`) streams the request body to disk with a running byte cap and sha256; `sniffFileKind` checks magic bytes (PNG, JPEG, PDF signatures, or valid plain text) and `fileKindMatchesMime` requires that sniffed kind to agree with the declared MIME. Oversized or mismatched uploads are rejected and partial files are unlinked. Downloads serve `application/octet-stream` with `attachment` disposition, never inline. File versions pin per attachment id (`manage_files` for new versions).

## SSRF guards

Link preview (`GET /api/link-preview`) and the link-health worker use `fetchSafe` (`src/lib/ssrf.ts`). It resolves DNS first and blocks loopback, link-local, private ranges (`10/8`, `172.16/12`, `192.168/16`), `169.254`, `100.64/10`, and IPv6 equivalents; it allows only `http/https` targets with no embedded credentials. The connection is pinned to the resolved IP while the original hostname is kept as TLS SNI and `Host`, so DNS rebinding cannot redirect the socket. Each redirect hop (max 3) is re-resolved and revalidated before it is followed; bodies cap at 2 MB with a 10s abort. Failures are fail-closed (`400 Blocked`, `502 Failed to fetch URL`) with generic messages.

## Rate limits

In-memory buckets in the proxy: 100/min global per IP plus path, 10/min for `/api/auth/*`, `/api/link-preview`, `/api/search`, 60s window, `Retry-After` on 429. These buckets live in process memory: a restart resets them, and limits do not coordinate across instances.

Sensitive routes add a shared, Postgres-backed token bucket: `consumeRateLimit` (`src/lib/rate-limit.ts`) atomically updates the `rate_buckets` table over a 60-second window. `sensitiveLimitCheck` (`src/lib/rate-limit-guard.ts`) applies it to password login, OTP requests, and `/api/ops/run` with a limit of `max(60, RATE_LIMIT_MAX)`. It coordinates across instances and survives restarts; a database error fails open rather than blocking sign-in.

## Operator and agent API threat model

The control plane at `/api/ops` is a privileged, non-interactive surface. Assume a token can leak into logs, CI variables, or an agent transcript, and design for least privilege.

- Authentication is Bearer only; no SSH is used. `OPS_API_TOKEN` is a bootstrap credential with all four scopes. Prefer minting scoped, short-lived tokens with the `ops.token` action (scope `ops:danger`, TTL 60-86400 seconds) for each job or agent.
- Scopes are `ops:read`, `ops:deploy`, `ops:backup`, and `ops:danger`. Every action declares its required scopes in the shared registry; a read token cannot run deploy, backup, or danger actions. The TUI bypasses scope checks only because it runs locally with `source: "tui"`.
- `OPS_SECRET` signs issued tokens and confirmation tokens with HMAC-SHA256 and constant-time verification; it falls back to `AUTH_SECRET`, so set it explicitly. Rotating it invalidates all issued tokens. Token expiry is clamped to 60-86400 seconds.
- In production the API rejects requests without `X-Forwarded-Proto: https` (403). `OPS_ALLOWED_IPS` optionally restricts the source using `X-Forwarded-For` or `X-Real-IP`. Both depend on a correctly configured proxy that overwrites these headers; do not expose the Node port directly.
- Destructive actions use two-phase typed confirmation. The first call returns a five-minute signed token bound to the action, a hash of the params, and the operator id; the second call must repeat that token and a `typedValue` exactly equal to the target slug or email. Mismatches and expired or replayed tokens are rejected. `idempotencyKey` deduplicates successful calls for ten minutes.
- Every attempt, including denials and confirmation failures, appends `{ ts, operator, source, action, target, result }` to `.tui-audit.log`; tokens and secrets are never written. Discovery endpoints (`GET /api/ops` and its manifest/openapi/health siblings) contain no secret values.

## Secrets

Typed access via `src/config/index.ts`; `process.env` anywhere else is an ESLint error outside the exempted paths (config, db, logger, tui, scripts, instrumentation, playwright config, e2e tests). Pino redacts token hashes, verifiers, passwords, secrets, client secrets, tokens, and cookie/authorization headers (`remove: true`). Never log session tokens or OTP codes.

## Audit and deletion safety

Audit rows are hash-chained and verified by `verifyAuditChain`, surfaced on the admin audit page. Deletes are soft with trash restore; purge and danger actions require typed confirmation and write audit entries. Reporting: contact the operator with slug, route, and time; do not attach tokens or database URLs.
