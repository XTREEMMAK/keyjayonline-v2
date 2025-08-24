/**
 * Formats seconds into MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "3:45")
 */
export function formatTime(seconds) {
	if (!seconds || seconds < 0) return '0:00';
	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${minutes}:${secs.toString().padStart(2, '0')}`;
}