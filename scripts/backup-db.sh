#!/usr/bin/env bash
#
# backup-db.sh — Production-ready PostgreSQL backup script for OpsTicket
#
# Usage:
#   ./scripts/backup-db.sh
#
# Description:
#   Sources the root .env, dumps the PostgreSQL database using docker exec,
#   saves the backup with a YYYYMMDD_HHMMSS timestamp, and cleans up files
#   older than 7 days.
#
# Requirements:
#   - Docker daemon running
#   - ops-postgres container up
#   - .env file present in project root
#
###############################################################################

set -euo pipefail

# --- Configuration -----------------------------------------------------------

# Determine script location and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
BACKUP_DIR="$PROJECT_ROOT/backups"
CONTAINER_NAME="ops-postgres"
RETENTION_DAYS=7

# --- Helpers -----------------------------------------------------------------

log() {
  printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "backup-db" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

# --- Validate environment ----------------------------------------------------

if [[ ! -f "$ENV_FILE" ]]; then
  die ".env file not found at $ENV_FILE"
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${DB_NAME:?DB_NAME is not set in .env}"
: "${DB_USER:?DB_USER is not set in .env}"
: "${DB_PASSWORD:?DB_PASSWORD is not set in .env}"

log "Starting backup for database: $DB_NAME"

# --- Validate Docker & container ---------------------------------------------

if ! command -v docker &>/dev/null; then
  die "docker command not found. Is Docker installed and in PATH?"
fi

if ! docker info &>/dev/null; then
  die "Docker daemon is not running or user lacks permissions."
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  die "Postgres container '$CONTAINER_NAME' is not running."
fi

# --- Prepare backup directory ------------------------------------------------

mkdir -p "$BACKUP_DIR" || die "Failed to create backup directory: $BACKUP_DIR"

TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_GZ="${BACKUP_FILE}.gz"

log "Backup target: $BACKUP_GZ"

# --- Perform dump ------------------------------------------------------------

log "Executing pg_dump inside container '$CONTAINER_NAME'..."

if ! docker exec -i "$CONTAINER_NAME" \
  pg_dump \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    > "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE"
  die "pg_dump failed — backup aborted and partial file removed."
fi

# --- Compress ----------------------------------------------------------------

log "Compressing backup..."

if ! gzip -f "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE"
  die "gzip compression failed — removing partial file."
fi

# --- Verify ------------------------------------------------------------------

if [[ ! -s "$BACKUP_GZ" ]]; then
  rm -f "$BACKUP_GZ"
  die "Backup file is empty or missing after compression."
fi

FILE_SIZE=$(du -h "$BACKUP_GZ" | cut -f1)
log "Backup completed successfully: $BACKUP_GZ ($FILE_SIZE)"

# --- Cleanup old backups -----------------------------------------------------

log "Cleaning up backups older than $RETENTION_DAYS days..."

# Use find with -mtime +N (N full days ago)
# -delete is safer than -exec rm {} \; when used alone, but we log first.
# shellcheck disable=SC2144
OLD_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.gz" -mtime +"$RETENTION_DAYS" | wc -l)

if [[ "$OLD_COUNT" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -name "*.gz" -mtime +"$RETENTION_DAYS" -print -delete
  log "Deleted $OLD_COUNT old backup(s)."
else
  log "No old backups to clean up."
fi

log "Backup process finished."
exit 0
