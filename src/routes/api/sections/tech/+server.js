/**
 * Tech Section API Endpoint
 * Returns all data needed for the Tech section
 */

import { json } from '@sveltejs/kit';
import { getTechPageHeader } from '$lib/api/content/pages.js';
import { getTechProjects, getTechStack, getTechShowcase } from '$lib/api/content/tech.js';

const safePromise = (promise, name = 'Promise') =>
	promise.catch((err) => {
		console.error(`${name} failed:`, err);
		return null;
	});

export async function GET() {
	try {
		const [techPageHeader, projects, techStack, showcase] = await Promise.all([
			safePromise(getTechPageHeader(), 'getTechPageHeader'),
			safePromise(getTechProjects(), 'getTechProjects'),
			safePromise(getTechStack(), 'getTechStack'),
			safePromise(getTechShowcase(), 'getTechShowcase')
		]);

		return json({
			techPageHeader: techPageHeader || null,
			projects: projects || [],
			techStack: techStack || [],
			showcase: showcase || []
		});
	} catch (error) {
		console.error('Error loading tech section data:', error);

		return json(
			{
				error: 'Failed to load tech section data',
				techPageHeader: null,
				projects: [],
				techStack: [],
				showcase: []
			},
			{ status: 500 }
		);
	}
}
