/**
 * Gaming Content API
 * 
 * This module handles all gaming-related content fetching from DirectUs.
 * It provides functions to retrieve game library, Discord activity, and
 * gaming sessions with IGDB metadata integration.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches user's game library from DirectUs
 * Includes personal ratings, reviews, and metadata
 * @returns {Promise<Array>} Array of transformed game objects
 */
export async function getGamesLibrary() {
  try {
    const directus = getDirectusInstance();
    
    const games = await directus.request(
      readItems('kjov2_games_library', {
        filter: {
          published_status: { _eq: 'live' }
        },
        fields: [
          '*',
          {
            cover_image: ['id', 'filename_disk', 'filename_download', 'title']
          },
          {
            screenshots: [
              'directus_files_id.*'
            ]
          }
        ],
        sort: ['-last_played', '-created_at']
      })
    );

    return games.map(game => ({
      id: game.id,
      title: game.title,
      platform: game.platform,
      rating: parseFloat(game.personal_rating) || 0,
      cover_image: buildAssetUrl(game.cover_image),
      category: game.genre,
      description: game.description,
      review_text: game.review_text,
      review_date: game.review_date,
      playtime: game.playtime_hours,
      completion_status: game.completion_status,
      last_played: game.last_played,
      currently_playing: game.currently_playing,
      licensable: game.licensable || false,
      
      // IGDB metadata
      igdb_id: game.igdb_id,
      igdb_rating: game.igdb_rating,
      release_date: game.release_date,
      developer: game.developer,
      publisher: game.publisher,
      
      // Screenshots
      screenshots: (game.screenshots || []).map(screenshot => ({
        id: screenshot.directus_files_id.id,
        url: buildAssetUrl(screenshot.directus_files_id),
        title: screenshot.directus_files_id.title
      }))
    }));

  } catch (error) {
    console.error('Error fetching games library:', error);
    return [];
  }
}

/**
 * Fetches current Discord gaming activity
 * @returns {Promise<Object|null>} Current gaming activity or null
 */
export async function getCurrentDiscordActivity() {
  try {
    const directus = getDirectusInstance();
    
    const activities = await directus.request(
      readItems('kjov2_discord_activity', {
        filter: {
          is_active: { _eq: true }
        },
        fields: [
          '*',
          {
            game_library_id: ['*']
          }
        ],
        sort: ['-last_updated'],
        limit: 1
      })
    );

    if (activities.length === 0) return null;

    const activity = activities[0];
    return {
      id: activity.id,
      game_name: activity.game_name,
      application_id: activity.application_id,
      large_image: activity.large_image_url,
      small_image: activity.small_image_url,
      details: activity.details,
      state: activity.state,
      start_timestamp: activity.start_timestamp,
      end_timestamp: activity.end_timestamp,
      last_updated: activity.last_updated,
      game_info: activity.game_library_id || null
    };

  } catch (error) {
    console.error('Error fetching Discord activity:', error);
    return null;
  }
}

/**
 * Fetches recently played games from gaming sessions
 * @param {number} limit - Number of recent sessions to fetch
 * @returns {Promise<Array>} Array of recent gaming sessions
 */
export async function getRecentGamingSessions(limit = 10) {
  try {
    const directus = getDirectusInstance();
    
    const sessions = await directus.request(
      readItems('kjov2_game_sessions', {
        fields: [
          '*',
          {
            game_library_id: ['*', {
              cover_image: ['id', 'filename_disk', 'filename_download']
            }]
          }
        ],
        sort: ['-session_end', '-session_start'],
        limit: limit
      })
    );

    return sessions.map(session => ({
      id: session.id,
      session_start: session.session_start,
      session_end: session.session_end,
      duration_minutes: session.duration_minutes,
      achievements_unlocked: session.achievements_unlocked || 0,
      notes: session.notes,
      game: session.game_library_id ? {
        id: session.game_library_id.id,
        title: session.game_library_id.title,
        platform: session.game_library_id.platform,
        cover_image: buildAssetUrl(session.game_library_id.cover_image),
        genre: session.game_library_id.genre
      } : null
    }));

  } catch (error) {
    console.error('Error fetching gaming sessions:', error);
    return [];
  }
}

/**
 * Fetches a single game by ID with full details
 * @param {string|number} gameId - The game ID
 * @returns {Promise<Object|null>} Game object with full details
 */
export async function getGameById(gameId) {
  try {
    const directus = getDirectusInstance();
    
    const game = await directus.request(
      readItem('kjov2_games_library', gameId, {
        fields: [
          '*',
          {
            cover_image: ['id', 'filename_disk', 'filename_download', 'title']
          },
          {
            screenshots: [
              'directus_files_id.*'
            ]
          },
          {
            reviews: ['*']
          }
        ]
      })
    );

    return {
      id: game.id,
      title: game.title,
      platform: game.platform,
      rating: parseFloat(game.personal_rating) || 0,
      cover_image: buildAssetUrl(game.cover_image),
      category: game.genre,
      description: game.description,
      review_text: game.review_text,
      rich_review: game.rich_review,
      review_date: game.review_date,
      playtime: game.playtime_hours,
      completion_status: game.completion_status,
      last_played: game.last_played,
      currently_playing: game.currently_playing,
      
      // IGDB metadata
      igdb_id: game.igdb_id,
      igdb_rating: game.igdb_rating,
      release_date: game.release_date,
      developer: game.developer,
      publisher: game.publisher,
      
      // Screenshots
      screenshots: (game.screenshots || []).map(screenshot => ({
        id: screenshot.directus_files_id.id,
        url: buildAssetUrl(screenshot.directus_files_id),
        title: screenshot.directus_files_id.title || 'Screenshot',
        thumbnail: buildAssetUrl(screenshot.directus_files_id, { width: 400, height: 225, fit: 'cover' })
      })),
      
      // Reviews/content
      reviews: game.reviews || []
    };

  } catch (error) {
    console.error('Error fetching game by ID:', error);
    return null;
  }
}

/**
 * Search games library by title
 * @param {string} searchTerm - Search term for game titles
 * @returns {Promise<Array>} Array of matching games
 */
export async function searchGamesLibrary(searchTerm) {
  try {
    const directus = getDirectusInstance();
    
    const games = await directus.request(
      readItems('kjov2_games_library', {
        filter: {
          _and: [
            { published_status: { _eq: 'live' } },
            { title: { _icontains: searchTerm } }
          ]
        },
        fields: [
          'id', 'title', 'platform', 'personal_rating', 'genre', 'last_played',
          {
            cover_image: ['id', 'filename_disk']
          }
        ],
        sort: ['-personal_rating', '-last_played']
      })
    );

    return games.map(game => ({
      id: game.id,
      title: game.title,
      platform: game.platform,
      rating: parseFloat(game.personal_rating) || 0,
      category: game.genre,
      last_played: game.last_played,
      cover_image: buildAssetUrl(game.cover_image)
    }));

  } catch (error) {
    console.error('Error searching games library:', error);
    return [];
  }
}