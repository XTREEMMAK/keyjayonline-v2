/**
 * Games Playing Content API
 *
 * Fetches the user's game shelf from the kjov2_games_playing collection.
 */

import { getDirectusInstance, readItems } from '../core/client.js';

/**
 * Fetches all published games playing entries, sorted by sort order.
 * @returns {Promise<Array>} Array of transformed game objects
 */
export async function getGamesPlaying() {
	try {
		const directus = getDirectusInstance();

		const items = await directus.request(
			readItems('kjov2_games_playing', {
				filter: {
					status: { _eq: 'published' }
				},
				fields: [
					'id',
					'title',
					'igdb_id',
					'game_status',
					'platform',
					'notes',
					'date_created'
				],
				sort: ['sort']
			})
		);

		return items.map((item) => ({
			id: item.id,
			title: item.title,
			igdb_id: item.igdb_id,
			game_status: item.game_status,
			platform: item.platform,
			notes: item.notes,
			date_created: item.date_created
		}));
	} catch (error) {
		console.error('Error fetching games playing:', error);
		return [];
	}
}
