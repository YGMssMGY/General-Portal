# Runbook

## Common ops

- Restart: restart the Node process. This resets in-memory rate-limit buckets, re-runs deployment reconcile, and restarts pg-boss (`nudge`, `digest`, `report-generate`, `webhook-deliver`, `retention`, `link-health`, `scheduled-backup`).
- Reseed: `pnpm exec tsx scripts/seed.ts <slug> [packFile]`; idempotent, safe to re-run; add `--set-password <email>=<password>` to set a local credential.
- Rotate secret: set a new `AUTH_SECRET`, then revoke sessions (account page plus TUI Danger) so old tokens cannot linger.
- Revoke sessions: per user via `DELETE /api/account/sessions` on the account page; per portal via the TUI Danger screen (revokes all non-revoked sessions, typed confirmation, audit-logged); disable a user to block re-login.
- Restore backup: TUI Backup screen, pick the file, typed confirmation, `pg_restore`; then re-run migrate per database and restart.
- Rate-limit bucket reset: restart the process (buckets are in-memory only).
- pg-boss stuck jobs: inspect and re-queue or clear from the TUI Jobs screen; boss state lives in `PG_BOSS_URL` or the first portal database.
- Uploads disk full: check `UPLOADS_DIR` per-portal subdirectories; files are content-addressed by random names with sha256 rows in `attachments`, so orphans can be reconciled against the table before deletion.
- Migration failure: `scripts/migrate.ts` applies files in order inside per-file transactions with rollback; the failure log names file and statement number. Fix the cause, re-run the same command; `public.schema_migrations` records only fully applied files.
- Config check: run `pnpm config:check` after every `deployment.yaml` or env change (YAML validity, DB env vars and URLs, seed packs). `pnpm config:diff` compares YAML name, description, and logo with live workspace rows.
- Config doctor: `pnpm config:doctor` bundles the check, per-portal DB connectivity (URL redacted), applied-migration counts, and `UPLOADS_DIR` writability. UNHEALTHY means a portal is unreachable or the upload directory is not writable; it exits 1 so a scheduler can alert.
- Operator token: bootstrap with `OPS_API_TOKEN` (all scopes), then use the `ops.token` action (scope `ops:danger`) to mint least-privilege tokens with a 60-86400 second TTL. Rotate `OPS_SECRET` or `OPS_API_TOKEN` to invalidate issued tokens. Keep tokens out of logs and shell history.
- Operator API: discover with `GET /api/ops` and run with `POST /api/ops/run` from `curl`, PowerShell `irm`, or `cli/gp.sh` / `cli/gp.ps1` (set `GP_URL` and `GP_TOKEN`). Production requires HTTPS via `X-Forwarded-Proto`. A destructive action first returns 409 with a `confirmationToken`; repeat with that token and `typedValue` equal to the target slug or email. Use `idempotencyKey` for safe retries; every run lands in `.tui-audit.log`.
- DR drill: run the `dr.drill` action (scope `ops:backup`) to restore the newest backup into a scratch database, compare row counts with the live database, and drop the scratch. It never touches live data; schedule it to prove backups are restorable.

## Log levels

Pino, level from `LOG_LEVEL` (`trace debug info warn error fatal silent`); defaults `info` in production, `debug` in development, `silent` in test. Secrets, token hashes, verifiers, and cookie/authorization headers are redacted with `remove: true`. Service tag `general-portal`.

## Health checks

- `GET /api/health`: public, returns `{ success: true, data: { status: ok, version: 2.0.0 } }`; used by the Playwright `webServer` wait and load balancers.
- TUI Health screen: per-portal database reachability, pending-migration counts, and API status.
- `GET /api/ops/health` and the `ops.status` action: operator API status (token, secret, and IP allowlist configured flags plus portal count), without revealing values.
- Smoke: `SMOKE_EMAIL` plus `SMOKE_PASSWORD` against a seeded admin, `BASE_URL` default `http://localhost:3000`; covers login, all list routes, task/kudos/thread/proposal/file round trips, settings round trip, cross-portal isolation, anonymous 401s, and CSP headers.
