/**
 * Album Share Page - Server-Side Data Loader
 *
 * GET /share/album/[id]
 * Loads album data and track samples for shareable album page
 * Uses slug-based URLs (/share/album/destinys-world)
 */

import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
import { transformCredit } from '$lib/api/core/creditTransform.js';
import { extractYouTubeId } from '$lib/utils/youtube.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function load({ params, fetch }) {
	const { id: slug } = params;

	try {
		const directus = getDirectusInstance();

		// Query directly by slug field
		const releases = await directus.request(
			readItems('kjov2_music_releases', {
				filter: {
					slug: { _eq: slug },
					_or: [
						{ published_status: { _eq: 'live' } },
						{ published_status: { _null: true } }
					]
				},
				fields: [
					'*',
					{ cover_art: ['id', 'filename_disk', 'filename_download'] },
					{
						credits: [
							'additional_info',
							'display_order',
							{
								person_id: ['name', 'bio', 'website_url', 'social_links', 'profile_image.id', 'profile_image.filename_disk']
							},
							{
								role: [{ kjov2_ip_roles_id: ['id', 'name', 'sort'] }]
							}
						]
					},
					{
						videos: [
							'id',
							'title',
							'description',
							'video_type',
							'video_url',
							'thumbnail_url',
							'display_order',
							'featured'
						]
					},
					{
						external_links: [
							'id',
							'url',
							'label',
							'icon_type',
							'display_order',
							'is_primary',
							{ icon_value: ['icon_reference_id'] }
						]
					}
				],
				limit: 1
			})
		);

		if (!releases || releases.length === 0) {
			throw error(404, 'Album not found');
		}

		const release = releases[0];

		// Transform to frontend format
		const album = transformRelease(release);

		// Fetch track samples for this album using the album's UUID
		let samples = [];
		try {
			const samplesResponse = await fetch(`/api/music-samples/${album.id}`);
			if (samplesResponse.ok) {
				samples = await samplesResponse.json();
			}
		} catch (sampleError) {
			console.error('Failed to fetch album samples:', sampleError);
		}

		// Build SEO metadata
		const meta = {
			title: `${album.title} - KEY JAY`,
			description:
				album.description ||
				album.liner_notes ||
				`Listen to ${album.title} by KEY JAY on all streaming platforms`,
			image: album.cover_art || `${PUBLIC_SITE_URL}/img/og-social.webp`,
			releaseDate: album.release_date,
			artist: album.artist || 'KEY JAY'
		};

		return {
			album,
			samples,
			meta
		};
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Failed to load album:', err);
		throw error(500, 'Failed to load album');
	}
}

/**
 * Transform Directus release data to frontend format
 */
function transformRelease(release) {
	const credits = (release.credits || []).map(transformCredit);

	return {
		id: release.id,
		slug: release.slug,
		title: release.title,
		artist: release.main_artist,
		release_type: release.release_type,
		cover_art: release.cover_art
			? typeof release.cover_art === 'object'
				? buildAssetUrl(release.cover_art.filename_disk || release.cover_art.id)
				: buildAssetUrl(release.cover_art)
			: null,
		release_date: release.release_date,
		description: release.description,
		rich_content: release.rich_content,
		featured: release.featured,
		liner_notes: release.liner_notes,
		access_type: release.access_type,
		published_status: release.published_status,
		minimum_price: parseFloat(release.minimum_price) || 0,
		suggested_price: parseFloat(release.suggested_price) || 0,
		videos: (release.videos || []).map(video => ({
			id: video.id,
			title: video.title,
			description: video.description,
			video_type: video.video_type,
			video_url: video.video_url,
			thumbnail_url: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
			display_order: video.display_order,
			featured: video.featured
		})),
		youtube_videos: (release.videos || [])
			.filter(video => video.video_type === 'youtube')
			.map(video => ({
				id: extractYouTubeId(video.video_url) || video.video_url,
				title: video.title,
				description: video.description,
				thumbnail_url: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
				featured: video.featured
			})),
		external_links: (release.external_links || []).map(link => {
			let iconValue = null;
			if (link.icon_value && typeof link.icon_value === 'object') {
				iconValue = link.icon_value.icon_reference_id;
			} else {
				iconValue = link.icon_value;
			}

			return {
				id: link.id,
				url: link.url,
				label: link.label,
				icon_type: link.icon_type,
				icon_value: iconValue,
				display_order: link.display_order,
				is_primary: link.is_primary
			};
		}),
		credits
	};
}
