# Development Setup Guide

This guide covers setting up the development environment for KeyJay Online v2, including the audio CORS bypass functionality.

## Prerequisites

- Node.js 20+
- npm 9+
- Docker (optional, for containerized development)
- Access to the development database and Directus instance

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd keyjayonline.com_v2
   npm install
   ```

2. **Environment Configuration**

   This project uses Vite's auto-loading for environment files. Create your local files from the example:

   ```bash
   # Create base environment file
   cp .env.example .env

   # Create development overrides
   cp .env.example .env.development

   # Create secrets file (gitignored)
   cp .env.example .env.local
   ```

   Edit each file according to the structure below.

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   The site will be available at `http://localhost:5173`

## Environment File Structure

Vite auto-loads environment files in this order (later files override earlier ones):

```
npm run dev:
  .env                    → Base/Docker defaults
  .env.development        → Local dev overrides
  .env.local              → Your secrets (gitignored)
```

### .env (Base/Docker Defaults)

Contains Docker container defaults and production-like settings:

```bash
# Database (Docker container names)
DB_HOST=kjo2_postgres
DB_PORT=5432
DB_DATABASE=kjo_v2_db
DB_USER=kjo_user

# Directus (Docker internal URL)
DIRECTUS_URL=http://kjo2_directus:8055

# Production settings
NODE_ENV=production
USE_CDN_FOR_ASSETS=true
CDN_BASE_URL=https://kjo.nyc3.cdn.digitaloceanspaces.com
S3_BUCKET_URL=https://kjo.nyc3.digitaloceanspaces.com
```

### .env.development (Local Dev Overrides)

Overrides for local development with external services:

```bash
# Database (external server)
DB_HOST=192.168.10.156
DB_USER=xtreemmak

# Directus (external instance)
DIRECTUS_URL=http://192.168.10.24:8057

# Development settings
APP_PORT=3001
NODE_ENV=development
USE_CDN_FOR_ASSETS=false
BYPASS_CORS_IN_DEV=true
```

### .env.local (Secrets - Gitignored)

Your actual secrets - **never commit this file**:

```bash
# Database
DB_PASSWORD=your_database_password

# Directus
DIRECTUS_TOKEN=your_directus_api_token
DIRECTUS_KEY=your_directus_key
DIRECTUS_SECRET=your_directus_secret
DIRECTUS_ADMIN_PASSWORD=your_admin_password

# S3/Spaces (for Docker)
S3_ACCESS_KEY=your_spaces_access_key
S3_SECRET_KEY=your_spaces_secret_key
```

## Docker Development

For self-contained development with Docker:

```bash
# Start all containers (PostgreSQL, Directus, App)
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down

# Rebuild images
npm run docker:build
```

**Note**: Docker scripts automatically source `.env.local` for secrets.

### Docker Services

| Service | Container | Port |
|---------|-----------|------|
| SvelteKit | kjo2_app | 3000 |
| PostgreSQL | kjo2_postgres | Internal |
| Directus | kjo2_directus | 8055 |

## Audio CORS Bypass System

### Overview

The development environment includes a CORS bypass system to resolve audio playback issues when loading files from the DigitalOcean Spaces CDN.

### How It Works

1. **Environment Detection**: Automatically detects development vs production
2. **URL Transformation**: CDN URLs are transformed to proxy through localhost
3. **Vite Proxy**: Development server proxies requests to bypass CORS
4. **API Endpoint**: Fallback server-side proxy for additional compatibility

### Configuration Options

#### Enable/Disable CORS Bypass
```bash
# Enable (default in development)
BYPASS_CORS_IN_DEV=true

# Disable (for testing production-like behavior)
BYPASS_CORS_IN_DEV=false
```

#### URL Transformation Example
```
Original:    https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/track.mp3
Development: /api/proxy-audio/audio/track.mp3
Production:  https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/track.mp3
```

### Components Using Audio

The following components automatically use the CORS bypass:

- **AlbumModalSwal**: Track previews in album modals
- **AudioPlayer**: Standalone audio player component
- **PersistentMusicPlayer**: Site-wide music player

## Development Tools

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Sync SvelteKit types
npm run prepare

# Docker commands
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run docker:logs    # View logs
npm run docker:build   # Rebuild images
```

### Browser DevTools

#### Audio Debugging
- Check console for WaveSurfer initialization logs
- Look for URL transformation messages in development
- Network tab shows proxy requests to `/api/proxy-audio/`

#### Common Console Messages
```
WaveSurfer URL transformation:
  Original: https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/sample.mp3
  Transformed: /api/proxy-audio/audio/sample.mp3

Proxying audio request: https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/sample.mp3
```

## Troubleshooting

### Audio Not Playing

1. **Check CORS Bypass Status**
   ```javascript
   // In browser console
   console.log(window.location.href.includes('localhost')); // Should be true
   ```

2. **Verify Environment Variables**
   - Check that `.env.local` contains `BYPASS_CORS_IN_DEV=true`
   - Restart dev server after changing env files

3. **Check Network Requests**
   - Audio requests should go to `/api/proxy-audio/` in development
   - Look for 200 status codes, not CORS errors

4. **Common Issues**
   - **404 on proxy requests**: Restart dev server to pick up new Vite config
   - **Still getting CORS errors**: Check that `BYPASS_CORS_IN_DEV=true`
   - **Files not found**: Verify CDN URLs are correct in database

### Database Connection Issues

1. **Check Database Server**
   ```bash
   # Test connection
   pg_isready -h 192.168.10.156 -p 5432
   ```

2. **Verify Credentials**
   - Ensure `DB_PASSWORD` is set in `.env.local`
   - Check that database user has proper permissions

3. **Network Access**
   - Verify database server is accessible from development machine
   - Check firewall settings

### Directus Connection Issues

1. **Check Directus Server**
   ```bash
   # Test accessibility
   curl http://192.168.10.24:8057/server/ping
   ```

2. **Verify Token**
   - Check that `DIRECTUS_TOKEN` is valid in `.env.local`
   - Ensure token has necessary permissions

## Development Workflow

### Making Changes to Audio Components

1. **Test Both Environments**
   ```bash
   # Test with CORS bypass (default)
   npm run dev

   # Test production-like behavior
   # Edit .env.development: BYPASS_CORS_IN_DEV=false
   npm run dev
   ```

2. **Check Console Logs**
   - WaveSurfer initialization should show URL transformations
   - No CORS errors in development
   - Audio files load successfully

3. **Verify All Components**
   - Album modal track players
   - Standalone AudioPlayer components
   - Persistent music player

### Adding New Audio Features

1. **Use Shared Utilities**
   ```javascript
   import { createWaveSurfer, getAudioUrl } from '$lib/utils/wavesurfer.js';

   // Automatically includes CORS bypass
   const wavesurfer = await createWaveSurfer({
     container: element,
     audioUrl: originalUrl
   });
   ```

2. **Follow Environment Patterns**
   - Always use `getAudioUrl()` for URL transformation
   - Use shared WaveSurfer factory functions
   - Include proper error handling

## Performance Considerations

### Development Mode

- **Proxy Overhead**: Adds ~50ms latency to audio requests
- **Memory Usage**: Each proxy request loads full audio file into memory
- **Caching**: Browser caches proxied responses for better performance

### Optimization Tips

1. **Use Smaller Audio Files**
   - Keep development audio samples under 5MB
   - Use compressed formats (MP3 at 128kbps)

2. **Limit Concurrent Players**
   - Only one WaveSurfer instance active at a time
   - Clean up instances when components unmount

3. **Browser Cache**
   - Clear cache if audio changes aren't reflected
   - Use hard refresh (Ctrl+Shift+R) for testing

## Security Notes

### Development Only

The CORS bypass system is **automatically disabled** in production:

- Environment detection prevents proxy in production builds
- Server endpoints return 404 in production
- Vite proxy configuration only exists during development

### Safe Practices

1. **Never commit `.env.local`** - it's gitignored for a reason
2. **Use different database credentials for development**
3. **Regularly rotate Directus tokens**
4. **All `.env*` files except `.env.example` are gitignored**

## Getting Help

### Common Resources

- **SvelteKit Documentation**: https://kit.svelte.dev/
- **WaveSurfer.js Documentation**: https://wavesurfer.xyz/
- **Tailwind CSS Documentation**: https://tailwindcss.com/

### Project-Specific Help

- Check existing documentation in `/docs/` folder
- Review component code in `/src/lib/components/`
- Look at utility functions in `/src/lib/utils/`

### Debugging Steps

1. Check browser console for errors
2. Verify environment variables are loaded (check `.env.local`)
3. Test database/Directus connectivity
4. Compare with working production environment
5. Review recent changes for potential issues
