# Operator Console (TUI)

Run with `pnpm tui`. Ink plus `ink-text-input`, menu in `src/tui/App.tsx`. Operator interface, English only. Arrow keys and Enter to navigate, Esc to go back, Ctrl-C to quit.

## Safety rails (all screens)

- Interactive-only: refuses to start without a TTY (`This console requires an interactive terminal`).
- Typed confirmation for every destructive action: retype the portal slug (or user email); mismatch aborts with `Nothing was changed`.
- Verified backup first: Remove site takes a `pre-remove` `pg_dump` and refuses to drop when it fails.
- Backups are never deleted by the tool; listings show retained totals.
- Every action writes to the audit log (`src/tui/lib/audit-log.ts`).
- The tool never edits `deployment.yaml`; removal ends with a manual-edit reminder.

## Screens

| Screen | File | What it does |
|---|---|---|
| Sites | `screens/Sites.tsx` | List portals from `DATABASE_URL_*` env with database sizes |
| Add site | `screens/AddSite.tsx` | Wizard: slug, name, category, seed pack (`deployments/seed-packs/`), providers (the 10 schema ids), domains; creates the database, then expects migrate plus seed |
| Remove site | `screens/RemoveSite.tsx` | Impact preview (row counts for users, workspaces, roles, memberships, tasks, events, proposals, transactions, audit_logs, attachments, sessions, plus `pg_database_size`), verified backup, typed slug, drop; YAML edit stays manual |
| Migrate | `screens/Migrate.tsx` | Scope one portal or all; dry-run (default) lists pending files from `src/db/migrations` against `schema_migrations`; confirm shells `scripts/migrate.ts` per portal |
| Backup | `screens/Backup.tsx` | `pg_dump` per portal (`manual` label), list with byte totals, `pg_restore` restore with typed confirmation |
| Jobs | `screens/Jobs.tsx` | Inspect pg-boss queues (`nudge`, `digest`, `report-generate`, `webhook-deliver`, `retention`, `link-health`); re-queue or clear stuck jobs |
| Health | `screens/Health.tsx` | Per-portal checks: database reachability, pending migrations, `/api/health` status |
| Logs | `screens/Logs.tsx` | Tail process logs (pino levels `trace` through `fatal`) with portal filter |
| Danger | `screens/Danger.tsx` | Typed-confirmation zone: revoke all sessions for a portal, disable a user by email, hand off to the RemoveSite drop flow |

DB helpers live in `src/tui/lib/tui-db.ts` (`pgDump`, `pgRestore`, `pendingMigrations`, `tableRowCounts`, `runTsx`, identifier guards). `.env` is loaded via `loadDotEnv` on start; pools close on exit.
