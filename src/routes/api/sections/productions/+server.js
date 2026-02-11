/**
 * Productions Section API Endpoint
 * Returns all data needed for the Productions section
 */

import { json } from '@sveltejs/kit';
import { getProductions, getCategoryChoices, getSiteSettings } from '$lib/api/index.js';
import { getTestimonialsByServiceType } from '$lib/api/content/testimonials.js';

// Helper to wrap promises with error handling
const safePromise = (promise, name = 'Promise') =>
	promise.catch((err) => {
		console.error(`${name} failed:`, err);
		return null;
	});

export async function GET() {
	try {
		// Load all productions data in parallel
		const [productions, categories, siteSettings, testimonials] = await Promise.all([
			safePromise(getProductions(), 'getProductions'),
			safePromise(getCategoryChoices(), 'getCategoryChoices'),
			safePromise(getSiteSettings(), 'getSiteSettings'),
			safePromise(getTestimonialsByServiceType('productions'), 'getTestimonials')
		]);

		return json({
			productions: productions || [],
			categories: categories || [],
			socialLinks: siteSettings?.socialLinks || [],
			testimonials: testimonials || []
		});
	} catch (error) {
		console.error('Error loading productions section data:', error);

		return json(
			{
				error: 'Failed to load productions section data',
				productions: [],
				categories: [],
				socialLinks: [],
				testimonials: []
			},
			{ status: 500 }
		);
	}
}
