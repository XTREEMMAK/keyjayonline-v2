/**
 * Radio Content API
 *
 * This module handles all radio-related content fetching from Directus.
 * It provides functions to retrieve radio settings, playlists, and tracks
 * for the /radio standalone player experience.
 */

import { getDirectusInstance, readItems, readItem, createItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Transforms a raw Directus music sample into the radio track format
 * @param {Object} sample - Raw Directus music sample object
 * @returns {Object} Transformed track object
 */
function transformTrack(sample) {
  return {
    id: sample.id,
    title: sample.track_name,
    artist: sample.artist || 'Key Jay',
    audioUrl: sample.music_sample ? buildAssetUrl(sample.music_sample) : null,
    thumbnail: sample.thumbnail ? buildAssetUrl(sample.thumbnail) : null,
    isRadioNew: sample.is_radio_new || false,
    genre: sample.library || null,
    description: sample.description || null
  };
}

/** Fields to fetch for radio tracks */
const TRACK_FIELDS = [
  'id',
  'track_name',
  'artist',
  'library',
  'is_radio_new',
  'radio_sort_order',
  'description',
  { music_sample: ['id', 'filename_disk'] },
  { thumbnail: ['id', 'filename_disk'] }
];

/**
 * Fetches radio settings from the kjov2_radio_settings singleton
 * @returns {Promise<Object>} Radio settings object
 */
export async function getRadioSettings() {
  try {
    const directus = getDirectusInstance();

    const results = await directus.request(
      readItems('kjov2_radio_settings', {
        fields: [
          'id',
          'maintenance_mode',
          'maintenance_message',
          'current_playlist_id'
        ],
        limit: 1
      })
    );

    // Singleton may return array or single object
    const settings = Array.isArray(results) ? results[0] : results;

    if (!settings) {
      return {
        maintenanceMode: false,
        maintenanceMessage: null,
        currentPlaylistId: null
      };
    }

    return {
      maintenanceMode: settings.maintenance_mode || false,
      maintenanceMessage: settings.maintenance_message || null,
      currentPlaylistId: settings.current_playlist_id || null
    };
  } catch {
    return {
      maintenanceMode: false,
      maintenanceMessage: null,
      currentPlaylistId: null
    };
  }
}

/**
 * Fetches radio playlist tracks from Directus.
 * If a specific playlist is set in radio settings, fetches that playlist's tracks.
 * Otherwise fetches all tracks marked with include_in_radio: true.
 * @returns {Promise<Array>} Array of transformed track objects
 */
export async function getRadioPlaylist() {
  try {
    const directus = getDirectusInstance();
    const settings = await getRadioSettings();

    let tracks;

    if (settings.currentPlaylistId) {
      // Fetch tracks from the specific playlist via M2M relationship
      const playlists = await directus.request(
        readItems('kjov2_radio_playlists', {
          filter: {
            id: { _eq: settings.currentPlaylistId },
            status: { _eq: 'published' }
          },
          fields: [
            'id',
            'name',
            {
              tracks: [
                'sort',
                {
                  kjov2_music_samples_id: TRACK_FIELDS
                }
              ]
            }
          ],
          deep: {
            tracks: { _sort: ['sort'] }
          },
          limit: 1
        })
      );

      const playlist = playlists[0];
      if (playlist && playlist.tracks) {
        // Unwrap M2M junction objects
        tracks = playlist.tracks
          .map(jt => jt.kjov2_music_samples_id)
          .filter(Boolean);
      } else {
        tracks = [];
      }
    } else {
      // Fetch all tracks marked for radio inclusion
      tracks = await directus.request(
        readItems('kjov2_music_samples', {
          filter: {
            include_in_radio: { _eq: true },
            status: { _eq: 'published' }
          },
          fields: TRACK_FIELDS,
          sort: ['radio_sort_order', 'track_name']
        })
      );
    }

    return tracks.map(transformTrack);
  } catch {
    return [];
  }
}

/**
 * Fetches a single track by ID
 * @param {number|string} id - Track ID
 * @returns {Promise<Object|null>} Transformed track object or null
 */
export async function getRadioTrack(id) {
  try {
    const directus = getDirectusInstance();

    const sample = await directus.request(
      readItem('kjov2_music_samples', id, {
        fields: TRACK_FIELDS
      })
    );

    if (!sample) return null;
    return transformTrack(sample);
  } catch {
    return null;
  }
}

/**
 * Creates a new radio subscriber
 * @param {string} email - Subscriber email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function createRadioSubscriber(email) {
  try {
    const directus = getDirectusInstance();

    // Check for existing subscriber
    const existing = await directus.request(
      readItems('kjov2_radio_subscribers', {
        filter: { email: { _eq: email } },
        fields: ['id'],
        limit: 1
      })
    );

    if (existing && existing.length > 0) {
      return { success: false, error: 'Already subscribed' };
    }

    await directus.request(
      createItem('kjov2_radio_subscribers', {
        email,
        notification_opt_in: true
      })
    );

    return { success: true };
  } catch (error) {
    console.error('Error creating radio subscriber:', error);
    return { success: false, error: 'Failed to subscribe' };
  }
}
