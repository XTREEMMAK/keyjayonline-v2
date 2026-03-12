/**
 * Now Feed JSON API Endpoint
 *
 * Returns published /now entries as JSON for external consumption (NeoCities outpost).
 * Includes CORS headers restricted to allowed origins.
 * Cached for 15 minutes.
 */

import { json } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { sanitizeHtml, stripHtml } from '$lib/utils/markdown.js';
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
		const baseUrl = PUBLIC_SITE_URL || 'https://keyjayonline.com';

		const entries = await directus.request(
			readItems('kjov2_now_entries', {
				filter: { status: { _eq: 'published' } },
				fields: ['id', 'slug', 'content', 'date_created'],
				sort: ['-date_created'],
				limit: 5
			})
		);

		const result = {
			entries: entries.map((entry) => {
				const cleanHtml = sanitizeHtml(entry.content || '');
				const plainText = stripHtml(entry.content || '');
				return {
					id: entry.id,
					slug: entry.slug || null,
					content: cleanHtml,
					excerpt: plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText,
					published_at: entry.date_created
				};
			}),
			site: {
				name: 'Key Jay Online',
				url: baseUrl,
				now_url: `${baseUrl}/now`,
				feed_url: `${baseUrl}/feed.xml`
			}
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(result, callback, headers) || json(result, { headers });
	} catch (error) {
		console.error('Error fetching now entries for JSON feed:', error);
		const errData = { error: 'Content unavailable' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}
}
