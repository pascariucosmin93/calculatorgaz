# GAZ Calculator Platform

Gas consumption and cost calculator with OCR, billing, reporting, and microservices architecture.

## Architecture

```
                         ┌─────────────────────────────────────────────────────┐
                         │                   Kubernetes (ns: gaz)              │
                         │                                                     │
    Internet             │  ┌─────────────────────────────────────────────┐    │
       │                 │  │         Cilium Gateway API (.54)            │    │
       │   DNS (.53)     │  │           gaz-gateway:80                    │    │
       ▼                 │  └──────┬──────────┬──────────────┬────────────┘    │
  ┌─────────┐            │         │          │              │                 │
  │ CloudF. │────────────┼────►    │          │              │                 │
  └─────────┘            │         │          │              │                 │
                         │         │ direct   │ direct       │ proxy           │
                         │         ▼          ▼              ▼                 │
                         │  ┌───────────┐ ┌────────────┐ ┌──────────────┐     │
                         │  │ billing   │ │ reporting  │ │calculatorgaz │     │
                         │  │ :8080     │ │ :8081      │ │ Next.js:3000 │     │
                         │  │ stateless │ │ stateless  │ │ frontend+API │     │
                         │  └───────────┘ └─────┬──────┘ └──────┬───────┘     │
                         │                      │               │              │
                         │                      │        ┌──────┼──────┐       │
                         │                      ▼        ▼      ▼      ▼       │
                         │                ┌─────────┐ ┌────┐ ┌────┐ ┌──────┐  │
                         │                │reading  │ │auth│ │inv.│ │pw-   │  │
                         │                │:8084    │ │8083│ │8087│ │reset │  │
                         │                └────┬────┘ └──┬─┘ └──┬─┘ │8086  │  │
                         │                     │         │      │   └──┬───┘  │
                         │                     │         ▼      ▼      ▼       │
                         │                     │    ┌──────────────────────┐   │
                         │                     └───►│  /api/internal/*    │   │
                         │                          │  (Next.js + Prisma) │   │
                         │                          └─────────┬──────────┘   │
                         │                                    │               │
                         │                                    ▼               │
                         │                             ┌────────────┐         │
                         │                             │ PostgreSQL │         │
                         │                             │ (postgress │         │
                         │                             │  namespace)│         │
                         │                             └────────────┘         │
                         │                                                     │
                         │  Other: session-service:8088 (JWT sign/verify)     │
                         │         notification-service:8082 (Discord)        │
                         └─────────────────────────────────────────────────────┘
```

### Routing (Cilium Gateway API)

**Direct la microservicii** (fara Next.js hop):
| Gateway Path | Backend | Rewrite |
|---|---|---|
| `POST /api/calculate` | billing-service:8080 | `/calculate` |
| `GET /api/reports/monthly` | reporting-service:8081 | `/report/monthly` |
| `GET /api/reports/export/csv` | reporting-service:8081 | `/report/export.csv` |
| `GET /api/reports/export/pdf` | reporting-service:8081 | `/report/export.pdf` |

**Prin Next.js** (necesita sesiune/Prisma):
`/api/auth/*`, `/api/readings`, `/api/invoices/*`, `/api/ocr`, `/api/admin/*`, `/api/health`, `/api/settings`, `/api/csrf`

**Blocat la Gateway** (404, fara HTTPRoute):
`/api/internal/*` - accesibil doar din cluster via `X-Internal-Api-Key`

## Repositories

| Repo | Continut | Forgejo |
|---|---|---|
| `gaz` (acesta) | Next.js app + CI workflows + ArgoCD manifests | cosmin/gaz |
| `gaz-gitops` | Helm chart Kubernetes (values + templates) | cosmin/gaz-gitops |

### Structura `gaz`
```
gaz-nextjs/          # Next.js app (frontend + API routes)
  app/
    api/             # API endpoints (auth, readings, reports, admin, internal)
    components/      # React components (ProfileForm, SettingsForm, etc.)
  lib/               # Business logic (billing, types, formatting, Prisma)
  prisma/            # DB schema
  tests/             # Vitest tests
  middleware.ts      # CSRF, rate limiting, internal API protection
.github/workflows/   # Forgejo Actions (kube-build, tests-docker, security-scan)
argocd/              # ArgoCD Application manifests
```

### Structura `gaz-gitops`
```
k8s/chart/
  Chart.yaml
  values.yaml           # Toata configuratia + scripturile microserviciilor
  templates/
    calculatorgaz/       # Deployment, Service, HPA
    microservices/       # ConfigMap, Deployment, Service (generate din values)
    gateway/             # Gateway + HTTPRoutes (Cilium Gateway API)
    backup/              # CronJobs (DB + Secrets backup la S3)
    network-policies.yaml
```

## Services

| Service | Port | Tip | Rol |
|---|---:|---|---|
| `calculatorgaz` | 3000 | Next.js | Frontend + API proxy + Prisma |
| `billing-service` | 8080 | Stateless | Calcul cost gaz (m3 → kWh → MWh → lei) |
| `reporting-service` | 8081 | Stateless | Rapoarte lunare, CSV/PDF export |
| `reading-service` | 8084 | Proxy | CRUD citiri (via /api/internal) |
| `auth-service` | 8083 | Proxy | Signup/login/profile (via /api/internal) |
| `invoice-service` | 8087 | Proxy | Upload facturi PDF (via /api/internal) |
| `password-reset-service` | 8086 | Proxy | Reset parola (via /api/internal) |
| `session-service` | 8088 | Stateless | JWT sign/verify (HS256) |
| `notification-service` | 8082 | Stateless | Discord webhooks |

**Stateless** = self-contained, nu apeleaza /api/internal
**Proxy** = forward la Next.js /api/internal/* cu `X-Internal-Api-Key`

## Database (PostgreSQL + Prisma)

**Models**: `User`, `Reading`, `PasswordResetToken`
- Users: username, email, passwordHash (bcryptjs), address
- Readings: meter values, consumption (m3/kWh), costs, linked to user
- PasswordResetToken: hashed token, expiration, linked to user

Host: `postgres.postgress.svc.cluster.local:5432`, DB: `gaz`

## External Systems

| System | Endpoint | Rol |
|---|---|---|
| PostgreSQL | `postgres.postgress.svc.cluster.local` | Main datastore |
| SeaweedFS S3 | `https://s3.galeata.devjobs.ro` | Stocare facturi (bucket: `facturi`) |
| Discord Webhooks | secret | Notificari + link-uri reset parola |
| Container Registry | `registry.infraejobs.ro` | Docker images |

## Security

### Middleware (middleware.ts)
- **Rate limiting**: 10 req/min pe IP pentru login/signup/reset
- **CSRF**: token in cookie `gaz-csrf`, validat via header `x-csrf-token`
- **Internal API**: `/api/internal/*` blocat fara header `X-Internal-Api-Key`
- **Reset domain**: `RESET_PASSWORD_BASE_URL` separat pentru link-uri reset

### Network Policies
- Default deny ingress in namespace
- Fiecare microserviciu: ingress doar de la calculatorgaz (+ kube-system pentru servicii gateway-exposed)
- Egress: DNS + callback la calculatorgaz + inter-service + PostgreSQL + HTTPS extern

### Security Scanning (CI)
- **NPM Audit**: vulnerabilitati in dependinte
- **Semgrep SAST**: analiza statica (OWASP, TypeScript)
- **Trivy**: scan filesystem + Docker image (CRITICAL, HIGH)
- **SBOM**: SPDX + CycloneDX (Syft)
- **License Check**: conformitate licente open-source

## CI/CD

### Forgejo Actions (`.github/workflows/`)

| Workflow | Runner | Trigger | Rol |
|---|---|---|---|
| `security-scan.yml` | `docker25` | PR, push main | NPM audit, Semgrep, Trivy, SBOM |
| `kube-build.yml` | `docker25` | push main | Build Docker → push registry → update gitops tag |
| `tests-docker.yml` | `docker-tests` | PR, push main | Vitest tests |

### GitOps Flow
```
Push to gaz/main
  → Forgejo Actions: test + security scan + build
  → kube-build: push image, update tag in gaz-gitops/values.yaml
  → ArgoCD: auto-sync gaz-gitops Helm chart to cluster
```

ArgoCD: auto-sync cu `prune: true` + `selfHeal: true`

## Kubernetes

- **Namespace**: `gaz`
- **Ingress**: Cilium Gateway API pe `10.40.10.54` + LoadBalancer pe `10.40.10.53`
- **IP Pool**: pool-2 (`10.40.10.50-110`), BGP advertised
- **HPA**: calculatorgaz, min 1 / max 10, CPU 70%, Memory 70%

### Secrets necesare

`calculatorgaz-secrets`:
- `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD`
- `DISCORD_RESET_WEBHOOK_URL`
- `SEAWEED_S3_ACCESS_KEY`, `SEAWEED_S3_SECRET_KEY`
- `INTERNAL_API_KEY`, `JWT_SECRET`

`notification-service-secrets`:
- `DISCORD_WEBHOOK_URL`

`backup-s3-credentials`:
- S3 credentials pentru backup CronJobs

### Backup CronJobs
- **DB dump**: zilnic la 02:00, retenție 30 zile → S3 `backup-db`
- **Secrets export**: zilnic la 03:00, retenție 30 zile → S3 `backup-secrets-gaz`

## Operations

```bash
# Status
kubectl -n gaz get deploy,pod,svc
kubectl -n gaz get gateway,httproute
kubectl -n gaz get hpa
kubectl -n gaz top pod

# Logs
kubectl -n gaz logs deploy/calculatorgaz
kubectl -n gaz logs deploy/billing-service
kubectl -n gaz logs deploy/reporting-service

# Gateway check
kubectl -n gaz get gateway          # ADDRESS + Programmed: True
kubectl -n gaz get httproute        # Toate rutele active

# Common issue: CreateContainerConfigError = missing secret
kubectl -n gaz describe pod <pod-name>
kubectl -n gaz get secret
```
