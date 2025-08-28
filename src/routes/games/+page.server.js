import { 
  getGamesLibrary,
  getCurrentDiscordActivity,
  getRecentGamingSessions,
  getGamesPageHeader
} from '$lib/api/index.js';

export async function load({ url }) {
  try {
    // Run all data fetching in parallel for better performance
    const [
      gamesLibrary,
      discordActivity, 
      recentSessions,
      gamesPageHeader
    ] = await Promise.all([
      getGamesLibrary(),
      getCurrentDiscordActivity(),
      getRecentGamingSessions(10),
      getGamesPageHeader()
    ]);

    // Filter games by category if specified
    const category = url.searchParams.get('category');
    let filteredGames = gamesLibrary;
    
    if (category && category !== 'all') {
      filteredGames = gamesLibrary.filter(game => 
        game.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Get unique categories for filtering
    const categories = [...new Set(
      gamesLibrary
        .map(game => game.category)
        .filter(cat => cat && cat.trim())
    )].sort();

    // Transform games library data to match existing format
    const gameReviews = filteredGames
      .filter(game => game.review_text && game.personal_rating > 0)
      .slice(0, 6) // Limit to 6 for the reviews section
      .map(game => ({
        id: game.id,
        title: game.title,
        platform: game.platform,
        rating: game.rating,
        image: game.cover_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
        category: game.category || 'Unknown',
        description: game.description || game.review_text?.substring(0, 120) + '...',
        review_date: game.review_date || game.last_played,
        playtime: game.playtime ? `${game.playtime} hours` : 'Not tracked'
      }));

    // Create featured content from recent gaming sessions
    const gameContent = recentSessions
      .filter(session => session.game)
      .slice(0, 6) // Limit to 6 for content section
      .map(session => ({
        id: `session-${session.id}`,
        type: 'Gaming Session',
        title: `${session.game.title} - ${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m`,
        thumbnail: session.game.cover_image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600',
        duration: `${Math.floor(session.duration_minutes / 60)}:${(session.duration_minutes % 60).toString().padStart(2, '0')}`,
        views: session.achievements_unlocked ? `${session.achievements_unlocked} achievements` : 'No achievements',
        description: session.notes || `Gaming session on ${session.game.platform}`,
        session_date: session.session_start,
        game_info: session.game
      }));

    return {
      // Enhanced gaming data from DirectUS
      gamesLibrary,
      currentDiscordActivity: discordActivity,
      recentSessions,
      categories,
      selectedCategory: category || 'all',
      gamesPageHeader,
      
      // Transformed data for existing components
      gameReviews,
      gameContent,
      
      // Stats for dashboard
      stats: {
        totalGames: gamesLibrary.length,
        totalPlaytime: gamesLibrary.reduce((sum, game) => sum + (game.playtime || 0), 0),
        averageRating: gamesLibrary.length > 0 ? 
          Math.round((gamesLibrary.reduce((sum, game) => sum + game.rating, 0) / gamesLibrary.length) * 10) / 10 : 0,
        recentlyPlayed: gamesLibrary.filter(game => game.last_played && 
          new Date(game.last_played) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length
      }
    };

  } catch (error) {
    console.error('Error loading games data:', error);
    
    // Return fallback data with empty arrays
    return {
      gamesLibrary: [],
      currentDiscordActivity: null,
      recentSessions: [],
      categories: [],
      selectedCategory: 'all',
      gamesPageHeader: null,
      gameReviews: [],
      gameContent: [],
      stats: {
        totalGames: 0,
        totalPlaytime: 0,
        averageRating: 0,
        recentlyPlayed: 0
      },
      error: 'Failed to load games data'
    };
  }
}