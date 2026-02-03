/**
 * Professional Journey Content API
 *
 * Fetches professional journey milestones from Directus
 * Supports categories: music, tech, creative, productions
 */

import { getDirectusInstance, readItems } from '../core/client.js';

/**
 * Fetches all published journey milestones from Directus
 * @returns {Promise<Object>} Object with milestones grouped by category
 */
export async function getJourneyMilestones() {
  try {
    const directus = getDirectusInstance();

    const milestones = await directus.request(
      readItems('kjov2_journey_milestones', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: ['id', 'title', 'description', 'year', 'year_display', 'category', 'icon', 'display_order'],
        sort: ['category', '-year', 'display_order'] // Sort by year (desc), then display_order for same-year events
      })
    );

    // Group milestones by category
    const grouped = {
      music: [],
      tech: [],
      creative: [],
      productions: []
    };

    milestones.forEach(milestone => {
      const category = milestone.category || 'music';
      if (grouped[category]) {
        grouped[category].push({
          year: milestone.year_display || milestone.year, // Use year_display if available, fallback to year
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon || 'mdi:star'
        });
      }
    });

    return grouped;

  } catch (error) {
    console.error('Error fetching journey milestones:', error);
    // Return null to indicate API not available (use fallback data)
    return null;
  }
}

/**
 * Fetches skills from Directus (if available)
 * @returns {Promise<Array|null>} Array of skills or null if not available
 */
export async function getSkills() {
  try {
    const directus = getDirectusInstance();

    const skills = await directus.request(
      readItems('kjov2_skills', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: ['id', 'name', 'metric', 'icon', 'display_order'],
        sort: ['display_order']
      })
    );

    return skills.map(skill => ({
      name: skill.name,
      metric: skill.metric,
      icon: skill.icon || 'mdi:star'
    }));

  } catch (error) {
    console.error('Error fetching skills:', error);
    return null;
  }
}
