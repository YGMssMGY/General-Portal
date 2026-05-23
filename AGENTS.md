# General Portal — Agent Guide

> This file is for AI coding agents. Read it before modifying code.

## Project Overview

General Portal is a multi-tenant web application built for school clubs/organizations. It currently serves two workspaces (portals):

- **Developers Club** (`developers`)
- **Student Council** (`stuco`)

Each portal is isolated in its own PostgreSQL database. Users sign in via Microsoft Entra ID (school Microsoft accounts) and must be a member of the workspace to access it.

The app provides modules for: proposals, tasks, events, messages, finance, volunteers, members, files, meetings, activity feed, notifications, budget, kudos, and audit logs.

## Technology Stack

- **Framework**: Next.js 15.3.1 (App Router, React Server Components by default)
- **React**: 19.1.0
- **Language**: TypeScript 5.8.3 (strict mode enabled)
- **Styling**: Tailwind CSS 4.1.5 with PostCSS, `@theme` CSS variables
- **Database**: PostgreSQL + Prisma 6.6.0 (`@prisma/client`)
- **Auth**: NextAuth v5 (`next-auth@5.0.0-beta.25`) with Microsoft Entra ID OAuth, JWT strategy
- **State / Data Fetching**: TanStack React Query v5
- **UI Components**: Radix UI primitives + shadcn/ui (installed in `src/components/ui`)
- **Icons**: lucide-react
- **Dates**: date-fns
- **Validation**: zod
- **Cron**: node-cron (hourly nudge notifications)
- **Image Optimization**: sharp

## Project Structure

```
src/
  app/
    layout.tsx          # Root layout (fonts, Providers, FaviconSwitcher)
    page.tsx            # Landing page to choose portal
    login/page.tsx      # Microsoft sign-in page
    showcase/page.tsx   # Public showcase page
    [portal]/           # Portal-scoped pages (dashboard, tasks, events, etc.)
      layout.tsx        # Shared portal layout: sidebar, header, auth guards
      dashboard/page.tsx
      tasks/page.tsx
      ... (one folder per module)
    api/                # REST API routes (App Router route handlers)
      auth/[...nextauth]/route.ts
      tasks/route.ts
      tasks/[id]/route.ts
      ... (mirror the feature set)
  components/
    ui/                 # shadcn/ui components (button, card, dialog, etc.)
    QueryClientProvider.tsx
    SessionProvider.tsx
    FaviconSwitcher.tsx
  lib/
    auth.ts             # NextAuth configuration (MicrosoftEntraID provider)
    db.ts               # Prisma client factory per portal; global cache
    permissions.ts      # Role-based permission definitions
    portal-middleware.ts # Portal cookie / URL helpers
    api-client.ts       # `fetchJson` helper with retries, timeout, auth redirect
    api-response.ts     # `success()` / `error()` response wrappers
    audit.ts            # `writeAuditLog` helper
    cron.ts             # Hourly cron job for pending-task & upcoming-event nudges
    notifications.ts    # `createNotification` helper
    utils.ts            # `cn()` Tailwind class merge utility
prisma/
  schema.prisma         # Full Prisma schema (users, workspaces, tasks, events, ...)
  seed.ts               # Seeds developers & stuco workspaces with demo data
```

## Build, Dev, and Database Commands

All commands are run via the package manager (Bun is used in this project; `package-lock.json` also exists).

```bash
# Development (Turbopack)
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Lint
bun run lint

# Type check (no emit)
bun run typecheck

# Database
bun run db:generate   # Generate Prisma client
bun run db:push       # Push schema to database
bun run db:seed       # Run seed script (tsx prisma/seed.ts)
bun run db:studio     # Open Prisma Studio
```

## Environment Variables

See `.env.example` for the full set:

```env
PORT=3000
DATABASE_URL_DEVELOPERS=postgresql://...
DATABASE_URL_STUCO=postgresql://...
AUTH_SECRET=<generated>
AUTH_URL=http://localhost:3000
MICROSOFT_TENANT_ID=common
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
API_KEY=
RATE_LIMIT_MAX=100
UPLOADS_DIR=./uploads
```

## Multi-Tenant Architecture

The app is multi-tenant via **portal cookie** (`portal=developers|stuco`), not via subdomain or path-only isolation.

- `src/lib/db.ts` exports `getDbForPortal(portal)` which returns a cached `PrismaClient` connected to the correct database URL (`DATABASE_URL_DEVELOPERS` or `DATABASE_URL_STUCO`).
- API routes read the portal from the request cookie header via `getDbFromCookie(request)`.
- Client components read the portal from `document.cookie` using a small `getPortal()` helper duplicated in several pages.
- The `[portal]` dynamic segment in URLs is validated; if the cookie is missing or invalid, the user is redirected.

## Authentication & Authorization

- **Provider**: Microsoft Entra ID (OAuth 2.0).
- **Session**: JWT strategy.
- **Sign-in guard**: `signIn` callback checks that the user's email exists in a `Membership` record for the current portal cookie. If not, sign-in is denied (`AccessDenied`).
- **Role permissions**: Defined in `src/lib/permissions.ts`. Roles are `admin`, `officer`, `member`.
  - `admin`: all permissions
  - `officer`: all except `manage_users`, `manage_settings`, `view_audit`
  - `member`: limited set (can create proposals, tasks, events, messages, volunteer, view activity, files, members, send kudos, manage notifications)
- Session is extended with `id`, `portal`, `role`, and `permissions`.

## API Patterns

### Route Handlers
All API routes are standard Next.js App Router route handlers (`export async function GET(...)`, etc.).

Common pattern in every route:
1. Call `await auth()` to get the session; return 401 if missing.
2. Call `getDbFromCookie(request)` to get the correct Prisma client.
3. Resolve the workspace from `session.user.portal` (slug) → `workspace.id`.
4. Perform Prisma query.
5. Return `success(data)` or `error(message, status)`.

### Response Shape
All JSON responses are wrapped:

```ts
// success
{ success: true, data: T }

// error
{ success: false, error: string }
```

Use `src/lib/api-response.ts` (`success` / `error`) in route handlers.

### Client Fetching
Use `fetchJson<T>(url, options?)` from `src/lib/api-client.ts`. It handles:
- 15-second timeout
- 2 retries with exponential backoff for 429 / 5xx
- Automatic redirect to `/login` on 401
- Unwrapping the `{ success: true, data }` envelope

### React Query
Client pages use `@tanstack/react-query` with this default config (see `QueryClientProvider.tsx`):
- `staleTime: 30_000`
- `retry: 2`
- `refetchOnWindowFocus: false`

Invalidation pattern: `queryClient.invalidateQueries({ queryKey: [portal, "feature"] })`.

## Styling Conventions

- **Tailwind CSS v4** is used via `@import "tailwindcss"` in `src/app/globals.css`.
- CSS custom properties (variables) are the primary theming mechanism. They are defined in `@theme` and `:root` blocks in `globals.css`.
- **Most UI in this codebase uses inline `style` props**, not Tailwind utility classes. Tailwind is used sparingly (mostly for grid layouts like `grid grid-cols-2 lg:grid-cols-4 gap-4`).
- Color tokens:
  - `var(--color-primary)` — IBM-style blue `#0f62fe`
  - `var(--color-text)` — near-black in light mode, near-white in dark mode
  - `var(--color-border)` — `#e0e0e0`
  - `var(--color-bg)` / `var(--color-bg-secondary)`
  - `var(--color-destructive)` — red
  - `var(--color-success)` — green
  - `var(--color-warning)` — yellow
- Dark mode support exists via `prefers-color-scheme: dark` in `globals.css`.
- Font: Noto Sans loaded from Google Fonts.
- Border radius is consistently `5px` (`var(--radius-sm)` through `var(--radius-3xl)` all equal `5px`).

## Database & Prisma

- Provider: `postgresql`
- Single `schema.prisma` file.
- The default datasource URL is `DATABASE_URL_DEVELOPERS`; runtime code switches DBs via `datasourceUrl` on the PrismaClient instance.
- Key models: `User`, `Workspace`, `Membership`, `TaskItem`, `SubTask`, `TaskComment`, `EventItem`, `Proposal`, `MessageThread`, `Message`, `Transaction`, `VolunteerSlot`, `VolunteerSignup`, `Meeting`, `MeetingRsvp`, `Notification`, `AuditLog`, `Kudos`, `BudgetAllocation`, `BudgetTransaction`, `Attachment`, `ActivityFeed`.
- Enums: `Role`, `ProposalStatus`, `TaskStatus`, `EventStatus`, `MeetingStatus`, `TransactionType`, `BudgetStatus`.

## File Uploads

- Uploaded files are stored on the local filesystem under `UPLOADS_DIR` (default `./uploads`).
- Sub-directory per portal: `./uploads/developers/`, `./uploads/stuco/`.
- Max file size: 10 MB.
- Allowed MIME type prefixes are whitelisted (images, PDF, text, Word, Excel).
- File metadata is stored in the `Attachment` table.

## Background Jobs

`instrumentation.ts` registers a cron job on the Node.js runtime only:
- Runs every hour (`0 * * * *`).
- For each portal, counts pending tasks per user and upcoming events within 24h.
- Creates `Notification` records of type `"nudge"`.

## Security Considerations

- **Auth is required** for all API routes and all portal pages. The login page and public showcase are the only unauthenticated routes.
- **Membership gate**: You cannot sign in unless your email has a `Membership` row in the target portal.
- **Role checks** happen via `session.user.permissions`; some UI features are gated with `isAdmin` checks on the client, but API routes should also validate permissions server-side before mutating data.
- **File uploads**: size and MIME type restrictions are enforced.
- **No rate-limiting middleware** is currently implemented in the codebase, although `RATE_LIMIT_MAX` exists in `.env.example`.
- **No tests** are present in this project.
- **No ESLint config file** is present (despite the `lint` script).

## Development Guidelines

1. **Keep the API response envelope**. Always use `success(data)` / `error(msg, status)` in new route handlers.
2. **Use `getDbFromCookie(request)`** in API routes; do not instantiate `PrismaClient` directly.
3. **Read portal from cookie on client**. Copy the `getPortal()` pattern from existing pages if you create new portal pages.
4. **Invalidate queries with the portal key**. Use `queryClient.invalidateQueries({ queryKey: [portal, "feature"] })` after mutations.
5. **Follow the inline-style convention**. New UI should use `style={{ ... }}` with CSS custom properties (e.g., `color: "var(--color-text)"`). Use Tailwind utilities only for responsive grids and layout helpers.
6. **Add audit logging** for destructive or important mutations: call `writeAuditLog(..., db)`.
7. **Add activity feed entries** for user-visible creations (tasks, events, proposals, etc.).
8. **Extend Prisma schema carefully**. After changing `schema.prisma`, run `bun run db:generate` and `bun run db:push`.
9. **Seed script** (`prisma/seed.ts`) is idempotent (uses `upsert`). It is safe to re-run.
