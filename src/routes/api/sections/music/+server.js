/**
 * Music Section API Endpoint
 * Returns all data needed for the Music section
 */

import { json } from '@sveltejs/kit';
import {
	getMusicReleases,
	getMusicNetworks,
	getMusicPageHeader,
	getMusicNewReleases,
	getLatestProjects
} from '$lib/api/index.js';

// Helper to wrap promises with error handling
const safePromise = (promise, name = 'Promise') =>
	promise.catch((err) => {
		console.error(`${name} failed:`, err);
		return null;
	});

export async function GET() {
	try {
		// Load all music data in parallel
		const [albums, musicNetworks, musicPageHeader, newReleases, latestProjects] = await Promise.all(
			[
				safePromise(getMusicReleases(), 'getMusicReleases'),
				safePromise(getMusicNetworks(), 'getMusicNetworks'),
				safePromise(getMusicPageHeader(), 'getMusicPageHeader'),
				safePromise(getMusicNewReleases(), 'getMusicNewReleases'),
				safePromise(getLatestProjects(3), 'getLatestProjects')
			]
		);

		return json({
			albums: albums || [],
			musicNetworks: musicNetworks || [],
			musicPageHeader,
			newReleases: newReleases || [],
			latestProjects: latestProjects || []
		});
	} catch (error) {
		console.error('Error loading music section data:', error);

		return json(
			{
				error: 'Failed to load music section data',
				albums: [],
				musicNetworks: [],
				musicPageHeader: null,
				newReleases: [],
				latestProjects: []
			},
			{ status: 500 }
		);
	}
}
