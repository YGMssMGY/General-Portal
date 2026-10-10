# Architecture

## Layers

Authority flows top-down: `deployment.yaml` declares portals, then each portal database holds a `workspaces` row overlay (name, settings toggles), then code enforces both. Startup reconcile (`src/lib/deployment/reconcile.ts`, called from `instrumentation.ts`) inserts missing workspaces and system roles only; it never updates or deletes. Module flags live in `workspace.settings`; `requireTenant` rejects disabled modules with 403. Per-site terminology (`termFor`) and nav (`navFor`) render from the YAML via `src/lib/deployment/index.ts`.

## Tenant resolution

The session decides the tenant, never the cookie alone. `resolvePortalSlug` reads the `portal` cookie as a hint (default `developers`), normalizes it, and throws 404 for unknown slugs. `getSession` then loads the opaque session token (`gp_session`), checks expiry and `revokedAt`, re-reads the user (disabled flag), the workspace row, and the membership plus role permissions on every request. No JWT claims, no cached roles: a disable or role change takes effect on the next request.

## Databases

One PostgreSQL database per site (`src/db/client.ts`). The connection URL comes from `DATABASE_URL_<SLUG>` (uppercased, dashes to underscores). Pools are cached per slug with `max: config.poolMax` (floor 2, default 10), 30s idle timeout, 5s connection timeout, and a 15s `statement_timeout` appended to the connection string. Capacity budget: `sites x PG_POOL_MAX` server connections, plus one pg-boss pool that uses `PG_BOSS_URL` or falls back to the first portal database. Size `max_connections` for the sum plus headroom.

## Request flow

1. `src/middleware.ts`: per-request nonce, CSP and hardening headers, in-memory rate limit (10/min for `/api/auth/*`, `/api/link-preview`, `/api/search`; 100/min elsewhere, keyed by IP plus path), locale detection (`NEXT_LOCALE` cookie, `Accept-Language`, `BASE_FALLBACK` map), then the auth gate.
2. Public paths pass through: `/`, `/login`, `/showcase`, `/api/auth/*`, `/api/public/*`, `/api/health`.
3. Other `/api/*` routes require a `gp_session` cookie or `Authorization: Bearer`; pages redirect to `/login?callbackUrl=`.
4. Route handlers call `requireTenant(request, { permission?, anyOf?, module?, allowToken?, scope? })`, scope every query by `workspaceId`, filter `deletedAt IS NULL`, and return the envelope.

## Responses

Envelope: `{ success: true, data }` via `ok()` / `success()`, `{ success: false, error }` via `fail()` / `error()`; unexpected errors become generic 500 `Internal server error` through `handleRouteError`. Cursor pagination: `?limit=` (clamped 1-100, default 50) with `?cursor=`; list endpoints set `X-Next-Cursor` (empty when exhausted). `GET /api/notifications` also sets `X-Unread-Count`. Cursors are base64url `[createdAt, id]` tuples decoded by `decodeCursorValues`.

## Money

All money is integer cents (`amountCents` on transactions and budget allocations). The seed script converts decimal pack values with `Math.round(n * 100)`. Never store or accept float currency.

## Deletion

Soft delete everywhere via `deletedAt`. `GET /api/trash` aggregates 11 entity types (tasks, events, proposals, messageThreads, meetings, subgroups, linkItems, attachments, showcaseItems, cooperationRequests, purchaseRequests); `POST /api/trash/restore` revives; `DELETE /api/trash` purges. Irreversible operations live behind the typed Danger Zone (TUI Danger screen, `src/app/[portal]` danger UI): the operator must retype the slug (or user email), and mismatches abort with an audit entry.

## Audit

`writeAuditLog` (`src/lib/audit.ts`) appends `{ action, entityType, entityId, metadata, workspaceId, createdAt }` chained by sha256 over the previous hash (`GENESIS` for the first row). `verifyAuditChain(db, workspaceId)` recomputes the chain and returns `{ ok, checked, brokenAt? }`; the admin audit page (`src/app/[portal]/admin/audit/page.tsx`) surfaces integrity inline. Mutations should use `emitSideEffects` (`src/lib/side-effects.ts`), which writes the activity feed row, the audit row, and fans out webhooks.

## Background jobs (pg-boss)

Registered on the Node.js runtime in `instrumentation.ts`; schedules:

| Queue | Schedule | Work |
|---|---|---|
| `nudge` | `0 * * * *` | Open-task, upcoming-event, overdue, and volunteer reminders as notifications |
| `digest` | `0 7 * * *` | Daily (plus weekly on Mondays) email digest via SMTP |
| `report-generate` | on demand | CSV/PDF/XLSX report builds to `UPLOADS_DIR` |
| `webhook-deliver` | on demand | Signed POST fan-out, 3 retries with backoff |
| `retention` | `0 3 * * *` | Purge audit rows past `auditRetentionDays`, activity past 180d, read notifications past 90d |
| `link-health` | `0 4 * * 0` | Re-check saved links, persist status where columns exist |

## i18n routing

`src/i18n/routing.ts`: locales `en-US zh-CN de-DE fr-FR es-ES`, `defaultLocale: en-US`, `localePrefix: as-needed`. Middleware resolves the locale, sets the `x-locale` request header and the `NEXT_LOCALE` cookie (1 year, `SameSite=Lax`).

## Modules and terminology

`modulesFor(slug)` gates which product areas a site exposes; `navFor(slug)` renders its sidebar; `termFor(slug, key)` swaps words per site (e.g. subgroup renders Guild for developers, Committee for stuco). `isFeatureEnabled(slug, flag)` gates flags such as `meeting_minutes`, `attendance`, `participation`, `reports`, `custom_fields`, `webhooks`.

## Turbopack lesson: dead-branch poisoning

Never write ternaries (or `&&` branches) on env-derived conditions in client-bundled code. Turbopack can statically fold one branch at build time and ship dead code paths that behave differently per environment. Use a map lookup plus an allowlist instead: resolve the value through a record keyed by the env-derived string, validate the key against an explicit allowlist, and fall back to a safe default. The same rule applies to provider and locale selection in shared components.
