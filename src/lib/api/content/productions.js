/**
 * Productions Content API
 *
 * This module handles all productions-related content fetching from Directus.
 * It provides functions to retrieve productions and pages.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';
import { extractYouTubeId } from '../../utils/youtube.js';

/**
 * Credit fields to fetch from Directus (shared between queries)
 */
const CREDIT_FIELDS = [
  'role',
  'additional_info',
  'display_order',
  {
    person_id: ['name', 'bio', 'website_url', 'profile_image.id', 'profile_image.filename_disk']
  }
];

/**
 * Transform a raw credit record from Directus into a normalized object.
 * Handles flexible role formats (string, JSON string, JSON object, array).
 * Same parsing logic as music.js credit transforms.
 * @param {Object} credit - Raw credit record from Directus
 * @returns {Object} Normalized credit object
 */
function transformCredit(credit) {
  let roles = [];
  if (credit.role) {
    if (typeof credit.role === 'string') {
      try {
        const parsed = JSON.parse(credit.role);
        if (Array.isArray(parsed)) {
          roles = parsed;
        } else if (parsed.roles && Array.isArray(parsed.roles)) {
          roles = parsed.roles;
        } else if (typeof parsed === 'object') {
          roles = [parsed];
        }
      } catch {
        roles = [{ title: credit.role, category: credit.role }];
      }
    } else if (Array.isArray(credit.role)) {
      roles = credit.role;
    } else if (typeof credit.role === 'object') {
      roles = [credit.role];
    }
  }

  const normalizedRoles = roles.map(role => {
    if (typeof role === 'string') {
      return { title: role, category: role };
    }
    const title = role.title || role.name || role.role || 'Unknown Role';
    const category = role.category || role.group || title;
    return { title, category };
  });

  return {
    roles: normalizedRoles,
    role: normalizedRoles[0]?.title || 'Unknown Role',
    name: credit.person_id?.name || 'Unknown',
    additional_info: credit.additional_info,
    bio: credit.person_id?.bio,
    website_url: credit.person_id?.website_url,
    display_order: credit.display_order,
    profile_image: credit.person_id?.profile_image
      ? buildAssetUrl(
          typeof credit.person_id.profile_image === 'object'
            ? credit.person_id.profile_image.filename_disk
            : credit.person_id.profile_image
        )
      : null
  };
}

/**
 * Embed fields to fetch from Directus (shared between queries)
 */
const EMBED_FIELDS = [
  'id',
  'embed_url',
  'embed_type',
  'title',
  'description',
  { thumbnail_url: ['id', 'filename_disk'] },
  'display_order',
  'featured'
];

/**
 * Transform a raw embed record from Directus into a normalized object.
 * Handles YouTube and Vimeo URL parsing.
 * @param {Object} embed - Raw embed record from Directus
 * @returns {Object} Normalized embed object
 */
function transformEmbed(embed) {
  let embedId = null;
  let embedUrl = null;

  if (embed.embed_type === 'youtube' || !embed.embed_type) {
    embedId = extractYouTubeId(embed.embed_url);
    if (embedId) {
      embedUrl = `https://www.youtube.com/embed/${embedId}`;
    }
  } else if (embed.embed_type === 'vimeo') {
    const match = embed.embed_url?.match(/vimeo\.com\/(\d+)/);
    embedId = match?.[1] || null;
    if (embedId) {
      embedUrl = `https://player.vimeo.com/video/${embedId}`;
    }
  }

  // Fallback: use raw URL if we couldn't parse it
  if (!embedUrl) {
    embedUrl = embed.embed_url;
  }

  return {
    id: embed.id,
    url: embed.embed_url,
    embedUrl,
    embedId,
    type: embed.embed_type || 'youtube',
    title: embed.title || null,
    description: embed.description || null,
    thumbnailUrl: embed.thumbnail_url
      ? buildAssetUrl(
          typeof embed.thumbnail_url === 'object'
            ? embed.thumbnail_url.filename_disk
            : embed.thumbnail_url
        )
      : null,
    displayOrder: embed.display_order || 0,
    featured: embed.featured || false
  };
}

/**
 * Sort and transform embeds array (featured first, then by display_order)
 * @param {Array} embeds - Raw embeds from Directus
 * @returns {Array} Sorted and transformed embeds
 */
function processEmbeds(embeds) {
  return (embeds || [])
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    })
    .map(transformEmbed);
}

/**
 * Map production_status to display format
 */
const STATUS_MAP = {
  'in_development': 'In Development',
  'in_production': 'In Production',
  'ongoing': 'Ongoing',
  'released': 'Released',
  'complete': 'Complete'
};

/**
 * Parse tags from Directus (may be JSON array, string, or already an array)
 * @param {*} raw - Raw tags value from Directus
 * @returns {Array} Parsed tags array
 */
function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return [raw]; }
  }
  return [];
}

/**
 * Build quick-access links object and normalized externalLinks array
 * @param {Array} rawLinks - Raw external_links from Directus
 * @returns {{ links: Object, externalLinks: Array }}
 */
function buildExternalLinks(rawLinks) {
  const sorted = (rawLinks || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const links = {};
  for (const link of sorted) {
    if (link.link_type && link.url) links[link.link_type] = link.url;
  }
  const externalLinks = sorted.map(link => ({
    id: link.id,
    url: link.url,
    label: link.label,
    linkType: link.link_type,
    iconValue: link.icon_value,
    isPrimary: link.is_primary
  }));
  return { links, externalLinks };
}

/**
 * Transform a raw Directus production record into the canonical API shape.
 * Used by getProductions, getProductionById, and getProductionBySlug.
 * @param {Object} production - Raw production record with relations attached
 * @param {Object} metaBySlug - Category metadata lookup { slug: { name, icon, color } }
 * @returns {Object} Transformed production object
 */
function transformProduction(production, metaBySlug) {
  let coverImageUrl = null;
  if (production.cover_image) {
    coverImageUrl = buildAssetUrl(
      production.cover_image.filename_disk || production.cover_image.id
    );
  }

  const tags = parseTags(production.tags);
  const { links, externalLinks } = buildExternalLinks(production.external_links);

  // Parse categories - may be JSON array, single string, or already an array
  let rawCategories = [];
  if (production.category) {
    if (Array.isArray(production.category)) {
      rawCategories = production.category;
    } else if (typeof production.category === 'string') {
      try {
        const parsed = JSON.parse(production.category);
        rawCategories = Array.isArray(parsed) ? parsed : [production.category];
      } catch {
        rawCategories = [production.category];
      }
    }
  }

  const categories = rawCategories.map(slug => ({
    slug,
    name: metaBySlug[slug]?.name || slug,
    icon: metaBySlug[slug]?.icon || 'mdi:folder',
    color: metaBySlug[slug]?.color || '#6366f1'
  }));

  const categorySlugs = categories.length > 0
    ? categories.map(c => c.slug).join(' ')
    : 'uncategorized';

  return {
    id: production.id,
    slug: production.slug,
    title: production.title,
    description: production.description,
    category: rawCategories,
    categories,
    categorySlugs,
    type: categories[0]?.name || null,
    categoryIcon: categories[0]?.icon || 'mdi:folder',
    categoryColor: categories[0]?.color || '#6366f1',
    status: STATUS_MAP[production.production_status] || production.production_status,
    productionStatus: production.production_status,
    year: production.year,
    yearEnd: production.year_end || null,
    featured: production.featured || false,
    image: coverImageUrl,
    fallbackImage: production.fallback_image_url,
    tags,
    episodes: production.episodes_count,
    issues: production.issues_count,
    duration: production.duration,
    viewerType: production.viewer_type || null,
    embeds: processEmbeds(production.embeds),
    tagline: production.tagline || null,
    roles: production.roles || null,
    toolsMedium: production.tools_medium || null,
    behindTheScenes: production.behind_the_scenes || null,
    outcome: production.outcome || null,
    credits: (production.credits || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(transformCredit),
    links,
    externalLinks
  };
}

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
            { credits: CREDIT_FIELDS },
            { embeds: EMBED_FIELDS }
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

      // Fetch external links, embeds, and credits for all productions
      const [allLinks, allEmbeds, allCredits] = await Promise.all([
        directus.request(
          readItems('kjov2_productions_external_links', {
            filter: { production_id: { _in: productionIds } },
            fields: ['id', 'production_id', 'sort', 'url', 'label', 'link_type', 'icon_value', 'is_primary'],
            sort: ['sort']
          })
        ).catch(() => []),
        directus.request(
          readItems('kjov2_productions_embeds', {
            filter: { production_id: { _in: productionIds } },
            fields: ['id', 'production_id', 'embed_url', 'embed_type', 'title', 'description', 'thumbnail_url', 'display_order', 'featured'],
            sort: ['display_order']
          })
        ).catch(() => []),
        directus.request(
          readItems('kjov2_productions_credits', {
            filter: { production_id: { _in: productionIds } },
            fields: ['production_id', ...CREDIT_FIELDS],
            sort: ['display_order']
          })
        ).catch(() => [])
      ]);

      // Attach relations to productions
      for (const prod of productions) {
        prod.external_links = allLinks.filter(l => l.production_id === prod.id);
        prod.embeds = allEmbeds.filter(e => e.production_id === prod.id);
        prod.credits = allCredits.filter(c => c.production_id === prod.id);
      }
    }

    // Look up category display names from Directus field metadata
    const choices = await getCategoryChoices();
    const metaBySlug = Object.fromEntries(choices.map(c => [c.slug, c]));

    return productions.map(production => transformProduction(production, metaBySlug));

  } catch (error) {
    console.error('Error fetching productions:', error);
    return [];
  }
}

/**
 * Fetches category metadata from the kjov2_category_config collection.
 * Returns slug, display name, icon, and color for each production category.
 * Results are cached since category config rarely changes at runtime.
 * @returns {Promise<Array>} Array of { slug, name, icon, color } objects
 */
let _categoryChoicesCache = null;

export async function getCategoryChoices() {
  if (_categoryChoicesCache) return _categoryChoicesCache;
  try {
    const directus = getDirectusInstance();
    const configs = await directus.request(
      readItems('kjov2_category_config', {
        fields: ['slug', 'display_name', 'icon', 'color'],
        sort: ['sort']
      })
    );
    const choices = (configs || []).map(c => ({
      slug: c.slug,
      name: c.display_name,
      icon: c.icon || null,
      color: c.color || null
    }));
    _categoryChoicesCache = choices;
    return choices;
  } catch (error) {
    console.error('Error fetching category choices:', error);
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
          { credits: CREDIT_FIELDS },
          { embeds: EMBED_FIELDS },
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

    // Look up category display names from Directus field metadata
    const choices = await getCategoryChoices();
    const metaBySlug = Object.fromEntries(choices.map(c => [c.slug, c]));

    const result = transformProduction(production, metaBySlug);

    // Pages are only included in getProductionById (lazy-loaded elsewhere)
    result.pages = (production.pages || [])
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

    return result;

  } catch (error) {
    console.error('Error fetching production by ID:', error);
    return null;
  }
}

/**
 * Fetches a single production by slug
 * Used by share pages for SEO-friendly URLs
 * Includes fallback mechanism for when nested relation queries fail
 * @param {string} slug - The production slug
 * @returns {Promise<Object|null>} Production object or null if not found
 */
export async function getProductionBySlug(slug) {
  try {
    const directus = getDirectusInstance();

    let productions;
    let needsSeparateRelations = false;

    try {
      productions = await directus.request(
        readItems('kjov2_productions', {
          filter: {
            slug: { _eq: slug },
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
            { credits: CREDIT_FIELDS },
            { embeds: EMBED_FIELDS }
          ],
          limit: 1
        })
      );
    } catch (queryError) {
      // Fallback to simple query without relations
      needsSeparateRelations = true;
      productions = await directus.request(
        readItems('kjov2_productions', {
          filter: {
            slug: { _eq: slug },
            status: { _eq: 'live' }
          },
          fields: ['*'],
          limit: 1
        })
      );
    }

    if (!productions || productions.length === 0) {
      return null;
    }

    const production = productions[0];

    // If we need separate relation queries, fetch them
    if (needsSeparateRelations) {
      const [allLinks, allEmbeds, allCredits] = await Promise.all([
        directus.request(
          readItems('kjov2_productions_external_links', {
            filter: { production_id: { _eq: production.id } },
            fields: ['id', 'production_id', 'sort', 'url', 'label', 'link_type', 'icon_value', 'is_primary'],
            sort: ['sort']
          })
        ).catch(() => []),
        directus.request(
          readItems('kjov2_productions_embeds', {
            filter: { production_id: { _eq: production.id } },
            fields: ['id', 'production_id', 'embed_url', 'embed_type', 'title', 'description', 'thumbnail_url', 'display_order', 'featured'],
            sort: ['display_order']
          })
        ).catch(() => []),
        directus.request(
          readItems('kjov2_productions_credits', {
            filter: { production_id: { _eq: production.id } },
            fields: ['production_id', ...CREDIT_FIELDS],
            sort: ['display_order']
          })
        ).catch(() => [])
      ]);

      production.external_links = allLinks;
      production.embeds = allEmbeds;
      production.credits = allCredits;
    }

    // Look up category display names from Directus field metadata
    const choices = await getCategoryChoices();
    const metaBySlug = Object.fromEntries(choices.map(c => [c.slug, c]));

    return transformProduction(production, metaBySlug);

  } catch (error) {
    console.error('Error fetching production by slug:', error);
    return null;
  }
}
