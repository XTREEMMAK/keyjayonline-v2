/**
 * Social Links JSON API Endpoint
 *
 * Returns social media links from Directus for external consumption (NeoCities outpost).
 * Includes CORS headers restricted to allowed origins.
 * Cached for 15 minutes.
 */

import { json } from '@sveltejs/kit';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { getSocialPlatformColors } from '$lib/utils/colors.js';
import { getCorsHeaders, jsonpResponse } from '$lib/utils/cors.js';

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
		const directus = getDirectusInstance();

		const socials = await directus.request(
			readItems('kjov2_socials', {
				fields: ['id', 'name', 'url', 'sort'],
				sort: ['sort', 'id']
			})
		);

		const result = {
			links: (socials || []).map((social) => ({
				name: social.name,
				url: social.url,
				platform: social.name.toLowerCase().replace(/\s+/g, ''),
				color: getSocialPlatformColors(social.name)
			}))
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(result, callback, headers) || json(result, { headers });
	} catch (error) {
		console.error('Error fetching social links:', error);
		const errData = { error: 'Social links unavailable' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}
}
