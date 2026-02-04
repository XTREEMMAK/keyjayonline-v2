/**
 * Productions Content API
 *
 * This module handles all productions-related content fetching from Directus.
 * It provides functions to retrieve productions, categories, and pages.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches all published productions from Directus
 * Includes related data like external links, categories
 * Only returns productions with status = 'live'
 * @returns {Promise<Array>} Array of transformed production objects
 */
export async function getProductions() {
  try {
    const directus = getDirectusInstance();

    // Try nested query first, fallback to separate queries if relations fail
    let productions;
    let needsSeparateRelations = false;

    try {
      productions = await directus.request(
        readItems('kjov2_productions', {
          filter: {
            status: { _eq: 'live' }
          },
          fields: [
            '*',
            { cover_image: ['id', 'filename_disk', 'filename_download'] },
            {
              external_links: [
                'id',
                'sort',
                'url',
                'label',
                'link_type',
                'icon_value',
                'is_primary'
              ]
            },
            {
              categories: [
                { kjov2_productions_categories_id: ['id', 'name', 'slug', 'icon', 'color'] }
              ]
            }
          ],
          sort: ['sort', '-date_created']
        })
      );
    } catch (queryError) {
      // Fallback to simple query without relations
      needsSeparateRelations = true;
      productions = await directus.request(
        readItems('kjov2_productions', {
          filter: { status: { _eq: 'live' } },
          fields: ['*'],
          sort: ['sort', '-date_created']
        })
      );
    }

    // If we need separate relation queries, fetch them
    if (needsSeparateRelations && productions.length > 0) {
      const productionIds = productions.map(p => p.id);

      // Fetch external links for all productions
      const [allLinks, allCategoryAssignments, allCategories] = await Promise.all([
        directus.request(
          readItems('kjov2_productions_external_links', {
            filter: { production_id: { _in: productionIds } },
            fields: ['id', 'production_id', 'sort', 'url', 'label', 'link_type', 'icon_value', 'is_primary'],
            sort: ['sort']
          })
        ).catch(() => []),
        directus.request(
          readItems('kjov2_productions_productions_categories', {
            filter: { kjov2_productions_id: { _in: productionIds } },
            fields: ['kjov2_productions_id', 'kjov2_productions_categories_id']
          })
        ).catch(() => []),
        directus.request(
          readItems('kjov2_productions_categories', {
            fields: ['id', 'name', 'slug', 'icon', 'color']
          })
        ).catch(() => [])
      ]);

      // Build category lookup
      const categoryById = {};
      for (const cat of allCategories) {
        categoryById[cat.id] = cat;
      }

      // Attach relations to productions
      for (const prod of productions) {
        prod.external_links = allLinks.filter(l => l.production_id === prod.id);
        const categoryIds = allCategoryAssignments
          .filter(a => a.kjov2_productions_id === prod.id)
          .map(a => a.kjov2_productions_categories_id);
        prod.categories = categoryIds.map(id => ({
          kjov2_productions_categories_id: categoryById[id]
        })).filter(c => c.kjov2_productions_categories_id);
      }
    }

    return productions.map(production => {
      // Get categories from M2M junction
      const categories = (production.categories || [])
        .map(c => c.kjov2_productions_categories_id)
        .filter(Boolean);

      // Build category slugs for MixItUp (space-separated for multiple class names)
      const categorySlugs = categories.length > 0
        ? categories.map(c => c.slug).join(' ')
        : 'uncategorized';

      // Build cover image URL
      let coverImageUrl = null;
      if (production.cover_image) {
        coverImageUrl = buildAssetUrl(
          production.cover_image.filename_disk || production.cover_image.id
        );
      }

      // Parse tags (JSON array or string)
      let tags = [];
      if (production.tags) {
        if (Array.isArray(production.tags)) {
          tags = production.tags;
        } else if (typeof production.tags === 'string') {
          try {
            tags = JSON.parse(production.tags);
          } catch {
            tags = [production.tags];
          }
        }
      }

      // Build links object for quick access (watch, listen, read, play)
      const links = {};
      const externalLinks = (production.external_links || [])
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));

      for (const link of externalLinks) {
        if (link.link_type && link.url) {
          links[link.link_type] = link.url;
        }
      }

      // Map production_status to display format
      const statusMap = {
        'in_development': 'In Development',
        'in_production': 'In Production',
        'ongoing': 'Ongoing',
        'released': 'Released',
        'complete': 'Complete'
      };

      return {
        id: production.id,
        slug: production.slug,
        title: production.title,
        description: production.description,
        category: production.category,
        type: production.production_type,
        status: statusMap[production.production_status] || production.production_status,
        productionStatus: production.production_status,
        year: production.year,
        featured: production.featured || false,

        // Media
        image: coverImageUrl,
        fallbackImage: production.fallback_image_url,

        // Tags
        tags,

        // Category info for filtering
        categorySlugs,
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          color: c.color
        })),

        // Content-type specific metadata
        episodes: production.episodes_count,
        issues: production.issues_count,
        platform: production.platform,
        duration: production.duration,
        count: production.item_count,

        // Content viewing
        contentType: production.content_type || 'none',
        contentEmbedUrl: production.content_embed_url,

        // External links
        links,
        externalLinks: externalLinks.map(link => ({
          id: link.id,
          url: link.url,
          label: link.label,
          linkType: link.link_type,
          iconValue: link.icon_value,
          isPrimary: link.is_primary
        }))
      };
    });

  } catch (error) {
    console.error('Error fetching productions:', error);
    return [];
  }
}

/**
 * Fetches all production categories from Directus
 * @returns {Promise<Array>} Array of category objects
 */
export async function getProductionsCategories() {
  try {
    const directus = getDirectusInstance();

    const categories = await directus.request(
      readItems('kjov2_productions_categories', {
        fields: ['id', 'name', 'slug', 'description', 'icon', 'color', 'sort'],
        sort: ['sort', 'name']
      })
    );

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      color: cat.color
    }));

  } catch (error) {
    console.error('Error fetching production categories:', error);
    return [];
  }
}

/**
 * Fetches pages for a specific production (lazy loaded)
 * Used for comic pages and image galleries
 * @param {string} productionId - The production ID to fetch pages for
 * @returns {Promise<Array>} Array of page objects with image URLs
 */
export async function getProductionPages(productionId) {
  try {
    const directus = getDirectusInstance();

    const pages = await directus.request(
      readItems('kjov2_productions_pages', {
        filter: {
          production_id: { _eq: productionId }
        },
        fields: [
          'id',
          'sort',
          'title',
          'caption',
          { page_image: ['id', 'filename_disk', 'filename_download', 'width', 'height'] }
        ],
        sort: ['sort']
      })
    );

    return pages.map(page => ({
      id: page.id,
      sort: page.sort,
      title: page.title,
      caption: page.caption,
      imageUrl: page.page_image
        ? buildAssetUrl(page.page_image.filename_disk || page.page_image.id)
        : null,
      width: page.page_image?.width,
      height: page.page_image?.height
    }));

  } catch (error) {
    console.error('Error fetching production pages:', error);
    return [];
  }
}

/**
 * Fetches a single production by ID
 * @param {string} productionId - The production ID
 * @returns {Promise<Object|null>} Production object or null if not found
 */
export async function getProductionById(productionId) {
  try {
    const directus = getDirectusInstance();

    const production = await directus.request(
      readItem('kjov2_productions', productionId, {
        fields: [
          '*',
          { cover_image: ['id', 'filename_disk', 'filename_download'] },
          {
            external_links: [
              'id',
              'sort',
              'url',
              'label',
              'link_type',
              'icon_value',
              'is_primary'
            ]
          },
          {
            categories: [
              { kjov2_productions_categories_id: ['id', 'name', 'slug', 'icon', 'color'] }
            ]
          },
          {
            pages: [
              'id',
              'sort',
              'title',
              'caption',
              { page_image: ['id', 'filename_disk', 'width', 'height'] }
            ]
          }
        ]
      })
    );

    if (!production) return null;

    // Transform using same logic as getProductions
    const categories = (production.categories || [])
      .map(c => c.kjov2_productions_categories_id)
      .filter(Boolean);

    const categorySlugs = categories.length > 0
      ? categories.map(c => c.slug).join(' ')
      : 'uncategorized';

    let coverImageUrl = null;
    if (production.cover_image) {
      coverImageUrl = buildAssetUrl(
        production.cover_image.filename_disk || production.cover_image.id
      );
    }

    let tags = [];
    if (production.tags) {
      if (Array.isArray(production.tags)) {
        tags = production.tags;
      } else if (typeof production.tags === 'string') {
        try {
          tags = JSON.parse(production.tags);
        } catch {
          tags = [production.tags];
        }
      }
    }

    const links = {};
    const externalLinks = (production.external_links || [])
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));

    for (const link of externalLinks) {
      if (link.link_type && link.url) {
        links[link.link_type] = link.url;
      }
    }

    const statusMap = {
      'in_development': 'In Development',
      'in_production': 'In Production',
      'ongoing': 'Ongoing',
      'released': 'Released',
      'complete': 'Complete'
    };

    const pages = (production.pages || [])
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(page => ({
        id: page.id,
        sort: page.sort,
        title: page.title,
        caption: page.caption,
        imageUrl: page.page_image
          ? buildAssetUrl(page.page_image.filename_disk || page.page_image.id)
          : null,
        width: page.page_image?.width,
        height: page.page_image?.height
      }));

    return {
      id: production.id,
      slug: production.slug,
      title: production.title,
      description: production.description,
      category: production.category,
      type: production.production_type,
      status: statusMap[production.production_status] || production.production_status,
      productionStatus: production.production_status,
      year: production.year,
      featured: production.featured || false,
      image: coverImageUrl,
      fallbackImage: production.fallback_image_url,
      tags,
      categorySlugs,
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color
      })),
      episodes: production.episodes_count,
      issues: production.issues_count,
      platform: production.platform,
      duration: production.duration,
      count: production.item_count,
      contentType: production.content_type || 'none',
      contentEmbedUrl: production.content_embed_url,
      links,
      externalLinks: externalLinks.map(link => ({
        id: link.id,
        url: link.url,
        label: link.label,
        linkType: link.link_type,
        iconValue: link.icon_value,
        isPrimary: link.is_primary
      })),
      pages
    };

  } catch (error) {
    console.error('Error fetching production by ID:', error);
    return null;
  }
}
