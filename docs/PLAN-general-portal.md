# PLAN: General Portal — Two-Club Next.js Monolith

## Goal
Build a production-ready Next.js 15 App Router monolith serving two isolated club portals (Developers Club, Student Council) with 17 features, role-based permissions, Auth.js v5, dual PostgreSQL databases, and a professional Carbon/Material UI — entirely from scratch.

## Project Type
**WEB** — Next.js 15 App Router monolith (no mobile framework, no standalone backend)

## Success Criteria
- [ ] Two portals fully isolated (different DB, different users, different data)
- [ ] Auth.js v5 login (credentials dev / Microsoft Entra ID prod) working on both portals
- [ ] All 17 feature pages render with real API data
- [ ] Mobile-first responsive design (320px-4K), no horizontal overflow
- [ ] API responses use uniform `{ success, data }` / `{ success, error }` envelope
- [ ] TanStack Query powers all client data fetching
- [ ] File uploads work across proposals, tasks, events, messages, finance, files
- [ ] Public `/showcase` page accessible without login
- [ ] Build passes (`next build`), no TS errors, no lint errors

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 App Router | Monolith, RSC, API routes, file-based routing |
| Auth | Auth.js v5 (JWT) | Credentials in dev, Microsoft Entra ID in prod; no sign-up |
| ORM | Prisma | Type-safe, migrations, dual DB support |
| Database | PostgreSQL 16 | Two DBs: `general_portal_dev`, `general_portal_stuco` |
| UI Components | shadcn/ui + Tailwind CSS v4 | Carbon/Material aesthetic; flat, no shadows/glow |
| Font | Noto Sans (Google Fonts) | Clean, professional, highly readable |
| Client State | TanStack Query | Server state caching, auto-retry, deduplication |
| File Uploads | local disk (`./uploads`) + Prisma Attachment model | Polymorphic, multi-entity |
| Cron | `node-cron` | Hourly nudge notifications in Next.js process |

---

## File Structure (exact)

```
general-portal/
├── prisma/
│   ├── schema.prisma           # 19 models + Auth.js User/Session/Account tables
│   ├── seed.ts                 # Whitelist emails, demo data per portal
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root: Noto Sans font, QueryClientProvider, favicon switcher
│   │   ├── page.tsx            # Landing page: pick Developers or Student Council
│   │   ├── login/page.tsx      # Login form (email+password), OAuth buttons
│   │   ├── globals.css         # Tailwind v4 + Carbon theme (CSS custom properties)
│   │   ├── showcase/page.tsx   # PUBLIC — combined events + gallery from both portals
│   │   ├── [portal]/
│   │   │   ├── layout.tsx      # Auth guard, sidebar, portal cookie
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── proposals/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   ├── events/page.tsx
│   │   │   ├── messages/page.tsx
│   │   │   ├── finance/page.tsx
│   │   │   ├── volunteers/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── files/page.tsx
│   │   │   ├── meetings/page.tsx
│   │   │   ├── activity/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   └── budget/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── me/route.ts
│   │       ├── dashboard/route.ts
│   │       ├── proposals/route.ts + [id]/
│   │       ├── tasks/route.ts + [id]/
│   │       ├── events/route.ts + [id]/
│   │       ├── messages/route.ts + threads/[id]/
│   │       ├── finance/route.ts + summary,trends,transactions
│   │       ├── volunteers/route.ts + slots,signups,stats
│   │       ├── members/route.ts + [id]/
│   │       ├── meetings/route.ts + [id]/rsvp,rsvps
│   │       ├── notifications/route.ts + [id]/read
│   │       ├── audit/route.ts + export
│   │       ├── kudos/route.ts + leaderboard
│   │       ├── budget/route.ts + [id]/
│   │       ├── admin/users/route.ts
│   │       ├── public/showcase/route.ts
│   │       └── health/route.ts
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, card, input, dialog, etc.)
│   │   └── QueryClientProvider.tsx
│   ├── lib/
│   │   ├── auth.ts             # Auth.js v5 config — JWT strategy, Entra ID + credentials
│   │   ├── db.ts               # Dual PrismaClient factory (portal cookie → DB)
│   │   ├── api-response.ts     # success() / error() envelope helpers
│   │   ├── api-client.ts       # fetchJson<T>() with 15s timeout, 2 retries, 401 redirect
│   │   ├── portal-middleware.ts# Extract portal from cookie, validate
│   │   ├── audit.ts            # writeAuditLog() — log all sensitive actions
│   │   ├── notifications.ts    # createNotification() — inbox + push
│   │   └── permissions.ts      # ROLE_PERMISSIONS matrix (admin/officer/member)
│   └── hooks/                  # TanStack Query hooks per feature
├── public/
│   ├── developers.png          # Favicon for Developers Club
│   └── stuco.png               # Favicon for Student Council
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── .env
└── .env.example
```

---

## Task Breakdown (10 Phases)

### Phase 1: Project Scaffold & Foundation

**T1.1: Initialize Next.js 15 project**
- Agent: `backend-specialist`
- Skills: `typescript`, `nextjs-react-expert`
- Action: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`, install deps (`next@latest`, `react@latest`, `react-dom@latest`, `@prisma/client`, `prisma`, `next-auth@beta`, `@auth/prisma-adapter`, `@tanstack/react-query`, `node-cron`, `sharp`, `zod`, `date-fns`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`)
- → Verify: `npm run build` succeeds with zero errors

**T1.2: Configure TypeScript, Tailwind, globals.css**
- Agent: `frontend-specialist`
- Skills: `tailwind-patterns`, `typescript`
- Action: Write `tailwind.config.ts`, `tsconfig.json` (strict), `src/app/globals.css` with Carbon theme variables (`--color-primary: #0f62fe`, `--color-text: #161616`, `--color-text-secondary: #6f6f6f`, `--color-border: #e0e0e0`, `--color-bg: #ffffff`, `--color-destructive: #da1e28`), Noto Sans import, border-radius 5px everywhere
- → Verify: `npm run dev` shows styled blank page with Noto Sans

**T1.3: Prisma schema (19 models + Auth.js tables)**
- Agent: `database-architect`
- Skills: `database-design`, `prisma`
- Action: Write `prisma/schema.prisma` with models: `User`, `Account`, `Session`, `VerificationToken`, `Workspace`, `Membership`, `Proposal`, `TaskItem`, `SubTask`, `TaskComment`, `EventItem`, `Message`, `MessageThread`, `Transaction`, `VolunteerSlot`, `VolunteerSignup`, `Meeting`, `MeetingRsvp`, `Notification`, `AuditLog`, `Kudos`, `BudgetAllocation`, `BudgetTransaction`, `Attachment` (polymorphic), `ActivityFeed`. All UUID PKs, JSON fields for extensibility. Auth.js adapter models included.
- → Verify: `npx prisma generate` succeeds, `npx prisma db push` succeeds on dev DB

---

### Phase 2: Auth & Core Infrastructure

**T2.1: Auth.js v5 config + JWT**
- Agent: `security-auditor`
- Skills: `jwt`, `authjs`
- Action: Write `src/lib/auth.ts` — Auth.js v5 config with JWT strategy, credentials provider (dev), Microsoft Entra ID provider (prod). `signIn` callback validates email against current portal's user table. `jwt` callback embeds workspace + role + permissions. `auth:unauthorized` event redirects to `/login`.
- → Verify: Login form renders at `/login`, credentials login works, JWT contains portal/role

**T2.2: Dual PrismaClient factory + portal middleware**
- Agent: `backend-specialist`
- Skills: `prisma`, `typescript`
- Action: Write `src/lib/db.ts` — factory that reads portal from cookie (`developers`/`stuco`) and returns the correct PrismaClient. Write `src/lib/portal-middleware.ts` — extract portal from cookie, validate it, inject into request context.
- → Verify: After setting portal cookie, DB queries target the correct database

**T2.3: Seed script with whitelist emails + demo data**
- Agent: `database-architect`
- Skills: `prisma`, `typescript`
- Action: Write `prisma/seed.ts` — create whitelist users (emails from spec), create workspace per portal, create memberships with admin role, create 2 demo tasks + 1 kickoff event per workspace
- → Verify: `npm run db:seed` + `DATABASE_URL="..." npx tsx prisma/seed.ts` for stuco both succeed

**T2.4: API helpers (response envelope, api-client, permissions)**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write `src/lib/api-response.ts` (success/error helpers), `src/lib/api-client.ts` (fetchJson with 15s timeout, 2 retries, 401 redirect), `src/lib/permissions.ts` (ROLE_PERMISSIONS matrix)
- → Verify: Unit tests for each helper pass

**T2.5: Root layout, portal selector, favicon switcher**
- Agent: `frontend-specialist`
- Skills: `nextjs-react-expert`, `frontend-design`
- Action: Write `src/app/layout.tsx` — Noto Sans font, QueryClientProvider, favicon switcher (reads portal cookie). Write `src/app/page.tsx` — portal selector landing (Developers / Student Council cards). Write `src/app/login/page.tsx` — login form + OAuth buttons.
- → Verify: `/` shows portal selector, `/login` shows login form, favicon changes with cookie

---

### Phase 3: Portal Layout & Navigation

**T3.1: Portal layout — auth guard, sidebar, responsive drawer**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tailwind-patterns`
- Action: Write `src/app/[portal]/layout.tsx` — Auth guard (redirect to `/login` if unauthenticated), sidebar navigation (collapses to slide-out drawer on mobile), portal cookie setter, responsive layout (320px-4K). Touch targets >= 48px. Sidebar items: all 16 feature links.
- → Verify: Sidebar renders, mobile drawer works, touch targets pass audit

**T3.2: shadcn/ui component setup**
- Agent: `frontend-specialist`
- Skills: `tailwind-patterns`, `frontend-design`
- Action: Set up shadcn/ui (`npx shadcn@latest init`). Configure for Carbon theme. Add components: Button, Card, Input, Textarea, Select, Dialog, Sheet (for mobile sidebar), DropdownMenu, Table, Badge, Avatar, Tabs, Separator, Skeleton, Toast, Tooltip, Popover, Command (for search).
- → Verify: All components render with Carbon styling (flat, 5px radius, no shadows)

---

### Phase 4: Feature APIs (Backend)

**T4.1: Dashboard + Health APIs**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write `GET /api/health`, `GET /api/me`, `GET /api/dashboard` (aggregated stats per portal)
- → Verify: `curl /api/health` returns 200, `curl /api/me` returns user with JWT

**T4.2: Proposals, Tasks, Events APIs**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write CRUD + approve/reject for proposals, CRUD + subtasks + comments for tasks, CRUD + owners for events. All with attachment support and audit logging.
- → Verify: All endpoints return `{ success, data }`, create/read/update/delete cycle works

**T4.3: Messages, Finance APIs**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write messages (threads, replies, read status), finance (transactions, summary, trends). Attachments on messages and finance transactions.
- → Verify: Thread creation, reply, mark-read cycle works

**T4.4: Volunteers, Members, Meetings APIs**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write volunteer slots + signups + stats, members list + roles, meetings CRUD + RSVP
- → Verify: Signup for slot, RSVP for meeting works end-to-end

**T4.5: Notifications, Audit, Kudos, Budget APIs**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write notifications (list, mark read), audit (paginated log, CSV export), kudos (leaderboard), budget (allocations, approve, spend, reconcile)
- → Verify: All endpoints return correct data, budget approve/spend/reconcile workflow works

**T4.6: Admin Users + Public Showcase APIs**
- Agent: `backend-specialist`
- Skills: `api-patterns`, `typescript`
- Action: Write `admin/users` (admin only — create users, assign roles), `public/showcase` (public — combined events + gallery from both portals)
- → Verify: Admin-only endpoints reject non-admins, showcase works without auth

---

### Phase 5: Feature Pages (Frontend)

**T5.1: Dashboard, Proposals, Tasks pages**
- Agent: `frontend-specialist`
- Skills: `nextjs-react-expert`, `frontend-design`, `tanstack-query`
- Action: Write page components + TanStack Query hooks for dashboard (stats cards, recent activity), proposals (list, create, approve/reject UI), tasks (list, create, subtasks, comments)
- → Verify: Pages load data from APIs, mutations reflect immediately

**T5.2: Events, Messages, Finance pages**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tanstack-query`
- Action: Write events (calendar/list view, create), messages (thread list, reply UI), finance (transactions table, summary chart, trends). Tables become stacked cards on mobile.
- → Verify: All CRUD operations work from UI, mobile view is clean

**T5.3: Volunteers, Members, Meetings pages**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tanstack-query`
- Action: Write volunteers (slots list, signup), members (table, role badges), meetings (list, create, RSVP buttons)
- → Verify: Signup flow works, RSVP toggles correctly

**T5.4: Files, Activity, Search, Accounts pages**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tanstack-query`
- Action: Write files (upload/list/delete), activity (feed), search (full-text), accounts (profile, kudos leaderboard, admin user management)
- → Verify: File upload returns attachment, search returns results, kudos leaderboard shows rankings

**T5.5: Settings, Notifications, Budget pages**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tanstack-query`
- Action: Write settings (workspace config, modules toggle), notifications (list, mark-all-read), budget (allocations list, approve/spend/reconcile workflow)
- → Verify: Settings persist, notifications mark-read works, budget workflow complete

---

### Phase 6: Showcase & Public Pages

**T6.1: Public showcase page**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tanstack-query`
- Action: Write `src/app/showcase/page.tsx` — fetches from `/api/public/showcase` (no auth). Displays combined public events + gallery from both portals. Portal filter tabs.
- → Verify: Page loads without login, events from both portals display

---

### Phase 7: File Upload System

**T7.1: File upload infrastructure + polymorphic Attachment model**
- Agent: `backend-specialist`
- Skills: `typescript`, `prisma`
- Action: Write file upload routes for proposals, tasks, events, messages, finance, files. Use `multer` or native `Request.formData()`. Validate file size (10MB max) and MIME types (images, PDFs, docs). Store in `./uploads` with UUID filenames. Prisma `Attachment` model with `entityType` + `entityId` for polymorphism.
- → Verify: File upload returns 201 with attachment data, download returns file, delete removes from disk + DB

---

### Phase 8: Cron & Notifications

**T8.1: Hourly cron for nudge notifications**
- Agent: `backend-specialist`
- Skills: `typescript`, `node-cron`
- Action: Write cron job using `node-cron` inside Next.js that fires hourly. Checks for pending tasks, upcoming events, unread messages, and creates Notification records for affected users.
- → Verify: At the top of the hour, notifications appear for users with pending items

---

### Phase 9: Mobile Optimization & Polish

**T9.1: Mobile responsiveness audit & fixes**
- Agent: `frontend-specialist`
- Skills: `frontend-design`, `tailwind-patterns`
- Action: Audit all pages for: touch targets >= 48px, no horizontal overflow, forms single-column on mobile, tables → stacked cards on < 768px, sidebar → slide-out drawer on < 768px, font sizes readable (base 16px). Fix all issues.
- → Verify: All pages pass at 375px viewport in Chrome DevTools, no overflow

---

### Phase 10: Verification (Phase X)

**X.1: Build & lint check**
- Action: `npm run build` — fix any TS errors, lint errors
- → Verify: `next build` exits with 0

**X.2: Security scan**
- Action: Run `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- → Verify: No critical vulnerabilities

**X.3: UX audit**
- Action: Run `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- → Verify: All UX psychology laws respected (Fitts, Hick, Miller, etc.)

**X.4: Manual E2E smoke test**
- Action: Start dev server, test: login flow, portal switch, create task, upload file, check showcase, verify mobile layout
- → Verify: All 6 smoke test scenarios pass

**X.5: Final checklist**
- [ ] No purple hex codes
- [ ] No standard template layouts
- [ ] Socratic Gate respected (spec was clear — no questions needed)
- [ ] All `PLAN-*.md` tasks marked `[x]` or completed

---

## Critical Dependencies (Hard Blockers)

| Task | Blocks | Reason |
|------|--------|--------|
| T1.1 (scaffold) | Everything | No project to work in |
| T1.3 (schema) | T2.1-T2.3, T4.x, T7.1 | No DB models |
| T2.1 (auth) | T3.1, T4.x, T5.x | No auth without config |
| T2.2 (dual DB) | T4.x, T5.x | No data access without DB factory |
| T3.1 (portal layout) | T5.x | No page shell without layout |
| T4.x (APIs) | T5.x | No data for pages without APIs |
| T5.1 must wait for T4.1-T4.2 | T5.2 | Sequential feature delivery |

---

## ⚠️ Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dual DB complexity | `db.ts` factory pattern isolates complexity; one PrismaClient per DB |
| JWT token size (portal + role + permissions) | Keep JWT payload lean; store only IDs, not full objects |
| File upload size/security | 10MB cap, MIME validation, UUID filenames, no direct path exposure |
| Mobile responsiveness gap | Build mobile-first from start; stacked card tables, drawer nav |
| Auth.js v5 + custom credentials + Entra ID | Follow Auth.js v5 docs; credentials for dev only, Entra for prod |
| 17 features = scope creep | Keep each page minimal (list + create + detail); add polish in pass 2 |

---

## Agent Assignment Summary

| Phase | Agent | Focus |
|-------|-------|-------|
| 1 | `backend-specialist` + `database-architect` + `frontend-specialist` | Scaffold, schema, styling |
| 2 | `security-auditor` + `backend-specialist` + `database-architect` + `frontend-specialist` | Auth, DB factory, seed, helpers, root layout |
| 3 | `frontend-specialist` | Portal layout, shadcn/ui |
| 4 | `backend-specialist` | All 17 feature APIs |
| 5 | `frontend-specialist` | All 16 feature pages |
| 6 | `frontend-specialist` | Showcase page |
| 7 | `backend-specialist` | File upload system |
| 8 | `backend-specialist` | Cron + notifications |
| 9 | `frontend-specialist` | Mobile polish |
| 10 | Self | Build, security, UX audit, smoke test |

---

## Done When

- [ ] Plan file written and verified
- [ ] All 10 phases complete
- [ ] Build passes with zero errors
- [ ] Security scan passed
- [ ] UX audit passed
- [ ] 6 smoke test scenarios pass
- [ ] Phase X completion marker in this file
