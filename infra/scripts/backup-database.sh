#!/bin/bash
#
# FitVibe Database Backup Script
# Version: 1.0
# Purpose: Create encrypted PostgreSQL database backups
#
# Usage: ./backup-database.sh [environment]
# Example: ./backup-database.sh production
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fitvibe/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
ENVIRONMENT="${1:-development}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fitvibe_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

# Load environment-specific configuration
case "$ENVIRONMENT" in
    production)
        DB_HOST="${PGHOST:-db.fitvibe.app}"
        DB_PORT="${PGPORT:-5432}"
        DB_NAME="${PGDATABASE:-fitvibe}"
        DB_USER="${PGUSER:-fitvibe}"
        GPG_RECIPIENT="${GPG_RECIPIENT:-backups@fitvibe.app}"
        S3_BUCKET="${S3_BUCKET:-s3://fitvibe-backups-prod/postgres}"
        ;;
    staging)
        DB_HOST="${PGHOST:-db.staging.fitvibe.app}"
        DB_PORT="${PGPORT:-5432}"
        DB_NAME="${PGDATABASE:-fitvibe}"
        DB_USER="${PGUSER:-fitvibe}"
        GPG_RECIPIENT="${GPG_RECIPIENT:-backups@fitvibe.app}"
        S3_BUCKET="${S3_BUCKET:-s3://fitvibe-backups-staging/postgres}"
        ;;
    development)
        DB_HOST="${PGHOST:-localhost}"
        DB_PORT="${PGPORT:-5432}"
        DB_NAME="${PGDATABASE:-fitvibe}"
        DB_USER="${PGUSER:-fitvibe}"
        GPG_RECIPIENT="${GPG_RECIPIENT:-dev@fitvibe.app}"
        S3_BUCKET="${S3_BUCKET:-}"  # No S3 for dev
        ;;
    *)
        error "Unknown environment: $ENVIRONMENT"
        echo "Usage: $0 [production|staging|development]"
        exit 1
        ;;
esac

# Create backup directory
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# Pre-flight checks
log "Starting backup for environment: $ENVIRONMENT"
log "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

if ! command -v pg_dump &> /dev/null; then
    error "pg_dump not found. Please install PostgreSQL client tools."
    exit 1
fi

if ! command -v gpg &> /dev/null; then
    error "gpg not found. Please install GnuPG."
    exit 1
fi

# Test database connection
log "Testing database connection..."
if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
    error "Cannot connect to database. Check credentials and network."
    exit 1
fi

# Create backup
log "Creating backup: $BACKUP_FILE"
PGPASSWORD="$PGPASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    2>&1 | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Encrypt backup
log "Encrypting backup with GPG..."
gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Backup encrypted: $ENCRYPTED_FILE"
    # Remove unencrypted backup
    rm -f "$BACKUP_FILE"
else
    error "Encryption failed. Keeping unencrypted backup."
    exit 1
fi

ENCRYPTED_SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
log "Encrypted backup size: $ENCRYPTED_SIZE"

# Generate checksum
log "Generating checksum..."
sha256sum "$ENCRYPTED_FILE" > "${ENCRYPTED_FILE}.sha256"
log "Checksum saved: ${ENCRYPTED_FILE}.sha256"

# Upload to S3 (production/staging only)
if [ -n "$S3_BUCKET" ]; then
    if command -v aws &> /dev/null; then
        log "Uploading to S3: $S3_BUCKET"
        aws s3 cp "$ENCRYPTED_FILE" "$S3_BUCKET/" --storage-class STANDARD_IA
        aws s3 cp "${ENCRYPTED_FILE}.sha256" "$S3_BUCKET/"
        log "Backup uploaded to S3"
    else
        warn "AWS CLI not found. Skipping S3 upload."
    fi
fi

# Create backup metadata
cat > "${ENCRYPTED_FILE}.meta" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "backup_file": "$ENCRYPTED_FILE",
  "size_bytes": $(stat -f%z "$ENCRYPTED_FILE" 2>/dev/null || stat -c%s "$ENCRYPTED_FILE"),
  "checksum_sha256": "$(cat ${ENCRYPTED_FILE}.sha256 | cut -d' ' -f1)"
}
EOF

# Cleanup old backups (local only; S3 uses lifecycle policies)
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "fitvibe_${ENVIRONMENT}_*.sql.gz.gpg" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "fitvibe_${ENVIRONMENT}_*.sha256" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "fitvibe_${ENVIRONMENT}_*.meta" -type f -mtime +$RETENTION_DAYS -delete

log "Backup completed successfully: $ENCRYPTED_FILE"

# Send notification (optional)
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Database backup completed for $ENVIRONMENT: $ENCRYPTED_FILE ($ENCRYPTED_SIZE)\"}" \
        2>/dev/null || warn "Failed to send Slack notification"
fi

exit 0
