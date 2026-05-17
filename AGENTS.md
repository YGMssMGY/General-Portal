# AGENTS.md — General Portal

## Quick start

```powershell
# Everything from root (npm workspaces)
npm install          # hoists deps for frontend/ + backend/
npm run dev          # kills ports 3001,5173 → migrations + seed → Hono (:3001) + Vite (:5173)
npm run stop         # kills ports 3001,5173
npm run build        # tsc (backend) + tsc -b && vite build (frontend)
npm run test -w backend    # 10 vitest tests
npm run test -w frontend   # 20 vitest tests
npm run format       # prettier --write
npx eslint "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"
```

## Architecture

```
root package.json  (workspaces: ["frontend", "backend"])
├── frontend/   Vite + React 18 + Carbon Design System  → port 5173
├── backend/    Hono + Prisma + @hono/auth-js  → port 3001
└── node_modules/  (hoisted)

Vite proxy: /api/* → localhost:3001
```

- **No Java, no Spring Boot, no Docker.** SQLite for dev (`file:./dev.db`), PostgreSQL for prod (swap `schema.prod.prisma`).
- **Auth:** `@hono/auth-js` with JWT strategy. Dev credentials provider active when `DEV_AUTH_PASSWORD` is set. OAuth2 (GitHub, Google, Microsoft) optional.
- **Production:** Only Microsoft OAuth2. Dev credentials and other OAuth2 providers are disabled when `NODE_ENV=production`.
- **Database persists across dev restarts.** `dev-setup.mjs` runs pending migrations on existing DB; does NOT delete it. Seeded users are always created fresh by the seed script.
- **Multi-client:** `VITE_CLIENT_NAME=developers|stuco` controls brand, feature flags, favicon, and separate database file (`dev.db` vs `dev-stuco.db`).

## Key files

| Path                                   | Role                                                               |
| -------------------------------------- | ------------------------------------------------------------------ |
| `backend/src/index.ts`                 | Dev entry — sets `DATABASE_URL`, dynamic imports, registers routes |
| `backend/src/prod.ts`                  | Production entry — same + serves frontend `dist/` + SPA fallback   |
| `backend/src/lib/env.ts`               | Typed env access (reads from `process.env`, no dotenv)             |
| `backend/src/lib/db.ts`                | PrismaClient singleton (globalThis guard for hot-reload)           |
| `backend/src/lib/auth-config.ts`       | Auth.js providers + callbacks (production-aware)                   |
| `backend/src/routes/*.ts`              | 15 Hono route modules + admin.ts (admin-only user creation)        |
| `backend/prisma/schema.prisma`         | SQLite schema (19 models + Account/Session/VerificationToken)      |
| `backend/prisma/schema.prod.prisma`    | PostgreSQL schema (swap for prod)                                  |
| `backend/scripts/dev-setup.mjs`        | Dev DB setup — runs migrations, seeds on fresh DB only             |
| `backend/scripts/manage-accounts.mjs`  | CLI tool: `create-admin`, `create-user`, `list`, `delete`          |
| `frontend/src/config/clientConfig.ts`  | Multi-client branding config                                       |
| `frontend/src/hooks/useClientTheme.ts` | Sets favicon, title, CSS vars                                      |
| `frontend/src/api/httpClient.ts`       | `fetchJson()` with retry (2x on 5xx/network err)                   |

## Critical gotchas

1. **`DATABASE_URL` must be set before PrismaClient is created.** `index.ts` sets `process.env["DATABASE_URL"]` before any dynamic imports. `env.ts` must NOT call `dotenv.config()` — it would overwrite the URL. Loading `.env.local` is centralized in `index.ts` only.
2. **`env-url-basepath-redundant` warning** — safe to ignore. Caused by explicit `basePath: "/api/auth"` plus `AUTH_URL` env var.
3. **Module execution order matters.** All backend imports after DATABASE_URL are dynamic (`await import()`) to ensure the env var is set first.
4. **Credentials sign-in requires JWT strategy.** `session: { strategy: "database" }` crashes with `UnsupportedStrategy`.
5. **Custom passwords stored in DB.** Admin-created users get their own password. Seeded users fall back to `DEV_AUTH_PASSWORD`. Usernames don't require `@` — "jeff" works.
6. **SQLite schema differences** vs PostgreSQL: remove `@db.Text`, change `cuid()` → `uuid()`. Handled in `schema.prisma` (SQLite) vs `schema.prod.prisma` (PostgreSQL).
7. **Database persists across restarts.** `dev-setup.mjs` does NOT delete the DB. Custom-created users and data survive `npm run dev` restarts.
8. **No safe DB proxy.** `db` is just `prisma` directly. Errors throw and must be caught explicitly.
9. **PrismaClient uses globalThis singleton.** Survives `tsx watch` hot-reloads without creating duplicate connections.

## Dev login accounts

Seeded users (password from `DEV_AUTH_PASSWORD`, default `devpass123`):

| Email                               | Role      |
| ----------------------------------- | --------- |
| `dev.admin@generalportal.local`     | Admin     |
| `dev.president@generalportal.local` | President |
| `dev.officer@generalportal.local`   | Officer   |
| `dev.member@generalportal.local`    | Member    |

Custom accounts can be created via **Admin → Accounts** page with any username and password.

## Production deployment

```powershell
npm run db:use:prod           # swap schema.prisma → PostgreSQL version
npm run db:push:prod          # push schema to PostgreSQL
npm run db:seed:prod          # seed data
NODE_ENV=production npm start # builds + starts on :3001
# Login: Microsoft OAuth2 only, no dev credentials
# Frontend static files served by the backend at /
```

## UI conventions

- Use Carbon components (`Grid`, `Row`, `Column`, `Stack`, `Tile`, `DataTable`, `Modal`, `InlineNotification`) — not inline `style={{}}`.
- All admin pages use `PageHeader` for title + actions.
- Multi-client feature flags in `clientConfig.ts` control sidebar nav visibility.
- Time-aware greeting in DashboardPage (`Good morning/afternoon/evening`).
- Logout button in UIShell header global bar.
- Page transition animations via framer-motion (`PageTransition` component).
- Toast notifications via react-hot-toast on CRUD operations.

## Testing

```powershell
npm run test -w backend    # 10 tests (health, auth, env, error middleware)
npm run test -w frontend   # 20 tests (Card, PageHeader, StateViews, PublicHome, LoginPage, clientConfig)
```

- Backend tests use Hono's `app.request()` (no real DB needed for unit tests).
- Frontend tests use vitest + jsdom + @testing-library/react.
- No E2E tests (no Playwright config).

## Verification gates (after every change)

1. `npm run build -w backend` — 0 TS errors
2. `npm run build -w frontend` — 0 TS errors
3. `npx eslint "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"` — 0 errors
4. `npm run test -w backend` — all pass
5. `npm run test -w frontend` — all pass
6. Quick smoke: `npm run dev`, hit `/api/health` → 200
