/**
 * Album Share Page - Server-Side Data Loader
 *
 * GET /share/album/[id]
 * Loads album data and track samples for shareable album page
 */

import { getMusicReleases } from '$lib/api/content/music.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function load({ params, fetch }) {
	const { id } = params;

	try {
		// Fetch all music releases
		const releases = await getMusicReleases();

		// Find the album by ID (support both string and numeric IDs)
		const album = releases.find(
			r => r.id === id || r.id.toString() === id || r.id === parseInt(id)
		);

		if (!album) {
			throw error(404, 'Album not found');
		}

		// Fetch track samples for this album
		let samples = [];
		try {
			const samplesResponse = await fetch(`/api/music-samples/${id}`);
			if (samplesResponse.ok) {
				samples = await samplesResponse.json();
			}
		} catch (sampleError) {
			console.error('Failed to fetch album samples:', sampleError);
			// Continue without samples - not critical for page load
		}

		// Build SEO metadata
		const meta = {
			title: `${album.title} - KEY JAY`,
			description:
				album.description ||
				album.liner_notes ||
				`Listen to ${album.title} by KEY JAY on all streaming platforms`,
			image: album.cover_art || `${PUBLIC_SITE_URL}/img/social_1200.jpg`,
			releaseDate: album.release_date,
			artist: album.artist || 'KEY JAY'
		};

		return {
			album,
			samples,
			meta
		};
	} catch (err) {
		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		// Otherwise, throw a 500 error
		console.error('Failed to load album:', err);
		throw error(500, 'Failed to load album');
	}
}
