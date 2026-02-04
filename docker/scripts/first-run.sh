#!/bin/bash
# ============================================================================
# Directus First-Run Initialization Script
# ============================================================================
#
# This script runs on first container boot to apply schema and seed data.
# It uses a marker file to ensure it only runs once.
#
# Prerequisites:
# - Directus container must be running
# - PostgreSQL must be accessible
# - Schema file must exist at /directus/schema.yaml (mounted via docker-compose)
#
# Usage:
# This script is automatically executed by Directus on startup if mounted
# to /docker-entrypoint-init.d/
# ============================================================================

set -e

MARKER_FILE="/directus/.initialized"
SCHEMA_FILE="/directus/schema.yaml"
SEED_FILE="/directus/seed-data.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if already initialized
if [ -f "$MARKER_FILE" ]; then
    log_info "Directus already initialized - skipping first-run setup"
    exit 0
fi

log_info "First run detected - beginning initialization..."

# Wait for Directus to be fully ready
log_info "Waiting for Directus to be ready..."
sleep 10

# Apply Directus schema if file exists
if [ -f "$SCHEMA_FILE" ]; then
    log_info "Applying Directus schema from $SCHEMA_FILE..."

    if npx directus schema apply "$SCHEMA_FILE" --yes; then
        log_info "Schema applied successfully"
    else
        log_error "Failed to apply schema"
        exit 1
    fi
else
    log_warn "Schema file not found at $SCHEMA_FILE - skipping schema apply"
    log_warn "You may need to configure collections manually in Directus admin"
fi

# Run seed data if file exists and PostgreSQL is accessible
if [ -f "$SEED_FILE" ]; then
    log_info "Running seed data from $SEED_FILE..."

    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_DATABASE" ]; then
        log_warn "Database environment variables not set - skipping seed data"
    else
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_DATABASE" -f "$SEED_FILE"; then
            log_info "Seed data applied successfully"
        else
            log_warn "Failed to apply seed data - this may be okay if tables don't exist yet"
        fi
    fi
else
    log_warn "Seed file not found at $SEED_FILE - skipping seed data"
fi

# Create marker file
touch "$MARKER_FILE"
log_info "Initialization complete - marker file created at $MARKER_FILE"

exit 0
