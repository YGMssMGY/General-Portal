# Feature completeness manifest

This manifest is an audit of the working tree on branch `feat/general-workspace-os`. Every row below is present in the repository; "Where" points to the file that implements it and "Verification" names the test, script, or check that exercises it, or `None` when no automated check exists. Counts were taken from the working tree, not from documentation claims. `listActions()` registers 46 operator actions.

## Summary

| Metric | Count | Source of truth |
| --- | --- | --- |
| API route families | 61 (179 `route.ts` files) | `src/app/api/**/route.ts` |
| Portal pages | 55 (plus 13 public site pages; 68 `page.tsx` total) | `src/app/[portal]/**/page.tsx` |
| Operator actions | 46 | `listActions()` in `src/ops/registry.ts` |
| Locales and keys | 5 locales, 1,178 keys each | `pnpm i18n:check` |
| CI workflows | 11 | `.github/workflows/*.yml` |
| Deployment modes | 6 | `docs/deployment.md` |
| Background queues | 7 | `src/lib/jobs/*.ts` |

Deployment modes: bare Node (authoritative), Docker Compose, dev container/Codespaces, Helm, single-database mode, and ephemeral PR preview sites. Queues: `scheduled-backup`, `digest`, `link-health`, `nudge`, `report-generate`, `retention`, `webhook-deliver`.

## Organize

| Feature | Where | Verification |
| --- | --- | --- |
| Tasks with dependencies, recurrence, subtasks, comments, attachments | `src/app/[portal]/tasks/page.tsx`, `src/app/api/tasks/*` | `test:unit` (recurrence) |
| Recurring task occurrence expansion | `src/app/api/tasks/occurrences/route.ts` | `test:unit` |
| Time tracking on tasks | `src/app/api/tasks/time/route.ts` | None |
| Task comments | `src/app/api/tasks/[id]/comments/route.ts` | None |
| Calendar with scoped iCal feed (`calendar:read` scope) | `src/app/[portal]/calendar/page.tsx`, `src/app/api/calendar/ical/route.ts` | None |
| Meetings with agenda, minutes, RSVP, attendance code, check-in | `src/app/[portal]/meetings/page.tsx`, `src/app/api/meetings/*` | None |
| Meeting agenda items | `src/app/api/agenda/[id]/route.ts`, `src/app/api/meetings/[id]/agenda/route.ts` | None |
| Meeting minutes and action items | `src/app/api/meetings/[id]/minutes/route.ts`, `src/app/api/minutes/[id]/action-items/route.ts` | None |
| RSVP roster and single RSVP | `src/app/api/meetings/[id]/rsvps/route.ts`, `src/app/api/meetings/[id]/rsvp/route.ts` | None |
| Events with register, approve, reject, Teams post | `src/app/[portal]/events/page.tsx`, `src/app/api/events/*` | None |
| Annual event plans and linking | `src/app/api/events/annual-plan/*` | None |
| Polls with voting | `src/app/[portal]/polls/page.tsx`, `src/app/api/polls/*` | None |
| Goals with progress updates | `src/app/[portal]/goals/page.tsx`, `src/app/api/goals/*` | None |
| Assets and asset loans/returns | `src/app/[portal]/assets/page.tsx`, `src/app/api/assets/*` | None |
| Attendance recording and rate codes | `src/app/[portal]/attendance/page.tsx`, `src/app/api/attendance/*` | None |
| My Work aggregation | `src/app/[portal]/my-work/page.tsx`, `src/app/api/my-work/route.ts` | None |
| Onboarding setup | `src/app/[portal]/onboarding/page.tsx` | None |
| Invitations and invitation acceptance | `src/app/[portal]/invitations/page.tsx`, `src/app/api/auth/invitation/accept/route.ts` | None |
| Saved views | `src/app/[portal]/saved-views/page.tsx`, `src/app/api/saved-views/*` | None |
| Saved-view share links | `src/app/api/saved-views/share/route.ts`, `src/app/[portal]/saved-views/shared/[token]/page.tsx` | None |
| Subgroups with per-site terminology and broadcast | `src/app/[portal]/subgroups/page.tsx`, `src/app/api/subgroups/*` | None |
| Participation score and leaderboard | `src/app/[portal]/participation/page.tsx`, `src/app/api/participation/leaderboard/route.ts` | None |
| Kudos and kudos leaderboard | `src/app/[portal]/kudos/page.tsx`, `src/app/api/kudos/leaderboard/route.ts` | None |
| Participation badges | `src/app/[portal]/badges/page.tsx`, `src/app/api/badges/route.ts` | None |
| Live presence | `src/app/api/presence/route.ts` | None |
| Cooperation records and review | `src/app/[portal]/cooperation/page.tsx`, `src/app/api/cooperation/*` | None |
| Custom fields | `src/app/[portal]/custom-fields/page.tsx`, `src/app/api/custom-fields/*` | None |
| Generic comments and reactions | `src/app/api/comments/*`, `src/app/api/reactions/route.ts` | None |

## Decide

| Feature | Where | Verification |
| --- | --- | --- |
| Proposals with attachments | `src/app/[portal]/proposals/page.tsx`, `src/app/api/proposals/*` | None |
| Proposal templates | `src/app/api/proposals/templates/*` | None |
| Proposal approve/reject flow (`approve_proposal`) | `src/app/api/proposals/[id]/approve/route.ts`, `src/app/api/proposals/[id]/reject/route.ts` | `test:unit` (permissions) |
| Workflow definitions (`manage_workflows`) | `src/app/[portal]/workflows/page.tsx`, `src/app/api/workflows/*` | None |
| Workflow builder UI | `src/app/[portal]/admin/workflow-builder/page.tsx` | None |
| Approval SLA inbox (all/mine/overdue, due-soon badges) | `src/app/[portal]/approvals/page.tsx`, `src/app/api/approvals/*` | None |
| Multi-stage approver decisions with comments | `src/app/api/approvals/[id]/route.ts` | None |
| Decisions log (`manage_decisions`) | `src/app/[portal]/decisions/page.tsx`, `src/app/api/decisions/*` | None |
| Budget and purchase-request review decisions | `src/app/api/budget/[id]/approve/route.ts`, `src/app/api/purchase-requests/[id]/review/route.ts` | None |
| Event approval decisions | `src/app/api/events/[id]/approve/route.ts`, `src/app/api/events/[id]/reject/route.ts` | None |

## Money

| Feature | Where | Verification |
| --- | --- | --- |
| Finance ledger with integer-cent amounts | `src/app/[portal]/finance/page.tsx`, `src/app/api/finance/transactions/*` | None |
| Finance summary | `src/app/api/finance/summary/route.ts` | None |
| Finance trends | `src/app/api/finance/trends/route.ts` | None |
| Budgets with approve, spend, reconcile (`manage_budget`) | `src/app/api/budget/*` | None |
| Budget overview | `src/app/api/budget/overview/route.ts` | None |
| Purchase requests with review (`manage_purchase_requests`) | `src/app/api/purchase-requests/*`, nav entry in `deployment.yaml` | None |
| Dues collection (`manage_dues`) | `src/app/[portal]/dues/page.tsx`, `src/app/api/dues/*` | None |
| Report generation (CSV, XLSX, PDF) via queue | `src/app/[portal]/reports/page.tsx`, `src/app/api/reports/route.ts`, `src/lib/jobs/reports.ts` | None |
| Money stored as `amountCents` across finance writes | `src/db/schema.ts` | `pnpm typecheck` |

## People

| Feature | Where | Verification |
| --- | --- | --- |
| Members with custom roles and per-role permission sets | `src/app/[portal]/members/page.tsx`, `src/app/api/members/*` | `test:unit` (permissions) |
| Member history | `src/app/api/members/history/*` | None |
| Custom role permission matrix | `src/app/[portal]/admin/permissions/page.tsx`, `src/app/api/admin/permissions/route.ts` | None |
| Volunteer slots, signups, hours, statistics | `src/app/[portal]/volunteers/page.tsx`, `src/app/api/volunteers/*` | None |
| Admin user management | `src/app/api/admin/users/route.ts` | `test:e2e` (ops) |
| Account sessions and password change | `src/app/[portal]/account/sessions/page.tsx`, `src/app/api/account/*` | None |
| Account preferences and profile | `src/app/api/me/route.ts`, `src/app/api/me/prefs/route.ts` | None |
| SCIM 2.0 Users and Groups provisioning | `src/app/api/scim/v2/Users/route.ts`, `src/app/api/scim/v2/Groups/route.ts` | None |
| Notification preferences and digest preview | `src/app/[portal]/notifications/preferences/page.tsx`, `src/app/[portal]/notifications/digest-preview/page.tsx` | None |

## Knowledge

| Feature | Where | Verification |
| --- | --- | --- |
| Messages: threads, replies, read state | `src/app/[portal]/messages/page.tsx`, `src/app/api/messages/*` | None |
| Mentions and reactions | `src/lib/mentions.ts`, `src/app/api/reactions/route.ts` | None |
| Files with versions and sha256 integrity | `src/app/[portal]/files/page.tsx`, `src/app/api/files/[id]/versions/route.ts` | `test:unit` (upload sniffing) |
| Streamed file downloads | `src/app/api/files/download/[id]/route.ts` | None |
| Links with periodic health checks | `src/app/[portal]/links/page.tsx`, `src/app/api/links/*`, `src/lib/jobs/link-health.ts` | None |
| Link preview | `src/app/api/link-preview/route.ts` | None |
| Public showcase | `src/app/api/public/showcase/route.ts`, `src/app/showcase/page.tsx` | `test:e2e` (public) |
| Showcase administration and reorder | `src/app/[portal]/showcase-admin/page.tsx`, `src/app/api/showcase/reorder/route.ts` | None |
| Global search | `src/app/[portal]/search/page.tsx`, `src/app/api/search/route.ts` | None |
| Activity feed | `src/app/[portal]/activity/page.tsx`, `src/app/api/activity/route.ts` | None |
| Trash with restore across 11 entity types | `src/app/[portal]/trash/page.tsx`, `src/app/api/trash/restore/route.ts` | None |
| Notifications, read-all, unread count header | `src/app/[portal]/notifications/page.tsx`, `src/app/api/notifications/*` | None |
| Announcements and subgroup broadcasts | `src/app/api/subgroups/[id]/broadcast/route.ts` | None |
| Import wizard for portal data | `src/app/[portal]/admin/import/page.tsx`, `src/app/api/data-import/route.ts`, `data.import` action | None |
| Translation review screen | `src/app/[portal]/admin/translations/page.tsx`, `data.i18n-missing` action | `i18n:check` |

## Platform and security

| Feature | Where | Verification |
| --- | --- | --- |
| `deployment.yaml` authority for modules, nav, branding, terminology, limits | `deployment.yaml`, `src/lib/deployment/schema.ts`, `src/lib/deployment/index.ts` | `config:check` |
| Insert-only boot reconcile | `src/lib/deployment/reconcile.ts`, `instrumentation.ts` | `pnpm build` |
| Session-bound tenant resolution and `requireTenant` on routes | `src/lib/tenant.ts`, `src/app/api/*/route.ts` | `smoke` (cross-portal) |
| `hasPermission` on every mutation | `src/lib/permissions.ts` | `test:unit` (permissions) |
| Nine sign-in providers with env-gated invisibility | `src/lib/auth/providers.ts`, `src/app/api/auth/providers/route.ts` | `docs/auth.md` |
| Password auth with scrypt, minimum 12 characters | `src/lib/auth/passwords.ts`, `src/app/api/auth/password/*` | `test:unit` |
| Passkeys (WebAuthn) | `src/app/api/auth/passkey/*` | None |
| Email OTP and magic-link purpose | `src/lib/auth/email.ts`, `src/app/api/auth/otp/*` | None |
| SSO: Entra ID, Basis Auth, Google, GitHub, OIDC, SAML | `src/lib/auth/oidc.ts`, `src/lib/auth/saml.ts`, `src/app/api/auth/login/[provider]/route.ts` | None |
| Opaque Postgres sessions with revocation and rotation | `src/lib/auth/session.ts` | None |
| Basis auth resource indicator, PKCE, state, nonce, UserInfo-first identity | `src/lib/auth/providers.ts`, `src/app/api/auth/bcallback/route.ts` | None |
| Append-only audit log with sha256 hash chain | `src/lib/audit.ts` (`verifyAuditChain`), `src/app/api/audit/*` | `test:unit` |
| Audit export | `src/app/api/audit/export/route.ts` | None |
| Scoped API tokens (`manage_api_tokens`) | `src/app/[portal]/api-tokens/page.tsx`, `src/app/api/api-tokens/*` | None |
| Webhooks with HMAC `X-Portal-Signature` and deliveries | `src/lib/webhooks.ts`, `src/app/api/webhooks/*` | None |
| Webhook replay UI | `src/app/[portal]/webhooks/page.tsx`, `src/app/api/webhooks/[id]/replay/route.ts` | None |
| Nonce CSP, origin CSRF checks, rate limits, locale, auth gate | `src/middleware.ts` | `security:check` |
| DNS-pinned SSRF guards with redirect revalidation | `src/lib/ssrf.ts` | `test:unit` (SSRF blocking) |
| Magic-byte upload sniffing | `src/lib/uploads.ts` | `test:unit` (upload sniffing) |
| Postgres-backed rate limits | `src/lib/rate-limit.ts`, `src/lib/rate-limit-guard.ts` | None |
| Five-locale parity with `t()` and `useTerm()` | `messages/*.json`, `src/i18n/routing.ts` | `i18n:check` |
| Typed config accessor, single sanctioned `process.env` reader | `src/config/index.ts` | `lint` |
| Health and metrics endpoints | `src/app/api/health/route.ts`, `src/app/api/metrics/route.ts` | `smoke` |
| Quota and usage dashboard | `src/app/[portal]/admin/usage/page.tsx`, `src/app/api/usage/route.ts` | None |
| Admin status, health, audit screens | `src/app/[portal]/admin/status/page.tsx`, `src/app/[portal]/admin/health/page.tsx`, `src/app/[portal]/admin/audit/page.tsx` | None |
| PWA manifest, service worker, offline shell | `src/app/manifest.ts`, `public/sw.js`, `public/offline.html` | `seo:check` |
| Per-role dashboard widgets | `src/app/[portal]/dashboard/page.tsx` (`ROLE_WIDGETS`) | `test:e2e` (portal) |
| Public OpenAPI description | `src/app/api/public/openapi.json/route.ts` | `seo:check` |
| SEO files, JSON-LD, generated OG/Twitter images | `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/JsonLd.tsx` | `seo:check` |
| Public product site and read-only demo | `src/app/features/page.tsx`, `src/app/compare/page.tsx`, `src/app/demo/page.tsx`, `src/app/use-cases/[audience]/page.tsx` | `test:e2e` (public) |

## Operator, TUI, CLI, and API

| Feature | Where | Verification |
| --- | --- | --- |
| Shared operator registry (46 actions, duplicate-id guard) | `src/ops/registry.ts`, `src/ops/actions/*.ts` | `pnpm exec tsx -e "import {listActions} from './src/ops/registry'; console.log(listActions().length)"` |
| Filterable TUI Actions palette | `src/tui/screens/Actions.tsx` | `pnpm tui` |
| Sites, Add site, Remove site with impact preview | `src/tui/screens/Sites.tsx`, `src/tui/screens/AddSite.tsx`, `src/tui/screens/RemoveSite.tsx` | `docs/tui.md` |
| Migrate screen with dry-run default | `src/tui/screens/Migrate.tsx`, `src/ops/actions/migrate.ts` | `docs/deployment.md` |
| Backup, verify, restore, DR drill | `src/tui/screens/Backup.tsx`, `src/ops/actions/backup.ts` | `backup.verify`, `dr.drill` |
| Jobs screen with publish, retry, resume, status | `src/tui/screens/Jobs.tsx`, `src/ops/actions/jobs.ts` | None |
| Health, Logs, Danger screens | `src/tui/screens/Health.tsx`, `src/tui/screens/Logs.tsx`, `src/tui/screens/Danger.tsx` | None |
| Operator audit log | `src/tui/lib/audit-log.ts` | None |
| Operator API discovery endpoints | `src/app/api/ops/route.ts`, `src/app/api/ops/openapi.json/route.ts`, `src/app/api/ops/manifest.json/route.ts`, `src/app/api/ops/health/route.ts` | `test:e2e` (ops) |
| Operator run endpoint with scoped Bearer token | `src/app/api/ops/run/route.ts`, `src/ops/engine.ts` | `test:e2e` (ops) |
| Two-phase typed confirmations with five-minute expiry | `src/ops/engine.ts` | `test:unit` (operator engine) |
| Idempotency keys with ten-minute window | `src/ops/engine.ts` | `test:unit` (operator engine) |
| Least-privilege token minting (`ops.token`) and whoami/status/explain | `src/ops/actions/system.ts` | `test:e2e` (ops) |
| IP allowlist and HTTPS enforcement | `src/ops/engine.ts`, `docs/api.md` | `test:e2e` (ops) |
| Config check/init/diff/doctor as CLI and actions | `scripts/config.ts`, `src/ops/actions/system.ts` | `config:doctor` |
| User actions: list, role, disable, sessions, revoke-all | `src/ops/actions/system.ts` | None |
| Danger actions: revoke sessions, disable user, drop database | `src/ops/actions/system.ts`, `src/ops/actions/backup.ts` | `test:unit` (operator engine) |
| Data actions: export, i18n-missing, import | `src/ops/actions/system.ts` | `i18n:check` |
| Compliance export, secret rotation, bench, CLI completion | `src/ops/actions/system.ts` | None |
| Zero-install CLI wrappers | `cli/gp.sh`, `cli/gp.ps1` | `test:e2e` (ops) |
| Log tail action | `src/ops/actions/system.ts` | None |

## Developer experience

| Feature | Where | Verification |
| --- | --- | --- |
| Strict TypeScript | `package.json` (`typecheck`) | `pnpm typecheck` |
| ESLint 10 with Next.js rules and `process.env` ban | `eslint.config.mjs` | `pnpm lint` |
| oxfmt formatting (4 spaces, double quotes, width 100) | `package.json` (`verify`) | `pnpm exec oxfmt --check .` |
| pnpm 10.20.0 with Node >= 22.12 pinned | `package.json` | `pnpm install --frozen-lockfile` |
| Drizzle schema and generated migrations | `src/db/schema.ts`, `src/db/migrations/*`, `drizzle.config.ts` | `db:generate`, `db:migrate` |
| Idempotent seed packs and presets | `scripts/seed.ts`, `deployments/seed-packs/*`, `deployments/presets/*` | `db:seed` |
| Typed SDK client | `src/lib/sdk/client.ts`, `docs/sdk.md` | `pnpm typecheck` |
| Machine-readable API descriptions | `src/app/api/ops/openapi.json/route.ts`, `src/app/api/public/openapi.json/route.ts` | `seo:check` |
| Unit suite (cursor codec, permissions, recurrence, uploads, SSRF, JSON-LD, ops engine) | `tests/unit/core.test.ts` | `test:unit` |
| E2E projects: setup, public, ops, a11y, portal | `tests/e2e/*.spec.ts`, `tests/e2e/auth.setup.ts`, `playwright.config.ts` | `test:e2e` |
| Accessibility E2E with axe | `tests/e2e/a11y.spec.ts` | `test:e2e` |
| Docs set (architecture, deployment, auth, security, i18n, tui, api, runbook, sdk) | `docs/*.md` | Manual review |
| Community standards, issue and PR templates, dependabot, labeler | `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`, `.github/CODEOWNERS` | `labeler.yml` |
| In-product changelog and roadmap | `src/app/changelog/page.tsx`, `src/app/roadmap/page.tsx` | `test:e2e` (public) |

## Deployment

| Feature | Where | Verification |
| --- | --- | --- |
| Bare Node runtime (authoritative) | `docs/deployment.md` | `config:doctor`, `/api/health` |
| Multi-stage Docker image, unprivileged runner | `Dockerfile` | `docker build` (local only) |
| Docker Compose with local PostgreSQL 18 | `compose.yaml`, `.env.docker.example` | `docker compose config` (local only) |
| Dev container and Codespaces | `.devcontainer/devcontainer.json` | Manual |
| Helm chart with probes, Service, Ingress, Secret | `helm/general-portal/*` | `helm lint` (local only) |
| Single-database mode via `DATABASE_URL_SINGLE` | `docs/deployment.md`, `src/config/index.ts` | `config:check` |
| PR preview sites with ephemeral Postgres | `.github/workflows/preview.yml`, `scripts/preview.ts` | CI only |
| Scheduled encrypted backups | `src/lib/jobs/backups.ts` | `backup.verify` |
| Retention queue (audit, activity, notifications) | `src/lib/jobs/retention.ts` | None |
| Central CI: format, lint, typecheck, build | `.github/workflows/ci.yml` | CI only |
| E2E workflow with migrated and seeded databases | `.github/workflows/e2e.yml` | CI only |
| CodeQL, dependency review, Scorecard | `.github/workflows/codeql.yml`, `.github/workflows/dependency-review.yml`, `.github/workflows/scorecard.yml` | CI only |
| Lighthouse CI | `.github/workflows/lighthouse.yml` | CI only |
| Release automation | `.github/workflows/release-please.yml` | CI only |
| Stale, labeler, greetings automation | `.github/workflows/stale.yml`, `.github/workflows/labeler.yml`, `.github/workflows/greetings.yml` | CI only |
| Reverse proxy TLS, HSTS, `X-Forwarded-Proto` guidance | `docs/deployment.md` | `test:e2e` (ops) |

## Quality

| Feature | Where | Verification |
| --- | --- | --- |
| Full static verification pipeline | `scripts/verify.sh` | `pnpm verify` |
| Vitest unit suite | `tests/unit/core.test.ts` | `pnpm test:unit` |
| Five-locale key parity | `scripts/checks.cjs` | `pnpm i18n:check` |
| SEO file and landing metadata check | `scripts/checks.cjs` | `pnpm seo:check` |
| Banned-pattern security scan | `scripts/checks.cjs` | `pnpm security:check` |
| Indexed-query check via `EXPLAIN ANALYZE` | `scripts/checks.cjs` | `pnpm perf:check` (requires `MIGRATE_URL`) |
| Live-server smoke with cross-portal isolation | `scripts/smoke.ts` | `pnpm smoke` |
| Browser E2E with one worker | `playwright.config.ts` | `pnpm test:e2e` |
| Config validation and doctor | `scripts/config.ts` | `pnpm config:check`, `pnpm config:doctor` |
| Audit chain verification | `src/lib/audit.ts` | `pnpm test:unit` |
| Backup verification and DR drill | `src/ops/actions/backup.ts` | `backup.verify`, `dr.drill` |
| Structured-data script-closing escape test | `tests/unit/core.test.ts` | `pnpm test:unit` |
| Typed-confirmation and unknown-action tests | `tests/unit/core.test.ts` | `pnpm test:unit` |

## Verification commands

| Command | Covers |
| --- | --- |
| `pnpm verify` | Runs `oxfmt --check`, ESLint, `tsc --noEmit`, `next build`, unit tests, i18n, SEO, and security checks. Static only; no server or database. |
| `pnpm test:unit` | Vitest: cursor codec, permission grants, recurrence, upload sniffing, SSRF blocking, JSON-LD escaping, operator confirmation and unknown actions. |
| `pnpm i18n:check` | Reports missing and extra keys across `en-US`, `zh-CN`, `de-DE`, `fr-FR`, `es-ES`; currently 1,178 keys per locale. |
| `pnpm seo:check` | Checks sitemap, robots, manifest, OG and Twitter images, JSON-LD helper, landing metadata, and absence of landing self-fetch. |
| `pnpm security:check` | Static scan of `src/` and `scripts/` for `dangerouslySetInnerHTML`, `eval`, `new Function`, and `sql.raw`. |
| `pnpm perf:check` | Runs `EXPLAIN ANALYZE` on workspace and task queries against `MIGRATE_URL`; skips when unset. Fails on sequential scans. |
| `pnpm smoke` | Live-server suite using a seeded admin (`SMOKE_EMAIL`, `SMOKE_PASSWORD`), including cross-portal isolation. Requires a running server and migrated, seeded databases. |
| `pnpm test:e2e` | Playwright projects `setup`, `public`, `ops`, `a11y`, `portal` with `workers: 1`; needs a live server plus seeded databases. |

## Known deployment prerequisites

| Prerequisite | Why it is needed |
| --- | --- |
| Live PostgreSQL 14+ | One database per portal by default, or `DATABASE_URL_SINGLE` for single-database mode; pg-boss uses `PG_BOSS_URL` or the first portal database. |
| Migrated and seeded databases | `MIGRATE_URL` with `pnpm db:migrate` per database, then `pnpm db:seed <slug>`; required by smoke and E2E. |
| `SMOKE_EMAIL` and `SMOKE_PASSWORD` | Credentials of a seeded admin user for `pnpm smoke`. |
| `OPS_API_TOKEN`, `OPS_SECRET`, `OPS_ALLOWED_IPS` | Bootstrap operator credential, signing key for issued tokens and confirmations, optional source-IP allowlist. Production operator calls require HTTPS via `X-Forwarded-Proto`. |
| `BACKUP_ENCRYPTION_KEY` | Base64-encoded 32-byte key; without it scheduled backups are stored unencrypted. |
| `SCIM_TOKEN` | Bearer credential for the SCIM 2.0 Users and Groups endpoints. |
| `AUTH_SECRET`, `APP_BASE_URL` | Session signing and canonical origin for passkey rpId, redirects, and SAML ACS. |
| SMTP variables (`SMTP_HOST`, `SMTP_FROM`, plus credentials) | Email OTP, magic links, and digest mail. |
| Docker, Compose, and Helm binaries | Needed only to build or lint container images and charts locally; the authoritative runtime is bare Node. |
