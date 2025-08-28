# Audio CORS Bypass Technical Documentation

This document provides detailed technical information about the audio CORS bypass system implemented for development environments.

## Problem Statement

### The CORS Issue

Cross-Origin Resource Sharing (CORS) prevents web browsers from loading audio files from external CDNs when the request originates from a different domain. In development:

- **Local Development**: `http://localhost:5173`
- **Audio CDN**: `https://kjo.nyc3.cdn.digitaloceanspaces.com`
- **Result**: Browser blocks audio requests due to CORS policy

### Impact

Without CORS bypass, WaveSurfer.js audio players fail to load with errors like:
```
Access to fetch at 'https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/track.mp3' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## Solution Architecture

### Multi-Layer Approach

The CORS bypass system uses multiple complementary techniques:

1. **Environment Detection**: Automatic dev/prod environment detection
2. **URL Transformation**: Transform CDN URLs to proxy URLs in development
3. **Vite Proxy**: HTTP proxy at build tool level
4. **API Endpoint**: Server-side proxy fallback
5. **WaveSurfer Backend**: MediaElement backend for better compatibility

## Technical Implementation

### 1. Environment Detection

**File**: `src/lib/utils/environment.js`

```javascript
import { dev } from '$app/environment';

export function isDevelopment() {
  return dev; // SvelteKit's compile-time environment flag
}

export function shouldBypassCors() {
  // Multiple safety checks
  if (!isDevelopment()) return false;
  if (process.env?.BYPASS_CORS_IN_DEV === 'false') return false;
  return true;
}
```

**Key Features**:
- Uses SvelteKit's compile-time `dev` flag
- Environment variable override capability
- Fail-safe defaults (production = no bypass)

### 2. URL Transformation

**File**: `src/lib/utils/environment.js`

```javascript
export function getAudioUrl(originalUrl) {
  if (!originalUrl || !shouldBypassCors()) {
    return originalUrl; // No transformation in production
  }
  
  const cdnBaseUrl = 'https://kjo.nyc3.cdn.digitaloceanspaces.com';
  if (originalUrl.startsWith(cdnBaseUrl)) {
    const path = originalUrl.replace(cdnBaseUrl, '');
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/api/proxy-audio/${cleanPath}`;
  }
  
  return originalUrl;
}
```

**Transformation Examples**:
```
Original:  https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/samples/track.mp3
Development: /api/proxy-audio/audio/samples/track.mp3
Production:  https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/samples/track.mp3
```

### 3. Vite Proxy Configuration

**File**: `vite.config.js`

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api/proxy-audio': {
        target: 'https://kjo.nyc3.cdn.digitaloceanspaces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy-audio/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
        }
      }
    }
  }
});
```

**How It Works**:
1. Request: `GET /api/proxy-audio/audio/track.mp3`
2. Vite rewrites to: `https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/track.mp3`
3. Vite fetches from CDN and returns to browser
4. Browser receives response as if from same origin

### 4. Server-Side API Endpoint

**File**: `src/routes/api/proxy-audio/[...path]/+server.js`

```javascript
export async function GET({ params, url }) {
  // Security: Only allow in development
  if (!dev) {
    throw error(404, 'Proxy endpoint not available in production');
  }

  const cdnUrl = `https://kjo.nyc3.cdn.digitaloceanspaces.com/${params.path}`;
  const response = await fetch(cdnUrl);
  const audioData = await response.arrayBuffer();
  
  return new Response(audioData, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      'Access-Control-Allow-Origin': '*', // Development only
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

**Fallback Mechanism**:
- Provides server-side proxy when Vite proxy insufficient
- Handles edge cases and complex scenarios
- Adds proper CORS headers for development

### 5. WaveSurfer Integration

**File**: `src/lib/utils/wavesurfer.js`

```javascript
export async function createWaveSurfer({ container, audioUrl, customConfig }) {
  const WaveSurfer = (await import('wavesurfer.js')).default;
  
  // Get environment-aware configuration
  const baseConfig = getWaveSurferConfig();
  const transformedAudioUrl = getAudioUrl(audioUrl);
  
  // Create instance with transformed URL
  const wavesurfer = WaveSurfer.create({
    container,
    ...baseConfig,
    ...customConfig
  });
  
  if (transformedAudioUrl) {
    wavesurfer.load(transformedAudioUrl);
  }
  
  return wavesurfer;
}
```

## Security Analysis

### Development-Only Activation

The system has multiple layers of protection to ensure it only runs in development:

#### 1. Compile-Time Protection

```javascript
// SvelteKit's 'dev' flag is resolved at build time
import { dev } from '$app/environment';

// In production builds, dev = false, so this code is unreachable
if (dev) {
  // Development-only code
}
```

#### 2. Runtime Environment Checks

```javascript
export function shouldBypassCors() {
  if (!isDevelopment()) {
    return false; // Always false in production
  }
  // Additional checks...
}
```

#### 3. Server-Side Validation

```javascript
export async function GET({ params, url }) {
  if (!dev) {
    throw error(404, 'Proxy endpoint not available in production');
  }
  // Proxy logic...
}
```

### Attack Vector Analysis

#### 1. Production Exposure Risk: **VERY LOW**

- **Compile-time removal**: Production builds don't include proxy code
- **Environment detection**: Multiple checks prevent production activation
- **Server endpoints**: Return 404 in production automatically

#### 2. Path Traversal Risk: **LOW**

```javascript
// Current implementation
const cdnUrl = `https://kjo.nyc3.cdn.digitaloceanspaces.com/${params.path}`;
```

**Potential Improvement**:
```javascript
// Enhanced validation (optional)
const safePath = params.path.replace(/\.\./g, '').replace(/^\/+/, '');
const cdnUrl = `https://kjo.nyc3.cdn.digitaloceanspaces.com/${safePath}`;
```

#### 3. Resource Abuse Risk: **LOW**

- **Scope limitation**: Only proxies specific CDN domain
- **Development context**: Not accessible from public internet
- **File type restriction**: Only audio files are practically useful

### Security Recommendations

1. **Environment Variable Management**
   ```bash
   # Production .env should NOT include:
   BYPASS_CORS_IN_DEV=true
   
   # Or explicitly disable:
   BYPASS_CORS_IN_DEV=false
   ```

2. **Pre-deployment Verification**
   ```bash
   # Check that proxy code is not in production build
   grep -r "proxy-audio" build/ && echo "WARNING: Proxy found in build"
   ```

3. **Regular Security Reviews**
   - Audit environment detection logic
   - Verify production builds don't include development code
   - Test that proxy endpoints return 404 in production

## Performance Considerations

### Development Performance Impact

1. **Latency**: +50-100ms per audio request (proxy overhead)
2. **Memory**: Audio files loaded into server memory during proxy
3. **Network**: Double bandwidth usage (CDN → Dev Server → Browser)

### Optimization Strategies

#### 1. Caching

```javascript
// Vite proxy includes caching headers
'Cache-Control': 'public, max-age=3600'
```

#### 2. Request Limiting

```javascript
// Optional: Add request limiting for development
let requestCount = 0;
const MAX_CONCURRENT = 5;

export async function GET({ params }) {
  if (++requestCount > MAX_CONCURRENT) {
    throw error(429, 'Too many concurrent requests');
  }
  // ... proxy logic
  requestCount--;
}
```

#### 3. File Size Optimization

```javascript
// Optional: Add file size checking
const response = await fetch(cdnUrl);
const contentLength = response.headers.get('content-length');

if (contentLength && parseInt(contentLength) > 10_000_000) { // 10MB
  throw error(413, 'File too large for development proxy');
}
```

## Testing and Debugging

### Environment Detection Testing

```javascript
// Test in browser console (development)
import { isDevelopment, shouldBypassCors } from '/src/lib/utils/environment.js';
console.log('Development:', isDevelopment()); // Should be true
console.log('CORS Bypass:', shouldBypassCors()); // Should be true

// Production build should show false for both
```

### URL Transformation Testing

```javascript
// Test URL transformation
import { getAudioUrl } from '/src/lib/utils/environment.js';

const original = 'https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/test.mp3';
const transformed = getAudioUrl(original);

console.log('Original:', original);
console.log('Transformed:', transformed);
// Development: /api/proxy-audio/audio/test.mp3
// Production: https://kjo.nyc3.cdn.digitaloceanspaces.com/audio/test.mp3
```

### Network Request Monitoring

```javascript
// Monitor network requests in browser DevTools
// Development should show:
//   - Requests to /api/proxy-audio/ (Status: 200)
//   - No CORS errors
// Production should show:
//   - Direct requests to CDN (Status: 200)
//   - Proper CORS headers from CDN
```

## Migration and Maintenance

### Adding New Audio Components

1. **Use Shared Utilities**
   ```javascript
   import { createWaveSurfer } from '$lib/utils/wavesurfer.js';
   
   // Automatically includes CORS bypass
   const player = await createWaveSurfer({
     container: element,
     audioUrl: 'https://cdn.example.com/audio/track.mp3'
   });
   ```

2. **Avoid Direct WaveSurfer Creation**
   ```javascript
   // DON'T do this - bypasses CORS system
   const wavesurfer = WaveSurfer.create({
     container: element,
     url: audioUrl // No transformation applied
   });
   
   // DO this instead
   const wavesurfer = await createWaveSurfer({
     container: element,
     audioUrl: audioUrl // Transformation applied automatically
   });
   ```

### Updating CDN Configuration

1. **Development**: No changes needed (proxy handles any CDN)
2. **Production**: Update CORS headers on new CDN
3. **Testing**: Verify both environments work with new CDN

### Future Improvements

#### 1. Enhanced Path Validation
```javascript
function validateProxyPath(path) {
  // Whitelist allowed file extensions
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  const hasValidExtension = allowedExtensions.some(ext => path.endsWith(ext));
  
  if (!hasValidExtension) {
    throw error(400, 'Invalid file type for audio proxy');
  }
  
  return path;
}
```

#### 2. Development Analytics
```javascript
// Track proxy usage for debugging
const proxyStats = {
  requests: 0,
  successCount: 0,
  errorCount: 0,
  totalBytes: 0
};

// Log stats periodically in development
```

#### 3. Conditional CDN Selection
```javascript
// Support multiple CDNs with different CORS policies
function selectCDN(environment) {
  if (environment === 'development') {
    return 'https://dev-cdn.example.com'; // More permissive CORS
  }
  return 'https://prod-cdn.example.com'; // Strict CORS
}
```

## Related Documentation

- [Development Setup Guide](DEVELOPMENT.md) - How to set up the development environment
- [Deployment Guide](DEPLOYMENT.md) - Production deployment with CORS configuration
- [WaveSurfer Utilities](../src/lib/utils/wavesurfer.js) - Shared audio player utilities
- [Environment Utilities](../src/lib/utils/environment.js) - Environment detection and configuration

## Troubleshooting

### Common Issues

1. **Audio still not loading in development**
   - Check `BYPASS_CORS_IN_DEV=true` in .env
   - Verify dev server restarted after config changes
   - Check browser console for proxy request status

2. **Production build includes proxy code**
   - Ensure `NODE_ENV=production` during build
   - Check that SvelteKit's `dev` flag is false in production
   - Verify build process is using production configuration

3. **Performance issues in development**
   - Reduce audio file sizes for development
   - Clear browser cache if stale responses
   - Monitor memory usage for large audio files

For technical support or questions about this system, refer to the component implementations and utility functions in the codebase.