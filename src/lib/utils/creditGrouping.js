/**
 * Shared Credit Grouping Utilities
 *
 * Groups and sorts credits by role for display in collapsible sections.
 * Used by both AlbumModalSwal (Music) and ProductionDetailModal (Productions).
 */

/** Priority order for music role groups (roles not listed sort alphabetically after these) */
export const MUSIC_ROLE_PRIORITY = [
	'Creator', 'Producer', 'Composer', 'Song Writer',
	'Vocalists', 'Rapper', 'Mixing', 'Mastering'
];

/** Priority order for production role groups */
export const PRODUCTIONS_ROLE_PRIORITY = [
	'Director', 'Writer', 'Producer', 'Voice Actor',
	'Art', 'Animation', 'Music', 'Sound Design', 'Editing'
];

/** Priority order for comics production role groups */
export const COMICS_ROLE_PRIORITY = [
	'Lead Illustrator', 'Illustrator', 'Writer'
];

/** When a credit has this many or more social icons, collapse behind an info button */
export const SOCIAL_ICON_OVERFLOW_THRESHOLD = 4;

/**
 * Count total social icons for a credit (website counts as 1 + each social_link).
 * @param {{ website_url?: string, social_links?: Array<{ network_url?: string }> }} credit
 * @returns {number}
 */
export function countSocialIcons(credit) {
	let count = credit.website_url ? 1 : 0;
	if (Array.isArray(credit.social_links)) {
		count += credit.social_links.filter(s => s.network_url).length;
	}
	return count;
}

/**
 * Group credits by role title and sort groups by the role's sort field.
 *
 * Each credit's `roles` array (normalized by transformCredit) is iterated.
 * Each unique role title becomes a group. Credits with multiple roles appear
 * in multiple groups. Groups are sorted by the lowest `sort` value among their
 * roles first, then by the provided priority array as fallback for legacy
 * credits without sort values, then alphabetically.
 *
 * @param {Array<{ roles?: Array<{ title: string, sort?: number|null }>, role?: string, [key: string]: any }>} credits
 * @param {string[]} priorityOrder
 * @returns {Array<{ role: string, credits: Array<Object> }>}
 */
export function groupCreditsByRole(credits, priorityOrder = []) {
	if (!credits || credits.length === 0) return [];

	/** @type {Record<string, Array<Object>>} */
	const grouped = {};
	/** @type {Record<string, number|null>} Track the lowest sort value per group */
	const groupSort = {};

	for (const credit of credits) {
		const roleTitles = new Set();

		if (credit.roles && Array.isArray(credit.roles) && credit.roles.length > 0) {
			for (const role of credit.roles) {
				const title = role.title || 'Other';
				roleTitles.add(title);
				// Track the lowest sort value for this role group
				if (role.sort != null) {
					if (groupSort[title] == null || role.sort < groupSort[title]) {
						groupSort[title] = role.sort;
					}
				}
			}
		} else {
			roleTitles.add(credit.role || 'Other');
		}

		for (const roleTitle of roleTitles) {
			if (!grouped[roleTitle]) {
				grouped[roleTitle] = [];
			}
			// Stamp with only the role relevant to this group
			grouped[roleTitle].push({ ...credit, displayRole: roleTitle });
		}
	}

	const sortedRoles = Object.keys(grouped).sort((a, b) => {
		const aIdx = priorityOrder.indexOf(a);
		const bIdx = priorityOrder.indexOf(b);
		// Priority roles always come first, in their specified order
		if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
		if (aIdx !== -1) return -1;
		if (bIdx !== -1) return 1;
		// Remaining roles sort by Directus sort field
		const aSort = groupSort[a];
		const bSort = groupSort[b];
		if (aSort != null && bSort != null) return aSort - bSort;
		if (aSort != null) return -1;
		if (bSort != null) return 1;
		return a.localeCompare(b);
	});

	return sortedRoles.map(role => ({
		role,
		credits: grouped[role]
	}));
}
