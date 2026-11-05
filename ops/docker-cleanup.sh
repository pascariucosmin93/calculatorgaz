#!/bin/sh
# Prune unused Docker resources to reclaim disk space.
# Safe by default: never touches volumes, never touches images/containers
# still referenced by a running or stopped task.
#
# Deploy on each Docker node as /root/script/clear.sh, then in crontab -e:
#   0 19 * * 0 /root/script/clear.sh >> /var/log/docker-cleanup.log 2>&1

set -eu

DOCKER_ROOT="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

disk_usage_percent() {
  df -P "${DOCKER_ROOT}" | awk 'NR==2 { gsub("%","",$5); print $5 }'
}

log "=== docker-cleanup start (root=${DOCKER_ROOT}) ==="
log "Disk usage before: $(disk_usage_percent)%"

# Stopped containers not touched in 24h.
docker container prune -f --filter "until=24h" || true

# Dangling and unused images not touched in 24h.
# -a removes unused (not just dangling) images not referenced by any
# container, but leaves alone anything a running/stopped container still needs.
docker image prune -a -f --filter "until=24h" || true

# Unused build cache not touched in 24h.
docker builder prune -f --filter "until=24h" || true

# Unused networks (never affects running services).
docker network prune -f || true

log "Disk usage after: $(disk_usage_percent)%"
log "=== docker-cleanup end ==="
