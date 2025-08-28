import { getMusicReleases, getMusicNetworks, getMusicPageHeader } from '$lib/api/index.js';

export async function load() {
	try {
		const [albums, musicNetworks, musicPageHeader] = await Promise.all([
			getMusicReleases(),
			getMusicNetworks(),
			getMusicPageHeader()
		]);
		
		return {
			albums: albums || [],
			musicNetworks: musicNetworks || [],
			musicPageHeader
		};
	} catch (error) {
		console.error('Failed to load music releases:', error);
		
		// Return empty arrays so page still loads
		return {
			albums: [],
			musicNetworks: [],
			musicPageHeader: null,
			error: error.message
		};
	}
}