/**
 * Radio Settings API Endpoint
 *
 * GET /api/radio/settings
 * Returns radio settings including maintenance mode status.
 * Lightweight endpoint for client-side checks.
 */

import { json } from '@sveltejs/kit';
import { getRadioSettings } from '$lib/api/content/radio.js';

export async function GET() {
  try {
    const settings = await getRadioSettings();
    return json(settings);
  } catch (error) {
    console.error('Error fetching radio settings:', error);
    return json(
      { error: 'Failed to fetch radio settings', message: error.message },
      { status: 500 }
    );
  }
}
