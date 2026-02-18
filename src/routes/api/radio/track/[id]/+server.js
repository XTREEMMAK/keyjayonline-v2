/**
 * Radio Track Detail API Endpoint
 *
 * GET /api/radio/track/:id
 * Fetches details for an individual radio track.
 */

import { json } from '@sveltejs/kit';
import { getRadioTrack } from '$lib/api/content/radio.js';

export async function GET({ params }) {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Track ID is required' }, { status: 400 });
    }

    const track = await getRadioTrack(id);

    if (!track) {
      return json({ error: 'Track not found' }, { status: 404 });
    }

    return json(track);
  } catch (error) {
    console.error('Error fetching radio track:', error);
    return json(
      { error: 'Failed to fetch track', message: error.message },
      { status: 500 }
    );
  }
}
