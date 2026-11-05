# CalculatorGaz

CalculatorGaz este o aplicație web pentru estimarea consumului și costului gazelor naturale. Utilizatorul își salvează citirile contorului, configurează tarifele sau importă o factură PDF, iar aplicația calculează consumul, costul estimat și evoluția în timp.

> Rezultatele sunt estimări informative. CalculatorGaz nu procesează plăți, nu emite facturi și nu înlocuiește factura furnizorului.

## Funcționalități

- calculează consumul: **m³ → kWh → MWh → cost estimat**;
- salvează profilul tarifar: PCS, gaz, transport, distribuție, plafonări, taxă fixă și TVA;
- importă facturi PDF, detectează tarifele și cere confirmarea înainte de aplicare;
- avertizează când tariful nou diferă neobișnuit de mult de profilul precedent;
- păstrează istoricul citirilor și permite corectarea sau ștergerea lor timp de 4 zile;
- compară consumul cu luna precedentă, aceeași lună din anul trecut și media proprie;
- estimează consumul și costul lunii curente din ultimele perioade de citire;
- semnalizează consum anormal față de istoricul utilizatorului;
- permite mai multe locații de consum per utilizator (maxim 10), fiecare cu adresă, serie contor, tarife, istoric tarife, citiri și facturi proprii; selectorul de locație apare când există cel puțin două;
- oferă autentificare, profil, notificări, suport și exporturi de raport.

## Arhitectură

```mermaid
flowchart LR
    U[Utilizator\nBrowser] -->|HTTPS| A[CalculatorGaz\nNext.js]

    subgraph K8s[Kubernetes · namespace gaz]
        A --> AUTH[auth-service]
        A --> SESSION[session-service]
        A --> READ[reading-service]
        A --> BILL[billing-service]
        A --> REPORT[reporting-service]
        A --> NOTIFY[notification-service]
        A --> INVOICE[invoice-service]
        A --> METRICS[admin-metrics-service]
        A --> DB[(PostgreSQL extern\nPrisma)]
    end

    INVOICE --> R2[Cloudflare R2\nPDF facturi]
    A -->|poze contor| R2
    METRICS --> OTEL[OpenTelemetry]
    NOTIFY --> DISCORD[Discord webhook]
    A -->|resetare parolă| SMTP[Brevo SMTP\nnoreply@cosmin-lab.com]
```

Next.js este punctul unic de intrare. Serviciile interne sunt accesibile numai din interiorul clusterului (network policies) și folosesc `INTERNAL_API_KEY`; browserul nu le apelează direct.

Diagrama editabilă este disponibilă și în [docs/architecture.drawio](docs/architecture.drawio); poate fi deschisă în [diagrams.net](https://app.diagrams.net/).

## Cum funcționează

### Citiri și calcul

1. Utilizatorul introduce indexul și data citirii.
2. Sistemul calculează m³, apoi kWh folosind PCS-ul profilului.
3. Costul este calculat din tarifele în lei/MWh, taxa fixă și TVA.
4. Citirea este salvată în PostgreSQL; istoricul, comparațiile, previziunea și alertele se actualizează.
5. În primele 4 zile citirea poate fi corectată sau ștearsă. Perioada următoare se recalculează pentru continuitatea indexului.

```text
consum_m3  = index_curent − index_anterior
consum_kWh = consum_m3 × PCS
consum_MWh = consum_kWh ÷ 1000
cost_variabil = consum_MWh × (gaz + transport + distribuție + ajustări)
total = (cost_variabil + taxă_fixă) × (1 + TVA)
```

### Import factură PDF

1. PDF-ul este încărcat în Cloudflare R2 și deduplicat cu hash SHA-256 per utilizator.
2. Parserul extrage secțiunea de gaze, PCS-ul, tarifele și adresa locului de consum.
3. Utilizatorul vede valorile detectate și avertismentele de diferență înainte de aplicare.
4. La refuz, fișierul și înregistrarea de upload sunt eliminate.

Parserul este în [gaz-nextjs/lib/invoices/parser.ts](gaz-nextjs/lib/invoices/parser.ts), cu teste de regresie inclusiv pentru facturi E.ON Duo.

### Resetarea parolei și emailul

1. Utilizatorul cere resetarea din pagina de login, cu numele de utilizator sau emailul. Răspunsul este mereu același, ca aplicația să nu confirme dacă un cont există.
2. `auth-service` generează un token aleator, valabil o oră, și îl salvează în baza de date. Un token nou îl înlocuiește pe cel anterior al aceluiași utilizator.
3. Linkul `/reset?token=…` este trimis:
   - **pe email** către utilizator, dacă contul are o adresă validă și SMTP-ul este configurat (expeditor `Cosmin Lab <noreply@cosmin-lab.com>`);
   - **pe Discord** către administrator, prin `notification-service`, pentru toate conturile, inclusiv cele fără email sau cu email fictiv.
4. Dacă trimiterea emailului eșuează, eroarea apare doar în logul aplicației; răspunsul către utilizator și notificarea Discord nu sunt afectate.

Codul este în [gaz-nextjs/lib/mailer.ts](gaz-nextjs/lib/mailer.ts) (Nodemailer, STARTTLS) și în ruta [forgot-password](gaz-nextjs/app/api/auth/forgot-password/route.ts). Rutele de resetare sunt limitate la 3, respectiv 5 cereri pe 15 minute, per IP.

Emailul este trimis prin Brevo (`smtp-relay.brevo.com:587`). Domeniul `cosmin-lab.com` este autentificat prin înregistrări DNS din Cloudflare (DKIM, DMARC și verificarea domeniului). Planul gratuit permite 300 de emailuri pe zi.

| Variabilă | Valoare | Sursă |
| --- | --- | --- |
| `SMTP_HOST`, `SMTP_PORT` | `smtp-relay.brevo.com`, `587` | `values.yaml` din `gaz-gitops` |
| `SMTP_USER` | loginul SMTP Brevo | cheia `smtp_user` din Secretul `gaz-secrets` |
| `SMTP_PASSWORD` | cheia SMTP | cheia `smtp_key` din Secretul `gaz-secrets` (prin `SMTP_PASSWORD_FILE`) |
| `MAIL_FROM` | `Cosmin Lab <noreply@cosmin-lab.com>` | `values.yaml` din `gaz-gitops` |

Fără aceste variabile, aplicația funcționează normal, dar linkul de resetare ajunge doar pe Discord. Pentru rotația cheii, actualizează `smtp_key` în Secretul `gaz-secrets` și repornește `calculatorgaz`.

## Structura repository-ului

```text
gaz-nextjs/                 aplicația Next.js, Prisma, teste și servicii proxy
  app/                      pagini, componente și API routes
  lib/                      calcul, forecast, parser facturi și validare
  prisma/                   schema și migrațiile PostgreSQL
  scripts/                  servicii interne Node.js și smoke checks
ops/                        scripturi de operare (curățare Docker)
.github/workflows/           CI, scanări de securitate și deploy
```

## Rulare locală

Cerințe: Node.js 22, PostgreSQL 16+ și npm.

```bash
cd gaz-nextjs
npm ci
```

Creează `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/gaz"
```

Aplică schema și pornește aplicația:

```bash
npx prisma migrate deploy
npm run dev
```

Aplicația este disponibilă la `http://localhost:3000`.

### Verificări locale

```bash
npm run test:all
npm exec tsc -- --noEmit
npm run build
```

## Docker și producție

Imaginea principală este construită din [gaz-nextjs/Dockerfile](gaz-nextjs/Dockerfile). Rulează fără utilizator root și are healthcheck la `GET /api/health`.

Producția rulează pe Kubernetes (k3s). Manifestele sunt în repo-ul separat **`gaz-gitops`** (chart Helm în `k8s/chart`, livrat cu Argo CD). Migrarea Prisma rulează ca job `PreSync` la fiecare sincronizare; PostgreSQL-ul este extern.

### Secrete

Secretele nu se versionază. Sunt păstrate în Secretul Kubernetes `gaz-secrets` (namespace `gaz`); cheile folosite sunt cele din `calculatorgaz.secretEnv` și `secretFiles` din `gaz-gitops/k8s/chart/values.yaml` (inclusiv `SMTP_USER`, `SMTP_PASSWORD`, `JWT_SECRET`).

Vezi [POSTGRES_REPLICATION.md](POSTGRES_REPLICATION.md) pentru infrastructura PostgreSQL externă și failover.

## CI/CD

| Workflow | Eveniment | Ce rulează |
| --- | --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | Pull request | lint, Vitest, TypeScript, build Next.js, Gitleaks, npm audit, Semgrep, Hadolint, Trivy (imagini) și SBOM |
| [`ci.yml`](.github/workflows/ci.yml) | Push pe `main` | aceleași verificări, apoi publică imaginile scanate `gaz:<sha>` și `gaz:migrator-<sha>` (fără deploy) |
| [`release.yml`](.github/workflows/release.yml) | Manual (**Prod**) | promovează imaginile unui commit la o versiune și actualizează `gaz-gitops` |

Secrete GitHub Actions:

```text
GAZ_GITOPS_TOKEN  PAT GitHub cu drept de scriere (Contents) în repo-ul gaz-gitops
SONAR, SONAR_HOST_URL   opționale: analiza SonarQube se sare dacă lipsesc
(imaginile se publică în GHCR cu GITHUB_TOKEN; nu e nevoie de secrete de registry)
```

### Release în producție

Din **Actions**, rulează **Prod** pe `main` cu versiunea în format `X.Y.Z`.

1. Commitul HEAD de pe `main` trebuie să aibă imaginile `gaz:<sha>` publicate de CI; altfel release-ul este refuzat. Imaginile nu se reconstruiesc: exact imaginea scanată primește tag-urile `gaz:X.Y.Z` și `gaz:migrator-X.Y.Z`.
2. Workflow-ul actualizează în `gaz-gitops` tag-urile imaginilor (`calculatorgaz.image.tag`, `migrator.tag`), copiază scripturile microserviciilor în `k8s/chart/scripts/`, verifică chart-ul cu `helm lint`/`helm template`, apoi comite și împinge.
3. Argo CD sincronizează clusterul: rulează migrarea Prisma (hook `PreSync`), apoi actualizează aplicația stable cu rolling update.
4. Workflow-ul creează release-ul GitHub `vX.Y.Z`. O versiune existentă se redeployează din commitul ei (rollback).

## Securitate și date

- parolele sunt stocate hash-uit;
- tokenul de resetare a parolei este aleator (32 de octeți), valabil o oră, iar linkul se trimite pe email doar către adresa contului;
- rutele interne cer cheia de serviciu, iar rutele cu mutații sunt protejate CSRF;
- middleware-ul aplică rate limiting per IP și poate consulta o blocklist DDoS;
- facturile și pozele de contor sunt izolate per utilizator prin cheie R2 (pozele se servesc doar proprietarului), iar facturile au și hash de deduplicare;
- logurile de audit pentru login nu păstrează identificatorul utilizatorului, IP-ul, emailul sau credențiale;
- CI blochează secrete hardcodate și vulnerabilități `HIGH`/`CRITICAL` din imagine sau configurație.

## Observabilitate și operațiuni

Aplicația trimite telemetrie OpenTelemetry către collectorul `otel-collector` din namespace-ul `observability`. Endpointurile de sănătate sunt disponibile pentru aplicație și serviciile interne.

```bash
kubectl -n gaz get pods
kubectl -n gaz logs -f deploy/calculatorgaz
```


## Contribuții

1. Creează un branch cu scop clar.
2. Adaugă sau actualizează testele relevante.
3. Rulează verificările locale.
4. Deschide un pull request; deploy-ul în producție se face numai după merge în `main`.
