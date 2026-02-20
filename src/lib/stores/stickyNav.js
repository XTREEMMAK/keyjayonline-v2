/**
 * Sticky Navigation Store
 *
 * Manages sticky navigation state for sections that need to render
 * their sticky nav outside the transition container (to avoid transform issues).
 *
 * Supports:
 * - About section sticky nav (original portal pattern)
 * - Section sub-nav portals (Music, Tech, Productions) with context-aware nav swapping
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

// ── Section Sub-Nav (Music, Tech, Productions) ──

// Which section's sub-nav is currently in sticky/portal mode (null = none)
export const activeStickySection = writable(null);

// Temporarily show main nav overlay (hamburger button dropdown)
export const mainNavOverlayVisible = writable(false);

// When true, observer callbacks should not deactivate the portal (during programmatic scroll)
export let portalScrollLock = false;

export function setPortalScrollLock(value) {
	portalScrollLock = value;
}

// Bumped to trigger a one-time manual sentinel position check in section components.
// Used after scroll lock releases or content changes (filter/view/tab switches).
export const sentinelRecheck = writable(0);

export function recheckSentinels() {
	sentinelRecheck.update(n => n + 1);
}

// When true, a section modal is open and the sticky nav should hide (z-index stacking context issue)
export const sectionModalOpen = writable(false);

// Section-specific active tab/filter stores (synced bidirectionally with section components)
export const musicActiveView = writable('albums');
export const musicActiveFilter = writable('all');
export const techActiveTab = writable('stack');
export const productionsActiveFilter = writable('all');
export const voiceActiveFilter = writable('all');

/**
 * Show the sticky nav portal (About section)
 * @param {number} top - Top offset in pixels
 */
export function showStickyNav(top = 88) {
	stickyNavTop.set(top);
	stickyNavVisible.set(true);
	hideMainNavbar.set(true);
}

/**
 * Hide the sticky nav portal (About section)
 */
export function hideStickyNav() {
	stickyNavVisible.set(false);
	hideMainNavbar.set(false);
}

/**
 * Update sticky nav top position
 * @param {number} top - Top offset in pixels
 */
export function updateStickyNavTop(top) {
	stickyNavTop.set(top);
}

/**
 * Show section sub-nav in portal mode, hiding main navbar
 * @param {string} section - Section ID ('music', 'tech', 'productions')
 */
export function showSectionSubNav(section) {
	activeStickySection.set(section);
	hideMainNavbar.set(true);
}

/**
 * Hide section sub-nav portal, restoring main navbar
 */
export function hideSectionSubNav() {
	activeStickySection.set(null);
	hideMainNavbar.set(false);
	mainNavOverlayVisible.set(false);
}

/**
 * Show the main nav overlay (stays until explicitly closed)
 */
export function showMainNavOverlay() {
	mainNavOverlayVisible.set(true);
}

/**
 * Hide the main nav overlay
 */
export function hideMainNavOverlay() {
	mainNavOverlayVisible.set(false);
}

/**
 * Toggle main nav overlay visibility
 */
export function toggleMainNavOverlay() {
	let isVisible;
	mainNavOverlayVisible.subscribe(v => isVisible = v)();
	if (isVisible) {
		hideMainNavOverlay();
	} else {
		showMainNavOverlay();
	}
}
