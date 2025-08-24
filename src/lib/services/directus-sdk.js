/**
 * Directus SDK Service
 * 
 * This service handles all interactions with the Directus CMS backend.
 * It provides functions to fetch content for music releases, social links,
 * site settings, and other dynamic content.
 * 
 * Key Features:
 * - CDN-based asset serving for performance
 * - Published status filtering for content visibility
 * - Relationship expansion for complex data structures
 * - Fallback handling for offline scenarios
 */

import { createDirectus, rest, staticToken, readItems, readItem } from '@directus/sdk';
import { 
  DIRECTUS_URL,
  DIRECTUS_TOKEN,
  CDN_BASE_URL,
  S3_BUCKET_URL,
  USE_CDN_FOR_ASSETS,
  NODE_ENV
} from '$env/static/private';
import { extractYouTubeId } from '$lib/utils/youtube.js';
import { getMusicPlatformColors, getSocialPlatformColors } from '$lib/utils/colors.js';

/* =================================================================================
 * CORE DIRECTUS CLIENT SETUP
 * ================================================================================= */

/**
 * Creates and returns a configured Directus client instance
 * @returns {Object} Configured Directus client with REST API and authentication
 */
function getDirectusInstance() {
  const directus = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(staticToken(DIRECTUS_TOKEN));
  
  return directus;
}

/* =================================================================================
 * ASSET MANAGEMENT UTILITIES
 * ================================================================================= */

/**
 * Builds optimized asset URLs for images and files
 * Automatically switches between CDN and Directus assets endpoint based on environment
 * @param {string|Object} fileId - File ID or Directus file object
 * @param {Object} transforms - Optional image transformations
 * @returns {string|null} Complete asset URL or null if no file provided
 */
export function buildAssetUrl(fileId, transforms = {}) {
  if (!fileId) return null;
  
  // Handle both string IDs and file objects from Directus
  let actualFileId = fileId;
  if (typeof fileId === 'object' && fileId !== null) {
    // If it's a file object from Directus, use filename_disk which includes the extension
    actualFileId = fileId.filename_disk || fileId.id;
  }
  
  // If it's already a full URL, return as-is
  if (typeof actualFileId === 'string' && (actualFileId.startsWith('http://') || actualFileId.startsWith('https://'))) {
    return actualFileId;
  }

  // Determine whether to use CDN based on configuration
  const shouldUseCDN = USE_CDN_FOR_ASSETS === 'true' || NODE_ENV === 'production';
  
  // Use CDN URL when configured (DirectUS files are stored in S3/DigitalOcean Spaces)
  // The CDN serves the files directly without going through DirectUS
  if (shouldUseCDN && (CDN_BASE_URL || S3_BUCKET_URL)) {
    const baseUrl = CDN_BASE_URL || S3_BUCKET_URL;
    
    // If we have a file object but no filename_disk, fall back to Directus assets endpoint
    if (typeof fileId === 'object' && fileId !== null && !fileId.filename_disk) {
      const assetId = fileId.id;
      return `${DIRECTUS_URL}/assets/${assetId}`;
    }
    
    // When using CDN, we can't use DirectUS transforms, just return direct file URL
    return `${baseUrl}/${actualFileId}`;
  }
  
  // Fallback to DirectUS assets endpoint for local development
  // This would only be used if CDN is not configured
  const baseUrl = DIRECTUS_URL;
  const transformParams = new URLSearchParams(transforms).toString();
  const queryString = transformParams ? `?${transformParams}` : '';
  
  // For DirectUS assets endpoint, use the ID without extension
  const assetId = typeof fileId === 'object' ? fileId.id : fileId;
  return `${baseUrl}/assets/${assetId}${queryString}`;
}

/* =================================================================================
 * MUSIC CONTENT API
 * ================================================================================= */

/**
 * Fetches all published music releases from Directus
 * Includes related data like cover art, external links, credits, and videos
 * Only returns releases with published_status = 'live' or null (backward compatibility)
 * @returns {Promise<Array>} Array of transformed music release objects
 */
export async function getMusicReleases() {
  try {
    const directus = getDirectusInstance();
    
    // Use DirectUS SDK to fetch releases with cover art and credits  
    const releases = await directus.request(
      readItems('kjov2_music_releases', {
        // Filter to only show live releases (published_status = 'live' or null for backward compatibility)
        filter: {
          _or: [
            { published_status: { _eq: 'live' } },
            { published_status: { _null: true } }
          ]
        },
        // Specify fields including the cover art file relationship and credits
        fields: [
          '*',  // All direct fields
          {
            cover_art: ['id', 'filename_disk', 'filename_download']
          },
          {
            credits: [
              'role',
              'additional_info',
              'display_order',
              {
                person_id: ['name', 'bio', 'website_url']
              }
            ]
          },
          {
            videos: [
              'id',
              'title',
              'description',
              'video_type',
              'video_url',
              'thumbnail_url',
              'display_order',
              'featured'
            ]
          },
          {
            external_links: [
              'id',
              'url',
              'label',
              'icon_type',
              'display_order',
              'is_primary',
              {
                icon_value: ['icon_reference_id']
              }
            ]
          }
        ],
        // Sort by release date
        sort: ['-release_date', '-created_at']
      })
    );

    // Transform the data to match our existing format
    return releases.map(release => ({
      id: release.id,
      title: release.title,
      artist: release.main_artist, // Default artist
      release_type: release.release_type,
      // Handle cover_art - it can be a UUID string or an object with file details
      cover_art: release.cover_art ? 
        (typeof release.cover_art === 'object' ? 
          buildAssetUrl(release.cover_art.filename_disk || release.cover_art.id) : 
          buildAssetUrl(release.cover_art)) : null,
      release_date: release.release_date,
      description: release.description,
      rich_content: release.rich_content,
      featured: release.featured,
      liner_notes: release.liner_notes,
      access_type: release.access_type,
      published_status: release.published_status,
      minimum_price: parseFloat(release.minimum_price) || 0,
      suggested_price: parseFloat(release.suggested_price) || 0,
      track_count: 0, // Will need separate query for tracks
      genre: 'Unknown', // Will need tracks data
      
      // These would need additional queries or relationships set up in DirectUS
      tracks: [],
      videos: (release.videos || []).map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        video_type: video.video_type,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
        display_order: video.display_order,
        featured: video.featured
      })),
      youtube_videos: (release.videos || [])
        .filter(video => video.video_type === 'youtube')
        .map(video => ({
          id: video.video_url.includes('youtube.com/watch?v=') 
            ? video.video_url.split('v=')[1]?.split('&')[0]
            : video.video_url.includes('youtu.be/')
            ? video.video_url.split('youtu.be/')[1]?.split('?')[0]
            : video.video_url,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
          featured: video.featured
        })),
      external_links: (release.external_links || []).map(link => {
        // Handle icon field - check if icon_value is an object with icon_reference_id
        let iconValue = null;
        if (link.icon_value && typeof link.icon_value === 'object') {
          iconValue = link.icon_value.icon_reference_id;
        } else {
          iconValue = link.icon_value;
        }
        
        return {
          id: link.id,
          url: link.url,
          label: link.label,
          icon_type: link.icon_type,
          icon_value: iconValue,
          display_order: link.display_order,
          is_primary: link.is_primary
        };
      }),
      credits: (release.credits || []).map(credit => ({
        role: credit.role,
        name: credit.person_id?.name || 'Unknown',
        additional_info: credit.additional_info,
        bio: credit.person_id?.bio,
        website_url: credit.person_id?.website_url,
        display_order: credit.display_order
      })),
      
      // Legacy fields for compatibility
      spotify_url: undefined,
      bandcamp_url: undefined,
      apple_music_url: undefined,
      youtube_url: undefined,
      tidal_url: undefined
    }));

  } catch (error) {
    console.error('DirectUS SDK error:', error);
    // Return empty array as fallback
    return [];
  }
}

/* =================================================================================
 * FEATURED CONTENT API
 * ================================================================================= */

/**
 * Fetches featured works/projects from Directus
 * Used for homepage Featured Work section
 * @param {Array} [selectedFeaturedWorks] - Pre-fetched featured works from kjov2_general relationship (required)
 * @returns {Promise<Array>} Array of featured work objects
 */
export async function getFeaturedWorks(selectedFeaturedWorks = null) {
  if (!selectedFeaturedWorks || !Array.isArray(selectedFeaturedWorks)) {
    console.error('getFeaturedWorks requires selectedFeaturedWorks from kjov2_general relationship');
    return [];
  }

  // Sort by display_order for consistent presentation
  return selectedFeaturedWorks.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}


/* =================================================================================
 * BLOG CONTENT API
 * ================================================================================= */

/**
 * Fetches the blog page header image from Directus general settings
 * Used for the blog page hero section background
 * @returns {Promise<string|null>} URL of header image or null
 */
export async function getBlogPageHeader() {
  try {
    const directus = getDirectusInstance();
    
    const generalData = await directus.request(
      readItems('kjov2_general', {
        fields: [
          '*',
          {
            blog_page_header: ['*']
          }
        ],
        limit: 1
      })
    );

    // Handle both array and single object responses
    const firstRecord = Array.isArray(generalData) ? generalData[0] : generalData;
    
    if (firstRecord && firstRecord.blog_page_header) {
      const headerFile = firstRecord.blog_page_header;
      
      // Directly use filename_disk since it's available
      if (headerFile.filename_disk) {
        return `${CDN_BASE_URL || S3_BUCKET_URL}/${headerFile.filename_disk}`;
      }
      
      // Fallback to buildAssetUrl
      return buildAssetUrl(headerFile);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching blog page header:', error);
    return null;
  }
}

// Fetch blog posts from DirectUS
export async function getBlogPosts(section = null, limit = null, offset = null) {
  try {
    const directus = getDirectusInstance();
    
    let query = {
      fields: [
        'id',
        'title', 
        'content',
        'excerpt',
        'section',
        'featured_post',
        'tags',
        'slug',
        {
          featured_image: ['id', 'filename_disk', 'filename_download', 'type']
        }
      ],
      sort: ['-id'] // Sort by newest first for consistent pagination
    };
    
    // Add pagination if specified
    if (limit) {
      query.limit = limit;
    }
    if (offset) {
      query.offset = offset;
    }
    
    // Filter by section if provided
    if (section) {
      query.filter = {
        section: {
          _eq: section
        }
      };
    }
    
    const blogPosts = await directus.request(
      readItems('kjov2_blog_posts', query)
    );
    
    if (!blogPosts || blogPosts.length === 0) {
      return [];
    }

    // Transform the data to match our expected format
    return blogPosts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || post.content?.substring(0, 150) + '...' || 'No excerpt available',
      section: post.section,
      category: post.section || 'general',
      featured: post.featured_post || false,
      tags: post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim())) : [],
      image: post.featured_image ? buildAssetUrl(post.featured_image) : '/img/blog-hero-default.jpg',
      featured_image: post.featured_image ? buildAssetUrl(post.featured_image) : null,
      date: new Date().toISOString(), // Use current date as fallback
      slug: post.slug || `post-${post.id}`,
      status: 'published',
      author: 'Key Jay',
      readTime: '5 min read'
    }));

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

// Search blog posts
export async function searchBlogPosts(query, limit = 10, offset = 0) {
  try {
    const directus = getDirectusInstance();
    
    const searchQuery = {
      fields: [
        'id',
        'title', 
        'content',
        'excerpt',
        'section',
        'featured_post',
        'tags',
        'slug',
        {
          featured_image: ['id', 'filename_disk', 'filename_download', 'type']
        }
      ],
      sort: ['-id'],
      limit,
      offset,
      filter: {
        _or: [
          {
            title: {
              _icontains: query
            }
          },
          {
            content: {
              _icontains: query
            }
          },
          {
            excerpt: {
              _icontains: query
            }
          },
          {
            tags: {
              _icontains: query
            }
          }
        ]
      }
    };
    
    const blogPosts = await directus.request(
      readItems('kjov2_blog_posts', searchQuery)
    );
    
    if (!blogPosts || blogPosts.length === 0) {
      return [];
    }

    // Transform the data to match our expected format
    return blogPosts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || post.content?.substring(0, 150) + '...' || 'No excerpt available',
      section: post.section,
      category: post.section || 'general',
      featured_post: post.featured_post || false,
      tags: post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim())) : [],
      image: post.featured_image ? buildAssetUrl(post.featured_image) : '/img/blog-hero-default.jpg',
      slug: post.slug,
      author: 'Key Jay',
      date: new Date().toISOString(),
      readTime: '5 min read'
    }));

  } catch (error) {
    console.error('Error searching blog posts:', error);
    return [];
  }
}

// Fetch single blog post by ID or slug
export async function getBlogPost(identifier) {
  try {
    const directus = getDirectusInstance();
    
    // Try to fetch by slug first, then by ID
    let post;
    try {
      post = await directus.request(
        readItems('kjov2_blog_posts', {
          fields: [
            '*',
            {
              featured_image: ['id', 'filename_disk', 'filename_download', 'type']
            }
          ],
          filter: {
            slug: {
              _eq: identifier
            }
          },
          limit: 1
        })
      );
      
      if (post.length === 0) {
        // Try by ID if slug doesn't work
        post = await directus.request(
          readItem('kjov2_blog_posts', identifier, {
            fields: [
              '*',
              {
                featured_image: ['id', 'filename_disk', 'filename_download', 'type']
              }
            ]
          })
        );
        post = [post]; // Wrap in array for consistent processing
      }
    } catch {
      // If slug fails, try ID
      post = await directus.request(
        readItem('kjov2_blog_posts', identifier, {
          fields: [
            '*',
            {
              featured_image: ['id', 'filename_disk', 'filename_download', 'type']
            }
          ]
        })
      );
      post = [post]; // Wrap in array for consistent processing
    }

    if (!post || post.length === 0) return null;
    
    const postData = post[0];
    return {
      id: postData.id,
      title: postData.title,
      content: postData.content,
      excerpt: postData.excerpt || postData.content?.substring(0, 150) + '...' || 'No excerpt available',
      section: postData.section,
      category: postData.section || 'general',
      featured: postData.featured || false,
      tags: postData.tags ? (Array.isArray(postData.tags) ? postData.tags : postData.tags.split(',').map(tag => tag.trim())) : [],
      image: postData.featured_image ? buildAssetUrl(postData.featured_image) : '/src/lib/assets/blog-hero-default.jpg',
      featured_image: postData.featured_image ? buildAssetUrl(postData.featured_image) : null,
      date: new Date().toISOString(), // Use current date as fallback since date fields don't exist
      slug: postData.slug || `post-${postData.id}`,
      status: postData.status || 'published',
      author: 'Key Jay',
      readTime: '5 min read'
    };

  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

/* =================================================================================
 * SOCIAL MEDIA & EXTERNAL LINKS API
 * ================================================================================= */


/**
 * Fetches music streaming platforms and networks from Directus
 * Used for "Listen On" sections throughout the application
 * @returns {Promise<Array>} Array of music network/platform objects
 */
export async function getMusicNetworks() {
  try {
    const directus = getDirectusInstance();
    
    const musicNetworks = await directus.request(
      readItems('kjov2_music_networks', {
        fields: [
          '*',
          {
            icon_selector_name: ['*']
          }
        ]
      })
    );

    if (musicNetworks && musicNetworks.length > 0) {
      // Transform the data to match our expected format
      const transformedNetworks = musicNetworks.map(network => {
        // Handle icon field - check if icon_selector_name is an object with icon_reference_id
        let iconName = null;
        if (network.icon_selector_name && typeof network.icon_selector_name === 'object') {
          iconName = network.icon_selector_name.icon_reference_id;
        } else {
          iconName = network.icon || network.icon_class || network.icon_name || network.icon_selector_name || `simple-icons:${(network.name || '').toLowerCase()}`;
        }
        
        return {
          id: network.id,
          name: network.name || network.platform,
          icon: iconName,
          url: network.url,
          color: network.color || getMusicPlatformColors(network.name || network.platform),
          display_order: network.display_order || network.sort || network.sort_order || 0
        };
      });
      
      // Sort by display_order
      transformedNetworks.sort((a, b) => a.display_order - b.display_order);
      
      return transformedNetworks;
    }
  } catch (error) {
    console.error('Error fetching music networks:', error);
  }
  
  // Return empty array if database fetch fails
  return [];
}

/* =================================================================================
 * UTILITY FUNCTIONS & FALLBACKS
 * ================================================================================= */


/* =================================================================================
 * SITE CONFIGURATION & SETTINGS API
 * ================================================================================= */

/**
 * Fetches general site configuration from Directus
 * Includes maintenance mode status and page enable/disable states
 * Provides comprehensive fallback data if database is unavailable
 * @returns {Promise<Object>} Site configuration object with status and page settings
 */
export async function getSiteSettings() {
  try {
    const directus = getDirectusInstance();
    
    const settings = await directus.request(
      readItems('kjov2_general', {
        fields: [
          '*',
          {
            featured: [
              'id',
              'header',
              'details',
              'hosted_type',
              'left_remote_content',
              'project_link',
              'sort',
              {
                thumbnail_image: ['id', 'filename_disk', 'filename_download']
              },
              {
                background: ['id', 'filename_disk', 'filename_download', 'type']
              }
            ]
          },
          {
            socials: [
              'id',
              'name',
              'url',
              'icon_selector_name',
              {
                icon_selector_name: ['icon_reference_id']
              }
            ]
          }
        ],
        limit: 1
      })
    );

    // Handle the case where settings is an object (single record) instead of array
    const siteConfig = Array.isArray(settings) ? settings[0] : settings;
    
    // Check if we got valid data from the database
    if (!siteConfig || Object.keys(siteConfig).length === 0) {
      throw new Error('No data from database, using fallback');
    }
    
    // Process featured works if they exist
    const featuredWorks = siteConfig.featured ? siteConfig.featured.map(work => ({
      id: work.id || work.feat_id,
      title: work.header || work.title,
      description: work.details || work.description,
      backgroundImageUrl: work.background ? buildAssetUrl(work.background) : 'https://images.unsplash.com/photo-1729575846511-f499d2e17d79?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFzaWMlMjBiYWNrZ3JvdW5kfGVufDB8fDB8fHww',
      leftContent: {
        type: work.hosted_type || work.video_type || 'image',
        src: (work.hosted_type === 'youtube' || work.video_type === 'youtube')
          ? null 
          : (work.left_local_content ? 
              buildAssetUrl(work.left_local_content) :
              (work.thumbnail_image ? 
                (typeof work.thumbnail_image === 'object' ? 
                  buildAssetUrl(work.thumbnail_image.filename_disk || work.thumbnail_image.id) : 
                  buildAssetUrl(work.thumbnail_image)) : 
                'https://placehold.co/800x600/1a1a1a/ffffff?text=Featured+Work')),
        videoId: (work.hosted_type === 'youtube' || work.video_type === 'youtube') && 
                 (work.left_remote_content || work.video_url) ? 
          extractYouTubeId(work.left_remote_content || work.video_url) : null
      },
      video_url: work.left_remote_content || work.video_url,
      video_type: work.hosted_type || work.video_type,
      featured: work.featured || false,
      display_order: work.sort || work.display_order || 0,
      link: work.project_link || '#'
    })) : [];

    // Process social links if they exist
    const socialLinks = siteConfig.socials ? siteConfig.socials.map(social => {
      // Handle icon field - check if icon_selector_name is an object with icon_reference_id
      let iconName = null;
      if (social.icon_selector_name && typeof social.icon_selector_name === 'object') {
        iconName = social.icon_selector_name.icon_reference_id;
      } else {
        iconName = social.icon_selector_name || `mdi:${(social.name || '').toLowerCase()}`;
      }
      
      return {
        id: social.id,
        name: social.name,
        icon: iconName,
        url: social.url,
        color: getSocialPlatformColors(social.name),
        display_order: 0 // Default since display_order field doesn't exist
      };
    }) : [];

    const result = {
      status: siteConfig.status?.toLowerCase() || 'live', // Normalize to lowercase: 'live' or 'maintenance'
      featuredWorks,
      socialLinks,
      pages: {
        music: {
          disabled: siteConfig.music_page_disabled || false,
          header_background: siteConfig.music_page_header || null
        },
        games: {
          disabled: siteConfig.games_page_disabled || false,
          header_background: siteConfig.games_page_header || null
        },
        voice: {
          disabled: siteConfig.voice_page_disabled || false,
          header_background: siteConfig.voice_page_header || null
        },
        tech: {
          disabled: siteConfig.tech_page_disabled || false,
          header_background: siteConfig.tech_page_header || null
        },
        productions: {
          disabled: siteConfig.productions_page_disabled || false,
          header_background: siteConfig.productions_page_header || null
        },
        blog: {
          disabled: siteConfig.blog_page_disabled || false,
          header_background: siteConfig.blog_page_header || null
        },
        about: {
          disabled: siteConfig.about_page_disabled || false,
          header_background: siteConfig.about_page_header || null
        },
        contact: {
          disabled: siteConfig.contact_page_disabled || false,
          header_background: siteConfig.contact_page_header || null
        }
      }
    };

    return result;

  } catch (error) {
    console.error('Error fetching site settings:', error);
    
    // Realistic fallback data that matches production database state
    const fallbackResult = {
      status: 'live',
      featuredWorks: [], // Empty array if database is unavailable
      socialLinks: [], // Empty array if database is unavailable
      pages: {
        music: { disabled: false, header_background: null },
        games: { disabled: false, header_background: null },
        voice: { disabled: false, header_background: null },
        tech: { disabled: false, header_background: null }, // Tech is NOT disabled in production
        productions: { disabled: false, header_background: null },
        blog: { disabled: false, header_background: null },
        about: { disabled: false, header_background: null },
        contact: { disabled: false, header_background: null }
      }
    };
    
    return fallbackResult;
  }
}