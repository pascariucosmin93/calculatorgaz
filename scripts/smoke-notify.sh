#!/usr/bin/env bash
set -euo pipefail

NS="${1:-gaz}"
TAG="$(date +%s)"

kubectl -n "$NS" run curl-smoke-notify --rm -i --restart=Never \
  --image=curlimages/curl:8.10.1 -- \
  -sS -X POST http://notification-service.${NS}.svc.cluster.local:8082/notify \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"SMOKE NOTIFY\",\"details\":{\"tag\":\"$TAG\",\"source\":\"smoke-notify.sh\"}}"

echo
echo "OK: notification sent (tag=$TAG)"
