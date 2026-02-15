/**
 * Resources Content API
 * 
 * This module handles all resource-related content fetching from DirectUs.
 * It provides functions to retrieve development tools, audio production gear,
 * creative software, code snippets, and learning resources.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches all resource categories with counts
 * @returns {Promise<Array>} Array of resource categories
 */
export async function getResourceCategories() {
  try {
    const directus = getDirectusInstance();
    
    const categories = await directus.request(
      readItems('kjov2_resource_categories', {
        filter: {
          published_status: { _eq: 'live' }
        },
        fields: [
          '*',
          {
            icon_image: ['id', 'filename_disk', 'filename_download']
          }
        ],
        sort: ['display_order', 'name']
      })
    );

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon_type: category.icon_type, // 'iconify' or 'image'
      icon_value: category.icon_value, // iconify icon or null
      icon_image: category.icon_image ?
        buildAssetUrl(category.icon_image) : null,
      display_order: category.display_order,
      resource_count: 0 // Will be populated by separate query if needed
    }));

  } catch (error) {
    console.error('Error fetching resource categories:', error);
    return [];
  }
}

/**
 * Fetches resources by category with optional filtering
 * @param {string|null} categorySlug - Category slug to filter by
 * @param {Object} options - Additional filtering options
 * @returns {Promise<Array>} Array of resources
 */
export async function getResources(categorySlug = null, options = {}) {
  try {
    const directus = getDirectusInstance();
    
    let filter = {
      published_status: { _eq: 'live' }
    };

    // Add category filter if specified
    if (categorySlug) {
      filter._and = [
        filter,
        { 'category_id.slug': { _eq: categorySlug } }
      ];
    }

    // Add search filter if specified
    if (options.search) {
      filter._and = filter._and || [];
      filter._and.push({
        _or: [
          { title: { _icontains: options.search } },
          { description: { _icontains: options.search } },
          { use_cases: { _icontains: options.search } }
        ]
      });
    }

    // Add pricing filter if specified
    if (options.pricing && options.pricing !== 'all') {
      filter._and = filter._and || [];
      filter._and.push({ pricing_type: { _eq: options.pricing } });
    }

    const resources = await directus.request(
      readItems('kjov2_resources', {
        filter: filter,
        fields: [
          '*',
          {
            category_id: ['id', 'name', 'slug', 'icon_type', 'icon_value']
          },
          {
            featured_image: ['id', 'filename_disk', 'filename_download', 'title']
          },
          {
            screenshots: [
              'directus_files_id.*'
            ]
          },
          {
            tags: [
              'resource_tags_id.tag_name'
            ]
          }
        ],
        sort: options.sort || ['-featured', '-personal_rating', 'title']
      })
    );

    return resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      website_url: resource.website_url,
      download_url: resource.download_url,
      pricing_type: resource.pricing_type, // 'free', 'paid', 'subscription', 'freemium'
      price_amount: parseFloat(resource.price_amount) || null,
      price_currency: resource.price_currency || 'USD',
      personal_rating: parseFloat(resource.personal_rating) || 0,
      pros: resource.pros ? resource.pros.split('\n') : [],
      cons: resource.cons ? resource.cons.split('\n') : [],
      use_cases: resource.use_cases,
      tutorial_links: resource.tutorial_links ? JSON.parse(resource.tutorial_links) : [],
      featured: resource.featured,
      date_added: resource.date_added,
      last_updated: resource.last_updated,
      
      // Related data
      category: resource.category_id ? {
        id: resource.category_id.id,
        name: resource.category_id.name,
        slug: resource.category_id.slug,
        icon_type: resource.category_id.icon_type,
        icon_value: resource.category_id.icon_value
      } : null,
      
      featured_image: resource.featured_image ?
        buildAssetUrl(resource.featured_image) : null,

      screenshots: (resource.screenshots || []).map(screenshot => ({
        id: screenshot.directus_files_id.id,
        url: buildAssetUrl(screenshot.directus_files_id),
        title: screenshot.directus_files_id.title || 'Screenshot',
        thumbnail: buildAssetUrl(screenshot.directus_files_id, { width: 400, height: 300, fit: 'cover' })
      })),
      
      tags: (resource.tags || []).map(tag => tag.resource_tags_id.tag_name)
    }));

  } catch (error) {
    console.error('Error fetching resources:', error);
    return [];
  }
}

/**
 * Fetches featured resources across all categories
 * @param {number} limit - Number of featured resources to fetch
 * @returns {Promise<Array>} Array of featured resources
 */
export async function getFeaturedResources(limit = 6) {
  try {
    const directus = getDirectusInstance();
    
    const resources = await directus.request(
      readItems('kjov2_resources', {
        filter: {
          _and: [
            { published_status: { _eq: 'live' } },
            { featured: { _eq: true } }
          ]
        },
        fields: [
          '*',
          {
            category_id: ['name', 'slug', 'icon_type', 'icon_value']
          },
          {
            featured_image: ['id', 'filename_disk', 'filename_download']
          }
        ],
        sort: ['-personal_rating', '-date_added'],
        limit: limit
      })
    );

    return resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      website_url: resource.website_url,
      pricing_type: resource.pricing_type,
      price_amount: parseFloat(resource.price_amount) || null,
      personal_rating: parseFloat(resource.personal_rating) || 0,
      use_cases: resource.use_cases,
      
      category: resource.category_id ? {
        name: resource.category_id.name,
        slug: resource.category_id.slug,
        icon_type: resource.category_id.icon_type,
        icon_value: resource.category_id.icon_value
      } : null,
      
      featured_image: resource.featured_image ?
        buildAssetUrl(resource.featured_image) : null
    }));

  } catch (error) {
    console.error('Error fetching featured resources:', error);
    return [];
  }
}

/**
 * Fetches all code snippets with syntax highlighting
 * @param {string|null} language - Programming language filter
 * @returns {Promise<Array>} Array of code snippets
 */
export async function getCodeSnippets(language = null) {
  try {
    const directus = getDirectusInstance();
    
    let filter = {
      published_status: { _eq: 'live' }
    };

    if (language) {
      filter.programming_language = { _eq: language };
    }

    const snippets = await directus.request(
      readItems('kjov2_code_snippets', {
        filter: filter,
        fields: [
          '*',
          {
            category_id: ['name', 'slug']
          }
        ],
        sort: ['-featured', '-created_at']
      })
    );

    return snippets.map(snippet => ({
      id: snippet.id,
      title: snippet.title,
      description: snippet.description,
      code_content: snippet.code_content,
      programming_language: snippet.programming_language,
      use_case: snippet.use_case,
      difficulty_level: snippet.difficulty_level, // 'beginner', 'intermediate', 'advanced'
      tags: snippet.tags ? snippet.tags.split(',').map(tag => tag.trim()) : [],
      featured: snippet.featured,
      created_at: snippet.created_at,
      
      category: snippet.category_id ? {
        name: snippet.category_id.name,
        slug: snippet.category_id.slug
      } : null
    }));

  } catch (error) {
    console.error('Error fetching code snippets:', error);
    return [];
  }
}

/**
 * Fetches a single resource by ID with full details
 * @param {string|number} resourceId - The resource ID
 * @returns {Promise<Object|null>} Resource object with full details
 */
export async function getResourceById(resourceId) {
  try {
    const directus = getDirectusInstance();
    
    const resource = await directus.request(
      readItem('kjov2_resources', resourceId, {
        fields: [
          '*',
          {
            category_id: ['*']
          },
          {
            featured_image: ['id', 'filename_disk', 'filename_download', 'title']
          },
          {
            screenshots: [
              'directus_files_id.*'
            ]
          },
          {
            tags: [
              'resource_tags_id.*'
            ]
          }
        ]
      })
    );

    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      rich_description: resource.rich_description,
      website_url: resource.website_url,
      download_url: resource.download_url,
      documentation_url: resource.documentation_url,
      pricing_type: resource.pricing_type,
      price_amount: parseFloat(resource.price_amount) || null,
      price_currency: resource.price_currency || 'USD',
      personal_rating: parseFloat(resource.personal_rating) || 0,
      pros: resource.pros ? resource.pros.split('\n').filter(pro => pro.trim()) : [],
      cons: resource.cons ? resource.cons.split('\n').filter(con => con.trim()) : [],
      use_cases: resource.use_cases,
      installation_notes: resource.installation_notes,
      tutorial_links: resource.tutorial_links ? JSON.parse(resource.tutorial_links) : [],
      alternative_tools: resource.alternative_tools ? resource.alternative_tools.split(',').map(tool => tool.trim()) : [],
      system_requirements: resource.system_requirements,
      featured: resource.featured,
      date_added: resource.date_added,
      last_updated: resource.last_updated,
      
      // Related data
      category: resource.category_id,
      
      featured_image: resource.featured_image ?
        buildAssetUrl(resource.featured_image) : null,

      screenshots: (resource.screenshots || []).map(screenshot => ({
        id: screenshot.directus_files_id.id,
        url: buildAssetUrl(screenshot.directus_files_id),
        title: screenshot.directus_files_id.title || 'Screenshot',
        thumbnail: buildAssetUrl(screenshot.directus_files_id, { width: 600, height: 400, fit: 'cover' })
      })),
      
      tags: (resource.tags || []).map(tag => ({
        id: tag.resource_tags_id.id,
        name: tag.resource_tags_id.tag_name,
        color: tag.resource_tags_id.color
      }))
    };

  } catch (error) {
    console.error('Error fetching resource by ID:', error);
    return null;
  }
}

/**
 * Search resources by title, description, or use cases
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching resources
 */
export async function searchResources(searchTerm) {
  try {
    const directus = getDirectusInstance();
    
    const resources = await directus.request(
      readItems('kjov2_resources', {
        filter: {
          _and: [
            { published_status: { _eq: 'live' } },
            {
              _or: [
                { title: { _icontains: searchTerm } },
                { description: { _icontains: searchTerm } },
                { use_cases: { _icontains: searchTerm } }
              ]
            }
          ]
        },
        fields: [
          'id', 'title', 'description', 'pricing_type', 'personal_rating', 'featured',
          {
            category_id: ['name', 'slug']
          },
          {
            featured_image: ['id', 'filename_disk']
          }
        ],
        sort: ['-personal_rating', 'title']
      })
    );

    return resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      pricing_type: resource.pricing_type,
      personal_rating: parseFloat(resource.personal_rating) || 0,
      featured: resource.featured,
      
      category: resource.category_id ? {
        name: resource.category_id.name,
        slug: resource.category_id.slug
      } : null,
      
      featured_image: resource.featured_image ?
        buildAssetUrl(resource.featured_image) : null
    }));

  } catch (error) {
    console.error('Error searching resources:', error);
    return [];
  }
}