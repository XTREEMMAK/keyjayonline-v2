/**
 * Section Backgrounds Utility
 * Provides fixed background images for each section
 */

// Fixed background images for each section (locally hosted webp for performance)
const sectionImages = {
	music: '/img/hero-music-concert.webp',
	voice: '/img/hero-voice-acting.webp',
	productions: '/img/blog-music-studio.webp',
	tech: '/img/hero-voice-acting.webp',
	about: '/img/keyjay_about.webp',
	contact: '/img/J_Header_2560.webp'
};

/**
 * Get the background image URL for a specific section
 * @param {string} section - The section name (music, voice, productions, about, contact)
 * @returns {string} - URL of the background image
 */
export function getSectionBackground(section) {
	return sectionImages[section] || sectionImages.productions;
}

/**
 * Reset the cached backgrounds (no-op, kept for API compatibility)
 */
export function resetBackgroundCache() {
	// No longer needed since we use fixed images
}

/**
 * Get all available images for a section
 * @param {string} section - The section name
 * @returns {string[]} - Array of image URLs (single item array for compatibility)
 */
export function getSectionImages(section) {
	const image = sectionImages[section] || sectionImages.productions;
	return [image];
}
