/**
 * Radio Sample JSON API Endpoint
 *
 * Returns 5 random published music samples as JSON for external consumption
 * (NeoCities outpost audio player). Queries kjov2_music_samples directly
 * since the full radio feature isn't enabled yet.
 *
 * Includes CORS headers restricted to allowed origins.
 * Cached for 15 minutes (random selection is re-shuffled on cache expiry).
 */

import { json } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
import { getCorsHeaders, jsonpResponse } from '$lib/utils/cors.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;
const SAMPLE_COUNT = 5;

/** Fisher-Yates shuffle */
function shuffle(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

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

		const samples = await directus.request(
			readItems('kjov2_music_samples', {
				filter: {
					status: { _eq: 'published' },
					music_sample: { _nnull: true },
					is_legacy: { _neq: true }
				},
				fields: [
					'id',
					'track_name',
					'artist',
					'library',
					'is_radio_new',
					'description',
					{ music_sample: ['id', 'filename_disk'] },
					{ thumbnail: ['id', 'filename_disk'] }
				],
				limit: -1
			})
		);

		const randomSamples = shuffle(samples).slice(0, SAMPLE_COUNT);

		const result = {
			tracks: randomSamples.map((sample) => ({
				id: sample.id,
				title: sample.track_name,
				artist: sample.artist || 'Key Jay',
				audioUrl: sample.music_sample ? buildAssetUrl(sample.music_sample) : null,
				thumbnail: sample.thumbnail ? buildAssetUrl(sample.thumbnail) : null,
				genre: sample.library || null
			})),
			radio_url: `${baseUrl}/radio`
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		const headers = { 'Cache-Control': 'public, max-age=900', ...corsHeaders };
		return jsonpResponse(result, callback, headers) || json(result, { headers });
	} catch (error) {
		console.error('Error fetching music samples for radio sample:', error);
		const errData = { error: 'Content unavailable' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}
}
