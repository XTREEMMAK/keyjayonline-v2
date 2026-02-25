/**
 * Shared Credit Transform
 *
 * Normalizes raw credit records from Directus into a consistent shape.
 * Used by both music.js and productions.js.
 */

import { buildAssetUrl } from './assets.js';

/**
 * Check if a value looks like M2M junction records.
 * Directus M2M returns: [{ kjov2_ip_roles_id: { id, name } }, ...]
 * or [{ kjov2_ip_roles_id: 5 }, ...] when not expanded.
 * @param {*} value
 * @returns {boolean}
 */
function isM2MRoleArray(value) {
  return Array.isArray(value) && value.length > 0 &&
    typeof value[0] === 'object' && value[0] !== null &&
    'kjov2_ip_roles_id' in value[0];
}

/**
 * Extract roles from M2M junction records.
 * @param {Array} junctionRecords
 * @returns {Array<{ title: string, category: string }>}
 */
function extractM2MRoles(junctionRecords) {
  return junctionRecords
    .map(jr => {
      const role = jr.kjov2_ip_roles_id;
      if (!role) return null;
      // Expanded object: { id, name, icon, sort }
      if (typeof role === 'object') {
        const title = role.name || 'Unknown Role';
        return { title, category: title };
      }
      // Non-expanded: just an integer ID — can't resolve name
      return null;
    })
    .filter(Boolean);
}

/**
 * Extract roles from the legacy `role` field (string, JSON string, JSON object, array).
 * @param {*} role - Raw role value from Directus
 * @returns {Array<{ title: string, category: string }>}
 */
function extractLegacyRoles(role) {
  let roles = [];
  if (typeof role === 'string') {
    try {
      const parsed = JSON.parse(role);
      if (Array.isArray(parsed)) {
        roles = parsed;
      } else if (parsed.roles && Array.isArray(parsed.roles)) {
        roles = parsed.roles;
      } else if (typeof parsed === 'object') {
        roles = [parsed];
      }
    } catch {
      roles = [{ title: role, category: role }];
    }
  } else if (Array.isArray(role)) {
    roles = role;
  } else if (typeof role === 'object') {
    roles = [role];
  }

  return roles.map(r => {
    if (typeof r === 'string') {
      return { title: r, category: r };
    }
    const title = r.title || r.name || r.role || 'Unknown Role';
    const category = r.category || r.group || title;
    return { title, category };
  });
}

/**
 * Transform a raw credit record from Directus into a normalized object.
 * The `role` field can be either M2M junction records (new schema) or a
 * legacy string/JSON value. Detects format automatically.
 * @param {Object} credit - Raw credit record from Directus
 * @returns {Object} Normalized credit object
 */
export function transformCredit(credit) {
  let normalizedRoles = [];

  // The `role` field is now an M2M alias to kjov2_ip_roles
  if (isM2MRoleArray(credit.role)) {
    normalizedRoles = extractM2MRoles(credit.role);
  } else if (credit.role) {
    // Legacy: string or JSON value
    normalizedRoles = extractLegacyRoles(credit.role);
  }

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
