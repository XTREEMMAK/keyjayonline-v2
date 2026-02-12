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
	getLatestProjects,
	getMusicStudioGear,
	getMusicStudioCategories,
	getLegacyReleases,
	getStudioPhoto
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
		const [albums, musicNetworks, musicPageHeader, newReleases, latestProjects, studioGear, studioCategories, legacyReleases, studioPhoto] = await Promise.all(
			[
				safePromise(getMusicReleases(), 'getMusicReleases'),
				safePromise(getMusicNetworks(), 'getMusicNetworks'),
				safePromise(getMusicPageHeader(), 'getMusicPageHeader'),
				safePromise(getMusicNewReleases(), 'getMusicNewReleases'),
				safePromise(getLatestProjects(3), 'getLatestProjects'),
				safePromise(getMusicStudioGear(), 'getMusicStudioGear'),
				safePromise(getMusicStudioCategories(), 'getMusicStudioCategories'),
				safePromise(getLegacyReleases(), 'getLegacyReleases'),
				safePromise(getStudioPhoto(), 'getStudioPhoto')
			]
		);

		return json({
			albums: albums || [],
			musicNetworks: musicNetworks || [],
			musicPageHeader,
			newReleases: newReleases || [],
			latestProjects: latestProjects || [],
			studioGear: studioGear || [],
			studioCategories: studioCategories || [],
			legacyReleases: legacyReleases || [],
			studioPhoto: studioPhoto || null
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
				latestProjects: [],
				studioGear: [],
				studioCategories: [],
				legacyReleases: [],
				studioPhoto: null
			},
			{ status: 500 }
		);
	}
}
