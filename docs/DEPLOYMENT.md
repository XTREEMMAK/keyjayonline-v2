# Production Deployment

## Overview

Deployments are automated via GitHub Actions on push to `main`:

```
Push to main → Build & Test → Upload CDN Assets → Docker Image → Deploy → Health Check → Backup
```

For local development setup, see [DEVELOPMENT.md](./DEVELOPMENT.md).

---

## GitHub Secrets

All production configuration comes from GitHub Secrets. No manual `.env` management needed.

### Required Secrets

| Category | Secrets |
|----------|---------|
| **Database** | `USE_LOCAL_POSTGRES`, `DB_HOST`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` |
| **Directus** | `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `DIRECTUS_TOKEN`, `DIRECTUS_PUBLIC_URL`, `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` |
| **Storage (Credentials)** | `S3_ACCESS_KEY`, `S3_SECRET_KEY` |
| **Storage (Config)** | `STORAGE_LOCATIONS`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `CDN_BASE_URL`, `S3_BUCKET_URL` |
| **SSH** | `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `SSH_PORT` |
| **Public** | `PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL` |

**Database Config Notes:**
- `USE_LOCAL_POSTGRES` - Set to `true` for local Postgres container, `false` for external database
- `DB_HOST` - Only needed when `USE_LOCAL_POSTGRES=false` (e.g., `your-db-server.com`)

**Storage Config Notes:**
- `STORAGE_LOCATIONS` - Directus storage driver name. Must be `digitalocean` (matches DB file records). Defaults to `local` for dev.
- `S3_BUCKET` - Bucket name (e.g., `kjo`)
- `S3_REGION` - Region code (e.g., `nyc3`)
- `S3_ENDPOINT` - Provider endpoint (e.g., `nyc3.digitaloceanspaces.com`)
- `CDN_BASE_URL` - Full CDN URL (e.g., `https://bucket.region.cdn.digitaloceanspaces.com`)
- `S3_BUCKET_URL` - Full bucket URL (e.g., `https://bucket.region.digitaloceanspaces.com`)

See `.github/workflows/deploy.yml` for the complete list.

### Generating Directus Credentials

**Before first deployment:**

1. **`DIRECTUS_KEY`** - Random 32+ character string for session encryption
   ```bash
   openssl rand -hex 32
   ```

2. **`DIRECTUS_SECRET`** - Random 32+ character string for data encryption
   ```bash
   openssl rand -hex 32
   ```

3. **`DIRECTUS_ADMIN_EMAIL`** - Admin login email (choose any valid email)

4. **`DIRECTUS_ADMIN_PASSWORD`** - Admin login password (choose a strong password)

5. **`DIRECTUS_PUBLIC_URL`** - External URL for Directus asset URLs
   - If behind reverse proxy: `https://cms.example.com`
   - If direct access: `http://your-server-ip:8055`
   - Used for generating public asset URLs in Directus responses

6. **`DIRECTUS_TOKEN`** - API token for app access (**add to secrets after first boot**):
   - First deployment: use a placeholder value, deploy will partially fail
   - Start Directus manually: `docker compose up -d kjo2_postgres kjo2_directus`
   - Login at `http://your-server:8055` with admin credentials
   - Go to Settings → Access Tokens → Create Token
   - Copy token value → Add to GitHub Secrets as `DIRECTUS_TOKEN`
   - Re-run deployment workflow

---

## Database Configuration

The deployment supports two database modes, controlled by the `USE_LOCAL_POSTGRES` secret:

### Local Postgres Container (`USE_LOCAL_POSTGRES=true`)

- Runs Postgres in a Docker container alongside the app
- Database is backed up with each deployment
- Best for: simple deployments, single-server setups

### External Postgres (`USE_LOCAL_POSTGRES=false`)

- Connects to an external Postgres server
- Set `DB_HOST` to your external database hostname
- Postgres container is not started (saves resources)
- Best for: managed databases, multi-server architectures, high availability

---

## Docker Architecture

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| kjo2_postgres | postgres:15-alpine | Internal | Database (optional, see above) |
| kjo2_directus | directus/directus:11 | 8055 | Headless CMS |
| kjo2_app | ghcr.io/*/kjo2_app | 3000 | SvelteKit app |

### Volumes (Backed Up)

- `kjo2_postgres_data` - PostgreSQL database
- `kjo2_directus_uploads` - Uploaded files

Backups created after each deployment, kept for 5 deployments.

---

## CDN Architecture

SvelteKit is configured with `paths.assets` pointing to the CDN (`CDN_BASE_URL`). This means:
- **JS/CSS bundles** (`_app/immutable/`) load from CDN
- **Static images** (`img/`) load from CDN (uploaded by CI)
- **Videos/audio** load from CDN (uploaded locally via `npm run cdn:sync`)
- The app server handles only SSR and API routes

### CORS Configuration (Required)

DigitalOcean Spaces must have CORS configured for cross-origin ES module loading:

```json
{
  "AllowedOrigins": ["https://keyjayonline.com", "https://www.keyjayonline.com"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

Configure this in the DigitalOcean control panel under Spaces settings.
**Note:** In the DO panel, origins must include the scheme (`https://`). The panel does **not** auto-add it. Use `https://keyjayonline.com` and `https://*.keyjayonline.com`. See [DO CORS docs](https://docs.digitalocean.com/products/spaces/how-to/configure-cors/).

### What Gets Uploaded Automatically (CI)

On every push to `main`, the `upload-cdn-assets` job in the deploy workflow:
1. Builds the app with `CDN_BASE_URL` set
2. Uploads `build/client/` to S3 (JS bundles, CSS, images, robots.txt)

This happens automatically — no manual steps needed for code changes.

### What Gets Uploaded Manually (Videos/Audio)

Large static assets (videos, audio) are gitignored and uploaded locally.

| Path | Storage | Purpose |
|------|---------|---------|
| `static/videos/` | CDN (manual upload) | Hero video, large video files |
| `static/audio/` | CDN (manual upload) | Music samples, audio files |
| `static/img/` | CDN (auto via CI) | Small images, icons |

When you add or change files in `static/videos/` or `static/audio/`:

1. **Configure credentials** in `.env.local`:
   ```bash
   S3_ACCESS_KEY=your_spaces_access_key
   S3_SECRET_KEY=your_spaces_secret_key
   ```

2. **Sync to CDN** before pushing:
   ```bash
   npm run cdn:sync
   ```

3. **Then push** your code changes.

The sync script (`scripts/sync-cdn-assets.js`):
- Uses `@aws-sdk/client-s3` (no AWS CLI needed)
- Only uploads changed files (compares by size)
- Uploads to `s3://kjo/videos/` and `s3://kjo/audio/`
- Sets public-read ACL and correct Content-Type

### Why Not Git for Videos/Audio?

- Video/audio files are large (100+ MB total)
- Git isn't designed for binary files
- CDN provides faster delivery worldwide

---

## Directus Schema Migrations

Schema changes (new collections, fields, relations) made on the dev Directus instance are automatically applied to production on deploy.

### How It Works

The `docker-compose.yml` mounts `docker/directus/schema.json` into the Directus container and overrides the startup command to run `docker/scripts/first-run.sh` before `npx directus start`. This script runs `npx directus schema apply` on every container startup — it's idempotent, so when the schema already matches, it's a no-op.

### Developer Workflow

```bash
# 1. Make schema changes in dev Directus (http://192.168.10.24:8057)

# 2. Export the schema snapshot
DEV_ADMIN_PASSWORD='your-password' npm run schema:snapshot
# → Saves to docker/directus/schema.json

# 3. Commit and push
git add docker/directus/schema.json
git commit -m "Update Directus schema"
git push

# 4. Deploy (push to main triggers CI/CD)
# Container restarts → first-run.sh applies schema → server starts
```

### What `schema:snapshot` Does

The `scripts/schema-snapshot.js` script:
1. Logs into dev Directus via `POST /auth/login` (admin JWT required for schema endpoints)
2. Calls `GET /schema/snapshot` to get the full schema
3. Extracts the `data` property (not the API response wrapper)
4. Saves to `docker/directus/schema.json`

### Initial Environment Sync

For a fresh production setup or when dev and production have diverged significantly, use a full database dump instead of schema migration:

```bash
# On dev (native Postgres)
pg_dump -U xtreemmak -d directus_kjo_v2 --clean --if-exists --no-owner --no-privileges > dump.sql

# On production
docker compose exec kjo2_postgres psql -U kjo_user -d kjo_v2_db < dump.sql
```

### Troubleshooting

- **KnexTimeoutError** when running schema commands: Don't use `docker exec` — it shares the running server's connection pool. Use `docker compose run --rm kjo2_directus npx directus schema apply ...` instead (separate container, own pool).
- **"Collection already exists"**: An orphaned PostgreSQL table exists without Directus metadata. Drop the table first: `DROP TABLE IF EXISTS <table> CASCADE;`
- **Schema file missing**: If `docker/directus/schema.json` doesn't exist, `first-run.sh` gracefully skips schema apply and the server starts normally.

**Caution:** Schema changes that remove or rename fields are destructive. Back up the database before deploying destructive schema changes.

---

## Manual Deployment

```bash
# On production server
cd /var/www/keyjayonline.com
git pull origin main
docker pull ghcr.io/YOUR_ORG/keyjayonline.com_v2/kjo2_app:latest

# With local Postgres:
docker compose --profile local-db down --remove-orphans
docker compose --profile local-db up -d

# With external Postgres (no profile needed):
docker compose down --remove-orphans
docker compose up -d
```

---

## Rollback

```bash
# Revert via git
git checkout previous-stable-tag
git push origin main
# GitHub Actions will redeploy

# Or manual image rollback
docker pull ghcr.io/YOUR_ORG/keyjayonline.com_v2/kjo2_app:previous-sha
docker compose down && docker compose up -d
```

---

## Monitoring

```bash
# Container status
docker compose ps

# Application logs
docker compose logs -f kjo2_app

# Health check
curl -s http://localhost:3000/
```

---

## Troubleshooting

**App container shows 401 Unauthorized errors**
- Token may be expired or invalid in GitHub Secrets
- Regenerate token in Directus admin and update `DIRECTUS_TOKEN` secret
- Re-run deployment workflow

**Directus container won't start**
- Check if port 8055 is already in use: `lsof -i :8055`
- Verify database credentials in GitHub Secrets

**Database connection errors**
- Ensure `kjo2_postgres` container is healthy before starting Directus
- Check `docker compose logs kjo2_postgres` for errors

**Deployment workflow fails**
- Check GitHub Actions logs for specific error
- Verify all required secrets are set in repository settings
- Ensure SSH key has access to production server
