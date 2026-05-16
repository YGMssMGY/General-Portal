# General Portal

A dual-purpose club management dashboard for **Developers' Club** and **Student Council** with a public showcase and a role-based admin dashboard.

**Stack:** Hono + Prisma + React 18 + Vite + TypeScript + IBM Carbon Design System  
**Database:** SQLite (dev) / PostgreSQL (prod)  
**Auth:** @hono/auth-js (JWT) with dev credentials + OAuth2 (GitHub, Google, Microsoft)

---

## Quick Start

```bash
npm install
npm run dev
```

Opens `http://localhost:5173`. Login with `dev.admin@generalportal.local` / `devpass123`.

### Dev Accounts

| Email                               | Role      |
| ----------------------------------- | --------- |
| `dev.admin@generalportal.local`     | Admin     |
| `dev.president@generalportal.local` | President |
| `dev.officer@generalportal.local`   | Officer   |
| `dev.member@generalportal.local`    | Member    |

All use password from `DEV_AUTH_PASSWORD` (default `devpass123`).

---

## Architecture

```
root package.json  (workspaces: ["frontend", "backend"])
├── frontend/   Vite + React 18 + Carbon Design System  → port 5173
├── backend/    Hono + Prisma + @hono/auth-js          → port 3001
└── node_modules/  (hoisted)

Vite proxy: /api/* → localhost:3001
```

### Database

| Mode        | Database   | File                                                  |
| ----------- | ---------- | ----------------------------------------------------- |
| Development | SQLite     | `backend/prisma/dev.db` (or `dev-stuco.db` for stuco) |
| Production  | PostgreSQL | via `schema.prod.prisma`                              |

The dev database resets on every `npm run dev` — fresh migration + seed data.

### Multi-Client

`VITE_CLIENT_NAME=developers|stuco` controls:

- Brand name and logo initials
- Favicon (`frontend/public/developers.png` or `stuco.png`)
- Feature flag visibility in sidebar
- Separate database file (`dev.db` vs `dev-stuco.db`)

---

## Commands

```bash
npm run dev          # Start both servers (kills ports 3001,5173 first)
npm run stop         # Kill ports 3001,5173
npm run build        # TypeScript build for backend + frontend
npm run format       # Prettier
npx eslint "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"

npm run test -w backend    # 10 tests (Hono app.request)
npm run test -w frontend   # 20 tests (vitest + @testing-library/react)
```

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # SQLite schema (dev)
│   ├── schema.prod.prisma  # PostgreSQL schema (swap for prod)
│   └── seed.ts             # Seed data (5 users, sample tasks/events/etc)
├── src/
│   ├── index.ts            # Server entry — sets DATABASE_URL, dynamic imports
│   ├── lib/
│   │   ├── env.ts          # Typed env access
│   │   ├── db.ts           # PrismaClient with safe error proxy
│   │   └── auth-config.ts  # Auth.js providers + callbacks
│   ├── middleware/
│   │   └── auth.ts         # requireWorkspace middleware
│   └── routes/             # 15 route modules
│       ├── auth.ts, dashboard.ts, tasks.ts, proposals.ts
│       ├── events.ts, volunteers.ts, finance.ts, messages.ts
│       ├── files.ts, members.ts, activity.ts, search.ts
│       ├── settings.ts, public.ts, docs.ts
│       └── health.ts
└── scripts/dev-setup.mjs   # DB reset + seed on dev start

frontend/
├── src/
│   ├── api/httpClient.ts       # fetchJson with retry (2x on 5xx)
│   ├── config/clientConfig.ts  # Multi-client branding config
│   ├── context/                # Auth, Theme, Workspace contexts
│   ├── components/             # UIShell, Card, PageHeader, DataTable, etc.
│   ├── features/               # 12 admin pages + 4 public pages
│   └── routes/                 # AppRoutes, LoginPage, ProtectedRoute
└── public/
    ├── developers.png          # Favicon for Developers' Club
    └── stuco.png               # Favicon for Student Council
```

---

## API Endpoints

All endpoints under `/api/*` are proxied by Vite to the Hono backend:

| Method       | Path                        | Description                                                     |
| ------------ | --------------------------- | --------------------------------------------------------------- |
| GET          | `/api/health`               | Health check                                                    |
| GET          | `/api/auth/session`         | Current session                                                 |
| GET          | `/api/me`                   | Current user profile                                            |
| GET          | `/api/dashboard`            | Dashboard metrics + attention items + tasks + events + activity |
| GET/POST     | `/api/tasks`                | List / create tasks                                             |
| PATCH/DELETE | `/api/tasks/:id`            | Update / delete task                                            |
| GET/POST     | `/api/proposals`            | List / create proposals                                         |
| GET/POST     | `/api/events`               | List / create events                                            |
| GET/POST     | `/api/volunteers/slots`     | List / create volunteer slots                                   |
| GET/POST     | `/api/finance/transactions` | List / create transactions                                      |
| GET/POST     | `/api/messages/threads`     | List / create message threads                                   |
| GET/POST     | `/api/files`                | List / upload files                                             |
| GET/PATCH    | `/api/members`              | List / update members                                           |
| GET          | `/api/activity`             | Activity feed                                                   |
| GET          | `/api/search`               | Cross-resource search                                           |
| GET/PATCH    | `/api/settings`             | Workspace settings                                              |
| GET          | `/api/events/public`        | Public events (no auth)                                         |
| GET          | `/api/photos`               | Photos (no auth)                                                |

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Key variables:

- `VITE_CLIENT_NAME=developers|stuco` — Client branding
- `DATABASE_URL` — SQLite (dev) or PostgreSQL (prod)
- `DEV_AUTH_PASSWORD` — Dev credentials login
- `GITHUB_ID` / `GOOGLE_ID` / `MICROSOFT_CLIENT_ID` — OAuth2 providers (optional)
