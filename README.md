# General Portal

General Portal is a multi-tenant portal platform for clubs, teams, and organizations. Each site (portal) gets isolated data in its own PostgreSQL database, its own branding and navigation from `deployment.yaml`, and membership-gated sign-in. It currently ships two sites: Developers Club (`developers`) and Student Council (`stuco`).

License: GPL-3.0-or-later (see `LICENSE` and the `license` field in `package.json`).

## Feature map

Organize:

- Tasks with dependencies, recurrence, subtasks, comments, attachments, and time tracking (`manage_time`)
- Calendar with scoped iCal feed (`GET /api/calendar/ical?token=`, `calendar:read` scope)
- Meetings with agenda, minutes, action items, RSVP, attendance codes, and check-in
- Polls with voting, goals with progress updates, annual event plans

Decide:

- Proposals with templates, approve/reject flow (`approve_proposal`), and attachments
- Workflows (`manage_workflows`), approvals inbox, decisions log (`manage_decisions`)

Money (all amounts stored as integer cents):

- Finance ledger (`amountCents`) with summary and trends (`manage_finance` for writes)
- Budgets with approve, spend, and reconcile flows (`manage_budget`)
- Purchase requests with review flow (`manage_purchase_requests`), dues collection (`manage_dues`)

People:

- Members with custom roles and per-role permission sets, member history, subgroups (per-site terminology, e.g. Guilds vs Committees), attendance recording, volunteer slots with signups and hours, participation leaderboard, kudos with leaderboard

Knowledge:

- Messages (threads, replies, read state) with mentions and reactions, files with versions and sha256 integrity, links with periodic health checks, public showcase, announcements (`manage_announcements`), trash with restore across 11 entity types

Platform:

- `deployment.yaml` as site authority with insert-only reconcile on boot
- `pnpm tui`: interactive Ink operator console (sites, migrate, backup, jobs, health, logs, danger)
- pg-boss queues: `nudge`, `digest`, `report-generate`, `webhook-deliver`, `retention`, `link-health`
- Webhooks with HMAC `X-Portal-Signature` plus scoped API tokens (`manage_api_tokens`)
- OpenAPI description at `GET /api/public/openapi.json`
- Append-only audit log with sha256 hash chain plus `verifyAuditChain`
- 5 locales (en-US, zh-CN, de-DE, fr-FR, es-ES) via next-intl
- Passkeys (WebAuthn), password auth (scrypt), email OTP / magic link, SSO (Microsoft Entra ID, Basis Auth, Google, GitHub, generic OIDC, SAML)

## Architecture (10 lines)

1. Next.js 16 App Router; pages under `src/app`, API route handlers under `src/app/api`.
2. Drizzle ORM 0.45 with `pg` pools; one PostgreSQL database per site, resolved from `DATABASE_URL_<SLUG>`.
3. Hand-rolled opaque Postgres sessions (`gp_session` cookie, sha256 hash at rest); no NextAuth, no Prisma.
4. `deployment.yaml` is the authority for portals, modules, nav, roles, limits, and auth providers.
5. `src/middleware.ts` sets nonce CSP, HSTS, rate limits, locale, and the auth gate.
6. Every API route calls `requireTenant(request, opts)`; every mutation checks `hasPermission`.
7. Money is integer cents; deletes are soft (`deletedAt`) with trash restore and a typed Danger Zone.
8. `instrumentation.ts` runs reconcile plus all pg-boss queues on the Node.js runtime only.
9. `src/tui` is an Ink console for provisioning, migrate, backup/restore, jobs, and danger ops.
10. `messages/*.json` holds 5 locales; `deployments/seed-packs/*.yaml` holds per-site seed data.

## Quick start

Prereqs: Node >= 22.12, pnpm 10, PostgreSQL 14+, `pg_dump`/`pg_restore` on PATH for backups.

```bash
pnpm install
cp .env.example .env   # then fill in per-portal DATABASE_URL_<SLUG> values
MIGRATE_URL=<url> pnpm exec tsx scripts/migrate.ts
pnpm exec tsx scripts/seed.ts <slug>
pnpm exec tsx scripts/seed.ts <slug> --set-password <email>=<password>
pnpm dev
pnpm tui
```

`scripts/migrate.ts` also accepts the connection string as argv (`tsx scripts/migrate.ts <url>`) and records applied files in `public.schema_migrations`. `scripts/seed.ts` defaults to `deployments/seed-packs/<slug>.yaml` and is idempotent. Dev server runs `next dev --turbopack`; the TUI requires an interactive TTY.

## Scripts

Every script in `package.json`:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev --turbopack` | Local dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |
| `lint` | `eslint .` | ESLint 10 with Next.js + `process.env` ban |
| `typecheck` | `tsc --noEmit` | Strict type check |
| `db:generate` | `drizzle-kit generate` | Generate SQL migration from `src/db/schema.ts` |
| `db:migrate` | `tsx scripts/migrate.ts` | Apply pending migrations (`MIGRATE_URL` or argv) |
| `db:push` | `drizzle-kit push` | Push schema directly (dev only) |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio |
| `db:seed` | `tsx scripts/seed.ts` | Seed a portal (`<slug> [packFile] [--set-password e=p]`) |
| `tui` | `tsx src/tui/index.tsx` | Operator console (TTY only) |
| `smoke` | `tsx scripts/smoke.ts` | Live-server smoke suite (`SMOKE_EMAIL`, `SMOKE_PASSWORD`) |
| `test:e2e` | `playwright test` | Playwright suite, workers: 1 |
| `verify` | `bash scripts/verify.sh` | oxfmt check + lint + typecheck + build |

## Project structure

```text
src/
  app/                  # Routes: page.tsx, [portal]/, login/, showcase/, api/
  app/api/              # ~50 route families (tasks, events, auth, files, ...)
  db/                   # client.ts (per-portal pools), schema.ts, migrations/
  lib/                  # tenant, permissions, api, audit, auth/, jobs/, deployment/
  lib/auth/             # oidc, session, passwords, providers, saml, email, rate-limit
  lib/jobs/             # boss, nudge, digest, reports, webhooks, retention, link-health
  lib/deployment/       # index, schema, reconcile (deployment.yaml authority)
  config/index.ts       # Typed env accessor (only sanctioned process.env reader)
  middleware.ts         # CSP nonce, rate limits, locale, auth gate
  i18n/routing.ts       # 5 locales, as-needed prefix, en-US default
  tui/                  # Ink console: App + screens/ + lib/
scripts/                # migrate.ts, seed.ts, smoke.ts, verify.sh
deployments/seed-packs/ # developers_club.yaml, student_council.yaml
messages/               # en-US, zh-CN, de-DE, fr-FR, es-ES JSON
tests/e2e/              # auth.setup.ts, public.spec.ts, portal.spec.ts
docs/                   # architecture, deployment, auth, security, i18n, tui, api, runbook
deployment.yaml         # Site authority (portals, modules, nav, roles, limits)
drizzle.config.ts       # schema ./src/db/schema.ts, out ./src/db/migrations
```

## Auth providers

| Provider | Required env | Visibility rule |
|---|---|---|
| `password` | none (always on) | Always shown |
| `passkey` | none (derives rpId/origin from base URL) | Always shown |
| `microsoft-entra-id` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` (`MICROSOFT_TENANT_ID`, default `common`) | Only when fully configured |
| `basis-auth` | `BASIS_AUTH_ISSUER`, `BASIS_AUTH_CLIENT_ID`, `BASIS_AUTH_CLIENT_SECRET`, `BASIS_AUTH_REDIRECT_URI`, `BASIS_AUTH_RESOURCE` | Only when all five are set |
| `google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Only when fully configured |
| `github` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Only when fully configured |
| `oidc` | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (`OIDC_REDIRECT_URI` optional) | Only when fully configured |
| `saml` | `SAML_ENTRY_POINT`, `SAML_ISSUER`, `SAML_CERT` | Only when fully configured |
| `email-otp` | `SMTP_HOST`, `SMTP_FROM` (plus `SMTP_PORT/USER/PASS` as needed) | Only when mail is configured |
| magic link | shares the email-otp channel (`purpose: magic-link`) | Same as email-otp |

Env-gating invisibility rule: a provider with missing env has zero UI trace. It is filtered from `GET /api/auth/providers`, direct login attempts redirect with `AccessDenied` or return generic `503 Sign-in is unavailable right now`. Error messages never name the missing variable. Details in `docs/auth.md`.

## i18n

5 locales: `en-US` (default), `zh-CN`, `de-DE`, `fr-FR`, `es-ES`. next-intl with `localePrefix: as-needed`; locale resolves from the `NEXT_LOCALE` cookie, then `Accept-Language`, then the default. Every UI string uses `t()` with all-5-file parity. Details in `docs/i18n.md`.

## License

GPL-3.0-or-later. See `LICENSE` at the repo root.

## Docs

- `docs/architecture.md` — layers, tenant resolution, request flow, queues
- `docs/deployment.md` — env reference, `deployment.yaml` keys, provisioning, backups, recovery
- `docs/auth.md` — providers, Basis Auth rules, passwords, passkeys, sessions, tokens
- `docs/security.md` — threat model, headers, authZ matrix, isolation, uploads, SSRF, audit
- `docs/i18n.md` — locales, key workflow, review status
- `docs/tui.md` — operator console screens and safety rails
- `docs/api.md` — envelope, pagination, endpoint catalogue, webhooks
- `docs/runbook.md` — operations, logs, health, recovery
