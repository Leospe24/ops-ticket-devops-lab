# 🛣️ OpsTicket — Engineering & Infrastructure Roadmap

This document outlines the planned architectural enhancements and operational milestones for **OpsTicket**. While the current platform demonstrates a fully containerized, IaC-driven AWS deployment, this roadmap defines the trajectory toward full enterprise production readiness.

---

## 🎯 Architectural Vision

Transition OpsTicket from a baseline DevOps portfolio project to an enterprise-grade, zero-trust, highly available cloud platform.

---

## 📌 Phase 1: Security & Identity Hardening
> **Focus**: Zero-Trust Security, Compliance & Secret Lifecycle

- [ ] **HTTPS & Custom Domain**: Issue AWS ACM TLS/SSL certificates and attach HTTPS (Port 443) listeners to the Application Load Balancer.
- [ ] **AWS WAF (Web Application Firewall)**: Attach AWS WAF to the ALB with rate-limiting rules and OWASP Top 10 protection against SQLi and XSS.
- [ ] **Secrets Rotation**: Automate AWS SSM Parameter Store / Secrets Manager password and JWT secret rotation.
- [ ] **HttpOnly Cookie Authentication**: Migrate JWT tokens from browser `localStorage` to encrypted `httpOnly` secure cookies.

---

## 📌 Phase 2: High Availability, Resilience & Scaling
> **Focus**: Autoscaling, Database Redundancy & Disaster Recovery

- [ ] **ECS Fargate Autoscaling**: Implement Target Tracking Scaling policies for ECS tasks based on CPU and Memory utilization thresholds.
- [ ] **RDS Multi-AZ Deployment**: Upgrade Amazon RDS PostgreSQL instance to Multi-AZ standby replica for zero-downtime failover.
- [ ] **Read Replicas & Connection Pooling**: Add PgBouncer and an RDS Read Replica to offload heavy read queries from the primary DB.
- [ ] **Cross-Region Backups**: Configure automated cross-region replication for database backups and S3 Terraform state storage.

---

## 📌 Phase 3: Advanced Observability & Telemetry
> **Focus**: Metrics, Distributed Tracing & Proactive Alerting

- [ ] **Prometheus & Grafana**: Expose Prometheus `/metrics` endpoints on backend containers and build Grafana dashboards for API golden signals (Latency, Traffic, Errors, Saturation).
- [ ] **AWS X-Ray Distributed Tracing**: Instrument Express.js API middleware with AWS X-Ray to trace requests across ALB → ECS → RDS.
- [ ] **Structured JSON Logging**: Implement Pino/Winston structured logging and stream container stdout directly to CloudWatch Logs Insights.

---

## 📌 Phase 4: CI/CD & GitOps Maturity
> **Focus**: Zero-Downtime Deployments & Automated Quality Gates

- [ ] **ECS Blue/Green Deployments**: Integrate AWS CodeDeploy for blue/green zero-downtime deployments with automatic rollback on CloudWatch alarm triggers.
- [ ] **End-to-End (E2E) Testing**: Add Playwright / Cypress integration tests in the GitHub Actions CI pipeline.
- [ ] **Container Vulnerability Scanning**: Integrate Snyk or Trivy security scanning in GitHub Actions before pushing images to Amazon ECR.
