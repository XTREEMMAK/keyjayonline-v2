/**
 * Tech Content API
 *
 * Fetches tech projects and tech stack data from Directus.
 * Collections: kjov2_tech_projects, kjov2_tech_stack
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches all published tech projects
 * @returns {Promise<Array>} Array of tech projects
 */
export async function getTechProjects() {
  try {
    const directus = getDirectusInstance();

    const projects = await directus.request(
      readItems('kjov2_tech_projects', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: [
          '*',
          {
            cover_image: ['id', 'filename_disk']
          }
        ],
        sort: ['-featured', 'sort']
      })
    );

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      tagline: project.tagline,
      description: project.description,
      project_url: project.project_url,
      repo_url: project.repo_url,
      cover_image: project.cover_image
        ? buildAssetUrl(project.cover_image.filename_disk || project.cover_image.id)
        : null,
      tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
      project_status: project.project_status || 'active',
      featured: project.featured || false,
      sort: project.sort || 0,
      date_started: project.date_started
    }));
  } catch (error) {
    console.error('Error fetching tech projects:', error);
    return [];
  }
}

/**
 * Fetches all published tech stack items
 * @returns {Promise<Array>} Array of tech stack items
 */
export async function getTechStack() {
  try {
    const directus = getDirectusInstance();

    const stack = await directus.request(
      readItems('kjov2_tech_stack', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: ['*'],
        sort: ['category', 'sort']
      })
    );

    return stack.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      icon: item.icon,
      url: item.url,
      proficiency: item.proficiency || 0,
      featured: item.featured || false,
      sort: item.sort || 0
    }));
  } catch (error) {
    console.error('Error fetching tech stack:', error);
    return [];
  }
}
