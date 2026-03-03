# 🔒 Security Scanning Pipeline

Documentație pentru pipeline-ul de security scanning implementat pentru proiectul GAZ Calculator.

## 📋 Overview

Pipeline-ul de security include 5 scanuri independente:

1. **NPM Audit** - Verifică vulnerabilități în dependențele Node.js
2. **Semgrep SAST** - Static Application Security Testing (vulnerabilități în cod)
3. **Trivy Filesystem** - Scanează fișiere din filesystem (configurări, secreturi, etc.)
4. **Trivy Docker Image** - Scanează imagini Docker (layers, packages)
5. **SBOM Generation** - Generează Software Bill of Materials (pentru supply chain security)
6. **License Check** - Verifică conformitatea licențelor open-source

---

## 🔄 Workflows & Execution Order

### Pipeline Flow:
```
PUSH TO MAIN
    ↓
security-scan.yml (RUN FIRST - BLOCKING)
    ├── npm-audit → ❌ BLOCKS if CRITICAL found
    ├── semgrep-sast → ❌ BLOCKS if CRITICAL found
    ├── trivy-filesystem → ❌ BLOCKS if CRITICAL found
    ├── sbom-generation → (always succeeds)
    ├── license-check → (non-blocking)
    ├── summary → (report generation)
    └── check-status → GATE DECISION
            ↓
            ✅ ALL PASS → Proceed to build
            ❌ FAIL → STOP HERE (no build, no push)
                      ↓
                    Developer fixes issues
                      ↓
                    Retry push
    ↓
kube-build.yml (RUN ONLY IF SECURITY PASSES)
    ├── NPM Audit pre-build
    ├── Build Image
    ├── Trivy Docker Scan
    ├── Push to Registry
    └── Update GitOps → ArgoCD Deploy
```

### 1. `security-scan.yml` (Runs on PR & Push to main) - **BLOCKING GATE**

**Trigger:**
- Pull requests către `main`
- Push-uri către `main` în folderul `gaz-nextjs/`
- Manual trigger (`workflow_dispatch`)

**Jobs:**
```
├── npm-audit (Dependencies) → ❌ FAIL on CRITICAL
├── semgrep-sast (Code analysis) → ❌ FAIL on CRITICAL
├── trivy-filesystem (File scanning) → ❌ FAIL on CRITICAL
├── sbom-generation (Syft) → ✅ always succeeds
├── license-check (Open source) → ✅ non-blocking
├── summary (Report generation)
└── check-status (GATE DECISION)
```

**Output:**
- `npm-audit-report/npm-audit.json` - NPM audit rezultate
- `semgrep-report/semgrep-report.json` - SAST găsiri
- `trivy-filesystem-report/trivy-filesystem.sarif` - File scan (SARIF format)
- `sbom-reports/sbom-spdx.json` - SBOM SPDX format
- `sbom-reports/sbom-cyclonedx.json` - SBOM CycloneDX format
- `license-report/licenses.json` - License compliance

**Gate Logic:**
- ❌ BLOCKS build if: NPM CRITICAL, Semgrep CRITICAL, Trivy CRITICAL found
- ✅ Allows build if: All scans pass

### 2. `kube-build.yml` (Modified - Build & Push) - **RUNS ONLY AFTER SECURITY PASSES**

**Dependencies:**
- Waits for `security-scan.yml` workflow to complete successfully
- Only runs if security gate passed

**Proceder:**
```
Wait for Security Pass → Checkout → Install → NPM Audit → Build Image → Trivy Scan → Push → Update GitOps
```

---

## 🔧 Configurație & Threshold-uri

### NPM Audit
```bash
# ❌ BLOCKS on CRITICAL vulnerabilities
npm audit --json > npm-audit.json
CRITICAL=$(jq '[.vulnerabilities[] | select(.severity=="critical")] | length' npm-audit.json)
if [ $CRITICAL -gt 0 ]; then exit 1; fi
```
**Action:** ❌ **BLOCKS build** dacă găsește CRITICAL

### Semgrep
```
Rulează cu:
- p/security-audit (OWASP, common vulnerabilities)
- p/owasp-top-ten
- p/typescript (TypeScript-specific rules)
```
**Action:** ❌ **BLOCKS build** pe CRITICAL severity issues

### Trivy Filesystem
```
- Severity: CRITICAL
- Exit code: 1 (blocks on CRITICAL)
- Reports: HIGH + CRITICAL
- Format: SARIF (integrare GitHub Security)
```
**Action:** ❌ **BLOCKS build** dacă găsește CRITICAL

### Trivy Docker Image (in kube-build.yml)
```
- Severity: CRITICAL, HIGH
- Exit code: 0 (non-blocking, informational)
```
**Action:** ⚠️ Reports issues dar nu blochează

### License Check
```
Licențe permise:
- MIT
- Apache-2.0
- BSD
- ISC
- MPL-2.0
```
**Action:** ⚠️ Non-blocking (for informational purposes)

---

## 📊 Viewing Results

### GitHub UI
1. **Pull Requests** → "Checks" tab → "Security Scanning" job
2. **Actions** → Selectează workflow-ul → Downloadează artifacts
3. **Security** tab (dacă e enabled) → Vulnerability alerts

### Download Reports
```bash
# Downloadează toate rapoartele
gh run download <run-id> -D ./security-reports/
```

### Local Preview
```bash
# View npm audit
jq . < npm-audit-report/npm-audit.json

# View SBOM
jq . < sbom-reports/sbom-spdx.json

# View Semgrep
jq '.results' < semgrep-report/semgrep-report.json
```

---

## ⚙️ Advanced Configuration

### Ignora Specific CVE-uri
Dacă trebuie să ignori o vulnerabilitate cunoscută:

**Trivy (docker image):**
```yaml
# Adaug în kube-build.yml, în step "Scan image"
--ignore-cve CVE-XXXX-XXXXX
```

**NPM Audit:**
```bash
npm audit --omit=dev  # Ignore devDependencies
```

### Semgrep Custom Rules
Dacă vrei custom rulesets:
```yaml
# În security-scan.yml
semgrep --config=p/custom-rules --config=p/security-audit
```

### Failure Threshold
Pentru a bloca build-ul pe vulnerabilități CRITICAL:

```yaml
# În kube-build.yml
- name: Trivy - Fail on CRITICAL
  run: |
    # Setează exit-code 1 pentru CRITICAL vulnerabilities
    trivy image --exit-code 1 --severity CRITICAL $IMAGE_REF
```

---

## 📝 Best Practices

### 1. Regular Updates
```bash
# Updatează dependencies lunar
npm outdated
npm update
```

### 2. Monitor Semgrep Findings
- Review-ează și fixează HIGH/CRITICAL issues
- Acceptă LOW/MEDIUM după caz de caz

### 3. License Compliance
- Nu adaugă dependențe cu licențe GPL/AGPL fără aprobarea arhitectului
- Yearly review de licențe în dependențe

### 4. SBOM Usage
- Distribute SBOM cu releases pentru supply chain transparency
- Monitor SBOMs pentru vulnerabilități NOU descoperite

### 5. Container Security
- Update Node.js base image lunar
- Monitor Trivy alerts pentru OS-level vulnerabilities

---

## 🚨 Remediation Examples

### NPM High Vulnerability
```bash
cd gaz-nextjs
npm audit fix  # Auto-fix dacă available
npm outdated   # Verific ce package cauzeaza
npm update package-name  # Update specific package
```

### Trivy Finding
```bash
# Cauta vulnerability pe aquasec.github.io/trivy
# Implementeaza fix (update base image, patch library, etc)
```

### Semgrep Issue
```bash
# Review găsire în code
# Fixeaza siguranța (validate input, use safe API, etc)
```

---

## 📞 Support

Pentru probleme:
1. Check GitHub Actions logs: `Actions` tab → Run details
2. Downloadează artifact-ul complet pentru detalii
3. Consulta [Trivy docs](https://aquasecurity.github.io/trivy/)
4. Consulta [Semgrep docs](https://semgrep.dev/r)
5. Consulta [Syft docs](https://github.com/anchore/syft)

---

## 🔄 Integration cu ArgoCD

GitOps workflow-ul va:
1. Build-ul declanșează security scans
2. Daca build-ul push-u imagini cu succes
3. `gaz-gitops` repo se update-aza automat cu noul tag
4. ArgoCD detectează change și deploy-u noua versiune

**Nu ai nimic de configurat** - everything flows automatically! 🚀
