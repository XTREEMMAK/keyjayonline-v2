/**
 * Section Backgrounds Utility
 * Provides random blurred background images for each section
 */

// Background images organized by section
// Using Unsplash for placeholder images - replace with actual images
const sectionImages = {
	music: [
		'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1920',
		'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920',
		'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920',
		'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920',
		'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920'
	],
	voice: [
		'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1920',
		'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1920',
		'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1920',
		'https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?w=1920'
	],
	productions: [
		'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920',
		'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920',
		'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920',
		'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1920'
	],
	about: [
		'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920',
		'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=1920',
		'https://images.unsplash.com/photo-1489549132488-d00b7eee80f1?w=1920'
	],
	contact: [
		'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=1920',
		'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1920',
		'https://images.unsplash.com/photo-1516387938699-a93567ec168e?w=1920'
	]
};

// Cache for selected backgrounds to maintain consistency during session
const selectedBackgrounds = {};

/**
 * Get a random background image URL for a specific section
 * Caches the selection so it remains consistent during the session
 * @param {string} section - The section name (music, voice, productions, about, contact)
 * @returns {string} - URL of the background image
 */
export function getSectionBackground(section) {
	// Return cached selection if available
	if (selectedBackgrounds[section]) {
		return selectedBackgrounds[section];
	}

	// Get images for the section, fallback to productions if not found
	const images = sectionImages[section] || sectionImages.productions;

	// Select a random image
	const randomIndex = Math.floor(Math.random() * images.length);
	const selectedImage = images[randomIndex];

	// Cache the selection
	selectedBackgrounds[section] = selectedImage;

	return selectedImage;
}

/**
 * Reset the cached backgrounds (useful for testing or forced refresh)
 */
export function resetBackgroundCache() {
	Object.keys(selectedBackgrounds).forEach(key => {
		delete selectedBackgrounds[key];
	});
}

/**
 * Get all available images for a section
 * @param {string} section - The section name
 * @returns {string[]} - Array of image URLs
 */
export function getSectionImages(section) {
	return sectionImages[section] || sectionImages.productions;
}
