/**
 * IGDB Authentication via Twitch OAuth
 *
 * Manages Twitch client credentials flow for IGDB API access.
 * Caches the access token in memory with expiry tracking.
 * Falls back to static IGDB_ACCESS_TOKEN if IGDB_CLIENT_SECRET is not set.
 *
 * Env vars: IGDB_CLIENT_ID, IGDB_CLIENT_SECRET, IGDB_ACCESS_TOKEN
 */

import { env } from '$env/dynamic/private';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get a valid IGDB access token.
 * Tries Twitch OAuth first (IGDB_CLIENT_ID + IGDB_CLIENT_SECRET),
 * falls back to static IGDB_ACCESS_TOKEN.
 * @returns {Promise<{clientId: string, accessToken: string}>}
 * @throws {Error} If no credentials are configured or Twitch API fails
 */
export async function getIGDBToken() {
	const now = Date.now();
	const clientId = env.IGDB_CLIENT_ID ?? '';

	// Return cached OAuth token if still valid (5-min buffer)
	if (cachedToken && tokenExpiresAt > now + 300_000) {
		return { clientId, accessToken: cachedToken };
	}

	const clientSecret = env.IGDB_CLIENT_SECRET;

	// Fall back to static token if no client secret configured
	if (!clientSecret) {
		const staticToken = env.IGDB_ACCESS_TOKEN;
		if (clientId && staticToken) {
			return { clientId, accessToken: staticToken };
		}
		throw new Error('IGDB_CLIENT_ID + IGDB_CLIENT_SECRET (or IGDB_ACCESS_TOKEN) required');
	}

	if (!clientId) {
		throw new Error('IGDB_CLIENT_ID is required');
	}

	const response = await fetch(
		`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
		{ method: 'POST' }
	);

	if (!response.ok) {
		throw new Error(`Twitch OAuth error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	cachedToken = data.access_token;
	tokenExpiresAt = now + data.expires_in * 1000;

	return { clientId, accessToken: cachedToken };
}
