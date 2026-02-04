/**
 * Production Share Page - Server-Side Data Loader
 *
 * GET /share/production/[id]
 * Loads individual production data for shareable page
 * Uses slug-based URLs (/share/production/production-name)
 */

import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function load({ params, parent }) {
	// Get parent layout data (siteSettings, socialLinks)
	const parentData = await parent();
	const { id: slug } = params;

	try {
		const directus = getDirectusInstance();

		// Query production by slug with related data
		const productions = await directus.request(
			readItems('kjov2_productions', {
				filter: {
					slug: { _eq: slug },
					status: { _eq: 'live' }
				},
				fields: [
					'id',
					'slug',
					'title',
					'description',
					'production_type',
					'production_status',
					'year',
					'tags',
					'platform',
					'episodes_count',
					'issues_count',
					'duration',
					'item_count',
					'content_type',
					'content_embed_url',
					{ cover_image: ['id', 'filename_disk', 'filename_download'] },
					{
						external_links: [
							'id',
							'sort',
							'url',
							'label',
							'link_type',
							'icon_value',
							'is_primary'
						]
					},
					{
						categories: [{ kjov2_productions_categories_id: ['id', 'name', 'slug', 'icon', 'color'] }]
					}
				],
				limit: 1
			})
		);

		if (!productions || productions.length === 0) {
			throw error(404, 'Production not found');
		}

		const production = productions[0];

		// Build cover image URL
		let coverImageUrl = null;
		if (production.cover_image) {
			coverImageUrl = buildAssetUrl(
				production.cover_image.filename_disk || production.cover_image.id
			);
		}

		// Process categories
		const categories = (production.categories || [])
			.map((c) => c.kjov2_productions_categories_id)
			.filter(Boolean)
			.map((cat) => ({
				id: cat.id,
				name: cat.name,
				slug: cat.slug,
				icon: cat.icon,
				color: cat.color
			}));

		// Process external links
		const externalLinks = (production.external_links || [])
			.sort((a, b) => (a.sort || 0) - (b.sort || 0))
			.map((link) => ({
				id: link.id,
				url: link.url,
				label: link.label,
				linkType: link.link_type,
				iconValue: link.icon_value,
				isPrimary: link.is_primary
			}));

		// Parse tags
		let tags = [];
		if (production.tags) {
			if (Array.isArray(production.tags)) {
				tags = production.tags;
			} else if (typeof production.tags === 'string') {
				try {
					tags = JSON.parse(production.tags);
				} catch {
					tags = [production.tags];
				}
			}
		}

		// Map production_status to display format
		const statusMap = {
			in_development: 'In Development',
			in_production: 'In Production',
			ongoing: 'Ongoing',
			released: 'Released',
			complete: 'Complete'
		};

		const productionData = {
			id: production.id,
			slug: production.slug,
			title: production.title,
			description: production.description,
			type: production.production_type,
			status: statusMap[production.production_status] || production.production_status,
			year: production.year,
			tags,
			categories,
			coverImage: coverImageUrl,
			platform: production.platform,
			episodes: production.episodes_count,
			issues: production.issues_count,
			duration: production.duration,
			count: production.item_count,
			contentType: production.content_type,
			contentEmbedUrl: production.content_embed_url,
			externalLinks
		};

		// Build meta tags for social sharing
		const meta = {
			title: `${productionData.title} - KEY JAY Productions`,
			description:
				productionData.description ||
				`Check out ${productionData.title} by KEY JAY.${categories.length > 0 ? ` Categories: ${categories.map((c) => c.name).join(', ')}` : ''}`,
			image: coverImageUrl || `${PUBLIC_SITE_URL}/img/social_1200.jpg`,
			type: 'production'
		};

		return {
			production: productionData,
			meta,
			// Pass through layout data for footer
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
		};
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Failed to load production:', err);
		throw error(500, 'Failed to load production');
	}
}
