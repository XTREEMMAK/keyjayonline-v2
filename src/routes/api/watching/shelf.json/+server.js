/**
 * Watching Shelf JSON API Endpoint
 *
 * Returns the user's movie/TV shelf from Directus.
 * No server-side enrichment — NeoCities page calls OMDb directly.
 * Cached for 15 minutes. CORS-enabled for NeoCities.
 */

import { json } from '@sveltejs/kit';
import { getCorsHeaders, jsonpResponse } from '$lib/utils/cors.js';
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

export async function GET({ request, url }) {
	const origin = request.headers.get('origin');
	const corsHeaders = getCorsHeaders(origin);
	const callback = url.searchParams.get('callback');
	const now = Date.now();

	if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(cachedResult, callback, headers) || json(cachedResult, { headers });
	}

	try {
		const media = await getVidtvWatching();

		const result = {
			media,
			updated_at: new Date().toISOString()
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(result, callback, headers) || json(result, { headers });
	} catch (error) {
		console.error('Error fetching watching shelf:', error);
		const errData = { error: 'Content unavailable' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}
}
