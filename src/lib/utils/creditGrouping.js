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
 * Group credits by role title and sort groups by priority order.
 *
 * Each credit's `roles` array (normalized by transformCredit) is iterated.
 * Each unique role title becomes a group. Credits with multiple roles appear
 * in multiple groups. Groups are sorted by the provided priority array first,
 * then alphabetically for unlisted roles.
 *
 * @param {Array<{ roles?: Array<{ title: string, category?: string }>, role?: string, [key: string]: any }>} credits
 * @param {string[]} priorityOrder
 * @returns {Array<{ role: string, credits: Array<Object> }>}
 */
export function groupCreditsByRole(credits, priorityOrder = []) {
	if (!credits || credits.length === 0) return [];

	/** @type {Record<string, Array<Object>>} */
	const grouped = {};

	for (const credit of credits) {
		const roleTitles = new Set();

		if (credit.roles && Array.isArray(credit.roles) && credit.roles.length > 0) {
			for (const role of credit.roles) {
				roleTitles.add(role.title || 'Other');
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
		if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
		if (aIdx !== -1) return -1;
		if (bIdx !== -1) return 1;
		return a.localeCompare(b);
	});

	return sortedRoles.map(role => ({
		role,
		credits: grouped[role]
	}));
}
