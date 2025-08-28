import { json } from '@sveltejs/kit';
import { getDirectusInstance, readItems, createItem, updateItem } from '$lib/api/core/client.js';
import { DISCORD_BOT_TOKEN, DISCORD_USER_ID } from '$env/static/private';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * POST /api/sync/discord
 * Sync Discord Rich Presence activity with DirectUs
 * This endpoint should be called by a cron job or similar scheduling service
 */
export async function POST({ request }) {
  try {
    const { force_refresh = false } = await request.json();

    if (!DISCORD_BOT_TOKEN || !DISCORD_USER_ID) {
      return json({ 
        error: 'Discord credentials not configured',
        success: false 
      }, { status: 500 });
    }

    // Get current Discord activity
    const discordActivity = await fetchDiscordActivity();
    
    if (!discordActivity) {
      // Mark all activities as inactive
      await markAllActivitiesInactive();
      
      return json({
        success: true,
        message: 'No current Discord activity found',
        activity: null,
        timestamp: new Date().toISOString()
      });
    }

    // Update or create activity in DirectUs
    const savedActivity = await updateDiscordActivity(discordActivity);

    return json({
      success: true,
      message: 'Discord activity synced successfully',
      activity: savedActivity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error syncing Discord activity:', error);
    
    return json({
      success: false,
      error: 'Failed to sync Discord activity',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/sync/discord
 * Get sync status and last update info
 */
export async function GET() {
  try {
    const directus = getDirectusInstance();
    
    // Get the most recent activity
    const activities = await directus.request(
      readItems('kjov2_discord_activity', {
        sort: ['-last_updated'],
        limit: 1,
        fields: ['*']
      })
    );

    const lastActivity = activities.length > 0 ? activities[0] : null;
    const lastSyncTime = lastActivity ? new Date(lastActivity.last_updated) : null;
    const now = new Date();
    const minutesSinceLastSync = lastSyncTime ? 
      Math.floor((now.getTime() - lastSyncTime.getTime()) / (1000 * 60)) : null;

    return json({
      sync_status: 'healthy',
      last_sync: lastSyncTime ? lastSyncTime.toISOString() : null,
      minutes_since_last_sync: minutesSinceLastSync,
      current_activity: lastActivity,
      is_stale: minutesSinceLastSync > 10, // Consider stale if over 10 minutes
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error getting Discord sync status:', error);
    
    return json({
      sync_status: 'error',
      error: 'Failed to get sync status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Fetch current Discord Rich Presence activity
 */
async function fetchDiscordActivity() {
  try {
    // Note: This is a simplified example. In reality, you would need to:
    // 1. Use Discord OAuth to get user authorization
    // 2. Use Gateway WebSocket connection for real-time presence
    // 3. Or use a Discord bot with proper permissions to read user presence
    
    // For now, return a mock response or implement based on available Discord integration
    const response = await fetch(`${DISCORD_API_BASE}/users/${DISCORD_USER_ID}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    // This is a basic user fetch - for Rich Presence, you'd need Gateway connection
    // For demo purposes, we'll return a mock activity
    return {
      application_id: '12345',
      game_name: 'Example Game',
      details: 'Playing in Campaign Mode',
      state: 'Level 42',
      large_image_url: 'https://cdn.discordapp.com/app-assets/12345/large_image.png',
      small_image_url: 'https://cdn.discordapp.com/app-assets/12345/small_image.png',
      start_timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      end_timestamp: null
    };

  } catch (error) {
    console.error('Error fetching Discord activity:', error);
    return null;
  }
}

/**
 * Update Discord activity in DirectUs
 */
async function updateDiscordActivity(activity) {
  const directus = getDirectusInstance();
  
  try {
    // First, mark all existing activities as inactive
    await markAllActivitiesInactive();

    // Try to find matching game in library
    let gameLibraryId = null;
    if (activity.game_name) {
      const games = await directus.request(
        readItems('kjov2_games_library', {
          filter: {
            title: { _icontains: activity.game_name }
          },
          limit: 1
        })
      );
      
      if (games.length > 0) {
        gameLibraryId = games[0].id;
      }
    }

    // Create new activity record
    const activityData = {
      application_id: activity.application_id,
      game_name: activity.game_name,
      details: activity.details,
      state: activity.state,
      large_image_url: activity.large_image_url,
      small_image_url: activity.small_image_url,
      start_timestamp: activity.start_timestamp,
      end_timestamp: activity.end_timestamp,
      last_updated: new Date().toISOString(),
      is_active: true,
      game_library_id: gameLibraryId
    };

    const savedActivity = await directus.request(
      createItem('kjov2_discord_activity', activityData)
    );

    return savedActivity;

  } catch (error) {
    console.error('Error updating Discord activity in DirectUs:', error);
    throw error;
  }
}

/**
 * Mark all Discord activities as inactive
 */
async function markAllActivitiesInactive() {
  const directus = getDirectusInstance();
  
  try {
    // Get all active activities
    const activeActivities = await directus.request(
      readItems('kjov2_discord_activity', {
        filter: {
          is_active: { _eq: true }
        },
        fields: ['id']
      })
    );

    // Update each to inactive
    const updatePromises = activeActivities.map(activity =>
      directus.request(
        updateItem('kjov2_discord_activity', activity.id, {
          is_active: false,
          last_updated: new Date().toISOString()
        })
      )
    );

    await Promise.all(updatePromises);
    
    return activeActivities.length;

  } catch (error) {
    console.error('Error marking activities as inactive:', error);
    return 0;
  }
}