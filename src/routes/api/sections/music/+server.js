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

// TODO: Move to Directus collection when ready
const STUDIO_GEAR = [
	{ id: 1, name: 'FL Studio', description: 'Primary DAW for production', icon: 'mdi:piano', category: 'daw' },
	{ id: 2, name: 'iZotope Ozone', description: 'Mastering suite', icon: 'mdi:tune', category: 'plugins' },
	{ id: 3, name: 'Audio-Technica AT2020', description: 'Condenser microphone for vocals', icon: 'mdi:microphone', category: 'microphones' },
	{ id: 4, name: 'Akai MPK Mini', description: 'MIDI controller for keys and pads', icon: 'mdi:piano', category: 'instruments' },
	{ id: 5, name: 'Focusrite Scarlett 2i2', description: 'Audio interface', icon: 'mdi:audio-input-stereo-minijack', category: 'outboard' },
	{ id: 6, name: 'Audio-Technica ATH-M50x', description: 'Studio monitoring headphones', icon: 'mdi:headphones', category: 'monitoring' }
];

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
			latestProjects: latestProjects || [],
			studioGear: STUDIO_GEAR
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
				studioGear: STUDIO_GEAR
			},
			{ status: 500 }
		);
	}
}
