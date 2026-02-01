import { getMusicReleases, getMusicNewReleases, getMusicNetworks, getMusicPageHeader, getLatestProjects } from '$lib/api/index.js';

// Helper to wrap promises with error handling - returns null on error
const safePromise = (promise) => promise.catch(err => {
	console.error('Promise failed:', err);
	return null;
});

export async function load() {
	try {
		const [albums, musicNetworks, musicPageHeader, newReleases, latestProjects] = await Promise.all([
			safePromise(getMusicReleases()),
			safePromise(getMusicNetworks()),
			safePromise(getMusicPageHeader()),
			safePromise(getMusicNewReleases()),
			safePromise(getLatestProjects(3))
		]);

		console.log('Music page load - latestProjects:', latestProjects?.length || 0, 'items');

		return {
			albums: albums || [],
			musicNetworks: musicNetworks || [],
			musicPageHeader,
			newReleases: newReleases || [],
			latestProjects: latestProjects || []
		};
	} catch (error) {
		console.error('Failed to load music releases:', error);

		// Return empty arrays so page still loads
		return {
			albums: [],
			musicNetworks: [],
			musicPageHeader: null,
			newReleases: [],
			latestProjects: [],
			error: error.message
		};
	}
}