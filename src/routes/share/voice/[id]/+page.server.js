/**
 * Voice Project Share Page - Server-Side Data Loader
 *
 * GET /share/voice/[id]
 * Loads individual voice project data for shareable page
 * Uses slug-based URLs (/share/voice/project-name)
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

		// Query voice project by slug with related data
		const projects = await directus.request(
			readItems('kjov2_voice_projects', {
				filter: {
					slug: { _eq: slug },
					status: { _eq: 'live' }
				},
				fields: [
					'id',
					'slug',
					'title',
					'description',
					'client_name',
					'project_date',
					'feeling',
					{
						clips: [
							'id',
							'sort',
							'title',
							{ audio_file: ['id', 'filename_disk', 'filename_download'] }
						]
					},
					{
						categories: [{ kjov2_voice_categories_id: ['id', 'name', 'slug'] }]
					},
					{
						external_links: ['id', 'sort', 'url', 'label', 'icon_value', 'is_primary']
					}
				],
				limit: 1
			})
		);

		if (!projects || projects.length === 0) {
			throw error(404, 'Voice project not found');
		}

		const project = projects[0];

		// Process clips
		const clips = (project.clips || [])
			.sort((a, b) => (a.sort || 0) - (b.sort || 0))
			.map((clip) => ({
				id: clip.id,
				title: clip.title,
				audioUrl: clip.audio_file ? buildAssetUrl(clip.audio_file.filename_disk || clip.audio_file.id) : null
			}));

		// Get primary clip for audio player
		const primaryClip = clips[0] || null;

		// Process categories
		const categories = (project.categories || [])
			.map((c) => c.kjov2_voice_categories_id)
			.filter(Boolean)
			.map((cat) => ({
				id: cat.id,
				name: cat.name,
				slug: cat.slug
			}));

		// Process external links
		const externalLinks = (project.external_links || [])
			.sort((a, b) => (a.sort || 0) - (b.sort || 0))
			.map((link) => ({
				id: link.id,
				url: link.url,
				label: link.label,
				iconValue: link.icon_value,
				isPrimary: link.is_primary
			}));

		// Parse feeling tags
		let feelings = [];
		if (project.feeling) {
			if (Array.isArray(project.feeling)) {
				feelings = project.feeling;
			} else if (typeof project.feeling === 'string') {
				try {
					feelings = JSON.parse(project.feeling);
				} catch {
					feelings = [project.feeling];
				}
			}
		}

		const projectData = {
			id: project.id,
			slug: project.slug,
			title: project.title,
			description: project.description,
			clientName: project.client_name,
			projectDate: project.project_date,
			feelings,
			categories,
			clips,
			primaryClip,
			externalLinks
		};

		// Build meta tags for social sharing
		const meta = {
			title: `${projectData.title} - KEY JAY Voice`,
			description:
				projectData.description ||
				`Listen to ${projectData.title} voice-over project by KEY JAY.${categories.length > 0 ? ` Categories: ${categories.map((c) => c.name).join(', ')}` : ''}`,
			image: `${PUBLIC_SITE_URL}/img/social_1200.jpg`,
			type: 'voice'
		};

		return {
			project: projectData,
			meta,
			// Pass through layout data for footer
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
		};
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Failed to load voice project:', err);
		throw error(500, 'Failed to load voice project');
	}
}
