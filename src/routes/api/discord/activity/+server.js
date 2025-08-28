import { json } from '@sveltejs/kit';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * GET /api/discord/activity
 * Fetches current Discord Rich Presence activity
 */
export async function GET({ url }) {
  try {
    const directus = getDirectusInstance();
    
    // Get the most recent Discord activity from cache
    const activities = await directus.request(
      readItems('kjov2_discord_activity', {
        filter: {
          is_active: { _eq: true }
        },
        fields: [
          '*',
          {
            game_library_id: [
              'id', 'title', 'platform', 'genre', 'personal_rating',
              {
                cover_image: ['id', 'filename_disk']
              }
            ]
          }
        ],
        sort: ['-last_updated'],
        limit: 1
      })
    );

    if (activities.length === 0) {
      return json({ 
        currently_playing: null,
        last_updated: null,
        error: null 
      });
    }

    const activity = activities[0];
    
    // Check if the activity is still current (within last 5 minutes)
    const lastUpdated = new Date(activity.last_updated);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    if (lastUpdated < fiveMinutesAgo) {
      // Mark as inactive if too old
      return json({ 
        currently_playing: null,
        last_updated: lastUpdated.toISOString(),
        error: 'Activity data is stale' 
      });
    }

    // Transform the activity data
    const currentActivity = {
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

    return json({
      currently_playing: currentActivity,
      last_updated: lastUpdated.toISOString(),
      error: null
    });

  } catch (error) {
    console.error('Error fetching Discord activity:', error);
    return json({ 
      currently_playing: null,
      last_updated: null,
      error: 'Failed to fetch Discord activity' 
    }, { status: 500 });
  }
}

/**
 * POST /api/discord/activity
 * Updates Discord Rich Presence activity (called by background job)
 */
export async function POST({ request }) {
  try {
    const { user_id, force_refresh = false } = await request.json();
    
    if (!user_id) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Use Discord OAuth to get user's current activity
    // 2. Parse the Rich Presence data
    // 3. Match with games library
    // 4. Update DirectUs activity record
    
    // For now, return a placeholder response
    return json({ 
      success: true, 
      message: 'Discord activity refresh initiated',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating Discord activity:', error);
    return json({ 
      success: false, 
      error: 'Failed to update Discord activity' 
    }, { status: 500 });
  }
}