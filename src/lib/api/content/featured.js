/**
 * Featured Works API
 * 
 * This module handles featured works/projects content fetching from Directus.
 * Featured works are managed through the kjov2_general.featured relationship
 * and are used primarily on the homepage to showcase key projects.
 */

/**
 * Processes featured works from kjov2_general relationship
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