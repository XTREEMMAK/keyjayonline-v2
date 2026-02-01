/**
 * SPA Main Page Server Load
 * Loads all section data for the single-page application
 */

import { getMusicReleases, getMusicNetworks, getMusicPageHeader, getMusicNewReleases, getLatestProjects } from '$lib/api/index.js';

// Helper to wrap promises with error handling - returns null on error
const safePromise = (promise, name = 'Promise') => promise.catch(err => {
	console.error(`${name} failed:`, err);
	return null;
});

export async function load({ parent }) {
	try {
		// Get site settings and CDN URL from parent layout
		const parentData = await parent();

		// Load music data in parallel with other potential data
		const [albums, musicNetworks, musicPageHeader, newReleases, latestProjects] = await Promise.all([
			safePromise(getMusicReleases(), 'getMusicReleases'),
			safePromise(getMusicNetworks(), 'getMusicNetworks'),
			safePromise(getMusicPageHeader(), 'getMusicPageHeader'),
			safePromise(getMusicNewReleases(), 'getMusicNewReleases'),
			safePromise(getLatestProjects(3), 'getLatestProjects')
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
				newReleases: newReleases || [],
				latestProjects: latestProjects || [],
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
				newReleases: [],
				latestProjects: [],
				featuredWorks: [],
				error: error.message
			},
			contactData: {}
		};
	}
}
