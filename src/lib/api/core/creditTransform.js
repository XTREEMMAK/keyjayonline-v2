/**
 * Shared Credit Transform
 *
 * Normalizes raw credit records from Directus into a consistent shape.
 * Used by both music.js and productions.js.
 */

import { buildAssetUrl } from './assets.js';

/**
 * Transform a raw credit record from Directus into a normalized object.
 * Handles flexible role formats (string, JSON string, JSON object, array).
 * @param {Object} credit - Raw credit record from Directus
 * @returns {Object} Normalized credit object
 */
export function transformCredit(credit) {
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
    social_links: credit.person_id?.social_links || [],
    display_order: credit.display_order,
    profile_image: buildAssetUrl(credit.person_id?.profile_image)
  };
}
