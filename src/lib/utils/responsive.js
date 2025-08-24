/**
 * Responsive breakpoint utilities for consistent responsive design
 */

/**
 * Standard responsive breakpoints
 */
export const BREAKPOINTS = {
	sm: 640,
	md: 768, 
	lg: 1024,
	xl: 1280,
	'2xl': 1536
};

/**
 * Get responsive text size classes based on screen width
 * @param {number} width - Current window width
 * @param {object} sizes - Object with breakpoint keys and size values
 * @returns {string} Tailwind text size class
 */
export function getResponsiveTextSize(width, sizes = {}) {
	const defaults = {
		sm: 'text-base',
		md: 'text-lg', 
		lg: 'text-xl',
		xl: 'text-2xl'
	};
	
	const sizeMap = { ...defaults, ...sizes };
	
	if (width >= BREAKPOINTS.xl) return sizeMap.xl;
	if (width >= BREAKPOINTS.lg) return sizeMap.lg;
	if (width >= BREAKPOINTS.md) return sizeMap.md;
	return sizeMap.sm;
}

/**
 * Get responsive padding values based on screen width
 * @param {number} width - Current window width
 * @returns {string} CSS padding value
 */
export function getResponsivePadding(width) {
	if (width >= BREAKPOINTS.lg) return '3rem';
	if (width >= BREAKPOINTS.md) return '2rem'; 
	if (width >= BREAKPOINTS.sm) return '1.5rem';
	return '1rem';
}