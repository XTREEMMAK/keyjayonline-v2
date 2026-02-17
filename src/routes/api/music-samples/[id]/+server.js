/**
 * Music Samples API Endpoint
 * 
 * Server-side endpoint to fetch music samples for a specific release
 * This avoids client-side Directus SDK compatibility issues with Vite
 */

import { json, error } from '@sveltejs/kit';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { buildAssetUrl } from '$lib/api/core/assets.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
  const releaseId = params.id;
  
  // Validate the release ID (can be UUID or integer)
  if (!releaseId) {
    throw error(400, 'Missing release ID');
  }

  try {
    const directus = getDirectusInstance();
    
    // Fetch release with M2M tracks expanded through junction table
    const releases = await directus.request(
      readItems('kjov2_music_releases', {
        filter: { id: { _eq: releaseId } },
        fields: [
          {
            tracks: [
              {
                kjov2_music_samples_id: [
                  'id',
                  'track_name',
                  'track_number',
                  'sort',
                  'status',
                  { music_sample: ['id', 'filename_disk', 'filename_download', 'type', 'filesize'] }
                ]
              }
            ]
          }
        ],
        limit: 1
      })
    );

    // M2M returns junction objects — unwrap to get actual sample data
    const samples = (releases?.[0]?.tracks || [])
      .map(junc => junc.kjov2_music_samples_id)
      .filter(Boolean);

    if (samples.length === 0) {
      return json([]);
    }
    
    // Transform and return the samples
    const transformedSamples = samples.map(sample => ({
      id: sample.id,
      title: sample.track_name || 'Untitled Track',
      trackNumber: sample.track_number || 0,
      duration: sample.duration || null,
      // Use the file object with filename_disk to get proper file extension
      previewUrl: sample.music_sample ? buildAssetUrl(sample.music_sample.filename_disk || sample.music_sample.id) : null,
      fullTrackUrl: sample.music_sample ? buildAssetUrl(sample.music_sample.filename_disk || sample.music_sample.id) : null,
      isFeatured: false, // Not in the schema
      displayOrder: sample.sort || sample.track_number || 0,
      status: sample.status,
      // Include file metadata for debugging
      fileType: sample.music_sample?.type,
      fileSize: sample.music_sample?.filesize
    })).sort((a, b) => (a.trackNumber || a.displayOrder || 0) - (b.trackNumber || b.displayOrder || 0));

    return json(transformedSamples);

  } catch (err) {
    console.error('Error fetching music samples:', err);
    console.error('Error details:', err.message);
    
    // Return 500 error with details
    throw error(500, `Failed to fetch music samples: ${err.message}`);
  }
}