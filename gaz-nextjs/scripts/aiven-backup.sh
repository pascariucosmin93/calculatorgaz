#!/bin/sh
set -eu

SOURCE_DATABASE_URL_FILE="${SOURCE_DATABASE_URL_FILE:-/run/secrets/database_url}"
TARGET_DATABASE_URL_FILE="${TARGET_DATABASE_URL_FILE:-/run/secrets/onprem_database_url}"
METRICS_FILE="${METRICS_FILE:-/var/www/metrics}"
WORK_DIR="${WORK_DIR:-/work}"
BACKUP_R2_ENDPOINT="${BACKUP_R2_ENDPOINT:-}"
BACKUP_R2_BUCKET="${BACKUP_R2_BUCKET:-}"
BACKUP_R2_ACCESS_KEY_FILE="${BACKUP_R2_ACCESS_KEY_FILE:-/run/secrets/backup_r2_access_key}"
BACKUP_R2_SECRET_KEY_FILE="${BACKUP_R2_SECRET_KEY_FILE:-/run/secrets/backup_r2_secret_key}"
# "scheduled" (implicit): dump, R2, restore on-prem și metrici.
# "pre-migration": doar dump și R2, rulat de deploy înaintea migrării Prisma.
BACKUP_MODE="${BACKUP_MODE:-scheduled}"
BACKUP_RUN_ID="${BACKUP_RUN_ID:-}"

write_metrics() {
  status="$1"
  timestamp="$2"
  duration="$3"
  r2_status="$4"
  r2_timestamp="$5"
  r2_size_bytes="$6"
  tmp="${METRICS_FILE}.tmp"
  cat > "$tmp" <<EOF
# HELP calculatorgaz_backup_last_success Whether the latest Aiven PostgreSQL backup and on-prem restore succeeded.
# TYPE calculatorgaz_backup_last_success gauge
calculatorgaz_backup_last_success ${status}
# HELP calculatorgaz_backup_last_success_timestamp_seconds Unix timestamp of the latest successful backup.
# TYPE calculatorgaz_backup_last_success_timestamp_seconds gauge
calculatorgaz_backup_last_success_timestamp_seconds ${timestamp}
# HELP calculatorgaz_backup_last_duration_seconds Duration of the latest backup attempt.
# TYPE calculatorgaz_backup_last_duration_seconds gauge
calculatorgaz_backup_last_duration_seconds ${duration}
# HELP calculatorgaz_backup_r2_last_success Whether the latest backup was uploaded and verified in Cloudflare R2.
# TYPE calculatorgaz_backup_r2_last_success gauge
calculatorgaz_backup_r2_last_success ${r2_status}
# HELP calculatorgaz_backup_r2_last_success_timestamp_seconds Unix timestamp of the latest successful R2 upload.
# TYPE calculatorgaz_backup_r2_last_success_timestamp_seconds gauge
calculatorgaz_backup_r2_last_success_timestamp_seconds ${r2_timestamp}
# HELP calculatorgaz_backup_r2_last_size_bytes Size in bytes of the latest PostgreSQL dump uploaded to R2.
# TYPE calculatorgaz_backup_r2_last_size_bytes gauge
calculatorgaz_backup_r2_last_size_bytes ${r2_size_bytes}
EOF
  chmod 0644 "$tmp"
  mv "$tmp" "$METRICS_FILE"
}

upload_to_r2() {
  test -n "$BACKUP_R2_ENDPOINT"
  test -n "$BACKUP_R2_BUCKET"
  test -s "$BACKUP_R2_ACCESS_KEY_FILE"
  test -s "$BACKUP_R2_SECRET_KEY_FILE"

  # The production image is intentionally the official PostgreSQL client image.
  # Install the S3 client on first run so the scheduled job stays self-contained.
  command -v aws >/dev/null 2>&1 || apk add --no-cache aws-cli ca-certificates

  export AWS_ACCESS_KEY_ID="$(cat "$BACKUP_R2_ACCESS_KEY_FILE")"
  export AWS_SECRET_ACCESS_KEY="$(cat "$BACKUP_R2_SECRET_KEY_FILE")"
  export AWS_DEFAULT_REGION="auto"
  export AWS_EC2_METADATA_DISABLED="true"

  if [ "$BACKUP_MODE" = "pre-migration" ]; then
    backup_key="calculatorgaz/pre-migration/$(date -u +%Y/%m/%d)/calculatorgaz-${BACKUP_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}.dump"
  else
    backup_key="calculatorgaz/aiven/$(date -u +%Y/%m/%d)/calculatorgaz-aiven-$(date -u +%Y%m%dT%H%M%SZ).dump"
  fi
  aws s3 cp "$dump_file" "s3://${BACKUP_R2_BUCKET}/${backup_key}" \
    --endpoint-url "$BACKUP_R2_ENDPOINT" \
    --only-show-errors
  aws s3api head-object --bucket "$BACKUP_R2_BUCKET" --key "$backup_key" \
    --endpoint-url "$BACKUP_R2_ENDPOINT" \
    --query ContentLength --output text >/dev/null
}

started_at="$(date +%s)"
mkdir -p "$WORK_DIR"
umask 077
dump_file="$WORK_DIR/calculatorgaz-aiven.dump"
trap 'rm -f "$dump_file"' EXIT

r2_status=0
r2_timestamp=0
r2_size_bytes=0

if [ "$BACKUP_MODE" = "pre-migration" ]; then
  if pg_dump --format=custom --compress=6 --no-owner --no-privileges \
      --dbname="$(cat "$SOURCE_DATABASE_URL_FILE")" --file="$dump_file" \
    && pg_restore --list "$dump_file" >/dev/null \
    && upload_to_r2; then
    echo "Pre-migration backup uploaded to R2 at $(date -Iseconds)."
    exit 0
  fi
  echo "Pre-migration backup failed at $(date -Iseconds)." >&2
  exit 1
fi

mkdir -p "$(dirname "$METRICS_FILE")"

if pg_dump --format=custom --compress=6 --no-owner --no-privileges \
    --dbname="$(cat "$SOURCE_DATABASE_URL_FILE")" --file="$dump_file" \
  && pg_restore --list "$dump_file" >/dev/null \
  && upload_to_r2; then
  r2_status=1
  r2_timestamp="$(date +%s)"
  r2_size_bytes="$(wc -c < "$dump_file" | tr -d ' ')"

  if pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error \
      --dbname="$(cat "$TARGET_DATABASE_URL_FILE")" "$dump_file"; then
    finished_at="$(date +%s)"
    write_metrics 1 "$finished_at" "$((finished_at - started_at))" "$r2_status" "$r2_timestamp" "$r2_size_bytes"
    echo "Aiven PostgreSQL backup uploaded to R2 and restored successfully at $(date -Iseconds)."
    exit 0
  fi
fi

finished_at="$(date +%s)"
write_metrics 0 0 "$((finished_at - started_at))" "$r2_status" "$r2_timestamp" "$r2_size_bytes"
echo "Aiven PostgreSQL backup failed at $(date -Iseconds)." >&2
exit 1
