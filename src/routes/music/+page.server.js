import { getMusicReleases, getMusicNetworks } from '$lib/services/directus-sdk.js';

export async function load() {
	try {
		const [albums, musicNetworks] = await Promise.all([
			getMusicReleases(),
			getMusicNetworks()
		]);
		
		return {
			albums: albums || [],
			musicNetworks: musicNetworks || []
		};
	} catch (error) {
		console.error('Failed to load music releases:', error);
		
		// Return empty arrays so page still loads
		return {
			albums: [],
			musicNetworks: [],
			error: error.message
		};
	}
}