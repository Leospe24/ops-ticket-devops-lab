# Ops-Ticket: Full-Stack IT Support Portal & DevOps Lifecycle Engine

Ops-Ticket is a production-ready, three-tier IT Ticketing and Incident Management system. This repository showcases a complete DevOps lifecycle: from local containerized development to a secure, decoupled, highly available cloud infrastructure on AWS, complete with automated CI/CD and production monitoring.

---

## 🛠️ The Tech Stack

- **Frontend:** React.js (Single Page Application)
- **Backend API:** Node.js (Express) / Python (FastAPI)
- **Database:** PostgreSQL
- **Infrastructure & Automation:** Terraform, Docker, GitHub Actions, Boto3, Bash
- **Observability:** Prometheus & Grafana

---

## 🏗️ System Architecture

The project transitions from an all-in-one containerized local environment to a highly secure, decoupled managed-service architecture on AWS.

### Architectural Highlights:

- **Optimized Frontend Hosting:** To minimize production costs and leverage global caching, the production frontend drops the local Docker layer. It is hosted as a static application on **AWS S3** and distributed globally via **Amazon CloudFront (CDN)**.
- **Network Isolation:** The infrastructure is locked down inside a custom **AWS VPC**. The backend application servers and the database live strictly within **Private Subnets**, entirely hidden from the public internet.
- **Public Entry Point:** Public traffic is gated through an **AWS Application Load Balancer (ALB)**, which acts as the sole proxy forwarding verified traffic to the backend containers.
- **Serverless Compute:** The backend API container runs on **AWS ECS Fargate**, completely removing OS management and infrastructure overhead.
- **Managed Data Tier:** Database persistence is migrated from local Docker volumes to a multi-AZ **AWS RDS PostgreSQL** instance, utilizing automated backups and storage scaling.

---

## 📦 Local Development (Docker Compose)

For local development, the full stack is containerized to ensure an isolated environment that mirrors cloud environment variables.

### To spin up the environment locally:

```bash
# Clone the repository
git clone [https://github.com/yourusername/ops-ticket.git](https://github.com/yourusername/ops-ticket.git)
cd ops-ticket

# Start all three tiers simultaneously
docker compose up --build
```

Note: The frontend includes a Dockerfile utilizing a multi-stage Nginx build strictly for local testing and architectural portability.

## 🚀 The CI/CD Pipeline (GitHub Actions)

The deployment pipeline is triggered on every git push to main, automatically splitting into two parallel workflows optimized for modern cloud delivery:

```text
┌──> Build Backend Image ──> Push to AWS ECR ──> Deploy to ECS Fargate (Zero-Downtime)
[GitHub Actions CI/CD] ┤
└──> Compile Production Assets ──> AWS CLI Sync ──> Host on AWS S3 / CloudFront
```

Backend Pipeline: Lints code → Builds Docker Image → Scans for Vulnerabilities → Pushes to AWS ECR → Triggers a rolling deployment on AWS ECS Fargate.

Frontend Pipeline: Compiles code to a production static dist/ folder → Synchronizes assets directly to AWS S3 via the AWS CLI → Invalidate CloudFront cache.

## 🤖 Automation & Reporting (Boto3 & Bash)

This repository includes a /scripts directory containing operational automation tools written in Bash and Python (Boto3) to simulate real-world system administration:

```text
backup-db.sh: A database backup script that runs pre-deployment, dumping data out of the system safely.

aws_cost_optimizer.py: A Python Boto3 script triggered weekly via GitHub Actions that scans the AWS account for orphaned resources (e.g., unattached EBS volumes, old S3 file versions), compiling a text-based Optimization Report sent to the administrator.
```

## 📊 Observability (Prometheus & Grafana)

The production backend containers expose a /metrics endpoint.

Prometheus is deployed to scrape performance metrics continuously (API latency, HTTP error rate tracking, request volume).

Grafana visualizes this data through a custom metrics dashboard, allowing real-time identification of application bottlenecks or server strains.

## 📂 Repository Directory Layout

```text
├── .github/workflows/
│ └── deploy.yml # Complete Dual-Track CI/CD Pipeline
├── backend/
│ ├── src/ # Node.js/Python API Code
│ └── Dockerfile # Production API Dockerfile
├── frontend/
│ ├── src/ # React Application Code
│ └── Dockerfile # Local Nginx Multi-stage Dockerfile
├── terraform/
│ ├── vpc.tf # Public/Private Subnet Networking
│ ├── ecs.tf # ECS Fargate & ALB Configuration
│ ├── rds.tf # PostgreSQL Managed Database
│ └── s3_cloudfront.tf # Frontend Hosting & CDN
└── scripts/
├── backup-db.sh # Bash Maintenance Script
└── aws_cost_optimizer.py # Boto3 Cloud Financial Report Engine
```
