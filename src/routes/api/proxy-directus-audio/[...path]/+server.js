/**
 * Directus Audio Proxy API Endpoint
 *
 * Development-only proxy endpoint that forwards audio requests to Directus
 * to bypass CORS restrictions. Only active in development mode for security.
 */

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
// Use dynamic imports to avoid build failures in CI when env vars are not set
import { env } from '$env/dynamic/private';

const DIRECTUS_URL = env.DIRECTUS_URL ?? 'http://localhost:8055';
const DIRECTUS_TOKEN = env.DIRECTUS_TOKEN ?? '';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
  // Only allow in development mode for security
  if (!dev) {
    throw error(404, 'Proxy endpoint not available in production');
  }

  const assetPath = params.path;

  if (!assetPath) {
    throw error(400, 'Missing asset path');
  }

  try {
    // Construct the Directus asset URL with authentication
    const directusUrl = `${DIRECTUS_URL}/assets/${assetPath}?access_token=${DIRECTUS_TOKEN}`;
    console.log('Proxying Directus audio request:', directusUrl);

    // Fetch from Directus
    const response = await fetch(directusUrl);

    if (!response.ok) {
      console.error('Directus fetch failed:', response.status, response.statusText);
      throw error(response.status, `Failed to fetch audio file: ${response.statusText}`);
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    // Stream the audio data
    const audioData = await response.arrayBuffer();

    return new Response(audioData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioData.byteLength.toString(),
        // Add CORS headers for development
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache for development performance
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (err) {
    console.error('Directus audio proxy error:', err);

    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }

    throw error(500, `Directus audio proxy failed: ${err.message}`);
  }
}

/** @type {import('./$types').RequestHandler} */
export async function OPTIONS() {
  // Only allow in development mode
  if (!dev) {
    throw error(404, 'Proxy endpoint not available in production');
  }

  // Handle preflight requests
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
