/**
 * Format a date as a relative time string ("just now", "3 weeks ago", etc.)
 * @param {string|Date} date - ISO date string or Date object
 * @returns {string} Human-readable relative time
 */
export function relativeDate(date) {
	if (!date) return '';

	const now = Date.now();
	const then = new Date(date).getTime();
	const diffMs = now - then;
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHr = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHr / 24);
	const diffWeek = Math.floor(diffDay / 7);
	const diffMonth = Math.floor(diffDay / 30);

	if (diffSec < 60) return 'just now';
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHr < 24) return `${diffHr}h ago`;
	if (diffDay < 7) return `${diffDay}d ago`;
	if (diffWeek < 5) return `${diffWeek}w ago`;
	if (diffMonth < 12) return `${diffMonth}mo ago`;

	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}
