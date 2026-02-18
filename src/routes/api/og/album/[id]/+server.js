/**
 * Open Graph Metadata API for Music Albums
 *
 * GET /api/og/album/[id]
 * Returns dynamic Open Graph metadata for social sharing
 */

import { json } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { getMusicReleases } from '$lib/api/content/music.js';

export async function GET({ params }) {
	const { id } = params;

	// Default OG data
	let ogData = {
		url: `${PUBLIC_SITE_URL}/#music?album=${id}`,
		type: 'music.album',
		title: 'KEY JAY ONLINE',
		description: 'The official website and portfolio for musician, creative, tech enthusiast, and producer Key Jay!',
		image: `${PUBLIC_SITE_URL}/img/og-social.webp`,
		siteName: 'KEY JAY ONLINE'
	};

	try {
		// Fetch all music releases
		const releases = await getMusicReleases();

		// Find the specific album by ID
		const album = releases.find(r => r.id === id || r.id === parseInt(id));

		if (album) {
			// Update with album-specific data
			ogData.title = `${album.title} - KEY JAY`;
			ogData.description =
				album.description ||
				`Listen to ${album.title} by KEY JAY on all streaming platforms`;

			// Use album cover art if available
			if (album.cover_art) {
				ogData.image = album.cover_art;
			}

			// Add music-specific metadata
			if (album.release_date) {
				ogData.releaseDate = album.release_date;
			}

			if (album.artist) {
				ogData.musician = album.artist;
			}

			// Add album type
			if (album.type) {
				ogData.albumType = album.type;
			}
		}
	} catch (error) {
		console.error('Failed to fetch album OG data:', error);
		// Return default OG data on error
	}

	return json(ogData);
}
