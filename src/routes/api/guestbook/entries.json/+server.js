/**
 * Guestbook Entries JSON API Endpoint
 *
 * Returns published guestbook entries as JSON/JSONP for the NeoCities outpost.
 * Cached for 15 minutes. CORS-enabled for allowed origins.
 */

import { json } from '@sveltejs/kit';
import { getCorsHeaders, jsonpResponse } from '$lib/utils/cors.js';
import { getCached, setCache, getGuestbookEntries } from '$lib/api/content/guestbook.js';

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

	const cached = getCached();
	if (cached) {
		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(cached, callback, headers) || json(cached, { headers });
	}

	try {
		const result = await getGuestbookEntries();
		setCache(result);

		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(result, callback, headers) || json(result, { headers });
	} catch (error) {
		console.error('Error fetching guestbook entries:', error);
		const errData = { error: 'Guestbook unavailable' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}
}
