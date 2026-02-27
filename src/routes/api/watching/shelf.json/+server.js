/**
 * Watching Shelf JSON API Endpoint
 *
 * Returns the user's movie/TV shelf from Directus.
 * No server-side enrichment — NeoCities page calls OMDb directly.
 * Cached for 15 minutes. CORS-enabled for NeoCities.
 */

import { json } from '@sveltejs/kit';
import { getCorsHeaders } from '$lib/utils/cors.js';
import { getVidtvWatching } from '$lib/api/content/vidtvWatching.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function OPTIONS({ request }) {
	const origin = request.headers.get('origin');
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(origin)
	});
}

export async function GET({ request }) {
	const origin = request.headers.get('origin');
	const corsHeaders = getCorsHeaders(origin);
	const now = Date.now();

	if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
		return json(cachedResult, {
			headers: { 'Cache-Control': 'public, max-age=900', ...corsHeaders }
		});
	}

	try {
		const media = await getVidtvWatching();

		const result = {
			media,
			updated_at: new Date().toISOString()
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		return json(result, {
			headers: { 'Cache-Control': 'public, max-age=900', ...corsHeaders }
		});
	} catch (error) {
		console.error('Error fetching watching shelf:', error);
		return json(
			{ error: 'Content unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-cache', ...corsHeaders } }
		);
	}
}
