# Production Deployment

## Overview

Deployments are automated via GitHub Actions on push to `main`:

```
Push to main → Build & Test → Docker Image → Deploy → Health Check → Backup
```

## GitHub Secrets

All production configuration comes from GitHub Secrets. No manual `.env` management needed.

### Required Secrets

| Category | Secrets |
|----------|---------|
| **Database** | `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` |
| **Directus** | `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `DIRECTUS_TOKEN`, `DIRECTUS_PUBLIC_URL`, `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` |
| **Storage (Credentials)** | `S3_ACCESS_KEY`, `S3_SECRET_KEY` |
| **Storage (Config)** | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `CDN_BASE_URL`, `S3_BUCKET_URL` |
| **SSH** | `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `SSH_PORT` |
| **Public** | `PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL` |

**Storage Config Notes:**
- `S3_BUCKET` - Bucket name (e.g., `keyjc`)
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

## Docker Architecture

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| kjo2_postgres | postgres:15-alpine | Internal | Database |
| kjo2_directus | directus/directus:11 | 8055 | Headless CMS |
| kjo2_app | ghcr.io/*/kjo2_app | 3000 | SvelteKit app |

### Volumes (Backed Up)

- `kjo2_postgres_data` - PostgreSQL database
- `kjo2_directus_uploads` - Uploaded files

Backups created after each deployment, kept for 5 deployments.

## CDN CORS Configuration

DigitalOcean Spaces must have CORS configured:

```json
{
  "AllowedOrigins": ["https://example.com", "https://www.example.com"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

## Manual Deployment

```bash
# On production server
cd /var/www/keyjayonline.com
git pull origin main
docker pull ghcr.io/YOUR_ORG/keyjayonline.com_v2/kjo2_app:latest
docker compose down --remove-orphans
docker compose up -d
```

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

## Monitoring

```bash
# Container status
docker compose ps

# Application logs
docker compose logs -f kjo2_app

# Health check
curl -s http://localhost:3000/
```
