/**
 * Sample Share Page - Server-Side Data Loader
 *
 * GET /share/sample/[id]
 * Loads individual music sample data for shareable sample page
 * Uses slug-based URLs (/share/sample/sample-name)
 *
 * Note: Voice samples now use /share/voice/ route with voice projects
 */

import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function load({ params }) {
	const { id: slug } = params;

	try {
		const directus = getDirectusInstance();

		// Query music samples by slug
		const musicSamples = await directus.request(
			readItems('kjov2_music_samples', {
				filter: {
					slug: { _eq: slug },
					status: { _eq: 'published' }
				},
				fields: [
					'id',
					'slug',
					'track_name',
					'artist',
					'library',
					'music_sample.id',
					'music_sample.filename_download',
					'thumbnail.id',
					'thumbnail.filename_download'
				],
				limit: 1
			})
		);

		if (musicSamples && musicSamples.length > 0) {
			const sample = musicSamples[0];

			const sampleData = {
				id: sample.id,
				slug: sample.slug,
				title: sample.track_name,
				artist: sample.artist || 'Key Jay',
				genre: sample.library,
				type: 'music',
				audioUrl: sample.music_sample?.id ? buildAssetUrl(sample.music_sample.id) : null,
				thumbnail: sample.thumbnail?.id ? buildAssetUrl(sample.thumbnail.id) : null
			};

			const meta = {
				title: `${sampleData.title} - ${sampleData.artist}`,
				description: `Listen to ${sampleData.title} by ${sampleData.artist}. ${sampleData.genre ? `Genre: ${sampleData.genre}` : ''}`,
				image: sampleData.thumbnail || `${PUBLIC_SITE_URL}/img/social_1200.jpg`,
				type: 'music'
			};

			return {
				sample: sampleData,
				meta
			};
		}

		// Sample not found
		throw error(404, 'Sample not found');
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Failed to load sample:', err);
		throw error(500, 'Failed to load sample');
	}
}
