# Gaz Platform - Technical Documentation

## 1. Overview

This repository contains a gas consumption and cost platform built as a **Next.js application + internal microservices** deployed in Kubernetes (`namespace: gaz`).

Main capabilities:
- User signup/login/profile
- Gas reading submission and billing calculation
- Reporting (monthly aggregates, compare, CSV/PDF export)
- Notifications to Discord
- Password reset flow
- Invoice PDF upload and tariff autofill (SeaweedFS/S3)

## 2. Repository Structure

- `gaz-nextjs/`: Next.js app (frontend + API routes)
- `k8s/`: Kubernetes manifests for all services
- `.github/workflows/`: CI workflows (build and tests)
- `argocd/`: Argo CD application manifests/configs
- `scripts/`: utility scripts

## 3. Runtime Architecture

### 3.1 Entry Point
- Public app service: `calculatorgaz` (`LoadBalancer`)
- Internal API calls from frontend go through Next.js API routes (`/api/*`)

### 3.2 Services

| Service | Port | Role |
|---|---:|---|
| `calculatorgaz` | 3000 | Next.js frontend + internal API implementation |
| `auth-service` | 8083 | signup/login/profile proxy |
| `password-reset-service` | 8086 | reset request/confirm proxy |
| `reading-service` | 8084 | readings CRUD proxy |
| `billing-service` | 8080 | billing compute engine |
| `reporting-service` | 8081 | reports and CSV/PDF exports |
| `notification-service` | 8082 | Discord notifications |
| `invoice-service` | 8087 | invoice upload proxy |

All service manifests are under `k8s/*.yaml`.

## 4. Key Flows

### 4.1 Auth Flow
1. Frontend calls `/api/auth/*`.
2. Next.js route proxies to `auth-service`.
3. `auth-service` proxies to internal Next.js routes (`/api/internal/auth/*`).
4. Prisma writes/reads users in PostgreSQL.

### 4.2 Password Reset Flow (Hardened)
1. User requests reset via `/api/auth/reset-password`.
2. System creates `PasswordResetToken` record.
3. Notification contains link with **opaque `rid`** (no raw token in URL).
4. Confirm endpoint validates by `rid` (or legacy token fallback) and updates password hash.

### 4.3 Reading + Billing Flow
1. Frontend submits reading to `/api/readings`.
2. `reading-service` forwards to internal reading route.
3. Billing is computed via `billing-service` (with local fallback if service unavailable).
4. Result is persisted and notification is sent.

### 4.4 Invoice Upload + Tariff Autofill
1. Frontend uploads PDF in Settings form to `/api/invoices/upload`.
2. `invoice-service` forwards multipart payload to internal route.
3. Internal route stores PDF in SeaweedFS S3 bucket `facturi`.
4. Basic text extraction + city profile (`auto`/`bucuresti`/`iasi`) returns tariff profile.
5. Frontend applies returned values into billing settings fields.

## 5. Storage and External Systems

### 5.1 PostgreSQL
- Main relational store for users, readings, password reset records.
- Accessed via Prisma.

### 5.2 SeaweedFS S3
- Endpoint: `https://s3.galeata.devjobs.ro`
- Bucket: `facturi`
- Used by invoice upload flow.

### 5.3 Discord Webhooks
- Used for notification events and reset links.
- Webhook URLs must be stored in Kubernetes Secrets, not in Git.

## 6. Kubernetes Deployment Model

### 6.1 Namespace
- `gaz`

### 6.2 Public exposure
- `calculatorgaz` is `Service type: LoadBalancer` and externally reachable.

### 6.3 Autoscaling
- HPA manifest: `k8s/calculatorgaz-hpa.yaml`
- Target: CPU 80%, Memory 80%
- Replicas: min `1`, max `10`

### 6.4 Resource Requests/Limits
Configured in manifests:
- `calculatorgaz`: req `200m/256Mi`, lim `1000m/512Mi`
- most services: req `100m/128Mi`, lim `500m/256Mi`
- `notification-service`: req `50m/64Mi`, lim `300m/192Mi`

## 7. Configuration and Secrets

### 7.1 Secret sources
- Application secrets are loaded via `secretKeyRef`.
- CI registry credentials are loaded from Forgejo/Git secrets.

### 7.2 Required secret keys (`calculatorgaz-secrets`)
- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD`
- `DISCORD_RESET_WEBHOOK_URL`
- `SEAWEED_S3_ACCESS_KEY`
- `SEAWEED_S3_SECRET_KEY`

### 7.3 Notification secret
- `notification-service-secrets` must contain:
  - `DISCORD_WEBHOOK_URL`

## 8. CI/CD

### 8.1 Build pipeline
- Workflow: `.github/workflows/kube-build.yml`
- Builds and pushes image tags for Kubernetes deployment.

### 8.2 Separate tests pipeline
- Workflow: `.github/workflows/tests-docker.yml`
- Runs tests on dedicated runner label `docker-tests`.

### 8.3 GitOps
- Argo CD syncs manifests from repo (`k8s/` path) to cluster.

## 9. Operations Runbook

### 9.1 Quick health checks
```bash
kubectl -n gaz get deploy,pod,svc
kubectl -n gaz get hpa
kubectl -n gaz top pod
```

### 9.2 Verify autoscaling
```bash
kubectl -n gaz describe hpa calculatorgaz
```

### 9.3 Common failure: `CreateContainerConfigError`
- Usually missing secret referenced by env var.
- Check:
```bash
kubectl -n gaz describe pod <pod-name>
kubectl -n gaz get secret
```

### 9.4 Check notification service
```bash
kubectl -n gaz logs deploy/notification-service
```

### 9.5 Check invoice upload path
```bash
kubectl -n gaz logs deploy/calculatorgaz
kubectl -n gaz logs deploy/invoice-service
```

## 10. Security Notes

- Do not commit raw credentials or webhooks.
- Rotate registry, DB, and webhook credentials periodically.
- Password reset links use opaque request id (`rid`) to avoid exposing reset token in URL.
- Admin account deletion is blocked in admin users API.

## 11. Known Gaps / Next Improvements

- Replace heuristic PDF parsing with robust extraction pipeline (OCR + template matching).
- Add audit trail for admin actions.
- Add integration tests for invoice upload and tariff autofill.
- Add network policies between services for stricter east-west traffic control.

---
Document owner: Platform/Gaz team
