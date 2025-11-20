#!/bin/bash
#
# FitVibe Database Restore Script
# Version: 1.0
# Purpose: Restore PostgreSQL database from encrypted backup
#
# Usage: ./restore-database.sh <backup_file> [target_environment]
# Example: ./restore-database.sh fitvibe_production_20251111_020000.sql.gz.gpg staging
#
# WARNING: This will DROP and recreate the target database!
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="${1:-}"
TARGET_ENV="${2:-development}"
RESTORE_DIR="/tmp/fitvibe_restore_$$"

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

usage() {
    cat <<EOF
Usage: $0 <backup_file> [target_environment]

Arguments:
  backup_file          Path to encrypted backup file (.sql.gz.gpg)
  target_environment   Target environment (production|staging|development)
                       Default: development

Examples:
  # Restore to development
  $0 fitvibe_production_20251111_020000.sql.gz.gpg development

  # Restore to staging (for DR testing)
  $0 fitvibe_production_20251111_020000.sql.gz.gpg staging

EOF
}

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
    error "Backup file not specified"
    usage
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment-specific configuration
case "$TARGET_ENV" in
    production)
        DB_HOST="${PGHOST:-db.fitvibe.app}"
        DB_PORT="${PGPORT:-5432}"
        DB_NAME="${PGDATABASE:-fitvibe}"
        DB_USER="${PGUSER:-fitvibe}"
        REQUIRE_CONFIRMATION=true
        ;;
    staging)
        DB_HOST="${PGHOST:-db.staging.fitvibe.app}"
        DB_PORT="${PGPORT:-5432}"
        DB_NAME="${PGDATABASE:-fitvibe}"
        DB_USER="${PGUSER:-fitvibe}"
        REQUIRE_CONFIRMATION=true
        ;;
    development)
        DB_HOST="${PGHOST:-localhost}"
        DB_PORT="${PGPORT:-5432}"
        DB_NAME="${PGDATABASE:-fitvibe}"
        DB_USER="${PGUSER:-fitvibe}"
        REQUIRE_CONFIRMATION=false
        ;;
    *)
        error "Unknown environment: $TARGET_ENV"
        usage
        exit 1
        ;;
esac

# Safety confirmation for production/staging
if [ "$REQUIRE_CONFIRMATION" = true ]; then
    warn "⚠️  WARNING: You are about to restore to $TARGET_ENV environment!"
    warn "This will DROP and recreate the database: $DB_NAME"
    warn "All existing data will be LOST!"
    echo ""
    read -p "Type 'yes I understand' to continue: " confirmation
    if [ "$confirmation" != "yes I understand" ]; then
        log "Restore cancelled."
        exit 0
    fi
fi

# Pre-flight checks
log "Starting restore to environment: $TARGET_ENV"
log "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
log "Backup file: $BACKUP_FILE"

if ! command -v psql &> /dev/null; then
    error "psql not found. Please install PostgreSQL client tools."
    exit 1
fi

if ! command -v gpg &> /dev/null; then
    error "gpg not found. Please install GnuPG."
    exit 1
fi

# Test database connection
log "Testing database connection..."
if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
    error "Cannot connect to database server. Check credentials and network."
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"
trap "rm -rf $RESTORE_DIR" EXIT

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    log "Verifying backup checksum..."
    if sha256sum -c "$CHECKSUM_FILE" 2>/dev/null; then
        log "✓ Checksum verified"
    else
        error "Checksum verification failed! Backup may be corrupted."
        exit 1
    fi
else
    warn "Checksum file not found. Skipping verification."
fi

# Decrypt backup
log "Decrypting backup..."
DECRYPTED_FILE="$RESTORE_DIR/backup.sql.gz"
if gpg --decrypt --output "$DECRYPTED_FILE" "$BACKUP_FILE" 2>/dev/null; then
    log "✓ Backup decrypted"
else
    error "Decryption failed. Check GPG key."
    exit 1
fi

# Decompress backup
log "Decompressing backup..."
SQL_FILE="$RESTORE_DIR/backup.sql"
gunzip -c "$DECRYPTED_FILE" > "$SQL_FILE"
log "✓ Backup decompressed"

SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
log "SQL dump size: $SQL_SIZE"

# Create pre-restore backup (safety measure)
if [ "$TARGET_ENV" != "development" ]; then
    log "Creating pre-restore safety backup..."
    SAFETY_BACKUP="$RESTORE_DIR/pre_restore_safety_backup.sql.gz"
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        2>/dev/null | gzip > "$SAFETY_BACKUP" || warn "Safety backup failed"

    if [ -f "$SAFETY_BACKUP" ]; then
        log "✓ Safety backup created: $SAFETY_BACKUP"
        log "  (Will be deleted on successful restore)"
    fi
fi

# Terminate existing connections
log "Terminating existing database connections..."
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF

# Drop and recreate database
log "Dropping database: $DB_NAME"
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

log "Creating database: $DB_NAME"
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore database
log "Restoring database from backup..."
log "This may take several minutes for large databases..."

PGPASSWORD="$PGPASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$SQL_FILE" \
    --set ON_ERROR_STOP=on \
    --quiet

if [ $? -eq 0 ]; then
    log "✓ Database restored successfully"
else
    error "Restore failed!"
    if [ -f "$SAFETY_BACKUP" ]; then
        warn "Safety backup is available at: $SAFETY_BACKUP"
        warn "You may need to manually restore from this backup."
    fi
    exit 1
fi

# Post-restore verification
log "Running post-restore verification..."

# Check table count
TABLE_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
log "Tables restored: $TABLE_COUNT"

# Check user count (sanity check)
USER_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
log "Users in database: $USER_COUNT"

# Run migrations to ensure schema is up-to-date
log "Applying any pending migrations..."
cd "$SCRIPT_DIR/../../apps/backend"
if [ -f "package.json" ]; then
    npm run migrate 2>/dev/null || warn "Migration failed or not configured"
fi

# Vacuum analyze (optimize database)
log "Running VACUUM ANALYZE to optimize database..."
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM ANALYZE;"

log "✅ Restore completed successfully!"

# Summary
cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Restore Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment:     $TARGET_ENV
Database:        $DB_NAME
Host:            $DB_HOST
Backup File:     $BACKUP_FILE
Tables Restored: $TABLE_COUNT
Users Count:     $USER_COUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
  1. Verify application functionality
  2. Run smoke tests
  3. Monitor logs for errors

EOF

# Cleanup safety backup on success
if [ -f "$SAFETY_BACKUP" ]; then
    rm -f "$SAFETY_BACKUP"
fi

# Send notification
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Database restored to $TARGET_ENV from backup: $BACKUP_FILE\"}" \
        2>/dev/null || warn "Failed to send Slack notification"
fi

exit 0
