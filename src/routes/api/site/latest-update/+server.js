/**
 * Latest Update API Endpoint
 * Returns the most recent content update timestamp across all collections.
 * Used by the new content notification indicator.
 * Cached for 5 minutes.
 */

import { json } from '@sveltejs/kit';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
	const now = Date.now();

	if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
		return json(cachedResult, {
			headers: { 'Cache-Control': 'public, max-age=300' }
		});
	}

	try {
		const directus = getDirectusInstance();

		const [nowEntry, musicSample, production] = await Promise.all([
			directus
				.request(
					readItems('kjov2_now_entries', {
						filter: { status: { _eq: 'published' } },
						fields: ['date_created'],
						sort: ['-date_created'],
						limit: 1
					})
				)
				.catch(() => []),
			directus
				.request(
					readItems('kjov2_music_samples', {
						filter: { status: { _eq: 'published' } },
						fields: ['date_created'],
						sort: ['-date_created'],
						limit: 1
					})
				)
				.catch(() => []),
			directus
				.request(
					readItems('kjov2_productions', {
						filter: { status: { _eq: 'live' } },
						fields: ['date_created'],
						sort: ['-date_created'],
						limit: 1
					})
				)
				.catch(() => [])
		]);

		const dates = [
			nowEntry[0]?.date_created,
			musicSample[0]?.date_created,
			production[0]?.date_created
		]
			.filter(Boolean)
			.map((d) => new Date(d).getTime());

		const latestTimestamp =
			dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

		const result = { latestUpdate: latestTimestamp };

		cachedResult = result;
		cacheTimestamp = Date.now();

		return json(result, {
			headers: { 'Cache-Control': 'public, max-age=300' }
		});
	} catch (error) {
		console.error('Error fetching latest update:', error);
		return json({ latestUpdate: null }, { status: 500 });
	}
}
