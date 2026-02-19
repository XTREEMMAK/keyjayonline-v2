/**
 * Music Samples API Endpoint
 *
 * GET /api/music-samples
 * Fetches standalone music library samples from Directus
 *
 * Query Parameters:
 * - library: Filter by library/genre (edm, hiphop, orchestral, etc.)
 * - shuffle: Return results in random order (true/false)
 *
 * Examples:
 * - GET /api/music-samples → All library samples
 * - GET /api/music-samples?library=edm → EDM only
 * - GET /api/music-samples?shuffle=true → All shuffled
 */

import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  try {
    const directus = getDirectusInstance();

    // Parse query parameters
    const libraryParam = url.searchParams.get('library');
    const shuffleParam = url.searchParams.get('shuffle') === 'true';

    // Build filter — only show published samples that have a library and are flagged for display
    const filter = {
      status: { _eq: 'published' },
      display_in_library: { _eq: true },
      library: { _nnull: true }
    };

    // Add library filter if provided
    if (libraryParam) {
      filter.library = { _eq: libraryParam.toLowerCase() };
    }

    // Fetch samples from Directus
    const samples = await directus.request(
      readItems('kjov2_music_samples', {
        filter,
        fields: [
          'id',
          'track_name',
          'artist',
          'library',
          'music_sample.id',
          'music_sample.filename_disk',
          'thumbnail.id',
          'thumbnail.filename_disk',
          'display_in_library'
        ],
        sort: shuffleParam ? null : ['library', 'track_name']
      })
    );

    // Transform to frontend format
    const transformedSamples = samples.map(sample => ({
      id: sample.id,
      title: sample.track_name,
      artist: sample.artist || 'Key Jay',
      genre: sample.library,
      audioUrl: sample.music_sample
        ? buildAssetUrl(sample.music_sample)
        : null,
      thumbnail: sample.thumbnail
        ? buildAssetUrl(sample.thumbnail)
        : null
    }));

    // Shuffle if requested
    if (shuffleParam) {
      transformedSamples.sort(() => Math.random() - 0.5);
    }

    return json(transformedSamples);

  } catch (error) {
    console.error('Error fetching music samples:', error);

    // Return error response
    return json(
      {
        error: 'Failed to fetch music samples',
        message: error.message
      },
      { status: 500 }
    );
  }
}
