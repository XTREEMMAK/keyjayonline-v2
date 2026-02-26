/**
 * Now Feed JSON API Endpoint
 *
 * Returns published /now entries as JSON for external consumption (NeoCities outpost).
 * Includes CORS headers restricted to allowed origins.
 * Cached for 15 minutes.
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { sanitizeHtml, stripHtml } from '$lib/utils/markdown.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

function getAllowedOrigins() {
	const envOrigins = env.CORS_ALLOWED_ORIGINS;
	if (envOrigins) {
		return envOrigins.split(',').map((o) => o.trim());
	}
	return ['https://keyjay.neocities.org'];
}

function getCorsHeaders(requestOrigin) {
	const allowed = getAllowedOrigins();
	if (requestOrigin && allowed.includes(requestOrigin)) {
		return {
			'Access-Control-Allow-Origin': requestOrigin,
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400',
			Vary: 'Origin'
		};
	}
	return { Vary: 'Origin' };
}

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
		const directus = getDirectusInstance();
		const baseUrl = PUBLIC_SITE_URL || 'https://keyjayonline.com';

		const entries = await directus.request(
			readItems('kjov2_now_entries', {
				filter: { status: { _eq: 'published' } },
				fields: ['id', 'content', 'date_created'],
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

		return json(result, {
			headers: { 'Cache-Control': 'public, max-age=900', ...corsHeaders }
		});
	} catch (error) {
		console.error('Error fetching now entries for JSON feed:', error);
		return json(
			{ error: 'Content unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-cache', ...corsHeaders } }
		);
	}
}
