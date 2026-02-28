/**
 * Video/TV Watching Content API
 *
 * Fetches the user's movie/TV shelf from the kjov2_vidtv_watching collection.
 */

import { getDirectusInstance, readItems } from '../core/client.js';

/**
 * Fetches all published watching entries, sorted by sort order.
 * @returns {Promise<Array>} Array of transformed media objects
 */
export async function getVidtvWatching() {
	try {
		const directus = getDirectusInstance();

		const items = await directus.request(
			readItems('kjov2_vidtv_watching', {
				filter: {
					status: { _eq: 'published' }
				},
				fields: [
					'id',
					'title',
					'imdb_id',
					'media_type',
					'watch_status',
					'notes',
					'rating',
					'date_created'
				],
				sort: ['sort']
			})
		);

		return items.map((item) => ({
			id: item.id,
			title: item.title,
			imdb_id: item.imdb_id,
			media_type: item.media_type,
			watch_status: item.watch_status,
			notes: item.notes,
			rating: item.rating,
			date_created: item.date_created
		}));
	} catch (error) {
		console.error('Error fetching vidtv watching:', error);
		return [];
	}
}
