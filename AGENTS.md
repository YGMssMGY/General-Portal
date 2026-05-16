# AGENTS.md — General Portal

## Quick start

```powershell
# Everything from root (npm workspaces)
npm install          # hoists deps for frontend/ + backend/
npm run dev          # kills ports 3001,5173 → SQLite reset+seed → Hono (:3001) + Vite (:5173)
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
- **Database resets every `npm run dev`.** `dev-setup.mjs` deletes `dev.db`, runs migration + seed fresh.
- **Multi-client:** `VITE_CLIENT_NAME=developers|stuco` controls brand, feature flags, favicon.

## Key files

| Path                                   | Role                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `backend/src/index.ts`                 | Server entry — sets `DATABASE_URL`, dynamic imports, registers routes    |
| `backend/src/lib/env.ts`               | Typed env access (reads from `process.env`, no dotenv)                   |
| `backend/src/lib/db.ts`                | Lazy `PrismaClient` (safe proxy catches DB errors → returns `[]`/`null`) |
| `backend/src/lib/auth-config.ts`       | Auth.js providers + callbacks                                            |
| `backend/src/routes/*.ts`              | 15 Hono route modules (health, auth, dashboard, CRUD per resource)       |
| `backend/prisma/schema.prisma`         | SQLite schema (19 models + Account/Session/VerificationToken)            |
| `backend/prisma/schema.prod.prisma`    | PostgreSQL schema (swap for prod)                                        |
| `frontend/src/config/clientConfig.ts`  | Multi-client branding config                                             |
| `frontend/src/hooks/useClientTheme.ts` | Sets favicon, title, CSS vars                                            |
| `frontend/src/api/httpClient.ts`       | `fetchJson()` with retry (2x on 5xx/network err)                         |

## Critical gotchas

1. **`DATABASE_URL` must be set before PrismaClient is created.** `index.ts` sets `process.env["DATABASE_URL"]` before any dynamic imports. `env.ts` must NOT call `dotenv.config()` — it would overwrite the URL. Loading `.env.local` is centralized in `index.ts` only.
2. **`env-url-basepath-redundant` warning** — safe to ignore. Caused by explicit `basePath: "/api/auth"` plus `AUTH_URL` env var.
3. **Module execution order matters.** PrismaClient is created lazily on first access (via `db.ts` Proxy). If you change this, make sure `DATABASE_URL` is already set.
4. **Credentials sign-in requires JWT strategy.** `session: { strategy: "database" }` crashes with `UnsupportedStrategy` when using credentials provider.
5. **`authorize()` should avoid DB queries** if possible (makes login resilient). The JWT callback enriches the token with workspace data — falls back to defaults if DB is unavailable.
6. **SQLite schema differences** vs PostgreSQL: remove `@db.Text`, change `cuid()` → `uuid()`. These are handled in `schema.prisma` (SQLite) while `schema.prod.prisma` keeps the PostgreSQL version.
7. **`npm run dev` resets the database every time.** `dev.db` is deleted and re-created with fresh seed data. Don't keep state across restarts.
8. **Safe DB proxy** (`db.ts`) silently returns `[]`/`null`/`0` on Prisma errors instead of crashing. This can hide bugs — check server logs for `[db] Query failed` warnings.

## Dev login accounts

All use password from `DEV_AUTH_PASSWORD` (default `devpass123`):

| Email                               | Role      |
| ----------------------------------- | --------- |
| `dev.admin@generalportal.local`     | Admin     |
| `dev.president@generalportal.local` | President |
| `dev.officer@generalportal.local`   | Officer   |
| `dev.member@generalportal.local`    | Member    |

## UI conventions

- Use Carbon components (`Grid`, `Row`, `Column`, `Stack`, `Tile`, `DataTable`, `Modal`, `InlineNotification`) — not inline `style={{}}`.
- All admin pages use `PageHeader` for title + actions.
- Multi-client feature flags in `clientConfig.ts` control sidebar nav visibility.
- Time-aware greeting in DashboardPage (`Good morning/afternoon/evening`).
- Logout button in UIShell header global bar.

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
