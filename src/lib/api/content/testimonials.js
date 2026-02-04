/**
 * Testimonials Content API
 *
 * This module handles testimonials data fetching from Directus.
 * Testimonials are filtered by service_type field for display in relevant sections.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Transforms a raw Directus testimonial into the component format
 * @param {Object} testimonial - Raw testimonial from Directus
 * @returns {Object} Transformed testimonial object
 */
function transformTestimonial(testimonial) {
	// service_type is already an array from Directus
	let serviceTypes = [];
	if (testimonial.service_type) {
		if (Array.isArray(testimonial.service_type)) {
			serviceTypes = testimonial.service_type;
		} else if (typeof testimonial.service_type === 'string') {
			// Handle if stored as JSON string (fallback)
			try {
				const parsed = JSON.parse(testimonial.service_type);
				serviceTypes = Array.isArray(parsed) ? parsed : [parsed];
			} catch {
				serviceTypes = [testimonial.service_type];
			}
		}
	}

	// Build avatar URL from client_image
	let avatarUrl = null;
	if (testimonial.client_image) {
		avatarUrl = buildAssetUrl(
			testimonial.client_image.filename_disk || testimonial.client_image.id || testimonial.client_image
		);
	}

	// Map Directus field names to component field names
	return {
		id: testimonial.id,
		name: testimonial.client_name,
		date: testimonial.testimonial_date,
		quote: testimonial.testimonial_text,
		rating: testimonial.rating || 5,
		serviceTypes,
		company: testimonial.client_company,
		title: testimonial.client_title,
		avatarUrl,
		featured: testimonial.featured,
		projectName: testimonial.project_name
	};
}

/**
 * Fetches all published testimonials from Directus
 * Only returns testimonials with status = 'live'
 * @returns {Promise<Array>} Array of transformed testimonial objects
 */
export async function getTestimonials() {
	try {
		const directus = getDirectusInstance();

		const testimonials = await directus.request(
			readItems('kjov2_testimonials', {
				filter: {
					status: { _eq: 'live' }
				},
				fields: [
					'id',
					'client_name',
					'client_title',
					'client_company',
					'testimonial_date',
					'testimonial_text',
					'rating',
					'service_type',
					'featured',
					'project_name',
					{ client_image: ['id', 'filename_disk', 'filename_download'] }
				]
			})
		);

		return testimonials.map(transformTestimonial);
	} catch (error) {
		console.error('Error fetching testimonials:', error);
		return [];
	}
}

/**
 * Fetches testimonials filtered by service type
 * @param {string} serviceType - Service type to filter by (e.g., 'music', 'creative', 'productions', 'voice')
 * @returns {Promise<Array>} Array of filtered testimonial objects
 */
export async function getTestimonialsByServiceType(serviceType) {
	const testimonials = await getTestimonials();
	return testimonials.filter((t) => t.serviceTypes.includes(serviceType));
}

/**
 * Fetches testimonials for the biography/about section
 * Returns latest 10 testimonials in random order
 * @returns {Promise<Array>} Array of testimonial objects in random order
 */
export async function getTestimonialsForBio() {
	try {
		const directus = getDirectusInstance();

		const testimonials = await directus.request(
			readItems('kjov2_testimonials', {
				filter: {
					status: { _eq: 'live' }
				},
				fields: [
					'id',
					'client_name',
					'client_title',
					'client_company',
					'testimonial_date',
					'testimonial_text',
					'rating',
					'service_type',
					'featured',
					'project_name',
					{ client_image: ['id', 'filename_disk', 'filename_download'] }
				],
				limit: 10
			})
		);

		// Transform and shuffle the results
		const transformed = testimonials.map(transformTestimonial);
		return shuffleArray(transformed);
	} catch (error) {
		console.error('Error fetching bio testimonials:', error);
		return [];
	}
}

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Fetches testimonials filtered by service type (legacy alias)
 * @param {string} category - Category/service type to filter by
 * @returns {Promise<Array>} Array of filtered testimonial objects
 * @deprecated Use getTestimonialsByServiceType instead
 */
export async function getTestimonialsByCategory(category) {
	return getTestimonialsByServiceType(category);
}
