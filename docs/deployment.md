# Deployment

## Server prereqs

Node >= 22.12, pnpm 10, PostgreSQL 14+ (one database per site), `pg_dump` and `pg_restore` on PATH (the TUI Backup screen shells out to them), outbound HTTPS for SSO discovery plus SMTP for digests and OTP mail. TLS terminates at the reverse proxy.

## Environment reference

Only `src/config/index.ts` (plus `src/db/*`, `src/tui/*`, `scripts/*`, `instrumentation.ts`, `playwright.config.ts`, `tests/e2e/*` under the ESLint exemption) may read `process.env`. Everything else imports the typed `config` object.

Database (one per site, named by slug):

| Var | Purpose |
| --- | --- |
| `DATABASE_URL_<SLUG>` | Portal database URL, e.g. `DATABASE_URL_DEVELOPERS`, `DATABASE_URL_STUCO` |
| `MIGRATE_URL` | Connection string for `scripts/migrate.ts` (argv alternative) |
| `PG_BOSS_URL` | Job database; defaults to the first portal database when unset |
| `PG_POOL_MAX` | Pool size per site (default 10, floor 2) |

App:

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | 3000 | HTTP port |
| `APP_BASE_URL` / `AUTH_URL` | `http://localhost:3000` | Canonical base URL (passkey rpId, redirects, SAML ACS) |
| `DEPLOYMENT_FILE` | `deployment.yaml` | Site authority path |
| `UPLOADS_DIR` | `./uploads` | Local file storage root (per-portal subdirectories) |
| `SESSION_TTL_HOURS` | 24 | Opaque session lifetime |
| `AUTH_SECRET` | empty | App secret; rotate with session revocation (see runbook) |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed client origin |
| `API_KEY` | empty | Legacy key placeholder |
| `OPS_API_TOKEN` | empty | Bootstrap operator token; when set, an exact Bearer match gets all four `ops:*` scopes |
| `OPS_SECRET` | falls back to `AUTH_SECRET`, then empty | HMAC key that signs issued operator tokens and two-phase confirmation tokens |
| `OPS_ALLOWED_IPS` | empty | Comma-separated source IPs; empty allows any source |

Providers (each group fully gates its provider; partial config keeps it invisible):

| Var | Provider |
| --- | --- |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` (default `common`) | microsoft-entra-id |
| `BASIS_AUTH_ISSUER`, `BASIS_AUTH_CLIENT_ID`, `BASIS_AUTH_CLIENT_SECRET`, `BASIS_AUTH_REDIRECT_URI`, `BASIS_AUTH_RESOURCE` | basis-auth |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` (optional) | oidc |
| `SAML_ENTRY_POINT`, `SAML_ISSUER`, `SAML_CERT` | saml |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | google |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | github |
| `AUTH_PROVIDERS_<SLUG>`, `ALLOWED_DOMAINS` | Per-portal provider override, SSO auto-join domains |

SMTP: `SMTP_HOST`, `SMTP_PORT` (default 587, 465 enables TLS), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. `TEAMS_WEBHOOK_URL` posts event announcements.

Limits: `RATE_LIMIT_MAX` (default 100; global per-IP bucket, sensitive auth/search paths get a tenth with a floor of 10), `PG_POOL_MAX` (default 10, floor 2; per-portal pool size), `LOG_LEVEL` (`trace debug info warn error fatal silent`; production defaults `info`, development `debug`, test `silent`). `NODE_ENV` is set by Next.js itself; do not set it in `.env`.

## Operator API configuration

The operator control plane lives at `/api/ops`. Discovery (`GET /api/ops`, `GET /api/ops/openapi.json`, `GET /api/ops/manifest.json`, `GET /api/ops/health`) needs no token and returns no secrets. `POST /api/ops/run` needs `Authorization: Bearer <token>`.

- In production the API rejects any request whose `X-Forwarded-Proto` is not `https` with `403 HTTPS required`. Terminate TLS at the proxy and preserve that header; the proxy must set it correctly or all operator calls fail.
- Set `OPS_API_TOKEN` as the bootstrap credential with all scopes (`ops:read`, `ops:deploy`, `ops:backup`, `ops:danger`). Then use the `ops.token` action to mint least-privilege tokens with a 60-86400 second TTL; rotating `OPS_SECRET` invalidates every issued token.
- Set `OPS_SECRET` explicitly in production; by default it reuses `AUTH_SECRET`. It signs both issued tokens and confirmation tokens.
- Optionally set `OPS_ALLOWED_IPS` to a comma-separated list. The check reads the first `X-Forwarded-For` entry, then `X-Real-IP`; only trust those headers from your own proxy.
- Destructive actions require two steps: the first call returns `409` with a `confirmationToken`, a preview, and a five-minute expiry; the second repeats with that token and `typedValue` equal to the target slug or email. Every call is appended to `.tui-audit.log`.
- Clients need no installation: use `curl`, PowerShell `irm`, or the wrappers `cli/gp.sh` / `cli/gp.ps1` with `GP_URL` and `GP_TOKEN`. No SSH.

`GET /api/ops/health` and the `ops.status` action report whether the token, secret, and IP allowlist are configured, plus the portal count, without revealing values.

## Configuration commands

`scripts/config.ts` has four maintenance commands, also available as `config.*` operator actions. They read `deployment.yaml` at the repo root; the running app reads the path configured by `DEPLOYMENT_FILE`.

| Command | What it does |
| --- | --- |
| `pnpm config:check` | Parses and validates the YAML, then per portal checks the DB env var is set and is a Postgres URL and the seed pack exists. Prints a PASS/FAIL summary; exits 1 on failure. |
| `pnpm config:init` | Writes `deployment.example.local.yaml`, a minimal starter config. Never overwrites an existing example file and never modifies `deployment.yaml`. |
| `pnpm config:diff` | For each portal with a DB URL, compares YAML `name`, `description`, and `branding.logo` with the live `workspaces` row. Reports differences without changing data. |
| `pnpm config:doctor` | Runs `check`, then tests DB connectivity per portal (URL redacted), counts applied `public.schema_migrations`, and checks that `UPLOADS_DIR` is writable. Prints HEALTHY/UNHEALTHY; exits 1 on failure. |

Run `config:check` after editing YAML or env, and `config:doctor` after host, database, or filesystem changes. `config:init` is a starting point: review its output, copy it to `deployment.yaml` (or point `DEPLOYMENT_FILE` at it), set `DATABASE_URL_EXAMPLE`, then run `pnpm config:check`.

## deployment.yaml reference

Validated by `src/lib/deployment/schema.ts` (`deploymentConfigSchema`, version literal `1`).

| Key | Purpose |
| --- | --- |
| `deployment.id` / `.environment` / `.baseUrl` | Deployment identity and canonical URL |
| `defaults.locale` / `.timezone` | Fallback locale (`en-US`) and timezone (`Asia/Shanghai`) |
| `defaults.theme.primary` / `.radius` | Brand defaults; primary must be `#rrggbb` and radius is clamped to 0-32 px as inline CSS variables |
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

Point the proxy at the Node port with `X-Forwarded-Proto` preserved; the app sets HSTS only when that header is `https` or `NODE_ENV` is production, and the operator API rejects non-HTTPS production calls on the same signal. Preserve the client IP in `X-Forwarded-For` or `X-Real-IP` if `OPS_ALLOWED_IPS` is set. The app never manages proxy services: no container or proxy configuration lives in this repo.

## Upgrades

There is no `--dry-run` flag on `scripts/migrate.ts` (usage: `tsx scripts/migrate.ts <connectionString>`, `MIGRATE_URL` fallback). The TUI Migrate screen is the dry-run surface: it lists pending files per portal first and only applies on explicit confirm. Upgrade per database: run migrate against each `DATABASE_URL_<SLUG>`, then re-run seed (idempotent: workspaces, roles, users, memberships, tasks, events, templates, transactions, and budgets are matched before insert). Applied files are recorded in `public.schema_migrations` inside per-file transactions with rollback on failure.

## Disaster recovery order

1. Restore each database from backup (`pg_restore` via the TUI Backup screen).
2. Re-run migrate per database to close any schema gap.
3. Reseed only if a portal database is empty (seed never overwrites user content, but empty-only keeps the intent explicit).
4. Restart Node and confirm `/api/health` plus one authed read per portal.
