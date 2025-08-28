import { json } from '@sveltejs/kit';
import { getDirectusInstance, readItems, updateItem } from '$lib/api/core/client.js';
import { IGDB_CLIENT_ID, IGDB_ACCESS_TOKEN } from '$env/static/private';

const IGDB_API_BASE = 'https://api.igdb.com/v4';

/**
 * POST /api/sync/igdb
 * Sync game library with IGDB metadata
 * Updates games in the library that are missing IGDB data
 */
export async function POST({ request }) {
  try {
    const { 
      game_id = null, 
      force_refresh = false, 
      limit = 10 
    } = await request.json();

    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      return json({ 
        error: 'IGDB credentials not configured',
        success: false 
      }, { status: 500 });
    }

    const directus = getDirectusInstance();
    let gamesUpdated = 0;
    let errors = [];

    if (game_id) {
      // Update specific game
      try {
        const updated = await updateGameWithIGDB(game_id, force_refresh);
        if (updated) gamesUpdated = 1;
      } catch (error) {
        errors.push({ game_id, error: error.message });
      }
    } else {
      // Update games missing IGDB data
      const filter = force_refresh ? {} : {
        _or: [
          { igdb_id: { _null: true } },
          { igdb_rating: { _null: true } },
          { developer: { _null: true } }
        ]
      };

      const games = await directus.request(
        readItems('kjov2_games_library', {
          filter,
          fields: ['id', 'title', 'igdb_id'],
          limit: Math.min(limit, 20) // Prevent excessive API calls
        })
      );

      // Process games in batches to avoid rate limits
      for (const game of games) {
        try {
          const updated = await updateGameWithIGDB(game.id, force_refresh);
          if (updated) gamesUpdated++;
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`Error updating game ${game.id}:`, error);
          errors.push({ game_id: game.id, title: game.title, error: error.message });
        }
      }
    }

    return json({
      success: true,
      games_processed: game_id ? 1 : limit,
      games_updated: gamesUpdated,
      errors: errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in IGDB sync:', error);
    
    return json({
      success: false,
      error: 'Failed to sync with IGDB',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/sync/igdb/status
 * Get IGDB sync status
 */
export async function GET() {
  try {
    const directus = getDirectusInstance();
    
    // Count games with and without IGDB data
    const [total, withIGDB, withoutIGDB] = await Promise.all([
      directus.request(
        readItems('kjov2_games_library', {
          aggregate: { count: ['id'] },
          filter: { published_status: { _eq: 'live' } }
        })
      ),
      directus.request(
        readItems('kjov2_games_library', {
          aggregate: { count: ['id'] },
          filter: {
            _and: [
              { published_status: { _eq: 'live' } },
              { igdb_id: { _nnull: true } }
            ]
          }
        })
      ),
      directus.request(
        readItems('kjov2_games_library', {
          aggregate: { count: ['id'] },
          filter: {
            _and: [
              { published_status: { _eq: 'live' } },
              { igdb_id: { _null: true } }
            ]
          }
        })
      )
    ]);

    const totalCount = total[0]?.count?.id || 0;
    const withIGDBCount = withIGDB[0]?.count?.id || 0;
    const withoutIGDBCount = withoutIGDB[0]?.count?.id || 0;

    return json({
      total_games: totalCount,
      games_with_igdb: withIGDBCount,
      games_without_igdb: withoutIGDBCount,
      sync_percentage: totalCount > 0 ? Math.round((withIGDBCount / totalCount) * 100) : 0,
      last_check: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting IGDB sync status:', error);
    
    return json({
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}

/**
 * Update a specific game with IGDB metadata
 */
async function updateGameWithIGDB(gameId, forceRefresh = false) {
  const directus = getDirectusInstance();
  
  try {
    // Get game from DirectUs
    const game = await directus.request(
      readItems('kjov2_games_library', {
        filter: { id: { _eq: gameId } },
        fields: ['*'],
        limit: 1
      })
    );

    if (game.length === 0) {
      throw new Error('Game not found');
    }

    const gameData = game[0];

    // Skip if already has IGDB data and not forcing refresh
    if (!forceRefresh && gameData.igdb_id) {
      return false;
    }

    // Search for game in IGDB
    let igdbGame = null;
    
    if (gameData.igdb_id && forceRefresh) {
      // Get by ID if we have it
      igdbGame = await fetchIGDBGameById(gameData.igdb_id);
    } else {
      // Search by title
      const searchResults = await searchIGDBGame(gameData.title);
      igdbGame = searchResults.length > 0 ? searchResults[0] : null;
    }

    if (!igdbGame) {
      console.log(`No IGDB match found for game: ${gameData.title}`);
      return false;
    }

    // Update game with IGDB data
    const updateData = {
      igdb_id: igdbGame.id,
      igdb_rating: igdbGame.rating ? Math.round(igdbGame.rating) / 10 : null,
      developer: igdbGame.developers?.join(', ') || null,
      publisher: igdbGame.publishers?.join(', ') || null,
      release_date: igdbGame.release_date || null,
      last_igdb_sync: new Date().toISOString()
    };

    // Only update cover if we don't have one
    if (!gameData.cover_image && igdbGame.cover_image) {
      updateData.igdb_cover_url = igdbGame.cover_image;
    }

    await directus.request(
      updateItem('kjov2_games_library', gameId, updateData)
    );

    console.log(`Updated game ${gameData.title} with IGDB data`);
    return true;

  } catch (error) {
    console.error(`Error updating game ${gameId} with IGDB:`, error);
    throw error;
  }
}

/**
 * Search for a game in IGDB by title
 */
async function searchIGDBGame(title) {
  try {
    const igdbQuery = `
      search "${title}";
      fields id, name, summary, cover.url, cover.image_id,
             genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer,
             involved_companies.publisher, first_release_date, rating;
      limit 5;
    `;

    const response = await fetch(`${IGDB_API_BASE}/games`, {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: igdbQuery
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
    }

    const games = await response.json();
    return games.map(transformIGDBGame);

  } catch (error) {
    console.error('Error searching IGDB:', error);
    return [];
  }
}

/**
 * Fetch specific game from IGDB by ID
 */
async function fetchIGDBGameById(igdbId) {
  try {
    const igdbQuery = `
      fields id, name, summary, cover.url, cover.image_id,
             genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer,
             involved_companies.publisher, first_release_date, rating,
             screenshots.url, screenshots.image_id;
      where id = ${igdbId};
    `;

    const response = await fetch(`${IGDB_API_BASE}/games`, {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: igdbQuery
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
    }

    const games = await response.json();
    return games.length > 0 ? transformIGDBGame(games[0]) : null;

  } catch (error) {
    console.error('Error fetching IGDB game by ID:', error);
    return null;
  }
}

/**
 * Transform IGDB game data to our format
 */
function transformIGDBGame(igdbGame) {
  return {
    id: igdbGame.id,
    title: igdbGame.name,
    summary: igdbGame.summary,
    cover_image: igdbGame.cover ? 
      `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg` : null,
    genres: (igdbGame.genres || []).map(genre => genre.name),
    platforms: (igdbGame.platforms || []).map(platform => platform.name),
    developers: (igdbGame.involved_companies || [])
      .filter(company => company.developer)
      .map(company => company.company.name),
    publishers: (igdbGame.involved_companies || [])
      .filter(company => company.publisher)
      .map(company => company.company.name),
    release_date: igdbGame.first_release_date ? 
      new Date(igdbGame.first_release_date * 1000).toISOString() : null,
    rating: igdbGame.rating || null,
    screenshots: (igdbGame.screenshots || []).map(screenshot => ({
      id: screenshot.image_id,
      url: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${screenshot.image_id}.jpg`,
      thumbnail: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${screenshot.image_id}.jpg`
    }))
  };
}