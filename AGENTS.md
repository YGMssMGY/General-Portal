# SYSTEM MODE
This repository runs in:
> DETACHED FULL-STACK AGENT MODE (SELF-HEALING ENABLED)
All agent actions must follow:
PLAN → EXECUTE → VERIFY → REPAIR → REPORT
No step skipping allowed.
# QUICK COMMANDS
```powershell
# Start
.\start-dev.ps1
.\start-dev.ps1 -BackendProfile demo
.\start-dev.ps1 -WithRedis
# Health check (MANDATORY after every change cycle)
.\check-dev.ps1
# Stop
.\stop-dev.ps1
# Backend tests
cd backend
..\.tools\apache-maven-3.9.11\bin\mvn.cmd test
# Frontend build (verification gate)
cd frontend
npm run build
```
# ARCHITECTURE TRUTH MODEL
```
frontend/   React 18 + Vite + TypeScript
backend/    Spring Boot 3.3.5 + Java 21
design/     stitch_orgflow_workspace_dashboard (reference only, legacy)
```
### SYSTEM RULES:
* Frontend = UI + state only
* Backend = business logic only
* API = contract boundary
* No cross-layer logic allowed
# API CONTRACT RULE (CRITICAL)
* Frontend MUST ONLY call `/api/**`
* Backend MUST NOT be directly exposed
* All routing must pass through Vite proxy (dev) or gateway (prod)
* No hardcoded backend URLs allowed
# SELF-HEALING SYSTEM (CORE FEATURE)
## FAILURE DETECTION TRIGGERS
Agent MUST detect and react to:
### 1. Build Failure
* frontend build fails → STOP + diagnose
* backend compile fails → STOP + diagnose
### 2. API Drift
* frontend calls endpoint not present in backend
* backend exposes endpoint not mapped in frontend
### 3. Contract Mismatch
* DTO mismatch
* renamed controller not reflected in frontend
### 4. Route Failure
* missing React route
* broken navigation path
## SELF-HEALING LOOP
If ANY failure is detected:
### STEP 1 — DIAGNOSE
* identify root cause
* classify:
  * frontend issue
  * backend issue
  * contract issue
  * routing issue
### STEP 2 — ISOLATE IMPACT
* list all affected files
* trace dependency chain
* identify upstream/downstream impact
### STEP 3 — GENERATE FIX PLAN
* minimal fix strategy ONLY
* no unrelated refactors
* no “cleanup improvements”
### STEP 4 — APPLY FIX
* apply smallest possible change
* maintain contract integrity
### STEP 5 — VERIFY
Run:
* backend compile
* frontend build
* API sanity check
* route validation
### STEP 6 — REPORT
Must include:
* root cause
* fix applied
* validation result
* remaining risks
# CODEBASE DISCIPLINE RULES
## ❌ FORBIDDEN
* silent fixes without reporting
* untracked API changes
* renaming without updating both frontend + backend
* introducing new architecture patterns
* modifying unrelated modules
## ✅ REQUIRED
* traceable changes
* dependency-aware modifications
* contract-first updates
* explicit reporting
# DEPENDENCY RULE
All changes MUST respect:
Frontend → API → Backend → DB
No reverse dependency allowed.
# VERIFICATION GATES
Every change cycle MUST pass:
### Backend
* Maven build success
* Spring context loads
### Frontend
* TypeScript compile success
* Vite build success
### Integration
* API endpoint consistency check
* route resolution check
If any gate fails → SELF-HEAL LOOP MUST TRIGGER.
# ENVIRONMENT RULES
* `.env.local` is authoritative runtime config
* no hardcoded URLs
* no hardcoded ports
* no secrets in frontend
Profiles:
* dev → PostgreSQL
* demo → H2
* redis → cache/session layer
# TESTING RULES
* backend: Mockito + H2 only
* frontend: build-time validation only
* no missing test execution allowed in backend pipeline
# TOOLCHAIN CONSTRAINTS
* Maven: `C:\maven\bin\mvn.cmd` (system PATH)
* Java 21 required
* PostgreSQL expected unless demo mode enabled
# QUALITY BAR
All agent output must be:
* deterministic
* reproducible
* dependency-aware
* contract-safe
* minimal-change oriented
# FINAL SYSTEM GUARANTEE
This system guarantees:
* zero silent failures
* automatic detection of broken API contracts
* enforced frontend/backend consistency
* controlled refactor behavior
* self-healing recovery loop on failure