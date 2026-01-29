/**
 * SPA Main Page Server Load
 * Loads all section data for the single-page application
 */

import { getMusicReleases, getMusicNetworks, getMusicPageHeader } from '$lib/api/index.js';

export async function load({ parent }) {
	try {
		// Get site settings and CDN URL from parent layout
		const parentData = await parent();

		// Load music data in parallel with other potential data
		const [albums, musicNetworks, musicPageHeader] = await Promise.all([
			getMusicReleases().catch(err => {
				console.error('Failed to load music releases:', err);
				return [];
			}),
			getMusicNetworks().catch(err => {
				console.error('Failed to load music networks:', err);
				return [];
			}),
			getMusicPageHeader().catch(err => {
				console.error('Failed to load music page header:', err);
				return null;
			})
		]);

		return {
			cdnBaseUrl: parentData.cdnBaseUrl || '',
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks,
			// Music section data
			musicData: {
				albums: albums || [],
				musicNetworks: musicNetworks || [],
				musicPageHeader,
				// Featured works from Directus kjov2_general.featured for Latest Projects section
				featuredWorks: parentData.siteSettings?.featuredWorks || []
			},
			// Contact section data (form needs parent data)
			contactData: {
				siteSettings: parentData.siteSettings
			}
		};
	} catch (error) {
		console.error('Error loading page data:', error);

		// Return fallback data
		return {
			cdnBaseUrl: '',
			siteSettings: null,
			socialLinks: [],
			musicData: {
				albums: [],
				musicNetworks: [],
				musicPageHeader: null,
				featuredWorks: [],
				error: error.message
			},
			contactData: {}
		};
	}
}
