# Gaz Platform - Documentație tehnică

## 1. Arhitectură

Platforma este o aplicație Next.js cu Prisma/PostgreSQL și servicii interne stateless:

| Serviciu | Port | Rol |
|---|---:|---|
| `calculatorgaz` | 3000 | UI, API și acces Prisma |
| `auth-service` | 8083 | autentificare și profil |
| `session-service` | 8088 | sesiuni/JWT |
| `billing-service` | 8080 | calcul facturare |
| `reading-service` | 8084 | citiri index |
| `reporting-service` | 8081 | rapoarte și exporturi |
| `notification-service` | 8082 | notificări Discord (inclusiv cererile de resetare a parolei) |
| `invoice-service` | 8087 | upload facturi |
| `admin-metrics-service` | 8089 | metrici pentru panoul de administrare |
| `postgress.cosmin.home` | 5432 | endpoint PostgreSQL extern (VIP) |

## 2. Kubernetes

Producția rulează pe k3s. Manifestele (chart Helm, `k8s/chart`) sunt în repo-ul **`gaz-gitops`** și sunt aplicate de Argo CD:
un push în `gaz-gitops` sincronizează clusterul. Aplicația folosește PostgreSQL extern, iar conexiunea este
citită din secretul `database_url_app` (valoarea nu este stocată în documentație sau în repository).

Secretele sunt în Secretul Kubernetes `gaz-secrets` (namespace `gaz`); cheile folosite sunt în `gaz-gitops/k8s/chart/values.yaml`.
Migrațiile Prisma rulează ca job `PreSync` (`templates/calculatorgaz/migrator-job.yaml`), înainte de actualizarea aplicației.

Traficul vine prin Cloudflare și tunelul `cloudflared` către Service-ul `calculatorgaz:3000`.

## 3. CI/CD

`.github/workflows/ci.yml` rulează două job-uri, al doilea condiționat de succesul primului:

1. **`quality`** — instalează dependențele, generează clientul Prisma, rulează testele, verificarea TypeScript și build-ul de producție;
2. **`security`** — scanare de securitate (vezi [SECURITY_SCANNING.md](SECURITY_SCANNING.md)), apoi construiește și scanează imaginile aplicației și migratorului și, pe `main`, le publică în registry ca `gaz:<sha>` și `gaz:migrator-<sha>`.

`.github/workflows/release.yml` (**Prod**, manual) promovează imaginile unui commit la o versiune `X.Y.Z`
și actualizează `gaz-gitops`.

Secrete GitHub Actions necesare:

```text
GAZ_GITOPS_TOKEN (PAT GitHub cu drept de scriere în gaz-gitops)
SONAR, SONAR_HOST_URL (opționale)
```

Credențialele Brevo pentru emailul de resetare a parolei (`smtp_user`, `smtp_key`) sunt chei din Secretul `gaz-secrets`; aplicația le citește prin `SMTP_PASSWORD_FILE`.

## 4. Verificări operaționale

```bash
kubectl -n gaz get pods
kubectl -n gaz logs -f deploy/calculatorgaz
kubectl -n gaz get events --sort-by=.lastTimestamp
```

## 5. Dependențe externe rămase

- Cloudflare R2 (S3) pentru stocarea facturilor PDF și a pozelor de contor;
- Discord webhook pentru notificări;
- Brevo SMTP (`smtp-relay.brevo.com:587`, expeditor `noreply@cosmin-lab.com`) pentru emailul de resetare a parolei; dacă lipsește, linkul ajunge doar pe Discord;
- registry-ul Docker pentru imaginile aplicației.
