/**
 * Games Shelf JSON API Endpoint
 *
 * Returns the user's game shelf from Directus, enriched with IGDB metadata
 * (cover art, genres, summary) where igdb_id is provided.
 * Cached for 30 minutes. CORS-enabled for NeoCities.
 */

import { json } from '@sveltejs/kit';
import { getCorsHeaders } from '$lib/utils/cors.js';
import { getGamesPlaying } from '$lib/api/content/gamesPlaying.js';
import { getIGDBToken } from '$lib/api/igdb/auth.js';
import { sanitizeHtml } from '$lib/utils/markdown.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

const IGDB_API_BASE = 'https://api.igdb.com/v4';

/**
 * Batch-fetch IGDB metadata for games with igdb_id.
 * Returns a map of igdb_id -> { cover_url, genres, summary }.
 */
async function fetchIGDBMetadata(igdbIds) {
	if (!igdbIds.length) return {};

	try {
		const { clientId, accessToken } = await getIGDBToken();

		const idList = igdbIds.join(',');
		const query = `fields name,cover.image_id,genres.name,summary; where id = (${idList}); limit ${igdbIds.length};`;

		const response = await fetch(`${IGDB_API_BASE}/games`, {
			method: 'POST',
			headers: {
				'Client-ID': clientId,
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'text/plain'
			},
			body: query
		});

		if (!response.ok) {
			console.error(`IGDB API error: ${response.status} ${response.statusText}`);
			return {};
		}

		const games = await response.json();
		const metadata = {};

		for (const game of games) {
			metadata[game.id] = {
				cover_url: game.cover
					? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
					: null,
				genres: (game.genres || []).map((g) => g.name),
				summary: game.summary || null
			};
		}

		return metadata;
	} catch (error) {
		console.error('IGDB enrichment failed (graceful degradation):', error.message);
		return {};
	}
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
			headers: { 'Cache-Control': 'public, max-age=1800', ...corsHeaders }
		});
	}

	try {
		const games = await getGamesPlaying();

		if (games.length === 0) {
			const result = { games: [], updated_at: new Date().toISOString() };
			cachedResult = result;
			cacheTimestamp = Date.now();
			return json(result, {
				headers: { 'Cache-Control': 'public, max-age=1800', ...corsHeaders }
			});
		}

		// Collect igdb_ids for batch enrichment
		const igdbIds = games.filter((g) => g.igdb_id).map((g) => g.igdb_id);
		const igdbMetadata = await fetchIGDBMetadata(igdbIds);

		const enrichedGames = games.map((game) => {
			const igdb = game.igdb_id ? igdbMetadata[game.igdb_id] || {} : {};
			return {
				id: game.id,
				title: game.title,
				game_status: game.game_status,
				platform: game.platform,
				notes: game.notes ? sanitizeHtml(game.notes) : null,
				cover_url: game.cover_url || igdb.cover_url || null,
				genres: igdb.genres || [],
				summary: igdb.summary || null,
				rating: game.rating,
				igdb_id: game.igdb_id,
				started_at: game.started_at,
				finished_at: game.finished_at
			};
		});

		const result = {
			games: enrichedGames,
			updated_at: new Date().toISOString()
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		return json(result, {
			headers: { 'Cache-Control': 'public, max-age=1800', ...corsHeaders }
		});
	} catch (error) {
		console.error('Error fetching games shelf:', error);
		return json(
			{ error: 'Content unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-cache', ...corsHeaders } }
		);
	}
}
