/**
 * Now Entries Content API
 *
 * Fetches /now page entries from the kjov2_now_entries collection.
 */

import { getDirectusInstance, readItems, aggregate } from '../core/client.js';

/**
 * Fetches published now entries with pagination, sorted by date_created desc.
 * @param {number} limit - Maximum entries to return (default: 15)
 * @param {number} offset - Number of entries to skip (default: 0)
 * @returns {Promise<{entries: Array, totalCount: number}>} Entries and total count
 */
export async function getNowEntries(limit = 15, offset = 0) {
	try {
		const directus = getDirectusInstance();

		const [entries, countResult] = await Promise.all([
			directus.request(
				readItems('kjov2_now_entries', {
					filter: {
						status: { _eq: 'published' }
					},
					fields: [
						'id',
						'slug',
						'content',
						'date_created',
						'date_updated'
					],
					sort: ['-date_created'],
					limit,
					offset
				})
			),
			directus.request(
				aggregate('kjov2_now_entries', {
					aggregate: { count: 'id' },
					query: {
						filter: { status: { _eq: 'published' } }
					}
				})
			)
		]);

		const totalCount = parseInt(countResult?.[0]?.count?.id || '0', 10);

		return {
			entries: entries.map((entry) => ({
				id: entry.id,
				slug: entry.slug,
				content: entry.content,
				publishedAt: entry.date_created,
				updatedAt: entry.date_updated
			})),
			totalCount
		};
	} catch (error) {
		console.error('Error fetching now entries:', error);
		return { entries: [], totalCount: 0 };
	}
}

/**
 * Find the position (0-based index) of an entry by slug among all published entries.
 * Returns the index or -1 if not found.
 * @param {string} slug - The entry slug to find
 * @returns {Promise<number>} 0-based index in date_created desc order, or -1
 */
export async function getNowEntryPosition(slug) {
	if (!slug) return -1;
	try {
		const directus = getDirectusInstance();

		// Fetch all published entry slugs in order to find position
		const entries = await directus.request(
			readItems('kjov2_now_entries', {
				filter: { status: { _eq: 'published' } },
				fields: ['slug'],
				sort: ['-date_created'],
				limit: -1
			})
		);

		const index = entries.findIndex((e) => e.slug === slug);
		return index;
	} catch (error) {
		console.error('Error finding now entry position:', error);
		return -1;
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
