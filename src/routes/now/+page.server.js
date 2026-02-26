import { getNowEntries } from '$lib/api/index.js';

export async function load({ parent }) {
	const parentData = await parent();

	try {
		const entries = await getNowEntries(50);

		return {
			entries,
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
		};
	} catch (error) {
		console.error('Error loading /now data:', error);
		return {
			entries: [],
			error: 'Failed to load entries',
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
		};
	}
}
