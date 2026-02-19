/**
 * Productions Content API
 *
 * This module handles all productions-related content fetching from Directus.
 * It provides functions to retrieve productions and pages.
 */

import { getDirectusInstance, readItems, readItem } from '../core/client.js';
import { buildAssetUrl, buildDirectusAssetUrl } from '../core/assets.js';
import { transformCredit } from '../core/creditTransform.js';
import { extractYouTubeId } from '../../utils/youtube.js';
import { getExternalLinkIcon } from '../../utils/externalLinks.js';

/**
 * Credit fields to fetch from Directus (shared between queries)
 */
const CREDIT_FIELDS = [
  'role',
  'additional_info',
  'display_order',
  {
    person_id: ['name', 'bio', 'website_url', 'social_links', 'profile_image.id', 'profile_image.filename_disk']
  }
];

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
export function transformEmbed(embed) {
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
      ? buildAssetUrl(embed.thumbnail_url)
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
  'on_hold': 'On Hold',
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
 * Action fields to fetch from Directus (shared between queries).
 * Collection: kjov2_productions_actions (renamed from kjov2_productions_external_links)
 */
const ACTION_FIELDS = [
  'id',
  'action_type',
  'url',
  'link_text',
  'link_type',
  { icon: ['id', 'icon_reference_id'] },
  'gallery_id',
  'audio_playlist_id'
];

/**
 * Build unified production actions from DB action records.
 *
 * @param {Object} production - Raw Directus production record
 * @param {Array} rawActions - Raw actions from kjov2_productions_actions
 * @returns {{ actions: Array, links: Object, externalLinks: Array }}
 */
function buildProductionActions(production, rawActions) {
  const actions = [];
  const links = {};

  const records = rawActions || [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    const actionType = raw.action_type || 'external_link';
    const label = raw.link_text || '';
    // icon is M2O → kjov2_icon_references; extract icon_reference_id string
    const icon = (raw.icon && typeof raw.icon === 'object') ? raw.icon.icon_reference_id : null;

    if (actionType === 'audio_player') {
      actions.push({
        id: raw.id,
        actionType: 'audio_player',
        label: label || 'Listen',
        icon: icon || 'mdi:headphones',
        isPrimary: true,
        sortOrder: i,
        playlistId: raw.audio_playlist_id,
        linkType: raw.link_type,
        openInNewTab: false
      });
    } else if (actionType === 'viewer') {
      actions.push({
        id: raw.id,
        actionType: 'viewer',
        label: label || 'View Gallery',
        icon: icon || (raw.link_type === 'comic_pages' ? 'mdi:book-open-variant' : 'mdi:image-multiple'),
        isPrimary: true,
        sortOrder: i,
        viewerType: raw.link_type || 'gallery',
        galleryId: raw.gallery_id,
        openInNewTab: false
      });
    } else {
      // external_link (default) — auto-detect icon from URL if none set
      const normalizedLink = { linkType: raw.link_type, url: raw.url };
      actions.push({
        id: raw.id,
        actionType: 'external_link',
        url: raw.url,
        label: label || 'Link',
        icon: icon || getExternalLinkIcon(normalizedLink),
        isPrimary: false,
        sortOrder: i,
        linkType: raw.link_type,
        openInNewTab: true
      });

      if (raw.link_type && raw.url) {
        links[raw.link_type] = raw.url;
      }
    }
  }

  // Backward-compatible externalLinks array (only external_link type)
  const externalLinks = actions
    .filter(a => a.actionType === 'external_link')
    .map(a => ({
      id: a.id,
      url: a.url,
      label: a.label,
      linkType: a.linkType,
      isPrimary: a.isPrimary
    }));

  return { actions, links, externalLinks };
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
    coverImageUrl = buildAssetUrl(production.cover_image);
  }

  const tags = parseTags(production.tags);
  // Support both new field name (actions) and legacy (external_links)
  const rawActions = production.actions || production.external_links || [];
  const { actions, links, externalLinks } = buildProductionActions(production, rawActions);

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
    embeds: processEmbeds(production.production_embeds || production.embeds),
    tagline: production.tagline || null,
    roles: production.roles || null,
    toolsMedium: production.tools_medium || null,
    behindTheScenes: production.behind_the_scenes || null,
    outcome: production.outcome || null,
    credits: (production.credits || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(transformCredit),
    actions,
    links,
    externalLinks,
    comicsViewerText: production.comics_viewer_text || null
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
            { actions: ACTION_FIELDS },
            { credits: CREDIT_FIELDS },
            { production_embeds: EMBED_FIELDS }
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
      const [allActions, allEmbeds, allCredits] = await Promise.all([
        directus.request(
          readItems('kjov2_productions_actions', {
            filter: { production_id: { _in: productionIds } },
            fields: ['production_id', ...ACTION_FIELDS],
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
        prod.actions = allActions.filter(a => a.production_id === prod.id);
        prod.production_embeds = allEmbeds.filter(e => e.production_id === prod.id);
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
 * Fetches albums (pages/images) for a specific gallery.
 * Replaces the former getProductionPages() — galleries are now decoupled from productions.
 * @param {string|number} galleryId - The gallery ID to fetch albums for
 * @returns {Promise<Array>} Array of album objects with image URLs
 */
export async function getGalleryAlbums(galleryId) {
  try {
    const directus = getDirectusInstance();

    const albums = await directus.request(
      readItems('kjov2_gallery_albums', {
        filter: {
          gallery_id: { _eq: galleryId }
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

    return albums.map(album => ({
      id: album.id,
      sort: album.sort,
      title: album.title,
      caption: album.caption,
      imageUrl: album.page_image
        ? buildDirectusAssetUrl(album.page_image, { key: '1440w' })
        : null,
      downloadUrl: album.page_image
        ? buildDirectusAssetUrl(album.page_image)
        : null,
      width: album.page_image?.width,
      height: album.page_image?.height
    }));

  } catch (error) {
    console.error('Error fetching gallery albums:', error);
    return [];
  }
}

/**
 * Fetches tracks for a specific audio playlist.
 * Playlists are decoupled from productions (like galleries).
 * Returns tracks in the shape expected by the music player store's loadPlaylist().
 * @param {string|number} playlistId - The audio playlist ID
 * @returns {Promise<{playlist: Object|null, tracks: Array}>}
 */
export async function getAudioPlaylistTracks(playlistId) {
  try {
    const directus = getDirectusInstance();

    const playlist = await directus.request(
      readItem('kjov2_audio_playlist', playlistId, {
        fields: [
          'id',
          'title',
          'description',
          'playlist_type',
          { cover_art: ['id', 'filename_disk'] }
        ]
      })
    );

    const tracks = await directus.request(
      readItems('kjov2_audio_playlist_tracks', {
        filter: {
          playlist_id: { _eq: playlistId }
        },
        fields: [
          'id',
          'sort',
          'title',
          'artist',
          'duration',
          'description',
          { audio_file: ['id', 'filename_disk'] },
          { cover_art: ['id', 'filename_disk'] }
        ],
        sort: ['sort']
      })
    );

    const playlistCoverArt = playlist?.cover_art
      ? buildAssetUrl(playlist.cover_art)
      : null;

    const transformedTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist || 'Key Jay',
      audioUrl: track.audio_file
        ? buildAssetUrl(track.audio_file)
        : null,
      thumbnail: track.cover_art
        ? buildAssetUrl(track.cover_art)
        : playlistCoverArt,
      genre: playlist?.playlist_type || 'general',
      duration: track.duration || null,
      album: playlist?.title || null
    }));

    return {
      playlist: playlist ? {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        playlistType: playlist.playlist_type,
        coverArt: playlistCoverArt
      } : null,
      tracks: transformedTracks
    };

  } catch (error) {
    console.error('Error fetching audio playlist tracks:', error);
    return { playlist: null, tracks: [] };
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
          { actions: ACTION_FIELDS },
          { credits: CREDIT_FIELDS },
          { production_embeds: EMBED_FIELDS }
        ]
      })
    );

    if (!production) return null;

    // Look up category display names from Directus field metadata
    const choices = await getCategoryChoices();
    const metaBySlug = Object.fromEntries(choices.map(c => [c.slug, c]));

    return transformProduction(production, metaBySlug);

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
            { actions: ACTION_FIELDS },
            { credits: CREDIT_FIELDS },
            { production_embeds: EMBED_FIELDS }
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
      const [allActions, allEmbeds, allCredits] = await Promise.all([
        directus.request(
          readItems('kjov2_productions_actions', {
            filter: { production_id: { _eq: production.id } },
            fields: ['production_id', ...ACTION_FIELDS],
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

      production.actions = allActions;
      production.production_embeds = allEmbeds;
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
