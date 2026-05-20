# General Portal

A dual-portal club management dashboard for **Developers' Club** and **Student Council** with a public showcase and a role-based admin dashboard. Portal selection is cookie-driven — each portal uses its own isolated PostgreSQL database.

**Stack:** Hono + Prisma + PostgreSQL + React 18 + Vite + TypeScript + IBM Carbon Design System + TanStack Query + Zustand + Framer Motion  
**Auth:** @hono/auth-js (JWT) with Microsoft OAuth2 (production) + credentials provider (dev)  
**Real-time:** WebSocket with presence, live notifications, activity feed

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ running locally
- Two databases (one per portal):

```bash
createdb general_portal_dev
createdb general_portal_stuco
```

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env to match your local PostgreSQL credentials

# 3. Start dev servers (runs migrations + seed automatically)
npm run dev
```

Opens `http://localhost:3000`. Login via Microsoft OAuth2 (if configured) or credentials provider in dev mode.

---

## Architecture

```
root package.json  (workspaces: ["frontend", "backend"])
├── frontend/   Vite + React 18 + Carbon DS     → port 3000
├── backend/    Hono + Prisma + @hono/auth-js   → port 30001
└── node_modules/  (hoisted)

Vite proxy: /api/* → localhost:30001
WebSocket:  ws://localhost:30001/ws
```

### Database

| Portal          | Database               | Connection Env Var        |
| --------------- | ---------------------- | ------------------------- |
| Developers Club | `general_portal_dev`   | `DATABASE_URL_DEVELOPERS` |
| Student Council | `general_portal_stuco` | `DATABASE_URL_STUCO`      |

Both databases use PostgreSQL. Portal selection is determined by a `portal` cookie set on the frontend. A request-scoped `portalMiddleware` reads this cookie and attaches the correct `PrismaClient` instance to the request context via `c.set("db", getDb(portal))`.

- Dual `PrismaClient` instances are cached in a `globalThis` Map, surviving hot-reload.
- Each portal has its own schema with 19+ models, seeded independently.
- Database persists across restarts — custom data survives `npm run dev`.

### State Management

- **Server state:** TanStack Query with query keys scoped by portal + workspace
- **Client state:** Zustand stores for UI state, theme, portal selection
- **Auth state:** @hono/auth-js React bindings via `useSession()`

### Multi-Client

`VITE_CLIENT_NAME=developers|stuco` controls branding, favicon, feature flags, and API origin. The frontend reads this at build time to select the active client config and sets the `portal` cookie for backend routing.

### Route Factory Pattern

Common CRUD endpoints are generated via a `resourceRoute(config)` factory in `backend/src/lib/route-factory.ts`. It provides:

| Method   | Path           | Description                          |
| -------- | -------------- | ------------------------------------ |
| `GET`    | `/`            | Paginated list with search + filter  |
| `GET`    | `/:id`         | Single item                          |
| `POST`   | `/`            | Create (Zod-validated, sanitized)    |
| `PATCH`  | `/:id`         | Update                               |
| `DELETE` | `/:id`         | Soft or hard delete                  |
| `POST`   | `/:id/restore` | Restore (only if `softDelete: true`) |

Features: Zod validation, XSS sanitization, audit logging, soft delete with restore, paginated responses with `{ success, data, meta }` format.

---

## Key Features

### Admin Dashboard (14 pages)

| Page | Features |
| --- | --- |
| **Dashboard** | Contextual greeting (time-aware), 5-column metrics, attention items, tasks, events timeline, activity feed, top contributors widget, motivational quotes |
| **Tasks** | Kanban board with drag-and-drop (`@dnd-kit`), list view, detail drawer with subtasks/comments/attachments, DataToolbar search+filter |
| **Proposals** | Multi-step approval workflow (Member → Officer → President → Approved), approval history timeline, detail panel with approve/reject |
| **Events** | Upcoming cards with progress bars, QR attendance check-in, detail tabs, budget tracking |
| **Volunteers** | Stats summary, capacity bars, hours-by-member, signups, hours from events |
| **Finance** | 4 summary cards with trends, budget lifecycle (request→approve→spend→reconcile), color-coded amounts, chart |
| **Messages** | 3-column layout (threads, conversation, context panel), chat bubbles, date dividers, markdown support, emoji picker |
| **Files** | Type-aware icons, drag-drop upload, image preview, OneDrive tab |
| **Members** | Role management, pagination, CSV import, member search |
| **Meetings** | Create with agenda, RSVP system, minutes editor, action item extraction |
| **Activity** | Charts (Carbon-native), progress bars, live activity feed, WebSocket updates |
| **Search** | Debounced search, category filters, keyboard navigation, type icons |
| **Settings** | Teams webhook URL, term archive/management, module toggles, logo upload |
| **Accounts** | Your profile, XP/level/streak, leaderboard, kudos, admin user creation |

### Production-Grade Infrastructure

| Feature              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| **WebSocket**        | Real-time updates, live presence indicators, instant notifications   |
| **Notifications**    | Bell icon with unread badge, Teams webhook integration, smart digest |
| **Audit Log**        | Tamper-evident log for financial + approval actions, CSV export      |
| **Rate Limiting**    | 100 req/15s API, 10 req/15s auth with `Retry-After` headers          |
| **Security Headers** | Helmet middleware, CORS restricted, CSP enabled                      |
| **Public API**       | `/api/v1/*` with API key auth, paginated responses, HMAC webhooks    |
| **Gamification**     | XP, levels, streaks, kudos, leaderboard, engagement scoring          |
| **Auto-Pilot**       | Hourly nudges for overdue tasks, pending proposals, low RSVPs        |
| **Succession**       | One-click term handoff with data archive + roll-over                 |

---

## Commands

```bash
npm run dev          # Start both servers (backend :30001 + frontend :3000)
npm run stop         # Kill ports 3000,30001
npm run build        # TypeScript build for backend + frontend
npm run start        # Production build + serve on :3000
npm run format       # Prettier
npm run lint         # ESLint on backend + frontend
npm run typecheck    # TypeScript check without emitting

npm run test -w backend    # 101 tests (22 test files)
npm run test -w frontend   # 87 tests (21 test files)
npm run test               # Both suites

npm run db:migrate   # Run pending migrations + seed
npm run db:seed      # Seed data
npm run db:reset     # Reset database
```

---

## Tests (188 total)

| Suite | Tests | Files | What's covered |
| --- | --- | --- | --- |
| **Backend** | 101 | 22 | All route modules (health, auth, dashboard, tasks, proposals, events, volunteers, finance, messages, files, members, activity, search, settings, public, docs, admin) + budget, meetings, archive, notifications, gamification + rate-limit middleware + WebSocket + env + error handling |
| **Frontend** | 87 | 21 | Components (Card, PageHeader, StateViews, ErrorBoundary, PageTransition), pages (LoginPage, PublicHome, DashboardPage, AccountsPage, MeetingsPage), hooks (useWebSocket, useNotifications), API (httpClient, workspaceApi), config (clientConfig) |

---

## API Endpoints

| Area | Endpoints |
| --- | --- | --- | --- |
| **Auth** | `GET /api/auth/session`, `GET /api/me` |
| **Dashboard** | `GET /api/dashboard` |
| **Docs** | `GET /api/docs` |
| **CRUD** | `GET/POST /api/tasks`, `/api/proposals`, `/api/events`, `/api/volunteers/slots`, `/api/finance/transactions`, `/api/messages/threads`, `/api/files`, `/api/members` |
| **Workflow** | `POST /api/proposals/:id/approve | reject`, `GET /api/proposals/:id/approval-history` |
| **Budget** | `GET/POST /api/budget`, `PATCH /api/budget/:id/approve | spend | reconcile` |
| **Meetings** | `GET/POST /api/meetings`, `POST /api/meetings/:id/rsvp` |
| **Notifications** | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |
| **Gamification** | `POST /api/gamification/check-streak`, `GET /api/gamification/leaderboard` |
| **Kudos** | `POST /api/kudos` |
| **Audit** | `GET /api/audit`, `GET /api/audit/export` |
| **Archive** | `POST /api/archive/end-term`, `GET /api/archive` |
| **Public API** | `GET /api/v1/tasks`, `/api/v1/events`, `/api/v1/proposals` (API key required) |
| **Presence** | `GET /api/presence` |

---

## Verification Gates

1. `npm run build -w backend` — 0 TS errors
2. `npm run build -w frontend` — 0 TS errors
3. `npx eslint "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"` — 0 errors
4. `npm run test -w backend` — 101/101 pass
5. `npm run test -w frontend` — 87/87 pass
6. Quick smoke: `npm run dev`, hit `/api/health` → 200
