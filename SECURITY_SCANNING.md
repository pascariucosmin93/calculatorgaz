# Security scanning pipeline

Documentație pentru scanările de securitate rulate în `.github/workflows/ci.yml`.

## Overview

Scanările rulează în job-ul **`security`**, care depinde de succesul job-ului
`quality` (teste, typecheck, build). Pe `main`, ultimul pas publică imaginile
`gaz:<sha>`; workflow-ul **Prod** promovează doar imagini care există, deci
doar commituri care au trecut toate scanările.

**Trigger:** `push` pe `main`, `pull_request`, sau `workflow_dispatch` (aceleași
condiții ca restul pipeline-ului — nu există filtrare pe cale de fișiere).

## Pipeline flow

```
push / pull_request
    ↓
quality (teste, tsc, build)
    ↓
security  ← BLOCANT
    ├── Gitleaks              → oprește la orice secret detectat
    ├── npm audit              → gaz-nextjs (doar dependențele de producție), HIGH sau CRITICAL
    ├── Semgrep SAST           → oprește la orice finding
    ├── Hadolint               → gaz-nextjs/Dockerfile
    ├── build imagini          → aplicație, migrator
    ├── Trivy image scan       → ambele, HIGH/CRITICAL (ignoră CVE-uri fără fix)
    ├── SBOM (Syft, CycloneDX) → aplicație, artifact GitHub
    └── push imagini <sha>     → doar push pe main
    ↓
Prod (manual) → promovează <sha> la X.Y.Z, fără rebuild
```

Versiunile scannerelor sunt fixate în `ci.yml`; actualizarea lor este o
schimbare explicită, nu o surpriză la următorul build.

## Configurație & threshold-uri

### Gitleaks
Scanează tot repo-ul (`--no-git`, config din [`.gitleaks.toml`](.gitleaks.toml)).
Blochează la orice secret găsit, inclusiv regulile custom pentru variabilele de
deploy cunoscute.

### npm audit
```bash
npm audit --audit-level=high
```
Blochează la vulnerabilități `high` sau `critical` în dependențele
`gaz-nextjs`.

### Semgrep SAST
```bash
semgrep --config=p/security-audit --config=p/owasp-top-ten --config=p/typescript --error
```
`--error` face ca orice finding să întoarcă exit code diferit de zero —
blochează pipeline-ul indiferent de severitate.

### Hadolint
Scanează `gaz-nextjs/Dockerfile`, `--failure-threshold error`.

### Trivy — image scan
```bash
trivy image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL "${image}"
```
Rulează pentru imaginea aplicației și migrator. Imaginile de rulare nu
conțin npm (scos după instalare), ca vulnerabilitățile dependențelor lui să nu
blocheze build-ul.

### SBOM
Generat cu Syft, format CycloneDX JSON (`sbom-cyclonedx.json`), urcat ca artifact GitHub (`sbom-${sha}`, retenție 10 zile). Nu se generează și format
SPDX.

## Vizualizarea rezultatelor

Pipeline-ul rulează în **GitHub Actions**:

1. Repo → tab **Actions** → selectează rularea → jobul `security` → logurile
   fiecărui pas.
2. Artifactul SBOM se descarcă din pagina rulării (secțiunea Artifacts).

Nu există raportare SARIF, tab de Security separat sau integrare cu o
platformă externă de securitate — totul e vizibil doar în logurile job-ului și
în artifactul SBOM.

## Ignorarea unui CVE cunoscut

**Trivy (image scan):** adaugă `--ignore-unfixed` este deja activ implicit
pentru pasul blocant; pentru un CVE cu fix disponibil pe care vrei totuși
să-l ignori temporar, adaugă în workflow:
```yaml
--ignore-cve CVE-XXXX-XXXXX
```

**npm audit:** pentru a exclude devDependencies din audit:
```bash
npm audit --omit=dev --audit-level=high
```

## Bune practici

1. **Actualizări regulate** — `npm outdated` / `npm update` lunar în
   `gaz-nextjs`.
2. **Semgrep** — orice finding blochează build-ul; nu există un nivel
   "acceptat" — findings trebuie rezolvate sau regula ajustată explicit.
3. **Imagine de bază** — actualizează imaginea `node:22-alpine` periodic
   pentru a reduce findings Trivy la nivel de OS.
4. **SBOM** — folosește artifactul CycloneDX pentru audit de supply chain la
   nevoie; nu e generat sau păstrat automat în afara celor 10 zile de
   retenție GitHub.

## Remediere

### npm audit
```bash
cd gaz-nextjs
npm audit fix
npm outdated
npm update <package>
```

### Trivy
Verifică findingul pe [aquasec.github.io/trivy](https://aquasecurity.github.io/trivy/),
actualizează imaginea de bază sau pachetul afectat.

### Semgrep
Revizuiește findingul în cod, aplică fix-ul (validare input, API sigur etc.).

### Hadolint
Corectează instrucțiunea semnalată din `gaz-nextjs/Dockerfile` conform
[regulilor Hadolint](https://github.com/hadolint/hadolint#rules).

## Integrare cu livrarea

1. `security` validează codul și imaginile, apoi (pe `main`) publică
   `gaz:<sha>` și `gaz:migrator-<sha>`.
2. Workflow-ul manual **Prod** promovează aceste imagini la `X.Y.Z` și
   actualizează repo-ul GitOps `gaz-gitops`; Argo CD aplică schimbarea în cluster.
   Detalii în [README.md](README.md#release-în-producție).

Secretele necesare sunt documentate în [README.md](README.md).
