/**
 * Sample Share Page - Server-Side Data Loader
 *
 * GET /share/sample/[id]
 * Loads individual sample data (music or voice) for shareable sample page
 */

import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function load({ params }) {
	const { id } = params;

	try {
		const directus = getDirectusInstance();

		// Try fetching from music samples first
		const musicSamples = await directus.request(
			readItems('kjov2_music_samples', {
				filter: {
					id: { _eq: id },
					status: { _eq: 'published' }
				},
				fields: [
					'id',
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

		if (musicSamples.length > 0) {
			const sample = musicSamples[0];

			// Transform to frontend format
			const sampleData = {
				id: sample.id,
				title: sample.track_name,
				artist: sample.artist || 'Key Jay',
				genre: sample.library,
				type: 'music',
				audioUrl: sample.music_sample?.id
					? buildAssetUrl(sample.music_sample.id)
					: null,
				thumbnail: sample.thumbnail?.id
					? buildAssetUrl(sample.thumbnail.id)
					: null
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

		// If not found in music samples, try voice samples
		const voiceSamples = await directus.request(
			readItems('kjov2_voice_samples', {
				filter: {
					id: { _eq: id },
					status: { _eq: 'published' }
				},
				fields: [
					'id',
					'sample_name',
					'category',
					'voice_sample.id',
					'voice_sample.filename_download',
					'thumbnail.id',
					'thumbnail.filename_download'
				],
				limit: 1
			})
		);

		if (voiceSamples.length > 0) {
			const sample = voiceSamples[0];

			const sampleData = {
				id: sample.id,
				title: sample.sample_name,
				category: sample.category,
				type: 'voice',
				audioUrl: sample.voice_sample?.id
					? buildAssetUrl(sample.voice_sample.id)
					: null,
				thumbnail: sample.thumbnail?.id
					? buildAssetUrl(sample.thumbnail.id)
					: null
			};

			const meta = {
				title: `${sampleData.title} - KEY JAY Voice Sample`,
				description: `Listen to ${sampleData.title} voice sample by KEY JAY. ${sampleData.category ? `Category: ${sampleData.category}` : ''}`,
				image: sampleData.thumbnail || `${PUBLIC_SITE_URL}/img/social_1200.jpg`,
				type: 'voice'
			};

			return {
				sample: sampleData,
				meta
			};
		}

		// Sample not found in either collection
		throw error(404, 'Sample not found');
	} catch (err) {
		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		// Otherwise, throw a 500 error
		console.error('Failed to load sample:', err);
		throw error(500, 'Failed to load sample');
	}
}
