/**
 * Now Entries Content API
 *
 * Fetches /now page entries from the kjov2_now_entries collection.
 */

import { getDirectusInstance, readItems } from '../core/client.js';

/**
 * Fetches all published now entries, sorted by date_created desc.
 * @param {number} limit - Maximum entries to return (default: 50)
 * @returns {Promise<Array>} Array of transformed now entry objects
 */
export async function getNowEntries(limit = 50) {
	try {
		const directus = getDirectusInstance();

		const entries = await directus.request(
			readItems('kjov2_now_entries', {
				filter: {
					status: { _eq: 'published' }
				},
				fields: [
					'id',
					'content',
					'date_created',
					'date_updated'
				],
				sort: ['-date_created'],
				limit
			})
		);

		return entries.map((entry) => ({
			id: entry.id,
			content: entry.content,
			publishedAt: entry.date_created,
			updatedAt: entry.date_updated
		}));
	} catch (error) {
		console.error('Error fetching now entries:', error);
		return [];
	}
}

/**
 * Get the most recent date_created timestamp from now entries.
 * Used by the RSS feed and latest-update endpoint.
 * @returns {Promise<string|null>} ISO date string or null
 */
export async function getLatestNowEntryDate() {
	try {
		const directus = getDirectusInstance();

		const entries = await directus.request(
			readItems('kjov2_now_entries', {
				filter: { status: { _eq: 'published' } },
				fields: ['date_created'],
				sort: ['-date_created'],
				limit: 1
			})
		);

		if (entries.length === 0) return null;
		return entries[0].date_created;
	} catch (error) {
		console.error('Error fetching latest now entry date:', error);
		return null;
	}
}
