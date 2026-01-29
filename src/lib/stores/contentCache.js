/**
 * Content Cache Store for KeyJay Online v2 SPA
 * Caches loaded section content to avoid re-fetching
 */

import { writable, get } from 'svelte/store';

// Cache structure for loaded content
export const contentCache = writable({
	music: { loaded: false, data: null, timestamp: null },
	voice: { loaded: false, data: null, timestamp: null },
	productions: { loaded: false, data: null, timestamp: null },
	about: { loaded: false, data: null, timestamp: null },
	contact: { loaded: false, data: null, timestamp: null }
});

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if section needs loading
 * @param {string} section - Section ID
 * @returns {boolean} True if section needs to be loaded
 */
export function needsLoading(section) {
	const cache = get(contentCache);
	const sectionCache = cache[section];

	if (!sectionCache || !sectionCache.loaded) {
		return true;
	}

	// Check if cache has expired
	if (sectionCache.timestamp && Date.now() - sectionCache.timestamp > CACHE_TTL) {
		return true;
	}

	return false;
}

/**
 * Get cached data for a section
 * @param {string} section - Section ID
 * @returns {any} Cached data or null
 */
export function getCachedData(section) {
	const cache = get(contentCache);
	return cache[section]?.data || null;
}

/**
 * Cache section data
 * @param {string} section - Section ID
 * @param {any} data - Data to cache
 */
export function cacheSection(section, data) {
	contentCache.update((cache) => ({
		...cache,
		[section]: {
			loaded: true,
			data,
			timestamp: Date.now()
		}
	}));
}

/**
 * Invalidate cache for a section
 * @param {string} section - Section ID
 */
export function invalidateCache(section) {
	contentCache.update((cache) => ({
		...cache,
		[section]: {
			loaded: false,
			data: null,
			timestamp: null
		}
	}));
}

/**
 * Clear all cached content
 */
export function clearAllCache() {
	contentCache.set({
		music: { loaded: false, data: null, timestamp: null },
		voice: { loaded: false, data: null, timestamp: null },
		productions: { loaded: false, data: null, timestamp: null },
		about: { loaded: false, data: null, timestamp: null },
		contact: { loaded: false, data: null, timestamp: null }
	});
}

/**
 * Preload a section's data
 * @param {string} section - Section ID
 * @param {Function} loadFn - Async function to load data
 */
export async function preloadSection(section, loadFn) {
	if (!needsLoading(section)) {
		return getCachedData(section);
	}

	try {
		const data = await loadFn();
		cacheSection(section, data);
		return data;
	} catch (error) {
		console.error(`Failed to preload section ${section}:`, error);
		return null;
	}
}
