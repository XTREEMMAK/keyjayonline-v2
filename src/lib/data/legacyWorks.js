/**
 * Legacy Works Data
 *
 * Archived audio content from early years on Newgrounds and other platforms.
 * This is placeholder data - actual content will be managed via Directus CMS later.
 *
 * Data Structure:
 * - id: Unique identifier
 * - title: Track title
 * - year: Release year (for grouping)
 * - description: Optional description/notes
 * - audioUrl: Direct URL to audio file
 * - newgroundsUrl: Link to original Newgrounds page (for attribution)
 * - genre: Music genre/style
 * - duration: Track duration (format: "M:SS")
 */

export const legacyWorks = [
	// Placeholder entries - replace with actual data via Directus
	{
		id: 'legacy-placeholder-001',
		title: 'Example Legacy Track 2008',
		year: 2008,
		description: 'Placeholder entry - actual content coming soon',
		audioUrl: '/audio/legacy/placeholder.mp3',
		newgroundsUrl: 'https://www.newgrounds.com/audio/listen/000000',
		genre: 'Electronic',
		duration: '3:00'
	},
	{
		id: 'legacy-placeholder-002',
		title: 'Example Legacy Track 2007',
		year: 2007,
		description: 'Placeholder entry - actual content coming soon',
		audioUrl: '/audio/legacy/placeholder.mp3',
		newgroundsUrl: 'https://www.newgrounds.com/audio/listen/000001',
		genre: 'Hip Hop',
		duration: '2:45'
	},
	{
		id: 'legacy-placeholder-003',
		title: 'Another 2007 Track',
		year: 2007,
		description: 'Placeholder entry - actual content coming soon',
		audioUrl: '/audio/legacy/placeholder.mp3',
		newgroundsUrl: 'https://www.newgrounds.com/audio/listen/000002',
		genre: 'Rock',
		duration: '4:20'
	},
	{
		id: 'legacy-placeholder-004',
		title: 'Early Experiment 2006',
		year: 2006,
		description: 'Placeholder entry - actual content coming soon',
		audioUrl: '/audio/legacy/placeholder.mp3',
		newgroundsUrl: 'https://www.newgrounds.com/audio/listen/000003',
		genre: 'Electronic',
		duration: '3:30'
	}
];

/**
 * Get legacy works grouped by year (descending - newest legacy first)
 * @returns {Array<{year: number, works: Array}>}
 */
export function getLegacyWorksByYear() {
	const grouped = {};

	legacyWorks.forEach(work => {
		if (!grouped[work.year]) {
			grouped[work.year] = [];
		}
		grouped[work.year].push(work);
	});

	// Return sorted by year descending (newest first)
	return Object.entries(grouped)
		.sort(([a], [b]) => Number(b) - Number(a))
		.map(([year, works]) => ({
			year: Number(year),
			works
		}));
}

/**
 * Get all legacy works as flat array
 * @returns {Array}
 */
export function getAllLegacyWorks() {
	return legacyWorks;
}

/**
 * Get legacy works by specific year
 * @param {number} year
 * @returns {Array}
 */
export function getLegacyWorksBySpecificYear(year) {
	return legacyWorks.filter(work => work.year === year);
}
