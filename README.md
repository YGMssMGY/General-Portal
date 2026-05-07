# OrgFlow &mdash; General Portal

A dual-purpose club management and student council platform with a public showcase
and a private, role-based admin dashboard.

**Stack:** Java 21 &bull; Spring Boot 3.3.5 &bull; React 18 &bull; Vite 6 &bull; TypeScript &bull; Tailwind CSS 3
**Databases:** PostgreSQL &bull; SQLite &bull; H2 &bull; Redis (optional)

---

## Project Overview

OrgFlow General Portal powers the **Developers&apos; Club** and **Student Council**
through a single shared web application. Public visitors browse past events, photo
galleries, and organizational information. Authenticated members enter the admin
dashboard where a strict role hierarchy (Teacher &rarr; President &rarr; VP &rarr; Members
&rarr; Grade Reps) controls feature visibility and write access.

The frontend works **completely offline** during development thanks to Mock Service
Worker (MSW) &mdash; no backend, no database, and no internet connection are required
to preview and navigate every page.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Spring Boot 3.3.5, Java 21, Spring Security OAuth2, Spring Data JPA |
| **Auth** | Microsoft Entra ID (OAuth2), Dev Login Filter (dev-mode only) |
| **Database** | PostgreSQL 16, SQLite 3, H2 (demo fallback) |
| **Cache** | Caffeine (simple), Redis (optional) |
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS 3 |
| **Mocking** | Mock Service Worker (MSW) |
| **Icons** | Carbon Design System (`@carbon/icons-react`) |
| **Testing** | JUnit 5, Mockito, Spring Boot Test |
| **Build** | Maven, npm |

---

## Project Structure

```
├── backend/                          # Spring Boot backend
│   ├── src/main/java/com/orgflow/portal/
│   │   ├── config/                   # Security, Swagger, CORS config
│   │   ├── controller/               # REST controllers (17 endpoints)
│   │   ├── dto/                      # Data Transfer Objects
│   │   ├── entity/                   # JPA entities (16 tables)
│   │   ├── exception/                # Global exception handler
│   │   ├── repository/               # Spring Data repositories
│   │   ├── security/                 # OAuth2, dev-auth filter
│   │   └── service/                  # Business logic
│   ├── src/main/resources/
│   │   ├── application.yml           # Main configuration
│   │   ├── application-dev.yml       # PostgreSQL dev profile
│   │   ├── application-sqlite.yml    # SQLite profile
│   │   ├── application-demo.yml      # H2 fallback profile
│   │   ├── application-redis.yml     # Redis add-on profile
│   │   └── db/migration/             # Flyway database migrations
│   ├── data/                         # SQLite database file location
│   └── pom.xml
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── api/                      # HTTP client + API service
│   │   ├── components/               # Reusable components (DataTable, Modal, etc.)
│   │   ├── context/                  # React contexts (Auth, Theme, Workspace)
│   │   ├── features/                 # Feature pages (dashboard, tasks, etc.)
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── mocks/                    # MSW handlers & mock data generators
│   │   ├── routes/                   # Route definitions + auth guards
│   │   ├── types/                    # TypeScript type definitions
│   │   └── utils/                    # Formatting, class name utilities
│   ├── public/                       # Static assets, MSW service worker
│   └── package.json
├── data/                             # Shared SQLite database directory
│   └── .gitkeep
├── .tools/                           # Bundled Maven (portable, no system setup)
├── start-dev.ps1                     # Windows dev launcher
├── start-dev.sh                      # Linux/macOS dev launcher
├── stop-dev.ps1                      # Stop script
├── check-dev.ps1                     # Health check script
├── .env.example                      # Environment variable template
└── README.md                         # This file
```

---

## Quick Start

### Prerequisites
- **Java 17+** (21 recommended)
- **Node.js 18+**
- **Maven** (bundled in `.tools/`, or system PATH, or set `MVN_CMD`)

### Zero-Setup Start (SQLite &mdash; no database install!)

```powershell
# Clone the repo
git clone <repo-url>
cd General-Portal

# Copy environment template
Copy-Item .env.example .env.local

# Start everything with SQLite (auto-creates data/orgflow.db)
.\start-dev.ps1 -DatabaseProvider sqlite
```

### Start with PostgreSQL

```powershell
# Requires PostgreSQL running on localhost:5432
.\start-dev.ps1 -DatabaseProvider postgres
```

### Start with H2 (in-memory, no persistence)

```powershell
.\start-dev.ps1 -BackendProfile demo
```

### Linux / macOS

```bash
chmod +x start-dev.sh
./start-dev.sh -d sqlite        # SQLite
./start-dev.sh -d postgres      # PostgreSQL
./start-dev.sh -b demo          # H2
```

---

## Available Profiles

| Profile | Database | Requires | Persistence | Use Case |
|---------|----------|----------|-------------|----------|
| `dev` (default) | PostgreSQL | PostgreSQL 16 at `localhost:5432` | Yes | Full development |
| `sqlite` | SQLite | Nothing (file auto-created) | Yes | Quick dev / demo |
| `demo` | H2 in-memory | Nothing | No (lost on restart) | Quick test / fallback |
| `redis` | Redis add-on | Redis at `localhost:6379` | &mdash; | Cache & session |

---

## Environment Variables

Copy `.env.example` to `.env.local` and customize:

```ini
# Frontend
FRONTEND_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:8080/api
VITE_DEV_AUTH=false              # Set to "true" to show developer login form

# Database (PostgreSQL)
POSTGRES_URL=jdbc:postgresql://localhost:5432/orgflow
POSTGRES_USER=orgflow
POSTGRES_PASSWORD=yourpassword

# Dev Authentication
DEV_AUTH_USERNAME=dev@orgflow.local
DEV_AUTH_PASSWORD=your-dev-password

# Microsoft Entra ID (OAuth2)
MICROSOFT_TENANT_ID=common
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## URLs After Startup

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend Health** | http://localhost:8080/api/health |
| **Swagger UI** | http://localhost:8080/swagger-ui/index.html |
| **OpenAPI Spec** | http://localhost:8080/v3/api-docs |

---

## Role Hierarchy

The portal enforces a linear role hierarchy. Higher roles inherit all permissions
of lower roles:

```
Teacher Advisor  ─── Full access (admin)
    │
President  ─── Manage members, tasks, events, proposals, volunteers, files
    │
Vice President  ─── Manage tasks, events, volunteers, files
    │
Member  ─── View all (dashboard, tasks, events, messages, files)
    │
Grade Rep  ─── View events, messages, activity only
```

Role enforcement happens at two levels:
1. **Method security** (`@PreAuthorize`) on every controller endpoint
2. **Role hierarchy** (`RoleHierarchyImpl`) for inherited permissions

---

## Running Tests

### Backend

```powershell
cd backend

# With bundled Maven
..\tools\apache-maven-3.9.11\bin\mvn.cmd test

# With SQLite profile
..\tools\apache-maven-3.9.11\bin\mvn.cmd test -Dspring.profiles.active=sqlite

# With H2 profile
..\tools\apache-maven-3.9.11\bin\mvn.cmd test -Dspring.profiles.active=demo
```

### Frontend

```powershell
cd frontend
npm run build          # TypeScript type-check + Vite production build
npm run format         # Prettier code formatting
npm run check-format   # Verify formatting (CI)
```

---

## Authentication Modes

### 1. Dev Login (local development)
Set `DEV_AUTH_USERNAME` and `DEV_AUTH_PASSWORD` in `.env.local`. The frontend
shows a Developer Login form when `VITE_DEV_AUTH=true`. The backend `DevLoginFilter`
is only active in `dev`, `demo`, `local`, and `sqlite` profiles.

### 2. Microsoft Entra ID (production)
Set `ORGFLOW_DEMO_MODE=false` and provide real `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`,
and `MICROSOFT_CLIENT_SECRET` values. Redirect URI: `http://localhost:8080/login/oauth2/code/microsoft`

### 3. Frontend-Only (MSW Mock Mode)
The frontend uses Mock Service Worker to intercept all API calls. No backend, no
database, and no authentication are required. Simply run `npm run dev` from `frontend/`.

---

## Common Issues

| Issue | Solution |
|-------|----------|
| *PostgreSQL connection refused* | Use `-DatabaseProvider sqlite` or `-BackendProfile demo` |
| *Maven not found* | The bundled Maven is in `.tools/`. Clone with `git` (not ZIP download). |
| *Port 8080 / 5173 already in use* | Run `.\stop-dev.ps1` to clean up old processes. |
| *SQLite database locked* | Stop the backend, delete `data/orgflow.db`, restart. |
| *Frontend shows "Network error"* | Start the backend first, or run `npm run dev` from `frontend/` for MSW mock mode. |

---

## License

This project is for internal club use. All rights reserved.
