/**
 * Audio Playlist Tracks API Endpoint
 * Lazy-loads tracks for a specific audio playlist
 */

import { json, error } from '@sveltejs/kit';
import { getAudioPlaylistTracks } from '$lib/api/index.js';

export async function GET({ params }) {
	const { id } = params;

	if (!id) {
		throw error(400, 'Playlist ID is required');
	}

	try {
		const { playlist, tracks } = await getAudioPlaylistTracks(id);

		return json({
			playlist,
			tracks,
			count: tracks.length
		});
	} catch (err) {
		console.error('Error loading playlist tracks:', err);

		throw error(500, 'Failed to load playlist tracks');
	}
}
