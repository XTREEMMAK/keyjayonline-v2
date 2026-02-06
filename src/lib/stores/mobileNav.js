import { writable } from 'svelte/store';

/**
 * Store to track and control mobile navigation menu state
 * Used to coordinate between NeumorphicNavbar and MobileNavButton
 */
export const mobileMenuOpen = writable(false);

/**
 * Store to track mobile nav button visibility
 * Used for coordinating floating button positions (like play button)
 */
export const mobileNavButtonVisible = writable(false);

/**
 * Toggle mobile menu open/closed
 */
export function toggleMobileMenu() {
	mobileMenuOpen.update(open => !open);
}

/**
 * Close mobile menu
 */
export function closeMobileMenu() {
	mobileMenuOpen.set(false);
}

/**
 * Open mobile menu
 */
export function openMobileMenu() {
	mobileMenuOpen.set(true);
}
