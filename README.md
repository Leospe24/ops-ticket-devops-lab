# OpsTicket DevOps Project

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)](https://github.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Terraform%2FECS-orange)](https://aws.amazon.com/)

## 🎥 Project Demo Video

> 🎬 **Watch the 3-Minute OpsTicket Demo Video**: [Link to Video Demo](YOUR_VIDEO_URL_HERE)

## What this project is

OpsTicket is a simple IT support ticket app. It is also a beginner-friendly DevOps project that shows how a web app can be built, tested, containerized, and deployed to the cloud.

This project is good for learning because it touches many common DevOps topics without being too large. You can see how an application moves from local development into a cloud-style setup.

## Why this project matters for DevOps

This repo is a good learning project because it includes:

- a web app with a frontend and backend,
- a database for storing data,
- Docker for running services locally,
- GitHub Actions for automation,
- Terraform for creating cloud infrastructure,
- AWS services such as ECS, RDS, and a load balancer,
- basic backup and monitoring practices.

If you are new to DevOps, this project helps you understand the big picture before you go deeper into advanced tools.

## Main parts of the project

### 1. Application

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT and password hashing

### 2. Containers and local development

- Docker Compose is used to run the app locally.
- This helps you test the app in a setup that looks closer to production.

### 3. Cloud and infrastructure

- Terraform is used to define AWS resources.
- The project includes networking, a database, container services, and monitoring.
- This is a simple example of infrastructure as code.

### 4. Automation

- GitHub Actions runs CI checks.
- The workflow also helps build and deploy application images.

## How the app works

A user can:

- log in or register,
- view tickets,
- create new tickets,
- see ticket statistics.

The backend handles authentication and ticket logic. The frontend shows the data to the user. The database stores the information.

## Local setup

To run the project locally:

```bash
git clone <repo-url>
cd ops-ticket-devops-infrastructure
cp .env.example .env
docker compose up --build
```

After that:

- the frontend should be available in the browser,
- the backend API will be running,
- PostgreSQL will be available for local testing.

## Testing

Backend tests:

```bash
cd backend && npm test
```

Frontend tests:

```bash
cd frontend && npm test
```

## DevOps topics covered

This project is a good beginner example for learning:

- Docker and containers
- Environment variables and secrets
- CI/CD with GitHub Actions
- Infrastructure as Code with Terraform
- AWS basics such as ECS, RDS, and networking
- Monitoring and alerts
- Backup and recovery basics

## Project structure

```text
backend/         - Node.js API and database access
frontend/        - React app for the user interface
terraform/       - AWS infrastructure defined with Terraform
terraform-bootstrap/ - bootstrap resources for Terraform state
.github/workflows/ - CI/CD automation
scripts/         - helper scripts such as database backup
docker-compose.yml - local container setup
```

## System Architecture

<p align="center">
  <img src="opsticket-architecture.png" alt="OpsTicket Architecture Diagram" width="850"/>
</p>

The application architecture is structured as follows:

- **Frontend & Backend**: React SPA communicates with Node.js / Express REST API over HTTP/JSON.
- **Database Layer**: PostgreSQL handles persistent data storage with isolated migrations and seeds.
- **Cloud Infrastructure (AWS & Terraform)**:
  - **Multi-AZ VPC**: Public subnets (ALB), Private App subnets (ECS Fargate), and Private Data subnets (RDS).
  - **Application Load Balancer (ALB)**: Public entry point with path-based routing (`/api/*` $\rightarrow$ Backend port 3000, default $\rightarrow$ Frontend port 80).
  - **Amazon RDS PostgreSQL**: Private database instance with security group isolation allowing access only from ECS tasks.
- **CI/CD & Security**: GitHub Actions pipeline uses AWS OIDC role assumption (passwordless) for automated testing, DB backup verification, and deployment. Runtime secrets are managed via AWS SSM Parameter Store.

## What a beginner can learn from this project

This project is useful if you want to practice:

- how apps are packaged with Docker,
- how CI pipelines work,
- how infrastructure can be created with code,
- how cloud services connect together,
- how to think about security and secrets,
- how to explain a project in interviews.

## Next steps

If you want to continue learning, the next steps could be:

- add better monitoring and logs,
- improve deployment automation,
- add more AWS security practices,
- learn how to manage secrets in a more production-ready way,
- explore container orchestration beyond this basic setup.

## Summary

OpsTicket is not just a ticket app. It is also a simple DevOps learning project that shows how application code, infrastructure, and automation can work together.
