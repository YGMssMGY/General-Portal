# OrgFlow Workspace MVP

This repository turns the Google Stitch UI export into a full-stack MVP:

- `frontend/`: React + Vite + TypeScript + Tailwind CSS
- `backend/`: Spring Boot REST API + Spring Security OAuth2 + PostgreSQL
- Redis support is available, but optional for local MVP development
- `stitch_orgflow_workspace_dashboard/`: original Stitch export and screenshots

## Tooling

Maven is installed locally in `.tools/apache-maven-3.9.11` and verified with the Maven Central SHA-512 checksum.

Java 21 and Node.js are expected on PATH.

## Run And Stop The Site

Use these commands from the repository root: `D:\programs\Portal`.

Start the normal development site after PostgreSQL is installed and running:

```powershell
.\start-dev.ps1
```

Start the demo fallback without PostgreSQL:

```powershell
.\start-dev.ps1 -BackendProfile demo
```

Open the site:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:8080/api/health

Check whether the frontend, backend, and PostgreSQL are reachable:

```powershell
.\check-dev.ps1
```

Stop the frontend and backend:

```powershell
.\stop-dev.ps1
```

## Local Development

The normal workflow does not require Docker. Run React and Spring Boot directly, and use a native Windows PostgreSQL install for structured data.

### 1. Install PostgreSQL

Install PostgreSQL 16.x from the official Windows installer:

- https://www.postgresql.org/download/windows/

Create the development user and database with SQL Shell or pgAdmin:

```sql
CREATE USER orgflow WITH PASSWORD 'orgflow';
CREATE DATABASE orgflow OWNER orgflow;
GRANT ALL PRIVILEGES ON DATABASE orgflow TO orgflow;
```

The app expects PostgreSQL at `localhost:5432` by default.

### 2. Start The App

From the repository root:

```powershell
.\start-dev.ps1
```

This starts:

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

Check the stack:

```powershell
.\check-dev.ps1
```

Stop both servers:

```powershell
.\stop-dev.ps1
```

## Backend Profiles

The backend defaults to the `dev` profile.

- `dev`: PostgreSQL on `localhost:5432`, simple in-memory cache, no Redis required.
- `redis`: optional add-on profile for Redis cache/session support.
- `demo`: H2 fallback with seeded data for quick demos when PostgreSQL is unavailable.

Run the H2 fallback:

```powershell
.\start-dev.ps1 -BackendProfile demo
```

Run PostgreSQL with Redis enabled:

```powershell
.\start-dev.ps1 -WithRedis
```

Redis is intentionally deferred for the MVP. If you add it later on Windows, prefer WSL Redis or Memurai:

- https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-windows/

## Manual Commands

Backend:

```powershell
cd backend
..\.tools\apache-maven-3.9.11\bin\mvn.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

## Configuration And Microsoft APIs

Demo authentication is enabled by default so the MVP is usable before Microsoft Entra credentials are configured.

Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

Then fill in `.env.local`. The `start-dev.ps1` script loads `.env.local` automatically.

Set these values for real Microsoft login:

```powershell
$env:ORGFLOW_DEMO_MODE="false"
$env:MICROSOFT_TENANT_ID="..."
$env:MICROSOFT_CLIENT_ID="..."
$env:MICROSOFT_CLIENT_SECRET="..."
$env:FRONTEND_ORIGIN="http://localhost:5173"
```

Microsoft Entra redirect URI for local development:

```text
http://localhost:8080/login/oauth2/code/microsoft
```

Microsoft Graph and API integration instructions live in:

- `docs/MICROSOFT_API_INTEGRATION.md`

Important boundary: Microsoft client secrets belong in `.env.local` and backend configuration only. Do not put Microsoft secrets in React/Vite files.

PostgreSQL defaults:

```powershell
$env:POSTGRES_URL="jdbc:postgresql://localhost:5432/orgflow"
$env:POSTGRES_USER="orgflow"
$env:POSTGRES_PASSWORD="orgflow"
```

Optional Redis defaults:

```powershell
$env:REDIS_HOST="localhost"
$env:REDIS_PORT="6379"
```

The frontend API URL defaults to `http://localhost:8080/api`. Override it with:

```powershell
$env:VITE_API_URL="http://localhost:8080/api"
```

## Docker

Docker is not required for daily development. `docker-compose.yml` remains as an optional convenience if you later want containerized PostgreSQL and Redis:

```powershell
docker compose up -d
```

## Verification

Backend:

```powershell
cd backend
..\.tools\apache-maven-3.9.11\bin\mvn.cmd test
```

Frontend:

```powershell
cd frontend
npm run build
```
