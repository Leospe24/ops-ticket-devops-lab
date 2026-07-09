# ⚡ OpsTicket — IT Support, Cloud-Native

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)](https://github.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)](https://www.docker.com/)
[![Node](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)

---

## What I Built

I built OpsTicket because I wanted a real project that actually touched every layer of the stack — frontend, backend, database, and infrastructure. It's an IT support ticket system where users can create tickets, engineers get assigned to handle them, and admins have a bird's-eye view of everything. Think of it as the internal tool your company's IT department wishes they had.

This is my DevOps portfolio piece. I didn't want another to-do app or a weather widget — I wanted something that showed I understand how production systems actually work. So I wired up Docker Compose for local dev, GitHub Actions for CI, PostgreSQL for data persistence, and JWT for authentication. I learned a ton building it, and honestly some of the lessons (like why graceful shutdown matters) only clicked once I saw them break in practice.

The goal was to build something interview-ready. Not perfect, but honest — a project I can walk through and explain every design decision.

---

## Tech Stack

| Layer       | Technology                       |
|-------------|----------------------------------|
| Frontend    | React 18 + Vite 5               |
| Backend     | Node.js 18 + Express 4 + Knex 3 |
| Database    | PostgreSQL 16                   |
| Auth        | JWT + bcrypt                    |
| Testing     | Jest (backend), Vitest (frontend) |
| Containers  | Docker + Docker Compose         |
| CI/CD       | GitHub Actions                  |

---

## Quick Start (Local)

Clone the repo, drop in your env file, and spin everything up with one command:

```bash
git clone <repo>
cd ops-ticket
cp .env.example .env
docker compose up --build
```

That's it. Docker Compose will provision PostgreSQL, the Node.js API, and the React frontend. The backend runs on port 3001, the frontend on port 5173, and Postgres on 5432.

---

## Running Tests

**Backend:**
```bash
cd backend && npm test
```

**Frontend:**
```bash
cd frontend && npm test
```

Backend tests cover API routes and database logic. Frontend tests use Vitest for components and hooks.

---

## CI/CD Pipeline

Every push to `main` triggers the GitHub Actions pipeline:

1. **Build** — Packages the Docker stack (backend + frontend + Postgres).
2. **Spin up services** — Brings up PostgreSQL for integration testing.
3. **Run tests** — Executes the Jest test suite against the live database.
4. **Health check** — Verifies the API responds healthy on its `/health` endpoint.
5. **Teardown** — Tears down the stack cleanly.

The pipeline is designed to catch issues before anything touches production. No manual deploys, no "works on my machine" surprises.

---

## Key Features

- Role-based access control (admin, engineer, user)
- Rate-limited auth endpoints to prevent brute-force attacks
- DB-aware health checks that verify the database connection is alive
- Graceful shutdown on SIGTERM — no dropped requests during deploys
- Zero hardcoded secrets — everything fails fast if env vars are missing
- Transaction-safe database migrations using Knex
- Structured multi-stage Docker builds for smaller, more secure images

---

## Project Structure

```
ops-ticket/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.js
│   ├── tests/
│   └── knexfile.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   └── vite.config.js
├── scripts/
├── terraform/
├── docker-compose.yml
└── roadmap.md
```

---

## Architecture

```
                        ┌─────────────┐
                        │   CloudFront│
                        │  (React SPA)│
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │     ALB     │
                        │   ( HTTPS ) │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │           AWS VPC               │
              │ ┌─────────────────────────────┐ │
              │ │     ECS Fargate             │ │
              │ │  (Node.js API container)    │ │
              │ └────────────┬────────────────┘ │
              │              │                   │
              │ ┌────────────▼────────────────┐ │
              │ │     RDS PostgreSQL          │ │
              │ │      (Private Subnet)       │ │
              │ └─────────────────────────────┘ │
              └─────────────────────────────────┘
```

The frontend is a static SPA served via CloudFront. All API traffic hits an Application Load Balancer over HTTPS, which routes to the ECS Fargate container running the Node.js backend. The database lives in a private subnet — unreachable directly from the internet.

---

## What I Learned

Building this project taught me things that textbooks skip:

- **Multi-stage Docker builds** reduce the final image size dramatically. Shipping only what the app needs means fewer attack surfaces and faster cold starts.
- **`rejectUnauthorized: false` in production DB connections is a red flag** — it disables TLS certificate verification. I learned to treat SSL as non-negotiable for any connection that touches production.
- **Database migrations should be wrapped in transactions** — if a migration partially fails, you want it to roll back cleanly rather than leave the schema in a broken state.
- **Graceful shutdown prevents dropped requests** — when ECS sends SIGTERM during a new deployment, the server needs time to finish in-flight requests before exiting. Without it, users get connection errors for no good reason.
- **Liveness vs readiness probes are different things** — a liveness probe tells Kubernetes "is this container alive?" A readiness probe tells it "is this container ready to receive traffic?" Confusing the two leads to flaky deployments.

---

## Next Steps

This is a living project. Here's what's on the roadmap:

- **CD pipeline** — Auto-deploy to ECS on merge to main (not just CI).
- **Prometheus + Grafana** — Observability so we can actually see what's happening in production.
- **AWS deployment** — Get this running on real infrastructure with proper networking and secrets management.

