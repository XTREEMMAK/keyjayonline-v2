# Production Deployment Guide

This guide covers deploying KeyJay Online v2 to production, including security considerations and the audio CORS configuration.

## Deployment Overview

Production deployments are handled automatically via GitHub Actions when pushing to the `main` branch.

```
Push to main branch
        │
        ▼
┌─────────────────────────┐
│ GitHub Actions          │
│ 1. Build & Test         │
│ 2. Build Docker Image   │
│ 3. Push to ghcr.io      │
│ 4. SSH to server        │
│ 5. Generate .env        │ ← From GitHub Secrets
│ 6. docker compose up    │
│ 7. Health check         │
│ 8. Backup volumes       │
└─────────────────────────┘
        │
        ▼
Production Server: /var/www/keyjayonline.com
```

## Pre-Deployment Checklist

### Security Review

- [ ] **GitHub Secrets**: All required secrets configured in repository settings
- [ ] **CORS Bypass**: Verify it's disabled in production builds (automatic)
- [ ] **API Endpoints**: Development-only endpoints return 404 in production (automatic)
- [ ] **Database Credentials**: Production secrets in GitHub Secrets
- [ ] **Directus Token**: Production token with minimal required permissions

### Code Review

- [ ] **Console Logs**: Remove or reduce debug logging for production
- [ ] **Error Handling**: Ensure graceful fallbacks for audio loading failures
- [ ] **Performance**: Verify audio components handle failures gracefully
- [ ] **Dependencies**: Check for any development-only dependencies

### Testing

- [ ] **Build Process**: Verify production build completes successfully
- [ ] **Audio Playback**: Test that audio works with CDN CORS headers
- [ ] **Cross-Origin**: Confirm no CORS errors in production environment
- [ ] **Mobile Testing**: Verify audio works on mobile devices

## GitHub Secrets Configuration

The following secrets must be configured in your GitHub repository settings:

### Build-Time Secrets (Baked into Docker Image)

| Secret | Description | Example |
|--------|-------------|---------|
| `DIRECTUS_URL` | Internal Directus URL | `http://kjo2_directus:8055` |
| `DIRECTUS_TOKEN` | API token for SvelteKit | `your_token` |
| `CDN_BASE_URL` | CDN URL for assets | `${CDN_BASE_URL}` |
| `S3_BUCKET_URL` | Direct S3 URL | `${S3_BUCKET_URL}` |
| `PUBLIC_SITE_URL` | Production site URL | `https://keyjayonline.com` |
| `PUBLIC_CONTACT_EMAIL` | Contact email | `contact@keyjayonline.com` |

### Runtime Secrets (Written to .env on Server)

| Secret | Description |
|--------|-------------|
| `DB_DATABASE` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DIRECTUS_KEY` | Directus encryption key |
| `DIRECTUS_SECRET` | Directus secret key |
| `DIRECTUS_ADMIN_EMAIL` | Directus admin email |
| `DIRECTUS_ADMIN_PASSWORD` | Directus admin password |
| `DIRECTUS_PUBLIC_URL` | Public Directus URL |
| `S3_ACCESS_KEY` | DigitalOcean Spaces access key |
| `S3_SECRET_KEY` | DigitalOcean Spaces secret key |
| `CONTACT_FORM_WEBHOOK_URL` | n8n webhook URL |
| `CONTACT_FORM_WEBHOOK_SECRET` | Webhook auth secret |

### SSH/Deployment Secrets

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | Production server IP/hostname |
| `SSH_USERNAME` | SSH username |
| `SSH_KEY` | SSH private key |
| `SSH_PORT` | SSH port (usually 22) |

## Automatic .env Generation

GitHub Actions automatically generates the `.env` file on the production server during deployment. This ensures:

1. **Single Source of Truth**: All secrets managed in GitHub Secrets
2. **No Manual .env Management**: File is regenerated on each deploy
3. **Consistent Configuration**: Same variables every deployment

The generated `.env` includes:
- Database configuration (container names, credentials)
- Directus configuration (keys, secrets, admin credentials)
- S3/Spaces storage configuration
- CDN and asset URLs
- Application settings
- Webhook configuration

## CDN CORS Configuration

**Critical**: The production CDN must be configured with proper CORS headers for audio playback to work.

### DigitalOcean Spaces CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://keyjayonline.com",
      "https://www.keyjayonline.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Build Process

### Automatic (Recommended)

Push to the `main` branch triggers the full CI/CD pipeline:

```bash
git checkout main
git merge feature/your-feature
git push origin main
# GitHub Actions handles everything
```

### Manual Build

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Test the production build locally
npm run preview
```

### Build Verification

1. **Check Build Output**
   ```bash
   # Build should complete without errors
   ls build/ -la
   ```

2. **Verify CORS Bypass Removal**
   ```bash
   # Search for development-only code (should be empty in build)
   grep -r "BYPASS_CORS_IN_DEV" build/ || echo "Good: No CORS bypass in production"
   grep -r "/api/proxy-audio" build/ || echo "Good: No proxy endpoints in production"
   ```

## Server Architecture

### Docker Containers

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| kjo2_postgres | postgres:15-alpine | Internal | PostgreSQL database |
| kjo2_directus | directus/directus:11 | 8055 | Headless CMS |
| kjo2_app | ghcr.io/*/kjo2_app | 3000 | SvelteKit application |

### Docker Volumes

| Volume | Contents | Backed Up |
|--------|----------|-----------|
| kjo2_postgres_data | PostgreSQL database | Yes |
| kjo2_directus_uploads | Uploaded files | Yes |
| kjo2_directus_extensions | Custom extensions | Yes |

Backups are created after each successful deployment and kept for 5 deployments.

### Health Checks

| Service | Endpoint | Interval |
|---------|----------|----------|
| PostgreSQL | `pg_isready` | 10s |
| Directus | `/server/health` | 15s |
| SvelteKit | `http://localhost:3000/` | 30s |

## Manual Deployment

If you need to deploy manually:

```bash
# On production server
cd /var/www/keyjayonline.com
git pull origin main

# Generate .env manually (or let GitHub Actions do it)
# Ensure all required variables are set

# Pull latest image
docker pull ghcr.io/YOUR_ORG/keyjayonline.com_v2/kjo2_app:latest

# Restart containers
docker compose down --remove-orphans
docker compose up -d

# Verify health
docker compose ps
docker compose logs --tail=20 kjo2_app
```

## Security Considerations

### CORS Bypass Security

The development CORS bypass system is automatically secure in production:

1. **Compile-Time Removal**: Production builds don't include proxy code
2. **Runtime Checks**: Server endpoints return 404 in production
3. **Environment Detection**: Multiple checks prevent production activation

### Additional Security Measures

1. **Database Security**
   - Use read-only database user for web application
   - Restrict database access by IP address
   - Use SSL/TLS for database connections

2. **API Security**
   - Rotate Directus tokens regularly
   - Use minimum required permissions
   - Monitor API access logs

3. **CDN Security**
   - Configure proper CORS headers (not wildcard in production)
   - Use CDN access logs to monitor usage
   - Consider signed URLs for sensitive content

## Testing in Production

### Audio Playback Verification

1. **Browser Testing**
   ```javascript
   // In browser console on production site
   // Check that URLs are NOT transformed
   console.log('Audio URLs should be CDN URLs, not proxy URLs');

   // Look for direct CDN requests in Network tab
   // Should see: ${CDN_BASE_URL}/audio/...
   // Should NOT see: /api/proxy-audio/...
   ```

2. **Cross-Browser Testing**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (especially on iOS)
   - Mobile browsers

### Common Issues and Solutions

#### Audio Not Playing in Production

1. **CORS Configuration Missing**
   ```
   Error: "Access to fetch at '${CDN_BASE_URL}/...'
          from origin 'https://keyjayonline.com' has been blocked by CORS policy"

   Solution: Configure CDN CORS headers (see above)
   ```

2. **Incorrect CDN URLs**
   ```
   Error: "Failed to load resource: the server responded with a status of 404"

   Solution: Verify audio files exist in CDN and URLs are correct
   ```

3. **Mixed Content Issues**
   ```
   Error: "Mixed Content: The page at 'https://keyjayonline.com' was loaded over HTTPS,
          but requested an insecure resource 'http://...' This request has been blocked"

   Solution: Ensure all CDN URLs use HTTPS
   ```

## Monitoring and Maintenance

### Performance Monitoring

1. **Audio Loading Times**
   - Monitor CDN response times
   - Track audio loading failures
   - Set up alerts for high error rates

2. **Application Performance**
   - Monitor memory usage (WaveSurfer instances)
   - Track JavaScript errors
   - Monitor page load times

### Log Monitoring

1. **Server Logs**
   ```bash
   # Monitor application logs
   docker compose logs -f kjo2_app

   # Look for audio-related errors
   docker compose logs kjo2_app | grep -i "wavesurfer\|audio\|cors"
   ```

2. **CDN Access Logs**
   - Monitor audio file access patterns
   - Check for 404s or other errors
   - Track bandwidth usage

### Backup and Recovery

Backups are automatically created after each successful deployment:

```bash
# Backup location
/var/backups/keyjayonline/YYYYMMDD_HHMMSS/

# Contents
├── postgres_data.tar.gz
└── directus_uploads.tar.gz

# Retention: Last 5 deployments
```

## Rollback Procedures

### Quick Rollback

1. **Revert to Previous Version**
   ```bash
   git checkout previous-stable-tag
   git push origin main
   # GitHub Actions will redeploy
   ```

2. **Manual Image Rollback**
   ```bash
   # On production server
   docker pull ghcr.io/YOUR_ORG/keyjayonline.com_v2/kjo2_app:previous-sha
   docker compose down
   docker compose up -d
   ```

### Rollback Verification

1. **Audio Functionality**
   - Test that audio players work
   - Verify no CORS errors
   - Check both desktop and mobile

2. **Database Connectivity**
   - Verify data loads correctly
   - Test write operations (if applicable)

## Support and Troubleshooting

### Log Analysis

1. **Application Logs**
   ```bash
   # Check for WaveSurfer initialization errors
   docker compose logs kjo2_app | grep "WaveSurfer"

   # Look for CORS-related issues
   docker compose logs kjo2_app | grep -i "cors\|cross-origin"
   ```

2. **Browser Developer Tools**
   - Check Network tab for failed requests
   - Look for JavaScript errors in Console
   - Verify audio elements are created properly

### Common Production Issues

1. **Audio Files Not Loading**
   - Verify CDN CORS configuration
   - Check file permissions and existence
   - Test CDN accessibility directly

2. **JavaScript Errors**
   - Check for missing dependencies
   - Verify WaveSurfer library loads correctly
   - Look for environment-specific issues

3. **Performance Issues**
   - Monitor memory usage
   - Check for memory leaks in audio components
   - Optimize audio file sizes if necessary

For additional support, refer to:
- [Development Setup Guide](DEVELOPMENT.md)
- [Audio CORS Bypass Technical Documentation](AUDIO_CORS_BYPASS.md)
- Component documentation in `/src/lib/components/music/`
