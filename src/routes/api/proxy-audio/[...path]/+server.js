/**
 * Audio Proxy API Endpoint
 * 
 * Development-only proxy endpoint that forwards audio requests to the CDN
 * to bypass CORS restrictions. Only active in development mode for security.
 */

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url }) {
  // Only allow in development mode for security
  if (!dev) {
    throw error(404, 'Proxy endpoint not available in production');
  }

  const path = params.path;
  
  if (!path) {
    throw error(400, 'Missing file path');
  }

  try {
    // Construct the CDN URL
    const cdnUrl = `https://kjo.nyc3.cdn.digitaloceanspaces.com/${path}`;
    console.log('Proxying audio request:', cdnUrl);
    
    // Fetch from CDN
    const response = await fetch(cdnUrl);
    
    if (!response.ok) {
      console.error('CDN fetch failed:', response.status, response.statusText);
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
    console.error('Audio proxy error:', err);
    
    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, `Audio proxy failed: ${err.message}`);
  }
}

/** @type {import('./$types').RequestHandler} */
export async function OPTIONS({ params }) {
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