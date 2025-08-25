/**
 * Blog Content API
 * 
 * This module handles all blog-related content fetching from Directus.
 * It provides functions to retrieve blog posts, search functionality,
 * and blog page configuration.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';
import { 
  CDN_BASE_URL,
  S3_BUCKET_URL
} from '$env/static/private';

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

/**
 * Fetches blog posts from Directus
 * @param {string|null} section - Filter by section/category
 * @param {number|null} limit - Maximum number of posts to return
 * @param {number|null} offset - Number of posts to skip for pagination
 * @returns {Promise<Array>} Array of blog post objects
 */
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

/**
 * Search blog posts by query string
 * @param {string} query - Search query
 * @param {number} limit - Maximum results to return
 * @param {number} offset - Number of results to skip
 * @returns {Promise<Array>} Array of matching blog posts
 */
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

/**
 * Fetch single blog post by ID or slug
 * @param {string|number} identifier - Post ID or slug
 * @returns {Promise<Object|null>} Blog post object or null if not found
 */
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