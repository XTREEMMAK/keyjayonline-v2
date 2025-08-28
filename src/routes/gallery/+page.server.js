import { 
  getPhotoGalleries,
  getPhotos,
  getFeaturedPhotos,
  getPhotoTags
} from '$lib/api/index.js';

export async function load({ url }) {
  try {
    const gallerySlug = url.searchParams.get('gallery');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const featured = url.searchParams.get('featured') === 'true' ? true : 
                     url.searchParams.get('featured') === 'false' ? false : null;
    
    // Run queries in parallel for better performance
    const [
      galleries,
      photosResult,
      featuredPhotos,
      photoTags
    ] = await Promise.all([
      getPhotoGalleries(),
      getPhotos({
        gallerySlug,
        tags: tags.length > 0 ? tags : null,
        page,
        limit,
        featured
      }),
      page === 1 && !gallerySlug && tags.length === 0 ? getFeaturedPhotos(8) : Promise.resolve([]),
      getPhotoTags()
    ]);

    // Calculate gallery counts
    const galleriesWithCounts = await Promise.all(
      galleries.map(async (gallery) => {
        const galleryPhotos = await getPhotos({
          gallerySlug: gallery.slug,
          page: 1,
          limit: 1
        });
        return {
          ...gallery,
          photo_count: galleryPhotos.pagination.total
        };
      })
    );

    return {
      galleries: galleriesWithCounts,
      photos: photosResult.photos,
      pagination: photosResult.pagination,
      featuredPhotos,
      photoTags,
      
      // Filter state
      filters: {
        gallery: gallerySlug || 'all',
        tags: tags,
        featured: featured,
        page: page,
        limit: limit
      },
      
      // Stats
      stats: {
        totalPhotos: photosResult.pagination.total,
        totalGalleries: galleries.length,
        featuredCount: featuredPhotos.length,
        tagsCount: photoTags.length
      }
    };

  } catch (error) {
    console.error('Error loading gallery data:', error);
    
    return {
      galleries: [],
      photos: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      },
      featuredPhotos: [],
      photoTags: [],
      filters: {
        gallery: 'all',
        tags: [],
        featured: null,
        page: 1,
        limit: 20
      },
      stats: {
        totalPhotos: 0,
        totalGalleries: 0,
        featuredCount: 0,
        tagsCount: 0
      },
      error: 'Failed to load gallery data'
    };
  }
}