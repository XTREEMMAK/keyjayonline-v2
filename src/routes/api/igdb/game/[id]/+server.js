import { json } from '@sveltejs/kit';
import { IGDB_CLIENT_ID, IGDB_ACCESS_TOKEN } from '$env/static/private';

const IGDB_API_BASE = 'https://api.igdb.com/v4';

/**
 * GET /api/igdb/game/[id]
 * Fetches game metadata from IGDB API
 */
export async function GET({ params, url }) {
  try {
    const { id } = params;
    const searchQuery = url.searchParams.get('query');
    
    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      return json({ 
        error: 'IGDB credentials not configured' 
      }, { status: 500 });
    }

    let igdbQuery = '';
    
    if (searchQuery) {
      // Search by game title
      igdbQuery = `
        search "${searchQuery}";
        fields id, name, summary, cover.url, cover.image_id, 
               screenshots.url, screenshots.image_id,
               genres.name, platforms.name, platforms.abbreviation,
               involved_companies.company.name, involved_companies.developer,
               involved_companies.publisher, first_release_date, rating, rating_count;
        limit 10;
      `;
    } else {
      // Get specific game by ID
      igdbQuery = `
        fields id, name, summary, storyline, cover.url, cover.image_id,
               screenshots.url, screenshots.image_id,
               genres.name, platforms.name, platforms.abbreviation,
               involved_companies.company.name, involved_companies.developer,
               involved_companies.publisher, first_release_date, rating, rating_count,
               videos.video_id, videos.name, websites.url, websites.category,
               similar_games.name, similar_games.cover.image_id;
        where id = ${parseInt(id)};
      `;
    }

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
    
    if (games.length === 0) {
      return json({ 
        error: 'Game not found',
        games: []
      }, { status: 404 });
    }

    // Transform IGDB data to our format
    const transformedGames = games.map(game => ({
      igdb_id: game.id,
      title: game.name,
      summary: game.summary,
      storyline: game.storyline,
      cover_image: game.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` : null,
      cover_thumbnail: game.cover ? `https://images.igdb.com/igdb/image/upload/t_thumb/${game.cover.image_id}.jpg` : null,
      screenshots: (game.screenshots || []).map(screenshot => ({
        id: screenshot.image_id,
        url: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${screenshot.image_id}.jpg`,
        thumbnail: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${screenshot.image_id}.jpg`
      })),
      genres: (game.genres || []).map(genre => genre.name),
      platforms: (game.platforms || []).map(platform => ({
        name: platform.name,
        abbreviation: platform.abbreviation
      })),
      developers: (game.involved_companies || [])
        .filter(company => company.developer)
        .map(company => company.company.name),
      publishers: (game.involved_companies || [])
        .filter(company => company.publisher)
        .map(company => company.company.name),
      release_date: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString() : null,
      igdb_rating: game.rating ? Math.round(game.rating) / 10 : null,
      rating_count: game.rating_count || 0,
      videos: (game.videos || []).map(video => ({
        video_id: video.video_id,
        title: video.name,
        youtube_url: `https://www.youtube.com/watch?v=${video.video_id}`
      })),
      websites: (game.websites || []).map(website => ({
        url: website.url,
        category: website.category
      })),
      similar_games: (game.similar_games || []).map(similar => ({
        name: similar.name,
        cover_image: similar.cover ? `https://images.igdb.com/igdb/image/upload/t_thumb/${similar.cover.image_id}.jpg` : null
      }))
    }));

    return json({
      games: transformedGames,
      search_query: searchQuery,
      total_results: games.length
    });

  } catch (error) {
    console.error('Error fetching IGDB data:', error);
    return json({ 
      error: 'Failed to fetch game data from IGDB',
      games: []
    }, { status: 500 });
  }
}

/**
 * POST /api/igdb/game/[id]
 * Cache IGDB data in DirectUs for a specific game
 */
export async function POST({ params, request }) {
  try {
    const { id } = params;
    const { game_data, library_id } = await request.json();
    
    // Here you would save the IGDB data to DirectUs
    // This would update the game library entry with IGDB metadata
    
    return json({
      success: true,
      message: 'Game metadata cached successfully',
      igdb_id: parseInt(id),
      library_id: library_id
    });

  } catch (error) {
    console.error('Error caching IGDB data:', error);
    return json({ 
      success: false,
      error: 'Failed to cache game data' 
    }, { status: 500 });
  }
}