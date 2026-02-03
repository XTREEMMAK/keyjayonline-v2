/**
 * Voice Content API
 *
 * This module handles all voice-related content fetching from Directus.
 * It provides functions to retrieve voice projects, clips, categories,
 * and associated metadata like external links.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches all published voice projects from Directus
 * Includes related data like clips (with audio files), categories, and external links
 * Only returns projects with status = 'live'
 * @returns {Promise<Array>} Array of transformed voice project objects
 */
export async function getVoiceProjects() {
  try {
    const directus = getDirectusInstance();

    const projects = await directus.request(
      readItems('kjov2_voice_projects', {
        filter: {
          status: { _eq: 'live' }
        },
        fields: [
          '*',
          {
            clips: [
              'id',
              'sort',
              'title',
              { audio_file: ['id', 'filename_disk', 'filename_download'] }
            ]
          },
          {
            categories: [
              { kjov2_voice_categories_id: ['id', 'name', 'slug', 'description', 'icon'] }
            ]
          },
          {
            external_links: [
              'id',
              'sort',
              'url',
              'label',
              'icon_value',
              'is_primary'
            ]
          }
        ],
        sort: ['sort', '-date_created']
      })
    );

    return projects.map(project => {
      // Get first category for filtering (projects can have multiple categories)
      const categories = (project.categories || [])
        .map(c => c.kjov2_voice_categories_id)
        .filter(Boolean);
      const primaryCategory = categories[0] || null;

      // Get first clip's audio for the player
      const clips = (project.clips || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const primaryClip = clips[0] || null;

      // Build audio URL from the clip's audio_file
      let audioUrl = null;
      if (primaryClip?.audio_file) {
        audioUrl = buildAssetUrl(
          primaryClip.audio_file.filename_disk || primaryClip.audio_file.id
        );
      }

      // Parse feeling - could be JSON array or string
      let feelings = [];
      if (project.feeling) {
        if (Array.isArray(project.feeling)) {
          feelings = project.feeling;
        } else if (typeof project.feeling === 'string') {
          try {
            feelings = JSON.parse(project.feeling);
          } catch {
            feelings = [project.feeling];
          }
        }
      }

      // Build category slugs string for MixItUp (space-separated for multiple class names)
      const categorySlugs = categories.length > 0
        ? categories.map(c => c.slug).join(' ')
        : 'uncategorized';

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        clientName: project.client_name || null,
        projectDate: project.project_date,
        feeling: feelings,

        // Category info for filtering - all categories for display and sorting
        categorySlugs, // Space-separated slugs for MixItUp classes
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug
        })),

        // Audio
        audioUrl,
        clipTitle: primaryClip?.title || project.title,
        clips: clips.map(clip => ({
          id: clip.id,
          title: clip.title,
          audioUrl: clip.audio_file
            ? buildAssetUrl(clip.audio_file.filename_disk || clip.audio_file.id)
            : null
        })),

        // External links
        externalLinks: (project.external_links || [])
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
          .map(link => ({
            id: link.id,
            url: link.url,
            label: link.label,
            iconValue: link.icon_value,
            isPrimary: link.is_primary
          }))
      };
    });

  } catch (error) {
    console.error('Error fetching voice projects:', error);
    return [];
  }
}

/**
 * Fetches all published voice categories from Directus
 * @returns {Promise<Array>} Array of voice category objects
 */
export async function getVoiceCategories() {
  try {
    const directus = getDirectusInstance();

    // Fetch all categories (no status column on this table)
    const categories = await directus.request(
      readItems('kjov2_voice_categories', {
        fields: ['id', 'name', 'slug', 'description', 'icon', 'sort'],
        sort: ['sort', 'name']
      })
    );

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon
    }));

  } catch (error) {
    console.error('Error fetching voice categories:', error);
    return [];
  }
}
