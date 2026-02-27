#!/usr/bin/env bash
set -euo pipefail

NS="${1:-gaz}"
BASE_URL="${2:-http://calculatorgaz.${NS}.svc.cluster.local}"
TAG="$(date +%s)"
USER="smoke${TAG}"
EMAIL="${USER}@example.com"
PASS="parola123"

# 1) signup
SIGNUP_PAYLOAD="{\"username\":\"$USER\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
SIGNUP_BODY="$(kubectl -n "$NS" run curl-smoke-signup --rm -i --restart=Never \
  --image=curlimages/curl:8.10.1 -- \
  -sS -X POST "$BASE_URL/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "$SIGNUP_PAYLOAD")"

USER_ID="$(printf '%s' "$SIGNUP_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [[ -z "$USER_ID" ]]; then
  echo "ERROR: signup failed or missing id"
  echo "$SIGNUP_BODY"
  exit 1
fi

# 2) reading
READING_PAYLOAD="{\"userId\":\"$USER_ID\",\"previousReading\":120.5,\"currentReading\":132.9,\"pcs\":10.548,\"gasPriceMwh\":171.44,\"transportPriceMwh\":13.8,\"distributionPriceMwh\":70.96,\"cap26PriceMwh\":-20.54,\"cap6PriceMwh\":-0.063,\"fixedFee\":0,\"vatRate\":0.21,\"includeVat\":true}"
READING_BODY="$(kubectl -n "$NS" run curl-smoke-reading --rm -i --restart=Never \
  --image=curlimages/curl:8.10.1 -- \
  -sS -X POST "$BASE_URL/api/readings" \
  -H 'Content-Type: application/json' \
  -d "$READING_PAYLOAD")"

READING_ID="$(printf '%s' "$READING_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [[ -z "$READING_ID" ]]; then
  echo "ERROR: reading create failed"
  echo "$READING_BODY"
  exit 1
fi

echo "OK: signup+reading succeeded"
echo "user=$USER userId=$USER_ID readingId=$READING_ID tag=$TAG"
