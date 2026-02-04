import { json } from '@sveltejs/kit';
// Use dynamic imports to avoid build failures in CI when env vars are not set
import { env } from '$env/dynamic/private';

const IGDB_CLIENT_ID = env.IGDB_CLIENT_ID ?? '';
const IGDB_ACCESS_TOKEN = env.IGDB_ACCESS_TOKEN ?? '';

const IGDB_API_BASE = 'https://api.igdb.com/v4';

/**
 * GET /api/igdb/search?q=QUERY
 * Search IGDB for games by title
 */
export async function GET({ url }) {
  try {
    const searchQuery = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    if (!searchQuery) {
      return json({ 
        error: 'Search query is required',
        results: []
      }, { status: 400 });
    }

    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      return json({ 
        error: 'IGDB credentials not configured',
        results: []
      }, { status: 500 });
    }

    const igdbQuery = `
      search "${searchQuery}";
      fields id, name, summary, cover.url, cover.image_id, 
             genres.name, platforms.name, platforms.abbreviation,
             involved_companies.company.name, involved_companies.developer,
             involved_companies.publisher, first_release_date, rating;
      limit ${Math.min(limit, 50)};
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

    // Transform IGDB data to simplified format for search results
    const searchResults = games.map(game => ({
      igdb_id: game.id,
      title: game.name,
      summary: game.summary ? 
        (game.summary.length > 200 ? 
          game.summary.substring(0, 200) + '...' : 
          game.summary) : null,
      cover_image: game.cover ? 
        `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover.image_id}.jpg` : null,
      cover_large: game.cover ? 
        `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` : null,
      genres: (game.genres || []).map(genre => genre.name).slice(0, 3), // Limit to 3 genres
      platforms: (game.platforms || []).map(platform => 
        platform.abbreviation || platform.name
      ).slice(0, 5), // Limit to 5 platforms
      developers: (game.involved_companies || [])
        .filter(company => company.developer)
        .map(company => company.company.name)
        .slice(0, 2), // Limit to 2 developers
      publishers: (game.involved_companies || [])
        .filter(company => company.publisher)
        .map(company => company.company.name)
        .slice(0, 2), // Limit to 2 publishers
      release_date: game.first_release_date ? 
        new Date(game.first_release_date * 1000).toISOString() : null,
      release_year: game.first_release_date ? 
        new Date(game.first_release_date * 1000).getFullYear() : null,
      igdb_rating: game.rating ? Math.round(game.rating) / 10 : null
    }));

    return json({
      results: searchResults,
      query: searchQuery,
      total_results: games.length,
      search_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error searching IGDB:', error);
    return json({ 
      error: 'Failed to search game database',
      results: [],
      query: url.searchParams.get('q')
    }, { status: 500 });
  }
}

/**
 * POST /api/igdb/search
 * Advanced search with filters
 */
export async function POST({ request }) {
  try {
    const { 
      query,
      genres = [],
      platforms = [],
      year_range = null,
      rating_min = null,
      limit = 20
    } = await request.json();

    if (!query) {
      return json({ 
        error: 'Search query is required',
        results: []
      }, { status: 400 });
    }

    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      return json({ 
        error: 'IGDB credentials not configured',
        results: []
      }, { status: 500 });
    }

    let filters = [];
    
    // Add genre filters
    if (genres.length > 0) {
      const genreFilter = `genres.name = (${genres.map(g => `"${g}"`).join(',')})`;
      filters.push(genreFilter);
    }
    
    // Add platform filters
    if (platforms.length > 0) {
      const platformFilter = `platforms.abbreviation = (${platforms.map(p => `"${p}"`).join(',')})`;
      filters.push(platformFilter);
    }
    
    // Add year range filter
    if (year_range) {
      const startTimestamp = Math.floor(new Date(`${year_range.start}-01-01`).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(`${year_range.end}-12-31`).getTime() / 1000);
      filters.push(`first_release_date >= ${startTimestamp} & first_release_date <= ${endTimestamp}`);
    }
    
    // Add rating filter
    if (rating_min) {
      filters.push(`rating >= ${rating_min * 10}`); // IGDB uses 0-100 scale
    }

    let igdbQuery = `search "${query}";`;
    
    if (filters.length > 0) {
      igdbQuery += `\nwhere ${filters.join(' & ')};`;
    }
    
    igdbQuery += `
      fields id, name, summary, cover.url, cover.image_id,
             genres.name, platforms.name, platforms.abbreviation,
             involved_companies.company.name, involved_companies.developer,
             involved_companies.publisher, first_release_date, rating;
      limit ${Math.min(limit, 50)};
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

    const searchResults = games.map(game => ({
      igdb_id: game.id,
      title: game.name,
      summary: game.summary,
      cover_image: game.cover ? 
        `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover.image_id}.jpg` : null,
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
      release_date: game.first_release_date ? 
        new Date(game.first_release_date * 1000).toISOString() : null,
      igdb_rating: game.rating ? Math.round(game.rating) / 10 : null
    }));

    return json({
      results: searchResults,
      filters: {
        query,
        genres,
        platforms,
        year_range,
        rating_min
      },
      total_results: games.length,
      search_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in advanced IGDB search:', error);
    return json({ 
      error: 'Failed to perform advanced search',
      results: []
    }, { status: 500 });
  }
}