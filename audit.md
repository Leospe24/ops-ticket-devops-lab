# OpsTicket Infrastructure — Comprehensive Audit Report

**Audited by:** Automated Sub-Agent Analysis  
**Date:** 2026-06-18  
**Repository root:** `/home/leo/leo/projects/ops-ticket-devOps-infrastructure`  
**Reference exploration docs:** `.kimchi/docs/explore_backend.md`, `.kimchi/docs/explore_frontend.md`, `.kimchi/docs/explore_roadmap_gaps.md`

---

## 1. Executive Summary

OpsTicket is a three-tier IT ticketing platform (React SPA + Express API + PostgreSQL) that is **functional at the application layer but not production-ready**. The backend API and frontend SPA are structurally sound with correct auth patterns and decent test coverage under an available database, but critical infrastructure is entirely absent: no Docker setup, no CI/CD pipeline, no Terraform IaC, no environment configuration documentation, no observability stack, and no scripts. When the PostgreSQL database is unavailable, the entire backend test suite (29 tests across 2 suites) fails with `ECONNREFUSED`, driving coverage to ~24.6% statements. The JWT secret falls back to a hardcoded `'dev-secret-change-in-production'` if the `JWT_SECRET` environment variable is unset — a critical security vulnerability. **Do not deploy this codebase to any environment without addressing the infrastructure gaps and hardening the security layer first.**

---

## 2. Project Overview

### What OpsTicket Is
OpsTicket is a full-stack IT ticketing and incident management portal. The roadmap describes it as a showcase for a complete DevOps lifecycle — from local containerized development through to a production AWS architecture with ECS Fargate, RDS, S3/CloudFront, GitHub Actions CI/CD, and Prometheus/Grafana monitoring.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, react-router-dom v6 |
| Backend API | Node.js 18+, Express 4.x |
| Database | PostgreSQL (via Knex 3 ORM) |
| Authentication | JWT (jsonwebtoken), bcrypt (12 rounds) |
| Testing | Jest 29, Supertest 7 |
| Infrastructure (promised) | Docker, GitHub Actions, AWS ECS/RDS/S3/CloudFront, Terraform, Prometheus, Grafana |

### Architecture Intent
- **Development:** All three tiers containerized via `docker-compose.yml` at the repo root.
- **Production:** Frontend hosted on AWS S3 + CloudFront; backend API containerized on ECS Fargate behind an ALB, with state in RDS PostgreSQL. Infrastructure as Code via Terraform under `terraform/`. CI/CD via `.github/workflows/deploy.yml`.
- **Observability:** Backend exposes a `/metrics` endpoint consumed by Prometheus, visualized in Grafana.

### Repository File Tree (as-is)
```
ops-ticket-devOps-infrastructure/
├── backend/
│   ├── src/
│   │   ├── app.js          # Express app, middleware, routes
│   │   ├── server.js       # HTTP server entry point
│   │   ├── db.js           # Knex instance
│   │   ├── middleware/
│   │   │   └── auth.js     # JWT verify + requireRole
│   │   └── routes/
│   │       ├── auth.js     # Register + Login
│   │       └── tickets.js  # CRUD + Stats
│   ├── migrations/
│   │   ├── 20240614000001_create_users.js
│   │   └── 20240614000002_create_tickets.js
│   ├── seeds/
│   │   └── default_admin.js
│   ├── tests/
│   │   ├── setup.js
│   │   ├── auth.test.js
│   │   └── tickets.test.js
│   ├── Dockerfile          # Multi-stage Node.js 18 Alpine
│   ├── .dockerignore
│   ├── knexfile.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx         # Router + PrivateRoute
│   │   ├── api.js          # Centralized fetch client
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── StatsBanner.jsx
│   │       └── TicketList.jsx
│   ├── Dockerfile          # Multi-stage Nginx with SPA routing
│   ├── .dockerignore
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env.example            # All required env vars
├── docker-compose.yml      # PostgreSQL + backend + frontend
├── audit.md                # This report
├── roadmap.md
└── .kimchi/docs/
    ├── explore_backend.md
    ├── explore_frontend.md
    └── explore_roadmap_gaps.md
```

**Present in repo but not listed above:** `frontend/dist/` (pre-built production assets, committed to repo — not recommended).

**Explicitly absent (see Section 8 for detail):** `README.md`, `.github/workflows/`, `terraform/`, `scripts/`, `.gitignore`.

**Now present (created during initial audit):** `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.env.example`, `backend/.dockerignore`, `frontend/.dockerignore`.

---

## 3. How to Use / Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (running and accessible)
- npm or yarn

### Step 1 — Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2 — Configure Environment Variables
Create a `.env` file in `backend/`:
```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/opsticket_dev
JWT_SECRET=your-256-bit-secret-here-change-in-production

# Optional (defaults shown)
PORT=3000
NODE_ENV=development
DB_SSL=false
```

> **Note:** There is currently no `.env.example` in the repo. See Section 7 for required env vars.

### Step 3 — Run Database Migrations
```bash
cd backend
npm run migrate
```

### Step 4 — Seed the Default Admin (Optional)
```bash
npm run seed
```
This creates `admin@opsticket.local` with password `AdminPass123!` (defined in `backend/seeds/default_admin.js`) if credentials are not overridden via env vars.

### Step 5 — Start the Backend Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```
The server starts on `http://localhost:3000`. A `/health` liveness endpoint is available at `GET /health`.

### Step 6 — Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 7 — Start the Frontend Dev Server
```bash
npm run dev
```
The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:3000` via `vite.config.js`.

### Running Tests (Backend Only)
```bash
cd backend
npm test
```
Tests require a live PostgreSQL connection. If the database is unavailable, all 29 tests fail immediately with `ECONNREFUSED`. See Section 4.4 for details.

### Building for Production (Frontend)
```bash
cd frontend
npm run build   # outputs to frontend/dist/
```

---

## 4. Backend Audit

### 4.1 Dependencies & Security

**Installed packages** (`backend/package.json`):
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `express` | ^4.19.2 | HTTP framework | Stable |
| `jsonwebtoken` | ^9.0.2 | JWT signing/verification | — |
| `bcrypt` | ^5.1.1 | Password hashing | SALT_ROUNDS = 12 (good) |
| `knex` | ^3.1.0 | SQL query builder + migrations | — |
| `pg` | ^8.12.0 | PostgreSQL driver | — |
| `cors` | ^2.8.5 | CORS middleware | Used with defaults (risky) |
| `helmet` | ^7.1.0 | Security headers | Used with defaults |
| `dotenv` | ^16.4.5 | Env var loading | — |

#### JWT Secret Fallback — CRITICAL
```javascript
// backend/src/middleware/auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```
**Risk:** If `JWT_SECRET` is not set (e.g., env vars not loaded), every token is signed with this known string, making token forgery trivial. All instances of `JWT_SECRET` must be required at startup, not defaulted.

**Fix:** Remove the fallback:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
```

#### CORS — HIGH
`cors()` is applied with default settings in `app.js`, which allows requests from **any origin** (`Access-Control-Allow-Origin: *`). In production, if the API is publicly accessible, this should be restricted to the known frontend origin(s) only.

#### Helmet — OK (defaults)
`helmet()` is present with default settings, providing a reasonable baseline for security headers. However, HSTS, CSP, and other advanced headers are not explicitly configured.

#### No Rate Limiting — HIGH
Login (`POST /api/auth/login`) and register (`POST /api/auth/register`) endpoints are completely unprotected against brute-force or credential-stuffing attacks. No `express-rate-limit` or equivalent is installed.

#### Bcrypt — OK
SALT_ROUNDS is 12, which is the current industry recommendation for bcrypt (as of 2026, cost factor 12 is considered secure against offline GPU cracking).

#### Input Validation — MEDIUM
| Field | Validation | Issue |
|-------|-----------|-------|
| `email` | Presence check only | No regex format validation |
| `password` | Presence check only | No min length, complexity, or max-length |
| `role` | Whitelist `['admin', 'engineer', 'user']` | Properly enforced |
| `priority` | Whitelist CHECK constraint in migration | OK |
| `status` | Whitelist CHECK constraint in migration | OK |
| `title` | DB max 100 chars, not enforced in code | Potential truncation |

#### Hardcoded Secrets — HIGH
- **JWT fallback:** `'dev-secret-change-in-production'` (see above)
- **DB password fallback in `knexfile.js`:** `'postgres'`
- **Default admin seed:** `admin@opsticket.local` / `AdminPass123!` (`backend/seeds/default_admin.js`)

---

### 4.2 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Liveness check, returns `{ status: 'ok' }` |
| `POST` | `/api/auth/register` | None | Register user (email, password, optional role) |
| `POST` | `/api/auth/login` | None | Login with email/password, returns JWT |
| `GET` | `/api/tickets` | Bearer JWT | List tickets (role-filtered), supports `?status=` and `?priority=` query params |
| `POST` | `/api/tickets` | Bearer JWT | Create ticket (auto-generates `INC-NNN` ID) |
| `PUT` | `/api/tickets/:id` | Bearer JWT | Update ticket status/priority/assignee |
| `GET` | `/api/tickets/stats` | Bearer JWT | Aggregate counts (active, critical, total, open, in-progress, resolved) |
| `*` | `*` | None | 404 fallback |

**Observations:**
- No refresh token mechanism — JWTs are valid for 24 hours.
- `requireRole` middleware is exported from `middleware/auth.js` but never wired to any route.
- Ticket PUT allows any authenticated user to reassign tickets (no admin/engineer enforcement).

---

### 4.3 Database

**ORM:** Knex 3 with PostgreSQL driver (`pg`).

**Knex environments** (`backend/knexfile.js`):
| Env | Pool | SSL | Notes |
|-----|------|-----|-------|
| `development` | min 2, max 10 | `DB_SSL` env var | — |
| `test` | min 2, max 10 | false | — |
| `production` | min 2, max 10 | `DB_SSL=true` → `rejectUnauthorized: false` | Weak SSL verification |

**Migrations:**
1. `20240614000001_create_users.js` — Creates `users` table with `id` (UUID), `email` (unique, indexed), `password_hash`, `role` (CHECK constraint), `created_at`. Enables `uuid-ossp` extension.
2. `20240614000002_create_tickets.js` — Creates `tickets` table with `id` (VARCHAR `INC-NNN` format), `title`, `description`, `priority`, `status`, `creator_id` (FK → users), `assignee_id` (FK), `created_at`, `updated_at`. CHECK constraints on `priority` and `status`. Indexes on `status`, `priority`, `creator_id`, `assignee_id`.

**Seeds:**
- `default_admin.js` — Conditionally inserts `admin@opsticket.local` with `bcrypt.hash('AdminPass123!', 12)` on conflict ignore.

**Injection Safety:** All user input goes through Knex's parameterized query builder. `db.raw` calls use hardcoded column names. `generateTicketId` uses hardcoded pattern `INC-%`. **No SQL injection risk identified.**

**Notable issues:**
- `updated_at` in ticket updates uses `db.fn.now()` but no DB trigger auto-updates it on row change — relying on application-level `updated_at` being set.
- **Race condition** in `generateTicketId`: two simultaneous requests could read the same `lastTicket` and generate duplicate IDs. No transaction or retry logic.

---

### 4.4 Tests

**Test framework:** Jest 29 + Supertest 7

**Test files:**
| File | Tests | Scope |
|------|-------|-------|
| `backend/tests/auth.test.js` | 10 tests | Register (4), Login (4), shared (2) |
| `backend/tests/tickets.test.js` | 19 tests | Full CRUD + stats + auth guards |

**Total: 29 tests across 2 describe suites.**

**Test setup** (`backend/tests/setup.js`):
- `beforeAll`: runs `db.migrate.latest()`
- `afterEach`: truncates `tickets` and `users` tables
- `afterAll`: destroys the Knex connection pool

**Test execution command** (from `package.json`):
```bash
npm test  # NODE_ENV=test jest --coverage --verbose --runInBand
```

#### Test Coverage When DB Is Unavailable
When the PostgreSQL database is not running, every test suite fails at the `beforeAll` migration step with:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
This means **0 of 29 tests pass**, and coverage drops to approximately **24.6% of statements** (only code executed at module-load time, before any DB call).

**To run tests successfully:**
1. Start a PostgreSQL instance (Docker recommended):
   ```bash
   docker run -d -p 5432:5432 -e POSTGRES_DB=opsticket_test \
     -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
     --name opsticket-postgres-test postgres:16-alpine
   ```
2. Create the `opsticket_test` database manually (Jest tests need the DB to exist):
   ```bash
   PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE opsticket_test;"
   ```
3. Set env vars:
   ```bash
   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsticket_test
   export JWT_SECRET=test-secret-for-jest
   export NODE_ENV=test
   ```
4. Run:
   ```bash
   cd backend && npm test
   ```

**What tests cover:**
- Auth: registration with hash verification, duplicate email rejection, role whitelist, missing field rejection, JWT payload contents, invalid credentials, non-existent user.
- Tickets: JWT guard enforcement, ticket creation with ID generation, CRUD operations, status/priority filtering, stats aggregation, concurrent updates.

**What tests do not cover:**
- Database connection failures and error resilience
- Input validation edge cases (e.g., very long strings, SQL injection attempts)
- Rate limiting (none exists to test)
- CORS behavior
- Concurrent ticket creation (race condition in `generateTicketId`)

---

### 4.5 Backend Production Readiness Flags

| # | Flag | Severity | Location |
|---|------|----------|----------|
| 1 | JWT secret fallback to hardcoded `'dev-secret-change-in-production'` — tokens are forgeable in any environment that omits `JWT_SECRET` | **Critical** | `backend/src/middleware/auth.js:1` |
| 2 | CORS wide-open (allows all origins) — not restricted to known frontend origin | **High** | `backend/src/app.js` (uses default `cors()`) |
| 3 | No rate limiting on login/register endpoints — exposed to brute-force | **High** | `backend/src/routes/auth.js` |
| 4 | Database credentials with weak defaults in `knexfile.js` (`'postgres'`) | **High** | `backend/knexfile.js` |
| 5 | Default admin seed uses predictable password `AdminPass123!` if env vars not overridden | **High** | `backend/seeds/default_admin.js` |
| 6 | SSL `rejectUnauthorized: false` in production DB config weakens TLS verification | **Medium** | `backend/knexfile.js` (production block) |
| 7 | Race condition in `generateTicketId` — concurrent inserts can cause duplicate key errors | **Medium** | `backend/src/routes/tickets.js` |
| 8 | No logging framework (only `console.error`) — no structured logging, log levels, or rotation | **Medium** | All route files |
| 9 | No process-level uncaught exception / unhandled rejection handlers | **Medium** | `backend/src/server.js` |
| 10 | No graceful shutdown — server does not close DB pool or HTTP server on SIGTERM | **Medium** | `backend/src/server.js` |
| 11 | No input length limits on `title`/`description` enforced in application code (DB truncates) | **Low** | `backend/src/routes/tickets.js` |
| 12 | No email format validation in registration | **Medium** | `backend/src/routes/auth.js` |
| 13 | No password strength enforcement (1-character passwords accepted) | **Medium** | `backend/src/routes/auth.js` |
| 14 | `requireRole` middleware exported but never applied to any route | **Low** | `backend/src/middleware/auth.js` |
| 15 | `updated_at` relies on application-side setting with no DB trigger | **Low** | `backend/src/routes/tickets.js` |

---

## 5. Frontend Audit

### 5.1 Dependencies & Build

**Installed packages** (`frontend/package.json`):
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `react` | ^18.3.1 | UI framework | — |
| `react-dom` | ^18.3.1 | DOM renderer | — |
| `react-router-dom` | ^6.23.1 | Client-side routing | — |
| `vite` | ^5.3.1 | Build tool + dev server | — |
| `@vitejs/plugin-react` | ^4.3.1 | React plugin for Vite | — |

**No state management library.** No axios, SWR, React Query, Redux, Zustand, or Context API.

**Build configuration** (`frontend/vite.config.js`):
- Dev server: port `5173`, proxy `/api` → `http://localhost:3000`
- Build output: `frontend/dist/`
- Source maps: enabled in production builds (`sourcemap: true`)

**Environment variables:**
- `VITE_API_URL` — read in `api.js`. Falls back to relative path `''`, relying on Vite proxy in dev.
- No `.env` files in repo (good: no secrets committed).
- Production builds need `VITE_API_URL` set to the deployed backend origin.

---

### 5.2 Component Inventory

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `src/main.jsx` | Entry | ~10 | React root mount, wraps in `<BrowserRouter>` and `<StrictMode>` |
| `src/App.jsx` | Router | ~25 | Defines `<PrivateRoute>`, three routes (`/login`, `/`, `*`) |
| `src/api.js` | Client | ~60 | Centralized fetch wrapper, auth methods, token persistence in localStorage |
| `src/pages/Login.jsx` | Page | ~100 | Login/Register form with toggle, role selection (register only) |
| `src/pages/Dashboard.jsx` | Page | ~180 | Main view: fetches stats + tickets, renders child components, handles create/update |
| `src/components/StatsBanner.jsx` | Component | ~50 | Displays stat cards (total, active, open, in-progress, resolved, critical) |
| `src/components/TicketList.jsx` | Component | ~100 | Renders ticket table with inline status editing |

**Total source files: 7 JSX/JS files + 2 config + 1 HTML.**

**Routing gaps:**
- No role-based route guards (e.g., admin-only pages).
- No `Outlet` or layout nesting.
- No lazy loading / code splitting.
- No 404 page (wildcard `*` redirects to `/` silently).

---

### 5.3 Security

| Issue | Severity | Details |
|-------|----------|---------|
| JWT stored in `localStorage` | **High** | Vulnerable to XSS exfiltration. Should use `httpOnly` cookies set by the backend. |
| No XSS sanitization | **Medium** | User-controlled data rendered in JSX. React provides default escaping. No CSP meta tag. |
| No Content Security Policy | **Medium** | `index.html` has no CSP meta tag or response header configuration. |
| No error boundaries | **High** | Any unhandled render error crashes the entire app (white screen). |
| No client-side password strength validation | **Low** | HTML5 `type="email"` used; no min-length or complexity enforcement. |
| Role in registration not validated server-side beyond whitelist | **Low** | `<select>` values can be tampered with client-side, but server correctly rejects invalid roles. |
| Source maps enabled in production builds | **Medium** | `vite.config.js` has `sourcemap: true` in build — exposes original source in production. Set to `'inline-source-map'` for dev only, or `'false'` for production. |

**No CSRF concern** — the backend does not use cookie-based sessions, so CSRF is not applicable. The XSS-to-token-theft risk is the primary attack surface.

---

### 5.4 Tests

**Status: Completely absent. Zero test files exist.**

No testing frameworks are in `frontend/package.json` dependencies or devDependencies. No Jest, Vitest, Cypress, Playwright, or RTL (`@testing-library/react`) is installed.

**Implications:** Any regression in Login, Dashboard, TicketList, or StatsBanner will not be caught by automated tests. Refactoring carries significant manual QA burden.

---

### 5.5 Frontend Production Readiness Flags

| # | Flag | Severity | Location |
|---|------|----------|----------|
| 1 | Zero tests — no unit, integration, or e2e test coverage | **Critical** | `frontend/` |
| 2 | No React Error Boundaries — any render error causes white-screen crash | **High** | All page/component files |
| 3 | JWT in `localStorage` — vulnerable to XSS exfiltration | **High** | `frontend/src/api.js` |
| 4 | Source maps enabled in production builds (`sourcemap: true`) | **Medium** | `frontend/vite.config.js:build.sourcemap` |
| 5 | No CSP meta tag in `index.html` | **Medium** | `frontend/index.html` |
| 6 | No pagination on ticket list — assumes all tickets fit in one response | **Medium** | `frontend/src/pages/Dashboard.jsx`, `src/components/TicketList.jsx` |
| 7 | No UI-side search/filter controls for tickets (API supports it) | **Medium** | `frontend/src/pages/Dashboard.jsx` |
| 8 | No loading skeletons — only text "Loading dashboard..." | **Low** | `frontend/src/pages/Dashboard.jsx` |
| 9 | No 404 page | **Low** | `frontend/src/App.jsx` (wildcard redirects silently) |
| 10 | No user profile page or role display | **Low** | `frontend/src/` |
| 11 | No toast/notification system | **Low** | All pages |
| 12 | All styles inline (no CSS modules or theme) — maintainability risk | **Low** | All component files |
| 13 | No lazy loading / code splitting | **Low** | `frontend/src/App.jsx` |
| 14 | No `aria-live` regions for error messages (a11y) | **Low** | `frontend/src/pages/Login.jsx`, `Dashboard.jsx` |
| 15 | Form inputs lack `<label>` elements (placeholder-only labels) | **Low** | `frontend/src/pages/Login.jsx` |
| 16 | Modal lacks `role="dialog"`, `aria-modal`, focus trap, or `Escape` handler | **Low** | `frontend/src/pages/Dashboard.jsx` |

---

## 6. Test Analysis

### 6.1 Existing Tests

**Backend: Jest + Supertest**

| Metric | Value |
|--------|-------|
| Test frameworks | Jest 29, Supertest 7 |
| Test files | 2 (`auth.test.js`, `tickets.test.js`) |
| Total test cases | 29 |
| Test suites | 2 (Auth Endpoints, Ticket Endpoints) |
| Setup file | `tests/setup.js` — runs migrations `beforeAll`, cleans tables `afterEach` |
| Coverage (DB available) | ~100% logical path coverage (per exploration notes) |
| Coverage (DB unavailable) | ~24.6% statements — all tests fail at `beforeAll` with `ECONNREFUSED` |

**What the backend tests cover well:**
- Auth happy paths (register, login with valid credentials)
- Password hashing verification (bcrypt)
- JWT token structure and payload (id, email, role, expiry)
- Input validation (missing fields, invalid roles, duplicate email)
- Ticket CRUD operations and ID generation
- Ticket stats aggregation
- JWT guard enforcement (unauthenticated requests return 401/403)

**What the backend tests do not cover:**
- Database connection failure resilience
- SQL injection edge cases (though Knex's parameterized queries are used throughout)
- Rate limiting (none exists to test)
- CORS behavior
- Concurrent ticket creation (race condition)
- Error responses from the global error handler
- Unhandled promise rejections

### 6.2 Missing Tests

| Category | Status | Technology Needed |
|----------|--------|-------------------|
| Backend: Error/edge-case tests | Missing | Jest + Supertest |
| Backend: Integration tests with real DB in CI | Missing | Docker + Jest in CI |
| Frontend: Unit tests (components, pages) | **Completely absent** | Vitest + React Testing Library |
| Frontend: Integration tests (routing, auth flow) | **Completely absent** | Vitest + React Testing Library + MSW |
| Frontend: End-to-end tests (critical flows) | **Completely absent** | Playwright or Cypress |
| API contract tests | Missing | OpenAPI/Postman or Jest |

### 6.3 Recommendations for Additional Tests

#### Backend
1. **Database error resilience tests:** Mock Knex to simulate connection failures and verify the API returns appropriate 503 responses (currently unhandled — all DB errors bubble to a generic 500).
2. **Input boundary tests:** Test with max-length strings, Unicode characters, SQL injection payloads, and empty strings for all fields.
3. **Concurrent ticket creation test:** Spawn multiple simultaneous `POST /api/tickets` requests and verify no duplicate `INC-NNN` IDs are created, or that the race condition is handled gracefully.
4. **Rate limiting tests:** Once rate limiting is added, test that limits are enforced on login/register endpoints.
5. **Global error handler tests:** Test that database errors, validation errors, and unexpected exceptions all produce safe (non-leaking), consistent error responses.

#### Frontend
1. **Component unit tests (Vitest + RTL):**
   - `Login.jsx`: render states (login mode, register mode), form submission, error display, loading state, navigation on success.
   - `Dashboard.jsx`: initial data fetch, stat card rendering, ticket list rendering, create ticket modal open/close, update ticket flow.
   - `StatsBanner.jsx`: all stat cards render with correct values, color-coding for active/critical counts.
   - `TicketList.jsx`: table renders empty state, renders rows, status dropdown update triggers `onUpdate`.

2. **API integration tests (Vitest + MSW):**
   - Mock all API responses using MSW (Mock Service Worker) to test Login success/failure, Dashboard data loading, ticket creation, and ticket updates without requiring a live backend.
   - Test 401/403 responses trigger logout and redirect.

3. **E2E tests (Playwright):**
   - **Happy path:** Register → Login → View dashboard → Create ticket → Update ticket status → Logout.
   - **Auth failure:** Attempt login with wrong password, verify error message and no redirect.
   - **Protected route access:** Directly navigate to `/` without token, verify redirect to `/login`.
   - **Ticket update flow:** Create a ticket, then change its status via dropdown, verify optimistic UI updates correctly.
   - **Error states:** Simulate API errors and verify error messages are displayed, not silent failures.

---

## 7. Docker Readiness Assessment

### 7.1 Current State

**Docker artifacts were created during the initial audit. The local development stack is now containerized and functional.**

| File | Status | Details |
|------|--------|---------|
| `docker-compose.yml` at repo root | ✅ **Created** | 3 services (postgres, backend, frontend) with healthchecks |
| `backend/Dockerfile` | ✅ **Created** | Multi-stage Node.js 18 Alpine, non-root user, auto-migrates |
| `frontend/Dockerfile` | ✅ **Created** | Multi-stage Nginx with SPA routing |
| `.env.example` | ✅ **Created** | All required env vars with local defaults |
| `backend/.dockerignore` | ✅ **Created** | Excludes node_modules, .env, coverage |
| `frontend/.dockerignore` | ✅ **Created** | Excludes node_modules, .env, dist |
| `.github/workflows/deploy.yml` | **Missing** | No CI/CD pipeline |
| `terraform/` | **Missing** | No IaC |
| `scripts/` | **Missing** | No automation scripts |
| `README.md` | **Missing** | No project README |

**Docker build verification:** Both images build successfully with `docker build`.
**Docker compose verification:** `docker compose up --build -d` starts all 3 services. Backend health endpoint returns `{"status":"ok"}`.

### 7.2 Containerization Blockers

#### Hardcoded Secrets
The application still has multiple hardcoded secrets that are present in the containerized build:
- `JWT_SECRET` — still falls back to `'dev-secret-change-in-production'` (must fail-safe in containers)
- Database credentials — `knexfile.js` still falls back to `'postgres'` for both user and password
- Default admin credentials — `seeds/default_admin.js` still hardcodes the seed password

**These were mitigated in docker-compose.yml by setting env var defaults, but the fallback code in the application itself remains a risk if containers are started without proper env vars.**

#### No Graceful Shutdown
`backend/src/server.js` still does not register `process.on('SIGTERM', ...)` or `process.on('SIGINT', ...)` handlers. The Dockerfile CMD runs migrations then starts the server, but there is no graceful shutdown logic. Docker stop sends SIGTERM which the process ignores.

**Fix needed:** Add graceful shutdown handler that closes the HTTP server and the Knex connection pool.

#### Missing Env Var Documentation
Without `.env.example`, developers and CI/CD pipelines cannot know which environment variables are required. The containerization process must define a complete set of required and optional env vars.

#### Health Endpoint Not Docker-Ready
The existing `/health` endpoint returns `{ status: 'ok' }` but does not check database connectivity. ECS Fargate health checks require a reliable liveness endpoint. A proper health check should verify DB connectivity.

### 7.3 Recommendations for Docker Setup

#### `backend/Dockerfile`
```dockerfile
# Multi-stage build (optional: build stage not needed for Node)
FROM node:20-alpine AS runtime

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY knexfile.js ./
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/
COPY src/ ./src/

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run migrations automatically, then start server
CMD ["sh", "-c", "npx knex migrate:latest && node src/server.js"]
```
**Required env vars:**
- `DATABASE_URL` (required)
- `JWT_SECRET` (required — must not fall back)
- `PORT` (optional, default 3000)
- `NODE_ENV` (optional)
- `DB_SSL` (optional)

#### `frontend/Dockerfile` (for local testing only — roadmap specifies S3+CloudFront in production)
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Nginx stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### `docker-compose.yml` (repo root)
Should include:
- `postgres` service (image: `postgres:16-alpine`, volume for persistence)
- `backend` service (build: `./backend`, depends on `postgres`, env file `.env`)
- `frontend` service (build: `./frontend`, depends on `backend`, ports `5173:5173`)
- Health checks on `postgres` and `backend` to gate `frontend` startup
- Shared network

#### `.env.example` (repo root)
```env
# Backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsticket_dev
JWT_SECRET=<generate-with: openssl rand -base64 32>
PORT=3000
NODE_ENV=development
DB_SSL=false

# Frontend (used at build time)
VITE_API_URL=http://localhost:3000
```

---

## 8. Roadmap Gap Analysis

### 8.1 Roadmap vs. Actual Status

The roadmap (`roadmap.md`) describes a complete DevOps lifecycle project. The following table maps each promised component to its actual status.

| Roadmap Component | File(s) Promised | Actual Status | Priority |
|-------------------|------------------|---------------|----------|
| CI/CD Pipeline | `.github/workflows/ci.yml` | ✅ **Created** | Critical |
| Docker Compose | `docker-compose.yml` at root | **Missing** | Critical |
| Backend Dockerfile | `backend/Dockerfile` | ✅ **Created** | Critical |
| Frontend Dockerfile | `frontend/Dockerfile` | ✅ **Created** | Critical |
| Docker Compose | `docker-compose.yml` | ✅ **Created** | Critical |
| Terraform: VPC | `terraform/vpc.tf` | **Missing** — no `terraform/` directory | Critical |
| Terraform: ECS/ALB | `terraform/ecs.tf` | **Missing** | Critical |
| Terraform: RDS | `terraform/rds.tf` | **Missing** | Critical |
| Terraform: S3/CloudFront | `terraform/s3_cloudfront.tf` | **Missing** | Critical |
| DB Backup Script | `scripts/backup-db.sh` | **Missing** — no `scripts/` directory | High |
| AWS Cost Optimizer | `scripts/aws_cost_optimizer.py` | **Missing** | High |
| Observability: `/metrics` endpoint | Backend route | **Missing** — only `/health` exists | High |
| Observability: Prometheus config | Prometheus YAML | **Missing** | High |
| Observability: Grafana dashboards | Grafana JSON | **Missing** | High |
| Environment files | `.env.example` | ✅ **Created** | High |
| .gitignore | `.gitignore` | ✅ **Created** | High |
| README | `README.md` | **Missing** | Medium |
| Backend application code | `backend/src/` | **Implemented** | — |
| Frontend application code | `frontend/src/` | **Implemented** | — |

### 8.2 Gap Summary

- **Critical gaps (production deployment blocked):** 3 items — Terraform files
- **High gaps (operational risk):** 5 items — scripts, observability
- **Medium gaps:** 1 item — README
- **Closed since original audit:** Docker files (backend/frontend), docker-compose.yml, .env.example, .dockerignore files

### 8.3 Priorities for Closing Gaps

**Phase 1 — Immediate (unblock local development):**
1. ✅ Create `docker-compose.yml` to spin up PostgreSQL + backend + frontend locally.
2. ✅ Create `backend/Dockerfile` and `frontend/Dockerfile`.
3. ✅ Create `.env.example` documenting all required environment variables.
4. Create `README.md` with setup instructions.
5. Create `.gitignore` to prevent node_modules and secrets from being tracked.

**Phase 2 — Security Hardening (before any deployment):**
1. Remove JWT secret fallback — fail at startup if `JWT_SECRET` is not set.
2. Remove DB credential fallbacks in `knexfile.js`.
3. Add `express-rate-limit` to protect auth endpoints.
4. Lock down CORS to the known frontend origin.
5. Remove source maps from production builds.
6. Add React Error Boundaries.

**Phase 3 — CI/CD:**
1. Create `.github/workflows/deploy.yml` following the dual-track pipeline described in the roadmap.
2. Add Docker build and push steps to backend workflow.
3. Add S3 sync + CloudFront invalidation to frontend workflow.
4. Add database migration step to CI pipeline.

**Phase 4 — IaC (Terraform):**
1. Create `terraform/vpc.tf` — public/private subnet layout, NAT gateway, IGW.
2. Create `terraform/rds.tf` — multi-AZ PostgreSQL, parameter groups, subnet group.
3. Create `terraform/ecs.tf` — Fargate cluster, task definitions, ALB, security groups.
4. Create `terraform/s3_cloudfront.tf` — S3 bucket, CloudFront distribution, OAI.

**Phase 5 — Observability:**
1. Add `/metrics` endpoint to backend using `prom-client`.
2. Create Prometheus scrape configuration.
3. Create Grafana dashboard JSON for API latency, error rate, request volume.

**Phase 6 — Automation Scripts:**
1. Create `scripts/backup-db.sh` for pre-deployment DB snapshots.
2. Create `scripts/aws_cost_optimizer.py` with Boto3 for orphaned resource reporting.

---

## 9. Production Readiness Scorecard

| Area | Rating | Notes |
|------|--------|-------|
| **Backend Code** | ⚠️ Needs Work | Functional CRUD, auth, and migrations exist. Security gaps (JWT fallback, no rate limiting, weak CORS, no input validation) are blockers. Race condition in ID generation. |
| **Frontend Code** | ⚠️ Needs Work | Basic SPA works. Missing error boundaries, pagination, loading states, notifications, accessibility, and any form of tests. |
| **Tests** | ⚠️ Needs Work | Backend has decent coverage (29 tests) but only when DB is available. Frontend has **zero tests**. |
| **Security** | ❌ Missing | Critical JWT fallback, no rate limiting, no CSP, localStorage JWT, source maps in prod, predictable admin seed. Multiple high-severity issues. |
| **Docker/Infra** | ⚠️ Needs Work | Docker files created (backend, frontend, compose, .env.example). Still missing: Terraform, CI/CD, scripts, README. Local containerized stack works but production deployment infra is absent. |
| **Observability** | ❌ Missing | No `/metrics` endpoint, no Prometheus config, no Grafana dashboards. Only `/health` exists (no DB check). |
| **Documentation** | ❌ Missing | No README.md. No `.env.example`. Only `roadmap.md` and exploration notes exist. |

**Overall: Not production ready.** The application code is a solid starting point, but the entire DevOps, infrastructure, hardening, and testing layers are missing.

---

## 10. Recommendations & Next Steps

### Priority 1 — Security Hardening (Do First — Production Blocker)
1. **Remove JWT secret fallback** in `backend/src/middleware/auth.js` — fail the process at startup if `JWT_SECRET` is unset. This is the most critical vulnerability.
2. **Remove database credential fallbacks** in `backend/knexfile.js` — fail if `DATABASE_URL` is not set.
3. **Add rate limiting** (`npm install express-rate-limit`) on `POST /api/auth/login` and `POST /api/auth/register`.
4. **Configure CORS** explicitly in `backend/src/app.js` to allow only the known frontend origin(s).
5. **Disable source maps in production builds** (`sourcemap: false` in `vite.config.js`).
6. **Do not seed the default admin** in production — require `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars for initial setup.

### Priority 2 — Local Development Setup (Unblock Team)
7. **Create `.env.example`** listing all required env vars (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `DB_SSL`, `VITE_API_URL`).
8. **Create `docker-compose.yml`** at repo root with PostgreSQL, backend, and frontend services.
9. **Create `backend/Dockerfile`** and `frontend/Dockerfile`.
10. **Add graceful shutdown** to `backend/src/server.js` (SIGTERM/SIGINT handlers closing the HTTP server and Knex pool).
11. **Create `README.md`** with clear local setup instructions.

### Priority 3 — Testing (Prevent Regression)
12. **Write frontend unit tests** using Vitest + React Testing Library for all components and pages.
13. **Add MSW (Mock Service Worker)** to mock API responses in frontend tests — removes dependency on a live backend.
14. **Add backend error resilience tests** (mock DB failures, test graceful degradation).
15. **Add Playwright E2E tests** for the critical user flows (register → login → create ticket → update ticket).

### Priority 4 — CI/CD Pipeline
16. **Create `.github/workflows/deploy.yml`** with:
    - Backend track: lint → test → build Docker image → push to ECR → deploy to ECS Fargate.
    - Frontend track: build → sync to S3 → invalidate CloudFront cache.
17. **Add database migration step** to the CI pipeline before deploying new backend versions.
18. **Set up Docker Hub or AWS ECR** as the container registry.

### Priority 5 — Infrastructure as Code (Terraform)
19. **Create `terraform/vpc.tf`** — custom VPC with public and private subnets across 2+ AZs, NAT gateway, internet gateway, route tables.
20. **Create `terraform/rds.tf`** — RDS PostgreSQL (multi-AZ), subnet group, parameter group, automated backups, storage encryption.
21. **Create `terraform/ecs.tf`** — ECS Fargate cluster, task definition, service, ALB with target group health checks, security groups.
22. **Create `terraform/s3_cloudfront.tf`** — S3 bucket (public-read for static hosting), CloudFront distribution with OAI, cache policies.

### Priority 6 — Observability
23. **Add `/metrics` endpoint** to `backend/src/app.js` using `prom-client` (request duration histogram, HTTP request counter, error counter, DB query timing).
24. **Create Prometheus configuration** (`prometheus.yml`) to scrape the `/metrics` endpoint.
25. **Create Grafana dashboard** JSON for API latency, error rate, request volume per endpoint, and DB connection pool utilization.

### Priority 7 — Operational Scripts
26. **Create `scripts/backup-db.sh`** that dumps the RDS PostgreSQL database to S3 with timestamped filenames.
27. **Create `scripts/aws_cost_optimizer.py`** using Boto3 to scan for orphaned EBS volumes, old snapshots, and unattached Elastic IPs, sending a report via SES.

### Priority 8 — Frontend Quality-of-Life
28. **Add React Error Boundaries** around each major route.
29. **Add pagination** to the ticket list (backend API already supports it via query params).
30. **Add UI-side ticket filtering** by status and priority (backend supports it).
31. **Replace inline styles** with a shared CSS file or CSS modules for maintainability.
32. **Add a 404 page** instead of silently redirecting to `/`.

---

## 11. Re-audit Status

**Re-audit Date:** 2026-06-18  
**Performed by:** Automated project scan after initial audit remediation  
**Method:** Compared current project state against original audit findings; re-ran tests and validated Docker stack.

### Summary of Changes Since Original Audit
- **6 new files created:** `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.env.example`, `backend/.dockerignore`, `frontend/.dockerignore`
- **Docker stack verified:** `docker compose up --build -d` successfully starts PostgreSQL, backend, and frontend
- **Tests verified:** All 29 backend tests pass (87.43% statement coverage) with a real PostgreSQL database
- **Health endpoint verified:** `GET /health` returns `{"status":"ok"}` from the containerized backend
- **1 new issue discovered:** `.gitignore` is completely missing, causing all `node_modules` files to appear as untracked in git

### CI & GitHub Readiness
- **`.gitignore` created** — excludes node_modules, .env, dist, coverage, backups
- **`.github/workflows/ci.yml` created** — automated pipeline for push/PR to `main`/`master`:
  - Spins up Docker stack (postgres + backend + frontend)
  - Creates test database
  - Runs backend tests (29/29) against live PostgreSQL
  - Validates health endpoint
  - Tears down stack with volume cleanup

### Security Fixes Applied
- **JWT secret fallback removed** — `backend/src/middleware/auth.js` now throws if `JWT_SECRET` is unset
- **DB credential fallbacks removed** — `backend/knexfile.js` validates all `DB_*` env vars and throws if missing
- **CORS restricted** — `backend/src/app.js` now uses `FRONTEND_URL` env var; throws if unset
- **Rate limiting added** — `express-rate-limit` installed; 5 req / 15 min limit on `/api/auth/*` routes (skipped in `test` env)
- **Production source maps disabled** — `frontend/vite.config.js` changed `sourcemap: true` → `sourcemap: false`
- **`.env` file created** at project root with all required environment variables
- **`docker-compose.yml` hardened** — removed fallbacks for `JWT_SECRET`, `FRONTEND_URL`, and `VITE_API_URL`
- **Backend dotenv paths updated** — `server.js`, `db.js`, and `knexfile.js` now load `.env` from project root

### Detailed Status Table

| # | Original Finding | Severity | Status | Notes |
|---|-----------------|----------|--------|-------|
| 1 | `backend/Dockerfile` missing | Critical | ✅ **FIXED** | Multi-stage Node.js 18 Alpine build created |
| 2 | `frontend/Dockerfile` missing | Critical | ✅ **FIXED** | Multi-stage Nginx build with SPA routing created |
| 3 | `docker-compose.yml` missing | Critical | ✅ **FIXED** | 3-service compose with postgres healthcheck created |
| 4 | `.env.example` missing | High | ✅ **FIXED** | All required env vars documented with safe defaults |
| 5 | `.dockerignore` files missing | Medium | ✅ **FIXED** | Created for both backend and frontend |
| 6 | Backend tests fail without DB | High | ✅ **MITIGATED** | Tests pass when PostgreSQL is running (docker-compose provides it) |
| 7 | No local containerized dev stack | Critical | ✅ **FIXED** | Full stack runs via `docker compose up` |
| 8 | JWT secret fallback — hardcoded `'dev-secret-change-in-production'` | Critical | ✅ **FIXED** | Fallback removed; app throws `Error: JWT_SECRET environment variable is required` if unset |
| 9 | CORS wide-open (allows all origins) | High | ✅ **FIXED** | Now restricted to `FRONTEND_URL` env var; throws if unset |
| 10 | No rate limiting on auth endpoints | High | ✅ **FIXED** | `express-rate-limit@8.5.2` installed; 5 req / 15 min limit on `/api/auth/*` (skipped in `test` env) |
| 11 | DB credential fallbacks in `knexfile.js` | High | ✅ **FIXED** | All fallbacks removed; throws if `DB_HOST/PORT/NAME/USER/PASSWORD` are missing |
| 12 | Default admin seed with predictable password | High | ❌ **OPEN** | No code change; `AdminPass123!` still hardcoded |
| 13 | SSL `rejectUnauthorized: false` in production DB config | Medium | ❌ **OPEN** | No code change |
| 14 | Race condition in `generateTicketId` | Medium | ❌ **OPEN** | No code change |
| 15 | No logging framework | Medium | ❌ **OPEN** | No code change |
| 16 | No graceful shutdown | Medium | ❌ **OPEN** | No code change |
| 17 | No process-level exception handlers | Medium | ❌ **OPEN** | No code change |
| 18 | No email format validation | Medium | ❌ **OPEN** | No code change |
| 19 | No password strength enforcement | Medium | ❌ **OPEN** | No code change |
| 20 | `requireRole` middleware unused | Low | ❌ **OPEN** | No code change |
| 21 | No DB trigger for `updated_at` | Low | ❌ **OPEN** | No code change |
| 22 | Frontend: zero tests | Critical | ❌ **OPEN** | No code change; no test framework installed |
| 23 | Frontend: JWT in `localStorage` | High | ❌ **OPEN** | No code change |
| 24 | Frontend: no React Error Boundaries | High | ❌ **OPEN** | No code change |
| 25 | Frontend: source maps in production | Medium | ✅ **FIXED** | `sourcemap: false` in `frontend/vite.config.js` |
| 26 | Frontend: no CSP | Medium | ❌ **OPEN** | No code change |
| 27 | Frontend: no pagination | Medium | ❌ **OPEN** | No code change |
| 28 | Frontend: no search/filter UI | Medium | ❌ **OPEN** | No code change |
| 29 | No CI/CD pipeline | Critical | ❌ **OPEN** | No `.github/workflows/` directory |
| 30 | No Terraform IaC | Critical | ❌ **OPEN** | No `terraform/` directory |
| 31 | No automation scripts | High | ❌ **OPEN** | No `scripts/` directory |
| 32 | No observability stack | High | ❌ **OPEN** | No `/metrics`, Prometheus, or Grafana |
| 33 | No `README.md` | Medium | ❌ **OPEN** | Still missing |
| 34 | **NEW:** No `.gitignore` | High | ⚠️ **NEW** | `node_modules` and `.env` files appear untracked in git status |
| 35 | **NEW:** `version: "3.8"` in docker-compose.yml | Low | ✅ **FIXED** | Removed obsolete `version` attribute during validation |

### Remaining Critical Blockers for Production

1. **No CI/CD** — no automated build, test, or deploy pipeline
2. **No Terraform** — no infrastructure as code for AWS deployment
3. **No frontend tests** — zero automated test coverage on the SPA
4. **No `.gitignore`** — node_modules and secrets could be committed accidentally
5. **Default admin seed** — `AdminPass123!` hardcoded in `backend/seeds/default_admin.js`
6. **No graceful shutdown** — SIGTERM not handled in `backend/src/server.js`
7. **No logging framework** — only `console.error` used throughout

---

*End of Audit Report*