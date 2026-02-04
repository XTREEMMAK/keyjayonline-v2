# Development Setup

## Prerequisites

- Node.js 22+
- npm 10+
- Access to Directus instance

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

## Environment Files

Vite auto-loads environment files in order:

```
npm run dev: .env → .env.development → .env.local
```

| File | Purpose |
|------|---------|
| `.env.example` | Template (committed) |
| `.env.local` | Your secrets (gitignored) |
| `.env.development` | Dev overrides (gitignored) |

### Required in .env.local

```bash
DIRECTUS_TOKEN=your_api_token
DB_PASSWORD=your_db_password  # Only for Docker
```

### Development Overrides

Create `.env.development` for local settings:

```bash
DIRECTUS_URL=http://your-directus-host:8055
NODE_ENV=development
USE_CDN_FOR_ASSETS=false
BYPASS_CORS_IN_DEV=true
```

## Docker Development

### First-Time Setup

1. Create `.env.local` with required secrets:
   ```bash
   cp .env.example .env.local
   # Edit with your values:
   DB_PASSWORD=your_password
   DIRECTUS_KEY=$(openssl rand -hex 32)
   DIRECTUS_SECRET=$(openssl rand -hex 32)
   DIRECTUS_ADMIN_PASSWORD=your_admin_password
   DIRECTUS_TOKEN=placeholder  # Update after first boot
   ```

2. Start Directus and Postgres (skip app for now):
   ```bash
   source .env.local && docker compose up -d kjo2_postgres kjo2_directus
   ```

3. Access Directus at `http://localhost:8055` and create collections or apply schema

4. Create API token in Directus (Settings → Access Tokens), update `DIRECTUS_TOKEN` in `.env.local`

5. Start full stack:
   ```bash
   source .env.local && docker compose up -d
   ```

### Commands

```bash
npm run docker:up      # Start containers (auto-sources .env.local)
npm run docker:down    # Stop containers
npm run docker:logs    # View logs
npm run docker:build   # Rebuild images
```

### Direct Docker Compose

If not using npm scripts, source env first:
```bash
source .env.local && docker compose up -d
```

### Services

| Service | Container | Port |
|---------|-----------|------|
| SvelteKit | kjo2_app | 3000 |
| PostgreSQL | kjo2_postgres | Internal |
| Directus | kjo2_directus | 8055 |

### Storage

- **Local dev**: Uses local filesystem (default)
- **Production**: Set `STORAGE_LOCATIONS=s3` with S3 credentials

### Schema Management

**What's included in schema export:**
- Collections, fields, relations (data model)

**What's NOT included (must be manually recreated or seeded):**
- Flows (automations)
- Roles/Permissions
- Settings
- Actual data/content

**Export schema** (from a working Directus instance):
```bash
docker exec -it kjo2_directus npx directus schema snapshot --yes /directus/schema.yaml
docker cp kjo2_directus:/directus/schema.yaml ./docker/directus/schema.yaml
```

**Import schema** (to a fresh Directus container):
```bash
# Copy schema file into container
docker cp ./docker/directus/schema.yaml kjo2_directus:/directus/schema.yaml

# Apply schema (creates all collections, fields, relations)
docker exec -it kjo2_directus npx directus schema apply /directus/schema.yaml --yes

# Optional: Preview changes without applying
docker exec -it kjo2_directus npx directus schema apply /directus/schema.yaml --dry-run
```

### Seed Data & Flows

**Export Flows, settings, and seed data** (via SQL):
```bash
# Export Directus system tables (flows, operations, settings, roles, permissions)
docker exec kjo2_postgres pg_dump -U kjo_user -d kjo_v2_db \
  --data-only \
  --table=directus_flows \
  --table=directus_operations \
  --table=directus_settings \
  --table=directus_roles \
  --table=directus_permissions \
  > ./docker/directus/system-seed.sql

# Export your app's seed data (e.g., testimonials, general settings)
docker exec kjo2_postgres pg_dump -U kjo_user -d kjo_v2_db \
  --data-only \
  --table=kjov2_general \
  --table=kjov2_socials \
  --table=kjov2_testimonials \
  > ./docker/directus/content-seed.sql
```

**Import seed data** (to fresh container):
```bash
# Copy seed files into postgres container
docker cp ./docker/directus/system-seed.sql kjo2_postgres:/tmp/
docker cp ./docker/directus/content-seed.sql kjo2_postgres:/tmp/

# Apply seeds (run AFTER schema is applied)
docker exec kjo2_postgres psql -U kjo_user -d kjo_v2_db -f /tmp/system-seed.sql
docker exec kjo2_postgres psql -U kjo_user -d kjo_v2_db -f /tmp/content-seed.sql
```

**Note:** Import order matters - apply schema first, then seed data.

## Audio CORS Bypass

Development includes automatic CORS bypass for CDN audio files:

- Enabled when `BYPASS_CORS_IN_DEV=true`
- Routes CDN URLs through local proxy (`/api/proxy-audio/`)
- Automatically disabled in production builds

## Troubleshooting

**Audio not playing:**
- Check `BYPASS_CORS_IN_DEV=true` in `.env.development`
- Restart dev server after config changes

**Database connection:**
```bash
pg_isready -h your-db-host -p 5432
```

**Directus connection:**
```bash
curl http://your-directus-host:8055/server/ping
```
