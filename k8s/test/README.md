# k8s/test

Manifeste pentru un mediu de test separat, destinat imaginilor generate din PR.

## ArgoCD
- `Repo URL`: `http://10.13.13.101:8085/cosmin/gaz`
- `Path`: `k8s/test`
- `Revision`: branch-ul de test sau `main`
- `Namespace`: `gaz-test`

## Componente
- `calculatorgaz-test.yaml` - aplicația de test (DB `gaz_test`)
- `elasticsearch.yaml` - Elasticsearch single-node (fără auth, doar pentru test)
- `kibana.yaml` - Kibana pentru inspectarea indexurilor

## Imagine folosită
Implicit este setată imaginea:
- `registry.infraejobs.ro/infra/gaz/calculatorgaz:pr-latest`

Dacă vrei un PR/commit anume, schimbă tag-ul din deployment la:
- `registry.infraejobs.ro/infra/gaz/calculatorgaz:pr-<PR_NUMBER>-<SHORT_SHA>`

## Search API (test)
Cu Elasticsearch configurat, aplicația expune:
- `GET /api/search/readings?userId=<id>&q=<text>&size=20`
