import { json } from '@sveltejs/kit';
import { getPhotos } from '$lib/api/index.js';

/**
 * GET /api/photos
 * API endpoint for fetching photos with pagination (used by infinite scroll)
 */
export async function GET({ url }) {
  try {
    // Extract query parameters
    const gallerySlug = url.searchParams.get('gallery');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const featured = url.searchParams.get('featured') === 'true' ? true : 
                     url.searchParams.get('featured') === 'false' ? false : null;

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return json({ 
        error: 'Invalid pagination parameters',
        photos: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }, { status: 400 });
    }

    // Get photos from DirectUs
    const result = await getPhotos({
      gallerySlug: gallerySlug && gallerySlug !== 'all' ? gallerySlug : null,
      tags: tags.length > 0 ? tags : null,
      page,
      limit,
      featured
    });

    return json({
      photos: result.photos,
      pagination: result.pagination,
      filters: {
        gallery: gallerySlug || 'all',
        tags: tags,
        featured: featured,
        page: page,
        limit: limit
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in photos API:', error);
    
    return json({ 
      error: 'Failed to fetch photos',
      photos: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/photos
 * Create new photo (for future admin functionality)
 */
export async function POST({ request }) {
  try {
    const photoData = await request.json();
    
    // TODO: Implement photo creation logic with DirectUs
    // This would be used by an admin interface to upload new photos
    
    return json({
      success: false,
      message: 'Photo creation not yet implemented',
      photo: null
    }, { status: 501 });

  } catch (error) {
    console.error('Error creating photo:', error);
    
    return json({
      success: false,
      error: 'Failed to create photo'
    }, { status: 500 });
  }
}