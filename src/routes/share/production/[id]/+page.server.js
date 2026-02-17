/**
 * Production Share Page - Server-Side Data Loader
 *
 * GET /share/production/[id]
 * Loads individual production data for shareable page
 * Uses slug-based URLs (/share/production/production-name)
 */

import { getProductionBySlug } from '$lib/api/content/productions.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function load({ params, parent }) {
	// Get parent layout data (siteSettings, socialLinks)
	const parentData = await parent();
	const { id: slug } = params;

	const production = await getProductionBySlug(slug);

	if (!production) {
		throw error(404, 'Production not found');
	}

	// Build meta tags for social sharing
	const categoryNames = (production.categories || []).map(c => c.name).join(', ');
	const meta = {
		title: `${production.title} - KEY JAY Productions`,
		description:
			production.description ||
			`Check out ${production.title} by KEY JAY.${categoryNames ? ` Categories: ${categoryNames}` : ''}`,
		image: production.image || `${PUBLIC_SITE_URL}/img/og-social.png`,
		type: 'production'
	};

	return {
		production,
		meta,
		// Pass through layout data for footer
		siteSettings: parentData.siteSettings,
		socialLinks: parentData.socialLinks
	};
}
