/**
 * Album Share Page - Server-Side Data Loader
 *
 * GET /share/album/[id]
 * Loads album data and track samples for shareable album page
 * Uses slug-based URLs (/share/album/destinys-world)
 */

import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
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
							'role',
							'additional_info',
							'display_order',
							{ person_id: ['name', 'bio', 'website_url', 'profile_image.id', 'profile_image.filename_disk'] }
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
	// Parse credits with role normalization
	const credits = (release.credits || []).map(credit => {
		let roles = [];
		if (credit.role) {
			if (typeof credit.role === 'string') {
				try {
					const parsed = JSON.parse(credit.role);
					if (Array.isArray(parsed)) {
						roles = parsed;
					} else if (parsed.roles && Array.isArray(parsed.roles)) {
						roles = parsed.roles;
					} else if (typeof parsed === 'object') {
						roles = [parsed];
					}
				} catch {
					roles = [{ title: credit.role, category: credit.role }];
				}
			} else if (Array.isArray(credit.role)) {
				roles = credit.role;
			} else if (typeof credit.role === 'object') {
				roles = [credit.role];
			}
		}

		const normalizedRoles = roles.map(role => {
			if (typeof role === 'string') {
				return { title: role, category: role };
			}
			const title = role.title || role.name || role.role || 'Unknown Role';
			const category = role.category || role.group || title;
			return { title, category };
		});

		return {
			roles: normalizedRoles,
			role: normalizedRoles[0]?.title || 'Unknown Role',
			name: credit.person_id?.name || 'Unknown',
			additional_info: credit.additional_info,
			bio: credit.person_id?.bio,
			website_url: credit.person_id?.website_url,
			display_order: credit.display_order,
			profile_image: credit.person_id?.profile_image
				? buildAssetUrl(
						typeof credit.person_id.profile_image === 'object'
							? credit.person_id.profile_image.filename_disk
							: credit.person_id.profile_image
					)
				: null
		};
	});

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
				id: video.video_url.includes('youtube.com/watch?v=')
					? video.video_url.split('v=')[1]?.split('&')[0]
					: video.video_url.includes('youtu.be/')
						? video.video_url.split('youtu.be/')[1]?.split('?')[0]
						: video.video_url,
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
