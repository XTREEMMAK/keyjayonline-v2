/**
 * Recent Listening JSON API Endpoint
 *
 * Proxies Last.fm user.getRecentTracks to keep API key server-side.
 * Returns simplified track data as JSON/JSONP for the NeoCities outpost.
 * Cached for 5 minutes.
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCorsHeaders, jsonpResponse } from '$lib/utils/cors.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

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
		const headers = { 'Cache-Control': 'public, max-age=300', ...corsHeaders };
		return jsonpResponse(cachedResult, callback, headers) || json(cachedResult, { headers });
	}

	const apiKey = env.LASTFM_API_KEY;
	const username = env.LASTFM_USERNAME;

	if (!apiKey || !username) {
		const errData = { error: 'Last.fm credentials not configured' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}

	try {
		const lastfmUrl =
			`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
			`&user=${encodeURIComponent(username)}` +
			`&api_key=${encodeURIComponent(apiKey)}` +
			`&limit=20&format=json`;

		const response = await fetch(lastfmUrl);
		if (!response.ok) {
			throw new Error(`Last.fm API returned ${response.status}`);
		}

		const data = await response.json();
		const rawTracks = data?.recenttracks?.track || [];

		const tracks = rawTracks.map((track) => {
			const isNowPlaying = track['@attr']?.nowplaying === 'true';
			const images = track.image || [];
			const extralarge = images.find((img) => img.size === 'extralarge');
			const large = images.find((img) => img.size === 'large');
			const imageUrl = extralarge?.['#text'] || large?.['#text'] || '';

			return {
				name: track.name || '',
				artist: track.artist?.['#text'] || track.artist?.name || '',
				album: track.album?.['#text'] || '',
				image: imageUrl,
				url: track.url || '',
				now_playing: isNowPlaying,
				played_at: isNowPlaying ? null : (track.date?.uts ? Number(track.date.uts) * 1000 : null)
			};
		});

		const result = {
			tracks,
			username,
			profile_url: `https://www.last.fm/user/${encodeURIComponent(username)}`,
			updated_at: Date.now()
		};

		cachedResult = result;
		cacheTimestamp = Date.now();

		const headers = { 'Cache-Control': 'public, max-age=300', ...corsHeaders };
		return jsonpResponse(result, callback, headers) || json(result, { headers });
	} catch (error) {
		console.error('Error fetching Last.fm recent tracks:', error);
		const errData = { error: 'Scrobble feed unavailable' };
		const errHeaders = { 'Cache-Control': 'no-cache', ...corsHeaders };
		return jsonpResponse(errData, callback, errHeaders) || json(errData, { status: 503, headers: errHeaders });
	}
}
