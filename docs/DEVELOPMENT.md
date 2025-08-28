# Development Setup Guide

This guide covers setting up the development environment for KeyJay Online v2, including the audio CORS bypass functionality.

## Prerequisites

- Node.js 18+ 
- npm 8+
- Access to the development database and Directus instance

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd keyjayonline.com_v2
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The site will be available at `http://localhost:5173`

## Environment Variables

### Required Variables

```bash
# Database Configuration
DATABASE_HOST=192.168.10.156
DATABASE_PORT=5432
DATABASE_NAME=kjo_v2_db
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password

# Directus Configuration
DIRECTUS_URL=http://192.168.10.24:8057
DIRECTUS_TOKEN=your_directus_token

# CDN Configuration
CDN_BASE_URL=https://kjo.nyc3.cdn.digitaloceanspaces.com
S3_BUCKET_URL=https://kjo.nyc3.digitaloceanspaces.com
```

### Development-Specific Variables

```bash
# Application Configuration
NODE_ENV=development
USE_CDN_FOR_ASSETS=true

# Audio CORS Bypass (Development Only)
BYPASS_CORS_IN_DEV=true
```

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
# Enable (default)
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
   ```bash
   # Check if bypass is enabled
   echo $BYPASS_CORS_IN_DEV
   ```

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
   - Ensure database user has proper permissions
   - Check that database exists

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
   - Check that `DIRECTUS_TOKEN` is valid
   - Ensure token has necessary permissions

## Development Workflow

### Making Changes to Audio Components

1. **Test Both Environments**
   ```bash
   # Test with CORS bypass
   BYPASS_CORS_IN_DEV=true npm run dev
   
   # Test production-like behavior
   BYPASS_CORS_IN_DEV=false npm run dev
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

1. **Never commit sensitive tokens**
2. **Use different database credentials for development**  
3. **Regularly rotate Directus tokens**
4. **Keep environment files out of version control**

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
2. Verify environment variables are loaded
3. Test database/Directus connectivity
4. Compare with working production environment
5. Review recent changes for potential issues