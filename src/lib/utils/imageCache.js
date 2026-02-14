/**
 * Image load tracking utility
 *
 * Tracks which image URLs have been successfully loaded during this session.
 * Used by SkeletonImage to skip the loading skeleton on previously-seen images.
 *
 * Actual caching is handled by the service worker (src/service-worker.js)
 * which uses a cache-first strategy for CDN images.
 */

/** @type {Set<string>} URLs known to have loaded successfully */
const loadedUrls = new Set();

/**
 * Check if a URL was previously loaded in this session.
 * @param {string} url
 * @returns {boolean}
 */
export function isImageLoaded(url) {
	if (!url) return false;
	return loadedUrls.has(url);
}

/**
 * Register a URL as successfully loaded.
 * @param {string} url
 */
export function markImageLoaded(url) {
	if (url) loadedUrls.add(url);
}
