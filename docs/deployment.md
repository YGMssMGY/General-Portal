# Deployment

## Server prereqs

Node >= 22.12, pnpm 10, PostgreSQL 14+ (one database per site), `pg_dump` and `pg_restore` on PATH (the TUI Backup screen shells out to them), outbound HTTPS for SSO discovery plus SMTP for digests and OTP mail. TLS terminates at the reverse proxy.

## Environment reference

Only `src/config/index.ts` (plus `src/db/*`, `src/tui/*`, `scripts/*`, `instrumentation.ts`, `playwright.config.ts`, `tests/e2e/*` under the ESLint exemption) may read `process.env`. Everything else imports the typed `config` object.

Database (one per site, named by slug):

| Var | Purpose |
|---|---|
| `DATABASE_URL_<SLUG>` | Portal database URL, e.g. `DATABASE_URL_DEVELOPERS`, `DATABASE_URL_STUCO` |
| `MIGRATE_URL` | Connection string for `scripts/migrate.ts` (argv alternative) |
| `PG_BOSS_URL` | Job database; defaults to the first portal database when unset |
| `PG_POOL_MAX` | Pool size per site (default 10, floor 2) |

App:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | HTTP port |
| `APP_BASE_URL` / `AUTH_URL` | `http://localhost:3000` | Canonical base URL (passkey rpId, redirects, SAML ACS) |
| `DEPLOYMENT_FILE` | `deployment.yaml` | Site authority path |
| `UPLOADS_DIR` | `./uploads` | Local file storage root (per-portal subdirectories) |
| `SESSION_TTL_HOURS` | 24 | Opaque session lifetime |
| `AUTH_SECRET` | empty | App secret; rotate with session revocation (see runbook) |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed client origin |
| `API_KEY` | empty | Legacy key placeholder |

Providers (each group fully gates its provider; partial config keeps it invisible):

| Var | Provider |
|---|---|
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` (default `common`) | microsoft-entra-id |
| `BASIS_AUTH_ISSUER`, `BASIS_AUTH_CLIENT_ID`, `BASIS_AUTH_CLIENT_SECRET`, `BASIS_AUTH_REDIRECT_URI`, `BASIS_AUTH_RESOURCE` | basis-auth |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` (optional) | oidc |
| `SAML_ENTRY_POINT`, `SAML_ISSUER`, `SAML_CERT` | saml |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | google |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | github |
| `AUTH_PROVIDERS_<SLUG>`, `ALLOWED_DOMAINS` | Per-portal provider override, SSO auto-join domains |

SMTP: `SMTP_HOST`, `SMTP_PORT` (default 587, 465 enables TLS), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. `TEAMS_WEBHOOK_URL` posts event announcements.

Limits: `RATE_LIMIT_MAX` (default 100; global per-IP bucket, sensitive auth/search paths get a tenth with a floor of 10), `LOG_LEVEL` (`trace debug info warn error fatal silent`; production defaults `info`, development `debug`, test `silent`). `NODE_ENV` is set by Next.js itself; do not set it in `.env`.

## deployment.yaml reference

Validated by `src/lib/deployment/schema.ts` (`deploymentConfigSchema`, version literal `1`).

| Key | Purpose |
|---|---|
| `deployment.id` / `.environment` / `.baseUrl` | Deployment identity and canonical URL |
| `defaults.locale` / `.timezone` | Fallback locale (`en-US`) and timezone (`Asia/Shanghai`) |
| `defaults.theme.primary` / `.radius` | Brand defaults |
| `portals[].slug` | Lowercase slug (`^[a-z0-9][a-z0-9_-]{0,63}$`); also the DB key suffix |
| `portals[].name/.category/.description` | Display name, category, public description |
| `portals[].branding.{logo,favicon,primary}` | Static asset paths and accent color |
| `portals[].db.envVar` | Env var holding this portal's URL (e.g. `DATABASE_URL_DEVELOPERS`) |
| `portals[].auth.providers` | Allowed providers (enum of the 10 schema ids); intersected with env-enabled set |
| `portals[].auth.allowedDomains` | SSO auto-join domains (e.g. `basischina.com`); empty disables auto-join |
| `portals[].modules` | Enabled product areas; enforced per request via `module` option |
| `portals[].nav[]` | Sidebar entries `{ path, label, icon, module }` |
| `portals[].terminology` | Word swaps, e.g. `subgroup: Guild` vs `subgroup: Committee` |
| `portals[].roles` | Role names to ensure (`admin, officer, member`) |
| `portals[].seedPack` | Seed pack id (`developers_club`, `student_council`) |
| `portals[].limits.{uploadMb,requestsPerMinute,auditRetentionDays}` | 10 / 100 / 365 in the shipped file |
| `portals[].features` | Flags: `meeting_minutes, attendance, participation, reports, custom_fields, webhooks` |
| `portals[].integrations` | Env-var pointers, e.g. `teamsWebhookEnv: TEAMS_WEBHOOK_URL` |

Provider ids in `auth.providers` match the runtime set (`password`, `email-otp` with magic-link purpose); the loader rejects anything else.

## Provisioning a site end to end

1. `pnpm tui` then Add site: slug, name, category, seed pack (from `deployments/seed-packs/`), providers, domains. This creates the database.
2. `MIGRATE_URL=<new-url> pnpm exec tsx scripts/migrate.ts` (or `pnpm db:migrate` with `MIGRATE_URL` set).
3. `pnpm exec tsx scripts/seed.ts <slug>`, optionally `--set-password <email>=<password>`.
4. Append the portal block to `deployment.yaml` by hand. The TUI never edits this file.
5. Set `DATABASE_URL_<SLUG>` in `.env`, restart Node. Reconcile inserts the workspace row and system roles on boot.

Removing a site is the reverse via the TUI Remove site flow (impact preview, mandatory verified backup, typed slug, drop), then deleting the YAML block by hand.

## Backups, restore, retention

The TUI Backup screen runs `pg_dump` per portal (`manual` or `pre-remove` label) and `pg_restore` for restore with typed confirmation; backup listings show retained totals and the tool never deletes backup files. `SELECT pg_database_size` reports size. The `retention` queue purges audit rows older than the portal's `auditRetentionDays` (default 365), activity feed rows older than 180 days, and read notifications older than 90 days, in 1000-row batches.

## Capacity ledger

Budget Postgres connections as `number_of_sites x PG_POOL_MAX`, plus pg-boss (shares `PG_BOSS_URL` or the first site database). With the shipped two sites and default pool 10, plan for at least 20 app connections plus boss. Raise `max_connections` before adding sites, not after alerts.

## Reverse proxy

Point the proxy at the Node port with `X-Forwarded-Proto` preserved; the app sets HSTS only when that header is `https` or `NODE_ENV` is production. The app never manages proxy services: no container or proxy configuration lives in this repo.

## Upgrades

There is no `--dry-run` flag on `scripts/migrate.ts` (usage: `tsx scripts/migrate.ts <connectionString>`, `MIGRATE_URL` fallback). The TUI Migrate screen is the dry-run surface: it lists pending files per portal first and only applies on explicit confirm. Upgrade per database: run migrate against each `DATABASE_URL_<SLUG>`, then re-run seed (idempotent: workspaces, roles, users, memberships, tasks, events, templates, transactions, and budgets are matched before insert). Applied files are recorded in `public.schema_migrations` inside per-file transactions with rollback on failure.

## Disaster recovery order

1. Restore each database from backup (`pg_restore` via the TUI Backup screen).
2. Re-run migrate per database to close any schema gap.
3. Reseed only if a portal database is empty (seed never overwrites user content, but empty-only keeps the intent explicit).
4. Restart Node and confirm `/api/health` plus one authed read per portal.
