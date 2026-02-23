/**
 * Professional Journey Content API
 *
 * Fetches professional journey milestones, skills, and achievements from Directus
 * Supports categories: music, tech, voice, productions
 */

import { getDirectusInstance, readItems } from '../core/client.js';

/** Normalize Directus category values to match frontend keys */
function normalizeCategory(category) {
  const cat = (category || 'music').toLowerCase();
  if (cat === 'creative') return 'voice';
  if (cat === 'production') return 'productions';
  return cat;
}

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
      voice: [],
      productions: []
    };

    milestones.forEach(milestone => {
      const category = normalizeCategory(milestone.category);
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
 * Fetches skills from Directus, grouped by category
 * @returns {Promise<Object|null>} Skills grouped by category or null if not available
 */
export async function getSkills() {
  try {
    const directus = getDirectusInstance();

    const skills = await directus.request(
      readItems('kjov2_skills', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: ['id', 'name', 'metric', 'icon', 'category', 'display_order'],
        sort: ['display_order', 'category']
      })
    );

    const grouped = {
      music: [],
      tech: [],
      voice: [],
      productions: []
    };

    skills.forEach(skill => {
      const category = normalizeCategory(skill.category);
      if (grouped[category]) {
        grouped[category].push({
          name: skill.name,
          metric: skill.metric,
          icon: skill.icon || 'mdi:star'
        });
      }
    });

    return grouped;

  } catch (error) {
    console.error('Error fetching skills:', error);
    return null;
  }
}

/**
 * Fetches achievements from Directus, grouped by category
 * @returns {Promise<Object|null>} Achievements grouped by category or null if not available
 */
export async function getAchievements() {
  try {
    const directus = getDirectusInstance();

    const achievements = await directus.request(
      readItems('kjov2_achievements', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: ['id', 'title', 'description', 'icon', 'category', 'display_order'],
        sort: ['category', 'display_order']
      })
    );

    const grouped = {
      music: [],
      tech: [],
      voice: [],
      productions: []
    };

    achievements.forEach(achievement => {
      const category = normalizeCategory(achievement.category);
      if (grouped[category]) {
        grouped[category].push({
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon || 'mdi:trophy'
        });
      }
    });

    return grouped;

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return null;
  }
}
