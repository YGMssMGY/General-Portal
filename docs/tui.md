# Operator Console (TUI)

Run with `pnpm tui`. Ink plus `ink-text-input`, menu in `src/tui/App.tsx`. Operator interface, English only. Arrow keys and Enter to navigate, Esc to go back, Ctrl-C to quit.

## Safety rails (all screens)

- Interactive-only: refuses to start without a TTY (`This console requires an interactive terminal`).
- Typed confirmation for every destructive action: retype the portal slug (or user email); mismatch aborts with `Nothing was changed`.
- Verified backup first: Remove site takes a `pre-remove` `pg_dump` and refuses to drop when it fails.
- Backups are never deleted by the tool; listings show retained totals.
- Every action writes to the audit log: shared operator actions via `src/ops/lib/audit.ts`; the TUI also has `src/tui/lib/audit-log.ts`.
- The tool never edits `deployment.yaml`; removal ends with a manual-edit reminder.

## Screens

| Screen | File | What it does |
| --- | --- | --- |
| Actions | `screens/Actions.tsx` | Filterable palette over all 46 registered operator commands: pick an action, enter JSON params, run it through the shared engine; destructive commands show a preview and require the typed slug or email |
| Sites | `screens/Sites.tsx` | List portals from `DATABASE_URL_*` env with database sizes |
| Add site | `screens/AddSite.tsx` | Wizard: slug, name, category, seed pack (`deployments/seed-packs/`), providers (the nine schema ids), domains; creates the database, then expects migrate plus seed |
| Remove site | `screens/RemoveSite.tsx` | Impact preview (row counts for users, workspaces, roles, memberships, tasks, events, proposals, transactions, audit_logs, attachments, sessions, plus `pg_database_size`), verified backup, typed slug, drop; YAML edit stays manual |
| Migrate | `screens/Migrate.tsx` | Scope one portal or all; dry-run (default) lists pending files from `src/db/migrations` against `schema_migrations`; confirm shells `scripts/migrate.ts` per portal |
| Backup | `screens/Backup.tsx` | `pg_dump` per portal (`manual` label), list with byte totals, `pg_restore` restore with typed confirmation |
| Jobs | `screens/Jobs.tsx` | Inspect pg-boss queues (`nudge`, `digest`, `report-generate`, `webhook-deliver`, `retention`, `link-health`, `scheduled-backup`); re-queue or clear stuck jobs |
| Health | `screens/Health.tsx` | Per-portal checks: database reachability, pending migrations, `/api/health` status |
| Logs | `screens/Logs.tsx` | Tail process logs (pino levels `trace` through `fatal`) with portal filter |
| Danger | `screens/Danger.tsx` | Typed-confirmation zone: revoke all sessions for a portal, disable a user by email, hand off to the RemoveSite drop flow |

DB helpers live in `src/tui/lib/tui-db.ts` (`pgDump`, `pgRestore`, `pendingMigrations`, `tableRowCounts`, `runTsx`, identifier guards). `.env` is loaded via `loadDotEnv` on start; pools close on exit.

## Shared operator registry

The Actions palette is not a separate command implementation. It reads `describeAll()` from `src/ops/registry.ts` and calls `executeAction` in `src/ops/engine.ts` directly with `source: "tui"` and all four scopes; the HTTP operator API calls the same registry and engine behind `POST /api/ops/run`. Adding an action in `src/ops/actions/` makes it available in both places, with the same zod validation, two-phase typed confirmation, and `.tui-audit.log` entry. The per-domain screens above remain as focused shortcuts.

## Remote operation without SSH

The TUI is local and interactive (TTY only). For a remote deployment, use the operator API over HTTPS instead: `curl`, PowerShell `irm`, or the checked-in `cli/gp.sh` / `cli/gp.ps1` wrappers with `GP_URL` and `GP_TOKEN`. These call the same 46 actions; no SSH server or remote shell is needed. Production requests require `X-Forwarded-Proto: https`, and the optional `OPS_ALLOWED_IPS` allowlist limits which source addresses may call. See `docs/api.md` for the request shape and `docs/deployment.md` for token setup.
