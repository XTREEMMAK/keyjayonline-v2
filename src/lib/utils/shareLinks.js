/**
 * Share Links Utility
 *
 * Functions for generating and handling shareable deep links
 * for music albums, comics, and productions.
 */

import { browser } from '$app/environment';
import { PUBLIC_SITE_URL } from '$env/static/public';

/**
 * Generate shareable URL for content item using database slug
 * @param {string} type - 'album', 'sample', 'comic', 'production'
 * @param {string|Object} idOrItem - Slug string, or object with { slug }
 * @returns {string} Full shareable URL
 * @throws {Error} If slug is missing from object
 *
 * @example
 * generateShareUrl('album', { slug: 'destinys-world' })
 * // Returns: "https://site.com/share/album/destinys-world"
 *
 * generateShareUrl('album', 'destinys-world')
 * // Returns: "https://site.com/share/album/destinys-world"
 */
export function generateShareUrl(type, idOrItem) {
	const base = PUBLIC_SITE_URL || (browser ? window.location.origin : '');

	if (typeof idOrItem === 'object' && idOrItem !== null) {
		if (!idOrItem.slug) {
			throw new Error(`Missing slug for ${type} share URL. Ensure Directus has slug field populated.`);
		}
		return `${base}/share/${type}/${idOrItem.slug}`;
	}

	// String passed directly (slug)
	return `${base}/share/${type}/${idOrItem}`;
}

/**
 * Detect if user is on mobile device
 * @returns {boolean} True if mobile
 */
function isMobile() {
	if (!browser) return false;
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);
}

/**
 * Copy share URL to clipboard
 * @param {string} url - URL to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyShareUrl(url) {
	if (!browser) return false;

	try {
		// Try native Web Share API on mobile first
		if (navigator.share && isMobile()) {
			await navigator.share({
				url,
				title: 'KEY JAY ONLINE'
			});
			return true;
		}

		// Fall back to clipboard API
		await navigator.clipboard.writeText(url);
		return true;
	} catch (error) {
		// If clipboard API fails, try fallback method
		try {
			const textArea = document.createElement('textarea');
			textArea.value = url;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			return true;
		} catch (fallbackError) {
			console.error('Failed to copy URL:', error, fallbackError);
			return false;
		}
	}
}
