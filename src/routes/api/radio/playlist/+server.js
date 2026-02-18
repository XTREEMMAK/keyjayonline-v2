/**
 * Radio Playlist API Endpoint
 *
 * GET /api/radio/playlist
 * Fetches the current radio playlist tracks and settings.
 * Respects active playlist selection and include_in_radio flags.
 */

import { json } from '@sveltejs/kit';
import { getRadioPlaylist, getRadioSettings } from '$lib/api/content/radio.js';

export async function GET() {
  try {
    const [tracks, settings] = await Promise.all([
      getRadioPlaylist(),
      getRadioSettings()
    ]);

    return json({
      tracks,
      settings: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage
      }
    });
  } catch (error) {
    console.error('Error fetching radio playlist:', error);
    return json(
      { error: 'Failed to fetch radio playlist', message: error.message },
      { status: 500 }
    );
  }
}
