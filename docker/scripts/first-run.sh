#!/bin/bash
# ============================================================================
# Directus Startup & Schema Migration Script
# ============================================================================
#
# Runs on every container startup (before npx directus start).
# Called via docker-compose command override.
#
# Schema apply:  Runs EVERY startup if schema file exists (idempotent).
# Seed data:     Runs ONCE on first boot only (marker file).
#
# Mounted volumes (via docker-compose.yml):
#   ./docker/directus/  → /directus/config/   (schema.json lives here)
#   ./docker/scripts/first-run.sh → /directus/scripts/first-run.sh
# ============================================================================

set -e

MARKER_FILE="/directus/.initialized"
SCHEMA_FILE="/directus/config/schema.json"
SEED_FILE="/directus/config/seed-data.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INIT]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[INIT]${NC} $1"
}

log_error() {
    echo -e "${RED}[INIT]${NC} $1"
}

# ── Schema Apply (every startup) ──
if [ -f "$SCHEMA_FILE" ]; then
    log_info "Applying schema from $SCHEMA_FILE..."

    if npx directus schema apply "$SCHEMA_FILE" --yes; then
        log_info "Schema applied successfully"
    else
        log_error "Failed to apply schema"
        exit 1
    fi
else
    log_warn "No schema file at $SCHEMA_FILE - skipping schema apply"
fi

# ── Seed Data (first boot only) ──
if [ ! -f "$MARKER_FILE" ]; then
    log_info "First boot detected"

    if [ -f "$SEED_FILE" ]; then
        log_info "Running seed data from $SEED_FILE..."

        if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_DATABASE" ]; then
            log_warn "Database env vars not set - skipping seed data"
        else
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_DATABASE" -f "$SEED_FILE"; then
                log_info "Seed data applied"
            else
                log_warn "Seed data failed - tables may not exist yet"
            fi
        fi
    fi

    touch "$MARKER_FILE"
    log_info "Marker file created at $MARKER_FILE"
fi

exit 0
