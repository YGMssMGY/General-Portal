# General Portal — Agent Guide

> For AI coding agents. Read before modifying code. License: GPL-3.0-or-later.

## Stack

Next.js 16 App Router, React 19, strict TypeScript (`tsc --noEmit`), Tailwind CSS v4, Drizzle ORM 0.45 with `pg` (NO Prisma, NO NextAuth: auth is hand-rolled opaque Postgres sessions). pnpm 10 only (NO bun, NO npm; `packageManager: pnpm@10.20.0`). Node >= 22.12. oxfmt (4-space, double quotes, width 100) runs before every commit; ESLint 10 with Next.js core-web-vitals plus a `process.env` ban.

## Mandatory patterns

- `requireTenant(request, opts)` on every API route (`permission`, `anyOf`, `module`, `allowToken`, `scope` as needed); `hasPermission` on every mutation.
- Scope every query by `workspaceId`; filter `deletedAt IS NULL`; use zod `parseBody` for all request bodies.
- Keyset pagination (`parsePagination`, `encodeCursorValues`/`decodeCursorValues`) plus `X-Next-Cursor` (and `X-Unread-Count` for notifications) on lists.
- Money as integer cents (`amountCents`); mutations call `emitSideEffects` (activity feed plus audit plus webhooks).
- No SQL string interpolation: Drizzle query builder or parameterized `$1` queries only.
- No `process.env` outside the exempted paths: `src/config/**`, `src/db/**`, `src/lib/logger.ts`, `src/tui/**`, `scripts/**`, `instrumentation.ts`, `playwright.config.ts`, `tests/e2e/**`. Use the typed `config` accessor everywhere else.
- `t()` for every UI string with all-5-locale parity (`en-US zh-CN de-DE fr-FR es-ES`); no emojis; no comments unless the why is non-obvious.
- Render-time state adjustment instead of `setState`-in-effect; never put JSX inside `try/catch` in components.
- No ternaries on env-derived conditions in shared/client code (Turbopack dead-branch poisoning); use map lookup plus an allowlist.

## Deployment model

`deployment.yaml` is the authority for portals, modules, nav, roles, limits, and providers. Boot reconcile (`instrumentation.ts`) is insert-only (missing workspaces and system roles); it never updates or deletes. Never auto-edit `deployment.yaml`: provisioning ends with a manual YAML block plus restart.

## TUI

`pnpm tui` (interactive TTY only): Sites, Add site, Remove site (impact preview, mandatory verified backup, typed slug), Migrate (dry-run default, per-portal `scripts/migrate.ts`), Backup (`pg_dump`/`pg_restore`, files never deleted), Jobs (pg-boss queues), Health, Logs, Danger (typed confirmation: revoke sessions, disable user, drop flow). Every action is audit-logged.

## Deletion safety

Soft delete (`deletedAt`) everywhere; trash restore across 11 entity types; purge and danger ops require typed confirmation (slug or email retype, mismatch aborts). Backups are never deleted by tooling.

## Auth rules

Providers: `microsoft-entra-id`, `basis-auth`, `oidc`, `saml`, `google`, `github`, `password`, `email-otp` (plus magic-link purpose), `passkey`. TODO(rename): `basis-auth` is the current id and subject to change; never "DevConnect". Invisibility rule: missing env means zero UI trace (filtered from providers list, generic 503/AccessDenied, never name the variable). Basis-auth specifics: scopes exactly `openid profile email`, always RFC 8707 `resource`, byte-for-byte redirect (incl. `/api/auth/bcallback` alias), UserInfo-first identity, sub-keyed email-join-once with 403 on mismatch, PKCE/state/nonce with 10-min TTL, 5-min discovery cache with abort timeouts, per-request role plus disabled re-read, opaque sessions with revocation and rotation, `HttpOnly`/`SameSite=Lax`/`Path` cookies (`Secure` only on https, no `__Host-` prefix), no system proxy. Passwords: scrypt N=32768, 12-char minimum, OTP reset, rotation on change. SSO auto-join only via `allowedDomains`.

## Verification

`pnpm verify` (oxfmt check plus lint, typecheck, build, unit tests, i18n, SEO, and security checks) before commit. Smoke (`SMOKE_EMAIL`, `SMOKE_PASSWORD`, seeded admin, live server) and E2E (`workers: 1`, setup/public/features/portal projects) need a live server plus migrated and seeded databases; they stay manual and CI-only.

## Never commit

`PORTING_GUIDE.md` stays untracked and is never committed.

## Docs map

`docs/architecture.md`, `docs/deployment.md`, `docs/auth.md`, `docs/security.md`, `docs/i18n.md`, `docs/tui.md`, `docs/api.md`, `docs/sdk.md`, `docs/runbook.md`, `docs/FEATURES.md`. Keep docs tight and factual; verify every command, path, and env var exists before referencing it.
