/**
 * Share Links Utility
 *
 * Functions for generating and handling shareable deep links
 * for music albums, comics, and productions.
 */

import { browser } from '$app/environment';
import { PUBLIC_SITE_URL } from '$env/static/public';

/**
 * Generate shareable URL for content item
 * @param {string} type - 'album', 'comic', 'production'
 * @param {string} id - Content ID
 * @returns {string} Full shareable URL
 */
export function generateShareUrl(type, id) {
	const base = PUBLIC_SITE_URL || (browser ? window.location.origin : '');
	return `${base}/share/${type}/${id}`;
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
