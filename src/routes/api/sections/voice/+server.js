/**
 * Voice Section API Endpoint
 * Returns all data needed for the Voice section
 */

import { json } from '@sveltejs/kit';
import { getVoiceProjects, getVoiceCategories } from '$lib/api/index.js';

// Helper to wrap promises with error handling
const safePromise = (promise, name = 'Promise') =>
	promise.catch((err) => {
		console.error(`${name} failed:`, err);
		return null;
	});

export async function GET() {
	try {
		// Load all voice data in parallel
		const [projects, categories] = await Promise.all([
			safePromise(getVoiceProjects(), 'getVoiceProjects'),
			safePromise(getVoiceCategories(), 'getVoiceCategories')
		]);

		return json({
			projects: projects || [],
			categories: categories || []
		});
	} catch (error) {
		console.error('Error loading voice section data:', error);

		return json(
			{
				error: 'Failed to load voice section data',
				projects: [],
				categories: []
			},
			{ status: 500 }
		);
	}
}
