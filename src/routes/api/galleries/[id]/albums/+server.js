/**
 * Gallery Albums API Endpoint
 * Lazy-loads albums (pages/images) for a specific gallery
 */

import { json, error } from '@sveltejs/kit';
import { getGalleryAlbums } from '$lib/api/index.js';

export async function GET({ params }) {
	const { id } = params;

	if (!id) {
		throw error(400, 'Gallery ID is required');
	}

	try {
		const albums = await getGalleryAlbums(id);

		return json({
			albums,
			count: albums.length
		});
	} catch (err) {
		console.error('Error loading gallery albums:', err);

		throw error(500, 'Failed to load gallery albums');
	}
}
