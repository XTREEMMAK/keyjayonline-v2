/**
 * Navigation Store for KeyJay Online v2 SPA
 * Manages active section and hash-based navigation
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Available sections
export const sections = ['home', 'music', 'voice', 'productions', 'about', 'contact'];

// Disabled pages configuration (set from server data)
export const disabledPages = writable({});

// Enabled sections (filters out disabled pages)
export const enabledSections = derived(disabledPages, ($disabledPages) => {
	return sections.filter(section => {
		// Home is never disabled
		if (section === 'home') return true;
		// Check if section is disabled
		return !$disabledPages[section]?.disabled;
	});
});

// Current active section
export const activeSection = writable('home');

// Navbar visibility state (for coordinating sticky sub-navs)
export const navbarVisible = writable(true);

// Content visibility (controlled for transition timing)
export const isContentVisible = writable(false);

// Track if we're navigating to home (for transition type)
export const isNavigatingToHome = writable(false);

// Section metadata for UI (includes glow colors for navbar)
export const sectionMeta = {
	home: { label: 'Home', icon: 'mdi:home', color: '#667eea' },
	music: { label: 'Music', icon: 'mdi:music-note', color: '#3b82f6' },
	voice: { label: 'Voice', icon: 'mdi:microphone', color: '#8b5cf6' },
	productions: { label: 'Productions', icon: 'mdi:video', color: '#f97316' },
	about: { label: 'About', icon: 'mdi:account', color: '#10b981' },
	contact: { label: 'Contact', icon: 'mdi:email', color: '#ec4899' }
};

// Timeout for hiding content (allows fade out animation)
let hideContentTimeout = null;

/**
 * Check if a section is disabled
 * @param {string} section - Section ID to check
 * @returns {boolean} True if section is disabled
 */
export function isSectionDisabled(section) {
	const disabled = get(disabledPages);
	return disabled[section]?.disabled === true;
}

/**
 * Navigate to a section
 * @param {string} section - Section ID to navigate to
 */
export function navigateTo(section) {
	if (!sections.includes(section)) {
		console.warn(`Unknown section: ${section}`);
		return;
	}

	// Block navigation to disabled sections
	if (isSectionDisabled(section)) {
		console.warn(`Section ${section} is disabled`);
		return;
	}

	// Clear any pending hide timeout
	if (hideContentTimeout) {
		clearTimeout(hideContentTimeout);
		hideContentTimeout = null;
	}

	// Set navigation direction BEFORE changing section (for out transitions)
	isNavigatingToHome.set(section === 'home');

	if (section === 'home') {
		// Going to home: hide content after fade out animation (200ms)
		hideContentTimeout = setTimeout(() => {
			isContentVisible.set(false);
		}, 250);
	} else {
		// Going to a section: show content immediately
		isContentVisible.set(true);
	}

	activeSection.set(section);

	if (browser) {
		// Update URL hash
		const newHash = section === 'home' ? '' : section;
		window.location.hash = newHash;

		// Scroll to top immediately when navigating (instant for better UX with transitions)
		window.scrollTo({ top: 0, behavior: 'instant' });
	}
}

/**
 * Initialize navigation from URL hash
 * Call this in onMount of the main page
 */
export function initFromHash() {
	if (!browser) return;

	const hash = window.location.hash.replace('#', '') || 'home';

	if (sections.includes(hash)) {
		// Check if the section is disabled
		if (isSectionDisabled(hash)) {
			console.warn(`Section ${hash} is disabled, redirecting to home`);
			activeSection.set('home');
			isContentVisible.set(false);
			window.location.hash = '';
		} else {
			activeSection.set(hash);
			// Set initial content visibility based on section
			isContentVisible.set(hash !== 'home');
		}
	} else {
		// Invalid hash, default to home
		activeSection.set('home');
		isContentVisible.set(false);
		window.location.hash = '';
	}

	// Listen for hash changes (browser back/forward)
	window.addEventListener('hashchange', handleHashChange);
}

/**
 * Cleanup hash change listener
 * Call this in onDestroy of the main page
 */
export function cleanupNavigation() {
	if (browser) {
		window.removeEventListener('hashchange', handleHashChange);
	}
}

/**
 * Handle browser hash changes
 */
function handleHashChange() {
	const hash = window.location.hash.replace('#', '') || 'home';

	if (sections.includes(hash)) {
		// Check if the section is disabled
		if (isSectionDisabled(hash)) {
			console.warn(`Section ${hash} is disabled, redirecting to home`);
			window.location.hash = '';
			activeSection.set('home');
			isContentVisible.set(false);
			return;
		}

		// Clear any pending hide timeout
		if (hideContentTimeout) {
			clearTimeout(hideContentTimeout);
			hideContentTimeout = null;
		}

		// Set navigation direction BEFORE changing section (for out transitions)
		isNavigatingToHome.set(hash === 'home');

		if (hash === 'home') {
			// Going to home: hide content after fade out animation
			hideContentTimeout = setTimeout(() => {
				isContentVisible.set(false);
			}, 250);
		} else {
			// Going to a section: show content immediately
			isContentVisible.set(true);
		}

		activeSection.set(hash);
		// Scroll to top on browser navigation
		window.scrollTo({ top: 0, behavior: 'instant' });
	}
}

/**
 * Get section index for transition direction
 * @param {string} section - Section ID
 * @returns {number} Index of section
 */
export function getSectionIndex(section) {
	return sections.indexOf(section);
}

/**
 * Check if we should animate left-to-right or right-to-left
 * @param {string} from - Section navigating from
 * @param {string} to - Section navigating to
 * @returns {number} 1 for right, -1 for left
 */
export function getTransitionDirection(from, to) {
	const fromIndex = getSectionIndex(from);
	const toIndex = getSectionIndex(to);
	return toIndex > fromIndex ? 1 : -1;
}
