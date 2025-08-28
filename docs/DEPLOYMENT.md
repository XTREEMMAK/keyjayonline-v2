# Production Deployment Guide

This guide covers deploying KeyJay Online v2 to production, including security considerations and the audio CORS configuration.

## Pre-Deployment Checklist

### Security Review

- [ ] **Environment Variables**: Remove or secure sensitive development variables
- [ ] **CORS Bypass**: Verify it's disabled in production builds
- [ ] **API Endpoints**: Ensure development-only endpoints return 404 in production
- [ ] **Database Credentials**: Use production database with restricted permissions
- [ ] **Directus Token**: Use production token with minimal required permissions

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

## Environment Configuration

### Production Environment Variables

```bash
# Application Configuration
NODE_ENV=production
USE_CDN_FOR_ASSETS=true

# IMPORTANT: Ensure CORS bypass is disabled or remove entirely
# BYPASS_CORS_IN_DEV=false  # or omit this variable

# Database Configuration (Production credentials)
DATABASE_HOST=prod-database-host
DATABASE_PORT=5432
DATABASE_NAME=kjo_v2_production
DATABASE_USER=kjo_prod_user
DATABASE_PASSWORD=secure_production_password

# Directus Configuration (Production instance)
DIRECTUS_URL=https://cms.keyjayonline.com
DIRECTUS_TOKEN=production_token_with_minimal_permissions

# CDN Configuration (Production CDN with CORS headers)
CDN_BASE_URL=https://kjo.nyc3.cdn.digitaloceanspaces.com
S3_BUCKET_URL=https://kjo.nyc3.digitaloceanspaces.com

# Site Configuration
PUBLIC_SITE_URL=https://keyjayonline.com
PUBLIC_CONTACT_EMAIL=contact@keyjayonline.com
PUBLIC_HELLO_EMAIL=hello@keyjayonline.com

# Webhook Configuration (if using contact forms)
CONTACT_FORM_WEBHOOK_URL=https://n8n.kjnet.us/webhook/kjo-contact-form
CONTACT_FORM_WEBHOOK_SECRET=secure_webhook_secret
```

### CDN CORS Configuration

**Critical**: The production CDN must be configured with proper CORS headers for audio playback to work.

#### DigitalOcean Spaces CORS Configuration

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

#### AWS S3 CORS Configuration (if applicable)

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

### Production Build

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Test the production build locally (optional)
npm run preview
```

### Build Verification

1. **Check Build Output**
   ```bash
   # Build should complete without errors
   # Check that all audio components are included
   ls build/ -la
   ```

2. **Verify CORS Bypass Removal**
   ```bash
   # Search for development-only code (should be empty in build)
   grep -r "BYPASS_CORS_IN_DEV" build/ || echo "Good: No CORS bypass in production"
   grep -r "/api/proxy-audio" build/ || echo "Good: No proxy endpoints in production"
   ```

3. **Test Production Build**
   ```bash
   # Start preview server
   npm run preview
   
   # Test audio playback
   # Should NOT use /api/proxy-audio/ URLs
   # Should load directly from CDN
   ```

## Deployment Platforms

### Node.js Server (Recommended)

1. **Server Requirements**
   - Node.js 18+
   - npm 8+
   - Process manager (PM2, systemd, etc.)

2. **Deployment Steps**
   ```bash
   # On server
   git pull origin main
   npm ci --only=production
   npm run build
   
   # Restart application
   pm2 restart keyjayweb
   # or
   systemctl restart keyjayweb
   ```

3. **Environment Setup**
   ```bash
   # Create .env file with production variables
   # Ensure proper file permissions (600)
   chmod 600 .env
   ```

### Vercel Deployment

1. **vercel.json Configuration**
   ```json
   {
     "framework": "sveltekit",
     "buildCommand": "npm run build",
     "devCommand": "npm run dev",
     "installCommand": "npm install"
   }
   ```

2. **Environment Variables**
   - Configure all production environment variables in Vercel dashboard
   - Ensure `NODE_ENV=production`
   - Omit `BYPASS_CORS_IN_DEV` entirely

### Netlify Deployment

1. **netlify.toml Configuration**
   ```toml
   [build]
     command = "npm run build"
     publish = "build"
   
   [build.environment]
     NODE_ENV = "production"
   ```

2. **Environment Variables**
   - Set all production variables in Netlify dashboard
   - Audio components will automatically use CDN URLs

## Security Considerations

### CORS Bypass Security

The development CORS bypass system is automatically secure in production:

1. **Compile-Time Removal**
   ```javascript
   // This code is automatically removed in production builds
   if (dev) {  // dev = false in production
     // Development-only proxy code
   }
   ```

2. **Runtime Checks**
   ```javascript
   // Server endpoints return 404 in production
   if (!dev) {
     throw error(404, 'Proxy endpoint not available in production');
   }
   ```

3. **Environment Variable Checks**
   ```javascript
   // Returns false if BYPASS_CORS_IN_DEV is not set or false
   export function shouldBypassCors() {
     if (!isDevelopment()) {
       return false;  // Always false in production
     }
     // ... rest of logic
   }
   ```

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
   // Should see: https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/...
   // Should NOT see: /api/proxy-audio/...
   ```

2. **Cross-Browser Testing**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (especially on iOS)
   - Mobile browsers

3. **Network Conditions**
   - Test with slow connections
   - Test with intermittent connectivity
   - Verify graceful degradation

### Common Issues and Solutions

#### Audio Not Playing in Production

1. **CORS Configuration Missing**
   ```
   Error: "Access to fetch at 'https://kjo.nyc3.cdn.digitaloceanspaces.com/...' 
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
   tail -f /var/log/keyjayweb/app.log
   
   # Look for audio-related errors
   grep -i "wavesurfer\|audio\|cors" /var/log/keyjayweb/app.log
   ```

2. **CDN Access Logs**
   - Monitor audio file access patterns
   - Check for 404s or other errors
   - Track bandwidth usage

### Backup and Recovery

1. **Database Backups**
   ```bash
   # Regular database backups
   pg_dump -h prod-database-host kjo_v2_production > backup_$(date +%Y%m%d).sql
   ```

2. **CDN Content Backup**
   - Backup audio files separately
   - Test restore procedures
   - Document recovery processes

## Rollback Procedures

### Quick Rollback

1. **Revert to Previous Version**
   ```bash
   git checkout previous-stable-tag
   npm run build
   pm2 restart keyjayweb
   ```

2. **Environment Variable Rollback**
   ```bash
   # Restore previous .env file
   cp .env.backup .env
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
   grep "WaveSurfer" logs/
   
   # Look for CORS-related issues
   grep -i "cors\|cross-origin" logs/
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