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

## Deployment modes

Bare Node is the authoritative runtime. The container, dev container, and Helm options package the same application and do not change its behavior.

### Bare Node (authoritative)

1. Install Node >= 22.12 and pnpm 10.20.0 (`corepack enable && corepack prepare pnpm@10.20.0 --activate`), plus PostgreSQL 14+ and the `pg_dump` and `pg_restore` binaries used by the TUI Backup screen.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env`, set one `DATABASE_URL_<SLUG>` per portal, set `AUTH_SECRET`, and point `APP_BASE_URL` at the public origin. Keep `.env` out of version control.
4. Create each database, run `MIGRATE_URL=<url> pnpm db:migrate` per portal, then seed with `pnpm exec tsx scripts/seed.ts <slug>`.
5. Run `pnpm build` followed by `pnpm start`. `PORT` defaults to 3000. Boot reconcile inserts missing workspaces and system roles, and pg-boss starts its queues; reconcile never updates or deletes existing rows.
6. Terminate TLS at the reverse proxy and confirm `GET /api/health`.

### Docker Compose

`Dockerfile` is a three-stage build: dependencies, build, and production runner. It installs with `pnpm install --frozen-lockfile`, prunes development dependencies, runs as the unprivileged `node` user, and bakes no secrets into the image. The runner health check calls `/api/health` with Node's built-in `fetch`, so no `curl` is required in the image.

`compose.yaml` starts the app on port 3000 and a local PostgreSQL 18 database. It loads `.env.docker.example` through `env_file`; replace the placeholder values locally before starting, or point `env_file` at a private file excluded from version control. The database host is `db`, so the example URLs use that name. A named `uploads` volume is mounted at `/app/uploads`, and database data lives in a named volume. The database port is published only on `127.0.0.1:5432` so migrations can run from the host.

PostgreSQL creates only `POSTGRES_DB` on first boot. Create the second portal database explicitly:

```sh
docker compose up -d --build
docker compose exec db psql -U general -d postgres -c "CREATE DATABASE general_portal_stuco;"
MIGRATE_URL=postgresql://general:general@127.0.0.1:5432/general_portal_dev pnpm db:migrate
MIGRATE_URL=postgresql://general:general@127.0.0.1:5432/general_portal_stuco pnpm db:migrate
pnpm exec tsx scripts/seed.ts developers
pnpm exec tsx scripts/seed.ts stuco
docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})"
```

Migrations run from the host because `tsx` is a development dependency and is pruned from the production image. The database credentials in `compose.yaml` and `.env.docker.example` are for local use only; replace them before any shared deployment.

### Dev container and Codespaces

`.devcontainer/devcontainer.json` uses the Node 22 Bookworm TypeScript image, adds the pnpm 10.20.0 and PostgreSQL client features, forwards port 3000, and runs `corepack enable && pnpm install --frozen-lockfile` on create. Open the repository in a dev container or a Codespace, copy `.env.example` to `.env`, provide database URLs reachable from the container, then run `pnpm build && pnpm start`. The dev container does not start PostgreSQL by itself.

### Helm

The chart in `helm/general-portal` deploys one replica with non-root pod and container security contexts, readiness and liveness probes on `/api/health`, a ClusterIP Service on port 80 targeting 3000, and an optional Ingress. `config` supplies `PORT`, `APP_BASE_URL`, `PG_POOL_MAX`, and `UPLOADS_DIR` through a ConfigMap. `databases.<slug>`, `authSecret`, `opsApiToken`, and `opsSecret` are base64-encoded into a generated Secret; set `existingSecret` instead to consume a Secret you manage. No credentials ship in `values.yaml`.

| Value | Default | Purpose |
| --- | --- | --- |
| `replicaCount` | `1` | Deployment replicas |
| `image.repository` / `image.tag` | `general-portal` / chart appVersion | Image reference |
| `image.pullPolicy` | `IfNotPresent` | Pull policy |
| `service.type` / `service.port` / `service.targetPort` | `ClusterIP` / `80` / `3000` | Service exposure |
| `ingress.enabled` / `ingress.className` / `ingress.hosts` / `ingress.tls` | `false` / empty / one example host / empty | Ingress routing |
| `config.port` / `config.baseUrl` / `config.pgPoolMax` / `config.uploadsDir` | `3000` / `http://localhost:3000` / `10` / `/app/uploads` | ConfigMap values |
| `databases` / `authSecret` / `opsApiToken` / `opsSecret` | empty | Secret values |
| `existingSecret` | empty | Name of a pre-created Secret; disables the generated Secret |
| `uploads.existingClaim` | empty | PVC for uploads; an `emptyDir` is used otherwise |
| `podSecurityContext` / `securityContext` | non-root, no privilege escalation | Container hardening |
| `resources` / `nodeSelector` / `tolerations` / `affinity` | empty | Scheduling and limits |

Example with a pre-created Secret:

```sh
kubectl create secret generic general-portal-secrets \
  --from-literal=DATABASE_URL_DEVELOPERS='postgresql://...' \
  --from-literal=DATABASE_URL_STUCO='postgresql://...' \
  --from-literal=AUTH_SECRET='...'
helm install general-portal ./helm/general-portal \
  --set existingSecret=general-portal-secrets \
  --set config.baseUrl=https://portal.example.com \
  --set uploads.existingClaim=general-portal-uploads
```

Set `ingress.enabled=true` with the appropriate host, class, and TLS Secret to expose the service. Uploads use `emptyDir` until `uploads.existingClaim` is set; that data is lost when the pod is replaced. Run migrations and seeding against each database before expecting portal data.

### Single-database mode (planned, not implemented)

`DATABASE_URL_SINGLE` is planned to map every portal slug to one Postgres database. It requires application support in the configuration loader, deployment reconciliation, and the migration and seed tooling; none of that support exists in this repository today. Setting the variable now has no effect. Continue to provide one `DATABASE_URL_<SLUG>` per portal, including in Docker Compose and Helm.
