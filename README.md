# CalculatorGaz Platform

`CalculatorGaz` is split across two repositories:

- `calculatorgaz`
  application code, CI/CD workflows, and Argo CD application manifests
- `gaz-gitops`
  the Helm chart tracked by Argo CD for Kubernetes deployments

This README is a technical sketch of the application and infrastructure so it is easy to understand how the platform is assembled.

## High-Level Overview

The delivery flow is:

1. you push code to `calculatorgaz`
2. GitHub Actions runs tests, scanning, image builds, and smoke tests
3. if everything passes, it publishes versioned images to GHCR using `0.0.x`
4. the workflow updates `gaz-gitops`
5. Argo CD detects the new commit in `gaz-gitops` and syncs the cluster

There is also a separate manual `promote` workflow:

- it starts from an already tested version such as `0.0.42`
- it promotes that image to `1.0.0`, `1.0`, `1`, and `latest`
- it can optionally update `gaz-gitops` to the promoted version

## Repositories

### `calculatorgaz`

Contains:

- the main Next.js application in [`gaz-nextjs`](/Users/cosmin.pascariu/calculatorgaz/gaz-nextjs)
- the OCR service in [`ocr-service`](/Users/cosmin.pascariu/calculatorgaz/ocr-service)
- GitHub Actions workflows in [`.github/workflows`](/Users/cosmin.pascariu/calculatorgaz/.github/workflows)
- Argo CD manifests in [`argocd`](/Users/cosmin.pascariu/calculatorgaz/argocd)

### `gaz-gitops`

Contains:

- the Helm chart in [`k8s/chart`](/Users/cosmin.pascariu/gaz-gitops/k8s/chart)
- image configuration, resources, gateway settings, and microservice definitions

Argo CD should track `gaz-gitops`, not the application repository.

## Application Architecture

The platform has two main runtime components:

- `calculatorgaz`
  the primary Next.js application that provides the UI, API routes, and PostgreSQL access through Prisma
- `ocr-service`
  a separate internal HTTP service used for OCR

The Helm chart also generates several small support services from `values.yaml`:

- `billing-service`
- `reporting-service`
- `auth-service`
- `reading-service`
- `invoice-service`
- `password-reset-service`
- `notification-service`
- `session-service`

Some of these are fully stateless, while others act as thin proxies toward internal Next.js endpoints.

## Request Flow

At a logical level:

1. a user reaches the public hostname
2. traffic enters the cluster through Cloudflare and the Kubernetes routing layer
3. the gateway routes the request:
   - either directly to backend microservices
   - or to the main `calculatorgaz` application
4. `calculatorgaz` talks to:
   - PostgreSQL for persistent data
   - `ocr-service` for OCR processing
   - internal or external services for invoices, notifications, and sessions

## Kubernetes

The cluster setup includes:

- the `gaz` namespace
- a Helm chart for the application and support services
- `LoadBalancer` services for components that must be advertised through BGP
- Gateway API resources for HTTP routing
- Argo CD for GitOps delivery

The Helm chart in `gaz-gitops` defines:

- deployments for `calculatorgaz` and `ocr-service`
- generated deployments and services for support microservices
- Gateway and HTTPRoutes
- network policies
- backup cronjobs

Relevant files:

- [`values.yaml`](/Users/cosmin.pascariu/gaz-gitops/k8s/chart/values.yaml)
- [`templates/calculatorgaz/deployment.yaml`](/Users/cosmin.pascariu/gaz-gitops/k8s/chart/templates/calculatorgaz/deployment.yaml)
- [`templates/ocr-service/deployment.yaml`](/Users/cosmin.pascariu/gaz-gitops/k8s/chart/templates/ocr-service/deployment.yaml)
- [`templates/gateway/gateway.yaml`](/Users/cosmin.pascariu/gaz-gitops/k8s/chart/templates/gateway/gateway.yaml)
- [`templates/gateway/httproutes.yaml`](/Users/cosmin.pascariu/gaz-gitops/k8s/chart/templates/gateway/httproutes.yaml)

## Argo CD

The Argo CD application manifests are in:

- [`application-calculatorgaz.yaml`](/Users/cosmin.pascariu/calculatorgaz/argocd/application-calculatorgaz.yaml)
- [`application-calculatorgaz-test.yaml`](/Users/cosmin.pascariu/calculatorgaz/argocd/application-calculatorgaz-test.yaml)

Their role is to tell Argo CD:

- which repository to track
- which path inside the repository to apply
- which namespace to deploy into

In practice, the deployment source of truth is `gaz-gitops`.

## CI/CD

Important workflows:

- [`ghcr-build.yml`](/Users/cosmin.pascariu/calculatorgaz/.github/workflows/ghcr-build.yml)
  the main push-to-main pipeline
- [`promote.yml`](/Users/cosmin.pascariu/calculatorgaz/.github/workflows/promote.yml)
  the manual promotion workflow
- [`security-scan.yml`](/Users/cosmin.pascariu/calculatorgaz/.github/workflows/security-scan.yml)
  additional security scanning
- [`tests-docker.yml`](/Users/cosmin.pascariu/calculatorgaz/.github/workflows/tests-docker.yml)
  standalone test execution

### Main Pipeline

On every push to `main`, the main workflow performs:

1. unit tests
2. dependency scanning
3. Docker image builds
4. smoke tests
   it starts `postgres`, `ocr-service`, and `calculatorgaz`
5. image push to GHCR
6. `gaz-gitops` update

The automatically published tags are:

- a short `sha` tag for traceability
- a `0.0.x` tag for automatic deployment

`latest` is no longer used by the automatic pipeline.

### Manual Promotion

The `promote.yml` workflow takes:

- `source_tag`, for example `0.0.42`
- `release_version`, for example `1.0.0`
- `update_gitops`, a boolean

It then creates:

- `1.0.0`
- `1.0`
- `1`
- `latest`

This gives you:

- `0.0.x` for automatic delivery
- `1.x.x` for stable manual releases

## Registry

Images are published to GHCR:

- `ghcr.io/pascariucosmin93/calculatorgaz`
- `ghcr.io/pascariucosmin93/ocr-service`

If you want to avoid `imagePullSecret` in the cluster, the simplest option is to keep these GHCR images public.

## Data and External Dependencies

Main external dependencies:

- PostgreSQL
- SeaweedFS / S3-compatible object storage
- Discord webhooks
- Cloudflare for public access
- Argo CD for GitOps deployment

## Required Secrets

For GitHub Actions in `calculatorgaz`, the repository needs:

- `GITOPS_PUSH_USER`
- `GITOPS_PUSH_TOKEN`

Inside Kubernetes, the application needs secrets such as:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD`
- `INTERNAL_API_KEY`
- S3 credentials
- webhook and operational secrets

## Quick Structure

```text
calculatorgaz/
├── .github/workflows/
│   ├── ghcr-build.yml
│   ├── promote.yml
│   ├── security-scan.yml
│   └── tests-docker.yml
├── argocd/
│   ├── application-calculatorgaz.yaml
│   └── application-calculatorgaz-test.yaml
├── gaz-nextjs/
│   ├── app/
│   ├── lib/
│   ├── prisma/
│   └── tests/
└── ocr-service/
```

```text
gaz-gitops/
└── k8s/chart/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── calculatorgaz/
        ├── gateway/
        ├── microservices/
        ├── ocr-service/
        ├── backup/
        └── network-policies.yaml
```

## In Short

- code and CI/CD live in `calculatorgaz`
- deployment state and runtime configuration live in `gaz-gitops`
- Argo CD syncs `gaz-gitops`
- pushing to `main` produces a `0.0.x` deployment version
- manual promotion produces a stable `1.x.x` release
