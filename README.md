# General Portal

A dual-purpose club management dashboard for **Developers' Club** and **Student Council** with a public showcase and a role-based admin dashboard.

**Stack:** Hono + Prisma + React 18 + Vite + TypeScript + IBM Carbon Design System  
**Database:** SQLite (dev) / PostgreSQL (prod)  
**Auth:** @hono/auth-js (JWT) with dev credentials + Microsoft OAuth2  
**Real-time:** WebSocket with presence, live notifications, activity feed

---

## Quick Start

```bash
npm install
npm run dev
```

Opens `http://localhost:5173`. Login with `dev.admin@generalportal.local` / `devpass123`.

### Dev Accounts

| Email                               | Role      | Password     |
| ----------------------------------- | --------- | ------------ |
| `dev.admin@generalportal.local`     | Admin     | `devpass123` |
| `dev.president@generalportal.local` | President | `devpass123` |
| `dev.officer@generalportal.local`   | Officer   | `devpass123` |
| `dev.member@generalportal.local`    | Member    | `devpass123` |

Custom accounts can be created via **Admin > Accounts** with any username and password.

---

## Architecture

```
root package.json  (workspaces: ["frontend", "backend"])
├── frontend/   Vite + React 18 + Carbon DS  → port 5173
├── backend/    Hono + Prisma + @hono/auth-js → port 3001
└── node_modules/  (hoisted)

Vite proxy: /api/* → localhost:3001
WebSocket:  ws://localhost:3001/ws
```

### Database

| Mode        | Database   | File                                        |
| ----------- | ---------- | ------------------------------------------- |
| Development | SQLite     | `backend/prisma/dev.db` (or `dev-stuco.db`) |
| Production  | PostgreSQL | via `schema.prod.prisma`                    |

Database persists across restarts. Custom-created users survive `npm run dev`.

### Multi-Client

`VITE_CLIENT_NAME=developers|stuco` controls branding, favicon, feature flags, and separate database file.

---

## Key Features

### Admin Dashboard (14 pages)

| Page           | Features                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**  | Contextual greeting (time-aware), 5-column metrics, attention items, tasks, events timeline, activity feed, top contributors widget, motivational quotes |
| **Tasks**      | Kanban board with drag-and-drop (`@dnd-kit`), list view, detail drawer with subtasks/comments/attachments, DataToolbar search+filter                     |
| **Proposals**  | Multi-step approval workflow (Member → Officer → President → Approved), approval history timeline, detail panel with approve/reject                      |
| **Events**     | Upcoming cards with progress bars, QR attendance check-in, detail tabs, budget tracking                                                                  |
| **Volunteers** | Stats summary, capacity bars, hours-by-member, signups, hours from events                                                                                |
| **Finance**    | 4 summary cards with trends, budget lifecycle (request→approve→spend→reconcile), color-coded amounts, chart                                              |
| **Messages**   | 3-column layout (threads, conversation, context panel), chat bubbles, date dividers, markdown support, emoji picker                                      |
| **Files**      | Type-aware icons, drag-drop upload, image preview, OneDrive tab                                                                                          |
| **Members**    | Role management, pagination, CSV import, member search                                                                                                   |
| **Meetings**   | Create with agenda, RSVP system, minutes editor, action item extraction                                                                                  |
| **Activity**   | Charts (Carbon-native), progress bars, live activity feed, WebSocket updates                                                                             |
| **Search**     | Debounced search, category filters, keyboard navigation, type icons                                                                                      |
| **Settings**   | Teams webhook URL, term archive/management, module toggles, logo upload                                                                                  |
| **Accounts**   | Your profile, XP/level/streak, leaderboard, kudos, admin user creation                                                                                   |

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
npm run dev          # Start both servers
npm run stop         # Kill ports 3001,5173
npm run build        # TypeScript build for backend + frontend
npm run start        # Production build + serve

npm run test -w backend    # 41 tests
npm run test -w frontend   # 68 tests (109 total)

npm run format       # Prettier
npx eslint "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"
```

---

## Tests (109 total)

| Suite        | Tests | What's covered                                                                                                                                                                                                                                                                      |
| ------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | 41    | All 15 route modules (health, auth, dashboard, tasks, proposals, events, volunteers, finance, messages, files, members, activity, search, settings, public) + budget, meetings, archive, notifications, gamification + rate-limit middleware + WebSocket lib + env + error handling |
| **Frontend** | 68    | All components (Card, PageHeader, StateViews, ErrorBoundary, PageTransition), pages (LoginPage, PublicHome, DashboardPage, AccountsPage, AdminUserManager, MeetingsPage), hooks (useWebSocket, useNotifications), API (httpClient, workspaceApi), config (clientConfig)             |

---

## API Endpoints

| Area              | Endpoints                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- |
| **Auth**          | `GET /api/auth/session`, `GET /api/me`                                                                                                                              |
| **Dashboard**     | `GET /api/dashboard`                                                                                                                                                |
| **CRUD**          | `GET/POST /api/tasks`, `/api/proposals`, `/api/events`, `/api/volunteers/slots`, `/api/finance/transactions`, `/api/messages/threads`, `/api/files`, `/api/members` |
| **Workflow**      | `POST /api/proposals/:id/approve                                                                                                                                    | reject`, `GET /api/proposals/:id/approval-history` |
| **Budget**        | `GET/POST /api/budget`, `PATCH /api/budget/:id/approve                                                                                                              | spend                                              | reconcile` |
| **Meetings**      | `GET/POST /api/meetings`, `POST /api/meetings/:id/rsvp`                                                                                                             |
| **Notifications** | `GET /api/notifications`, `PATCH /api/notifications/:id/read`                                                                                                       |
| **Gamification**  | `POST /api/gamification/check-streak`, `GET /api/gamification/leaderboard`                                                                                          |
| **Audit**         | `GET /api/audit`, `GET /api/audit/export`                                                                                                                           |
| **Archive**       | `POST /api/archive/end-term`, `GET /api/archive`                                                                                                                    |
| **Public API**    | `GET /api/v1/tasks`, `/api/v1/events`, `/api/v1/proposals` (API key required)                                                                                       |
| **Presence**      | `GET /api/presence`                                                                                                                                                 |

---

## Verification Gates

1. `npm run build -w backend` — 0 TS errors
2. `npm run build -w frontend` — 0 TS errors
3. `npx eslint "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"` — 0 errors
4. `npm run test -w backend` — 41/41 pass
5. `npm run test -w frontend` — 68/68 pass
6. Quick smoke: `npm run dev`, hit `/api/health` → 200
