/**
 * Guestbook Content API
 *
 * Shared cache and data access for guestbook entries.
 */

import { getDirectusInstance, readItems, createItem } from '../core/client.js';
import { sanitizeHtml } from '$lib/utils/markdown.js';

let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

export function bustCache() {
	cachedResult = null;
	cacheTimestamp = 0;
}

export function getCached() {
	if (cachedResult && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
		return cachedResult;
	}
	return null;
}

export function setCache(result) {
	cachedResult = result;
	cacheTimestamp = Date.now();
}

export async function getGuestbookEntries() {
	const directus = getDirectusInstance();

	const entries = await directus.request(
		readItems('kjov2_guestbook', {
			filter: { status: { _eq: 'published' } },
			fields: ['id', 'name', 'website', 'message', 'date_created'],
			sort: ['-date_created'],
			limit: 50
		})
	);

	return {
		entries: entries.map((entry) => {
			const cleanMessage = sanitizeHtml(entry.message || '');
			let website = entry.website || '';
			if (website && !/^https?:\/\//i.test(website)) {
				website = '';
			}
			return {
				id: entry.id,
				name: entry.name,
				website,
				message: cleanMessage,
				date_created: entry.date_created
			};
		}),
		total: entries.length
	};
}

export async function createGuestbookEntry({ name, website, message }) {
	const directus = getDirectusInstance();

	await directus.request(
		createItem('kjov2_guestbook', {
			name,
			website: website || null,
			message
		})
	);
}
