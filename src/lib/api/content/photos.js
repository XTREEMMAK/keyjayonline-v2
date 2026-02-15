/**
 * Photos/Gallery Content API
 * 
 * This module handles all photo gallery-related content fetching from DirectUs.
 * It provides functions to retrieve photo galleries, individual photos with
 * metadata, and supports infinite scrolling with masonry layout optimization.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches all photo gallery categories
 * @returns {Promise<Array>} Array of photo gallery categories
 */
export async function getPhotoGalleries() {
  try {
    const directus = getDirectusInstance();
    
    const galleries = await directus.request(
      readItems('kjov2_photo_galleries', {
        filter: {
          published_status: { _eq: 'live' }
        },
        fields: [
          '*',
          {
            cover_photo: ['id', 'filename_disk', 'filename_download', 'title']
          }
        ],
        sort: ['display_order', 'name']
      })
    );

    return galleries.map(gallery => ({
      id: gallery.id,
      name: gallery.name,
      slug: gallery.slug,
      description: gallery.description,
      display_order: gallery.display_order,
      photo_count: 0, // Will be populated by separate query if needed
      cover_photo: gallery.cover_photo ? {
        id: gallery.cover_photo.id,
        url: buildAssetUrl(gallery.cover_photo),
        thumbnail: buildAssetUrl(gallery.cover_photo, {
          width: 400,
          height: 300,
          fit: 'cover'
        }),
        title: gallery.cover_photo.title
      } : null
    }));

  } catch (error) {
    console.error('Error fetching photo galleries:', error);
    return [];
  }
}

/**
 * Fetches photos with infinite scrolling support
 * @param {Object} options - Filtering and pagination options
 * @returns {Promise<Object>} Photos array with pagination info
 */
export async function getPhotos(options = {}) {
  try {
    const directus = getDirectusInstance();
    
    const {
      gallerySlug = null,
      tags = null,
      page = 1,
      limit = 20,
      featured = null
    } = options;

    let filter = {
      published_status: { _eq: 'live' }
    };

    // Add gallery filter if specified
    if (gallerySlug) {
      filter._and = [
        filter,
        { 'gallery_id.slug': { _eq: gallerySlug } }
      ];
    }

    // Add featured filter if specified
    if (featured !== null) {
      filter._and = filter._and || [];
      filter._and.push({ featured: { _eq: featured } });
    }

    // Add tags filter if specified
    if (tags && tags.length > 0) {
      filter._and = filter._and || [];
      filter._and.push({
        tags: {
          photo_tags_id: {
            tag_name: { _in: tags }
          }
        }
      });
    }

    const offset = (page - 1) * limit;

    const photos = await directus.request(
      readItems('kjov2_photos', {
        filter: filter,
        fields: [
          '*',
          {
            gallery_id: ['id', 'name', 'slug']
          },
          {
            photo_file: ['id', 'filename_disk', 'filename_download', 'title', 'description', 'width', 'height', 'filesize']
          },
          {
            tags: [
              'photo_tags_id.*'
            ]
          }
        ],
        sort: ['-featured', '-date_taken', '-uploaded_at'],
        limit: limit,
        offset: offset
      })
    );

    // Get total count for pagination
    const totalCount = await directus.request(
      readItems('kjov2_photos', {
        filter: filter,
        aggregate: {
          count: ['id']
        }
      })
    );

    const transformedPhotos = photos.map(photo => ({
      id: photo.id,
      title: photo.title,
      description: photo.description,
      alt_text: photo.alt_text || photo.title,
      date_taken: photo.date_taken,
      location: photo.location,
      camera_settings: photo.camera_settings ? JSON.parse(photo.camera_settings) : null,
      featured: photo.featured,
      display_order: photo.display_order,
      uploaded_at: photo.uploaded_at,
      
      // Gallery information
      gallery: photo.gallery_id ? {
        id: photo.gallery_id.id,
        name: photo.gallery_id.name,
        slug: photo.gallery_id.slug
      } : null,
      
      // Photo file with multiple sizes for optimization
      photo: photo.photo_file ? {
        id: photo.photo_file.id,
        title: photo.photo_file.title,
        description: photo.photo_file.description,
        width: photo.photo_file.width,
        height: photo.photo_file.height,
        filesize: photo.photo_file.filesize,
        // Full resolution
        url: buildAssetUrl(photo.photo_file),
        // Medium size for grid display
        medium: buildAssetUrl(photo.photo_file, {
          width: 600,
          height: 600,
          fit: 'inside',
          quality: 85
        }),
        // Thumbnail for initial loading
        thumbnail: buildAssetUrl(photo.photo_file, {
          width: 300,
          height: 300,
          fit: 'cover',
          quality: 70
        }),
        // Blur placeholder for progressive loading
        placeholder: buildAssetUrl(photo.photo_file, {
          width: 20,
          height: 20,
          fit: 'cover',
          quality: 30
        })
      } : null,
      
      // Tags
      tags: (photo.tags || []).map(tag => ({
        id: tag.photo_tags_id.id,
        name: tag.photo_tags_id.tag_name,
        color: tag.photo_tags_id.color
      }))
    }));

    return {
      photos: transformedPhotos,
      pagination: {
        page: page,
        limit: limit,
        total: totalCount[0]?.count?.id || 0,
        totalPages: Math.ceil((totalCount[0]?.count?.id || 0) / limit),
        hasNextPage: page < Math.ceil((totalCount[0]?.count?.id || 0) / limit),
        hasPrevPage: page > 1
      }
    };

  } catch (error) {
    console.error('Error fetching photos:', error);
    return {
      photos: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

/**
 * Fetches featured photos for homepage or gallery previews
 * @param {number} limit - Number of featured photos to fetch
 * @returns {Promise<Array>} Array of featured photos
 */
export async function getFeaturedPhotos(limit = 8) {
  try {
    const directus = getDirectusInstance();
    
    const photos = await directus.request(
      readItems('kjov2_photos', {
        filter: {
          _and: [
            { published_status: { _eq: 'live' } },
            { featured: { _eq: true } }
          ]
        },
        fields: [
          '*',
          {
            gallery_id: ['name', 'slug']
          },
          {
            photo_file: ['id', 'filename_disk', 'width', 'height', 'title']
          }
        ],
        sort: ['-display_order', '-date_taken'],
        limit: limit
      })
    );

    return photos.map(photo => ({
      id: photo.id,
      title: photo.title,
      alt_text: photo.alt_text || photo.title,
      date_taken: photo.date_taken,
      location: photo.location,
      
      gallery: photo.gallery_id ? {
        name: photo.gallery_id.name,
        slug: photo.gallery_id.slug
      } : null,
      
      photo: photo.photo_file ? {
        id: photo.photo_file.id,
        title: photo.photo_file.title,
        width: photo.photo_file.width,
        height: photo.photo_file.height,
        url: buildAssetUrl(photo.photo_file),
        medium: buildAssetUrl(photo.photo_file, {
          width: 500,
          height: 500,
          fit: 'inside',
          quality: 85
        }),
        thumbnail: buildAssetUrl(photo.photo_file, {
          width: 250,
          height: 250,
          fit: 'cover',
          quality: 75
        })
      } : null
    }));

  } catch (error) {
    console.error('Error fetching featured photos:', error);
    return [];
  }
}

/**
 * Fetches a single photo by ID with full details
 * @param {string|number} photoId - The photo ID
 * @returns {Promise<Object|null>} Photo object with full details
 */
export async function getPhotoById(photoId) {
  try {
    const directus = getDirectusInstance();
    
    const photo = await directus.request(
      readItem('kjov2_photos', photoId, {
        fields: [
          '*',
          {
            gallery_id: ['*']
          },
          {
            photo_file: ['*']
          },
          {
            tags: [
              'photo_tags_id.*'
            ]
          }
        ]
      })
    );

    return {
      id: photo.id,
      title: photo.title,
      description: photo.description,
      alt_text: photo.alt_text || photo.title,
      date_taken: photo.date_taken,
      location: photo.location,
      camera_settings: photo.camera_settings ? JSON.parse(photo.camera_settings) : null,
      technical_notes: photo.technical_notes,
      featured: photo.featured,
      display_order: photo.display_order,
      uploaded_at: photo.uploaded_at,
      
      // Gallery information
      gallery: photo.gallery_id,
      
      // Full photo file information
      photo: photo.photo_file ? {
        id: photo.photo_file.id,
        title: photo.photo_file.title,
        description: photo.photo_file.description,
        filename: photo.photo_file.filename_download,
        width: photo.photo_file.width,
        height: photo.photo_file.height,
        filesize: photo.photo_file.filesize,
        type: photo.photo_file.type,
        url: buildAssetUrl(photo.photo_file),
        // Multiple sizes for different use cases
        sizes: {
          large: buildAssetUrl(photo.photo_file, {
            width: 1200,
            height: 1200,
            fit: 'inside',
            quality: 90
          }),
          medium: buildAssetUrl(photo.photo_file, {
            width: 800,
            height: 800,
            fit: 'inside',
            quality: 85
          }),
          small: buildAssetUrl(photo.photo_file, {
            width: 400,
            height: 400,
            fit: 'inside',
            quality: 80
          }),
          thumbnail: buildAssetUrl(photo.photo_file, {
            width: 200,
            height: 200,
            fit: 'cover',
            quality: 75
          })
        }
      } : null,
      
      // Tags
      tags: (photo.tags || []).map(tag => ({
        id: tag.photo_tags_id.id,
        name: tag.photo_tags_id.tag_name,
        color: tag.photo_tags_id.color,
        description: tag.photo_tags_id.description
      }))
    };

  } catch (error) {
    console.error('Error fetching photo by ID:', error);
    return null;
  }
}

/**
 * Fetches all available photo tags
 * @returns {Promise<Array>} Array of photo tags with usage counts
 */
export async function getPhotoTags() {
  try {
    const directus = getDirectusInstance();
    
    const tags = await directus.request(
      readItems('kjov2_photo_tags', {
        fields: ['*'],
        sort: ['tag_name']
      })
    );

    return tags.map(tag => ({
      id: tag.id,
      name: tag.tag_name,
      color: tag.color,
      description: tag.description,
      usage_count: 0 // Would need separate query to count actual usage
    }));

  } catch (error) {
    console.error('Error fetching photo tags:', error);
    return [];
  }
}

/**
 * Search photos by title, description, or location
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching photos
 */
export async function searchPhotos(searchTerm) {
  try {
    const directus = getDirectusInstance();
    
    const photos = await directus.request(
      readItems('kjov2_photos', {
        filter: {
          _and: [
            { published_status: { _eq: 'live' } },
            {
              _or: [
                { title: { _icontains: searchTerm } },
                { description: { _icontains: searchTerm } },
                { location: { _icontains: searchTerm } }
              ]
            }
          ]
        },
        fields: [
          'id', 'title', 'description', 'date_taken', 'location', 'featured',
          {
            gallery_id: ['name', 'slug']
          },
          {
            photo_file: ['id', 'filename_disk', 'width', 'height']
          }
        ],
        sort: ['-featured', '-date_taken']
      })
    );

    return photos.map(photo => ({
      id: photo.id,
      title: photo.title,
      description: photo.description,
      date_taken: photo.date_taken,
      location: photo.location,
      featured: photo.featured,
      
      gallery: photo.gallery_id ? {
        name: photo.gallery_id.name,
        slug: photo.gallery_id.slug
      } : null,
      
      photo: photo.photo_file ? {
        id: photo.photo_file.id,
        width: photo.photo_file.width,
        height: photo.photo_file.height,
        thumbnail: buildAssetUrl(photo.photo_file, {
          width: 300,
          height: 300,
          fit: 'cover',
          quality: 75
        })
      } : null
    }));

  } catch (error) {
    console.error('Error searching photos:', error);
    return [];
  }
}