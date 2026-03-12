import { redirect } from '@sveltejs/kit';
import { getNowEntries, getNowEntryPosition } from '$lib/api/index.js';

const PER_PAGE = 15;

export async function load({ parent, url }) {
	const parentData = await parent();

	// If ?entry=slug is present (without a page), resolve which page the entry is on
	const entrySlug = url.searchParams.get('entry');
	let page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));

	if (entrySlug && !url.searchParams.has('page')) {
		const position = await getNowEntryPosition(entrySlug);
		if (position >= 0) {
			page = Math.floor(position / PER_PAGE) + 1;
		}
	}

	const offset = (page - 1) * PER_PAGE;

	try {
		const { entries, totalCount } = await getNowEntries(PER_PAGE, offset);
		const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

		return {
			entries,
			page: Math.min(page, totalPages),
			totalPages,
			scrollToEntry: entrySlug || null,
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
		};
	} catch (error) {
		console.error('Error loading /now data:', error);
		return {
			entries: [],
			page: 1,
			totalPages: 1,
			scrollToEntry: null,
			error: 'Failed to load entries',
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
		};
	}
}
