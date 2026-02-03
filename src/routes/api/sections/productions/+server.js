/**
 * Productions Section API Endpoint
 * Returns all data needed for the Productions section
 */

import { json } from '@sveltejs/kit';
import { getProductions, getProductionsCategories, getSiteSettings } from '$lib/api/index.js';

// Helper to wrap promises with error handling
const safePromise = (promise, name = 'Promise') =>
	promise.catch((err) => {
		console.error(`${name} failed:`, err);
		return null;
	});

export async function GET() {
	try {
		// Load all productions data in parallel
		const [productions, categories, siteSettings] = await Promise.all([
			safePromise(getProductions(), 'getProductions'),
			safePromise(getProductionsCategories(), 'getProductionsCategories'),
			safePromise(getSiteSettings(), 'getSiteSettings')
		]);

		return json({
			productions: productions || [],
			categories: categories || [],
			socialLinks: siteSettings?.socialLinks || []
		});
	} catch (error) {
		console.error('Error loading productions section data:', error);

		return json(
			{
				error: 'Failed to load productions section data',
				productions: [],
				categories: [],
				socialLinks: []
			},
			{ status: 500 }
		);
	}
}
