/**
 * Production Pages API Endpoint
 * Lazy-loads pages for a specific production (comic pages, gallery images)
 */

import { json, error } from '@sveltejs/kit';
import { getProductionPages } from '$lib/api/index.js';

export async function GET({ params }) {
	const { id } = params;

	if (!id) {
		throw error(400, 'Production ID is required');
	}

	try {
		const pages = await getProductionPages(id);

		return json({
			pages,
			count: pages.length
		});
	} catch (err) {
		console.error('Error loading production pages:', err);

		throw error(500, 'Failed to load production pages');
	}
}
