/**
 * Sticky Navigation Store
 *
 * Manages sticky navigation state for sections that need to render
 * their sticky nav outside the transition container (to avoid transform issues).
 */

import { writable } from 'svelte/store';

// Store for sticky nav visibility and content
export const stickyNavVisible = writable(false);
export const stickyNavTop = writable(88); // Default top offset
export const stickyNavContent = writable(null); // Svelte component or snippet

// When true, main navbar should be hidden (About section takes over nav)
export const hideMainNavbar = writable(false);

// Active tab for About section (synced with AboutSection)
export const aboutActiveTab = writable('bio');

/**
 * Show the sticky nav portal
 * @param {number} top - Top offset in pixels
 */
export function showStickyNav(top = 88) {
	stickyNavTop.set(top);
	stickyNavVisible.set(true);
	hideMainNavbar.set(true); // Hide main navbar when subnav is pinned
}

/**
 * Hide the sticky nav portal
 */
export function hideStickyNav() {
	stickyNavVisible.set(false);
	hideMainNavbar.set(false); // Show main navbar again
}

/**
 * Update sticky nav top position
 * @param {number} top - Top offset in pixels
 */
export function updateStickyNavTop(top) {
	stickyNavTop.set(top);
}
