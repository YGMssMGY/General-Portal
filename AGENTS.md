# AGENTS.md — General Portal

## Quick start

```powershell
# Prerequisites: PostgreSQL 16+ with two databases
#   createdb general_portal_dev
#   createdb general_portal_stuco

# Everything from root (npm workspaces)
cp .env.example .env    # then edit credentials
npm install                   # hoists deps for frontend/ + backend/
npm run dev                   # kills ports 3000,30001 → migrations + seed → Hono (:30001) + Vite (:3000)
npm run stop                  # kills ports 3000,30001
npm run build                 # tsc (backend) + tsc -b && vite build (frontend)
npm run test -w backend       # 101 vitest tests (22 files)
npm run test -w frontend      # 87 vitest tests (21 files)
npm run format                # prettier --write
npm run lint                  # eslint backend + frontend
```

## Architecture

```
root package.json  (workspaces: ["frontend", "backend"])
├── frontend/   Vite + React 18 + Carbon Design System  → port 3000
├── backend/    Hono + Prisma + @hono/auth-js           → port 30001
└── node_modules/  (hoisted)

Vite proxy: /api/* → localhost:30001
```

- **No Java, no Spring Boot, no Docker.** Two PostgreSQL databases: `general_portal_dev` (developers) and `general_portal_stuco` (stuco). Portal selection via cookie → `portalMiddleware` attaches the correct `PrismaClient` per request.
- **Auth:** `@hono/auth-js` with JWT strategy. Microsoft OAuth2 in production. Credentials provider active in development for local testing.
- **Database persists across dev restarts.** `dev-setup.mjs` runs pending migrations on existing DB; does NOT delete it.
- **Multi-client:** `VITE_CLIENT_NAME=developers|stuco` controls brand, feature flags, favicon, and which PostgreSQL database is used.
- **State management:** TanStack Query for server state (portal-scoped query keys), Zustand for UI/client state.

## Key files

| Path                                   | Role                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `backend/src/lib/app.ts`               | App factory: creates Hono app with middleware, routes, WebSocket, cron     |
| `backend/src/index.ts`                 | Dev entry — starts app on `BACKEND_PORT` (30001)                           |
| `backend/src/prod.ts`                  | Production entry — same + serves frontend `dist/` + SPA fallback on :3000  |
| `backend/src/lib/env.ts`               | Typed env access (reads from `process.env`, no dotenv)                     |
| `backend/src/lib/db.ts`                | Dual PrismaClient factory — cached in `globalThis` Map per portal          |
| `backend/src/lib/portal-middleware.ts` | Reads `portal` cookie → sets `c.get("portal")` + `c.get("db")`             |
| `backend/src/lib/auth-config.ts`       | Auth.js providers + callbacks (Microsoft OAuth2 + dev credentials)         |
| `backend/src/lib/route-factory.ts`     | `resourceRoute()` — generic CRUD factory with Zod, audit log, soft delete  |
| `backend/src/lib/api-response.ts`      | Standard response shapes: `{ success, data, meta }` / `{ success, error }` |
| `backend/src/lib/permissions.ts`       | Role-based permission matrix (admin/president/officer/member)              |
| `backend/src/lib/audit.ts`             | Tamper-evident audit log for financial + approval actions                  |
| `backend/src/lib/websocket.ts`         | WebSocket setup + presence tracking                                        |
| `backend/src/routes/*.ts`              | 22 route modules + admin.ts (admin-only user creation)                     |
| `backend/prisma/schema.prisma`         | PostgreSQL schema (19 models + Account/Session/VerificationToken)          |
| `backend/scripts/dev-setup.mjs`        | Dev DB setup — runs migrations, seeds both databases                       |
| `backend/scripts/manage-accounts.mjs`  | CLI tool: `create-admin`, `create-user`, `list`, `delete`                  |
| `frontend/src/config/clientConfig.ts`  | Multi-client branding config                                               |
| `frontend/src/hooks/useClientTheme.ts` | Sets favicon, title, CSS vars                                              |
| `frontend/src/api/httpClient.ts`       | `fetchJson()` with retry (2x on 5xx/network err)                           |

## Critical gotchas

1. **`DATABASE_URL_DEVELOPERS` / `DATABASE_URL_STUCO` must be set before PrismaClient is created.** `.env` is loaded in `env.ts` before any route imports.
2. **`env-url-basepath-redundant` warning** — safe to ignore. Caused by explicit `basePath: "/api/auth"` plus `AUTH_URL` env var.
3. **Module execution order matters.** The `DATABASE_URL_*` env vars must be set before any PrismaClient is instantiated.
4. **Dual PrismaClient instances.** `getDb(portal)` returns a cached client keyed by portal name. Never create `new PrismaClient()` directly — always use `getDb()` or `getDbFromContext(c)`.
5. **`portalMiddleware` runs on every request.** It reads the `portal` cookie. Defaults to `"developers"` if missing or invalid.
6. **Credentials sign-in requires JWT strategy.** `session: { strategy: "database" }` crashes with `UnsupportedStrategy`.
7. **Custom passwords stored in DB.** Admin-created users get their own password. Usernames don't require `@` — "jeff" works.
8. **No safe DB proxy.** `db` is just `prisma` directly. Errors throw and must be caught explicitly.
9. **PrismaClient uses globalThis Map.** Survives `tsx watch` hot-reloads without creating duplicate connections.
10. **Production mode:** Set `NODE_ENV=production` to serve frontend from the backend on :3000. Only Microsoft OAuth2 is available; dev credentials are disabled.

## Portal cookie flow

```
Browser → cookie "portal=developers|stuco"
  → portalMiddleware reads cookie
    → getDb(portal) returns cached PrismaClient
      → db attached to request context as c.get("db")
        → route handlers use getDbFromContext(c)
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
npm run test -w backend    # 101 tests (22 files)
npm run test -w frontend   # 87 tests (21 files)
```

- Backend tests use Hono's `app.request()` (no real DB needed for unit tests).
- Frontend tests use vitest + jsdom + @testing-library/react.
- No E2E tests (no Playwright config).

## Verification gates (after every change)

1. `npm run build -w backend` — 0 TS errors
2. `npm run build -w frontend` — 0 TS errors
3. `npm run lint` — 0 errors
4. `npm run test -w backend` — all pass
5. `npm run test -w frontend` — all pass
6. Quick smoke: `npm run dev`, hit `/api/health` → 200
