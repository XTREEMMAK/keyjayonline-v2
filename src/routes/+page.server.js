/**
 * SPA Main Page Server Load
 * Loads only critical site settings - section data is lazy-loaded client-side
 */

export async function load({ parent }) {
	try {
		// Get site settings and CDN URL from parent layout
		const parentData = await parent();

		return {
			cdnBaseUrl: parentData.cdnBaseUrl || '',
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
			// Section data (music, voice, etc.) is now lazy-loaded via /api/sections/* endpoints
		};
	} catch (error) {
		console.error('Error loading page data:', error);

		// Return fallback data
		return {
			cdnBaseUrl: '',
			siteSettings: null,
			socialLinks: []
		};
	}
}
