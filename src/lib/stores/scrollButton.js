import { writable } from 'svelte/store';

/**
 * Store to track scroll-to-top button visibility
 * Used to coordinate positioning with other fixed buttons (like the play button)
 */
export const scrollButtonVisible = writable(false);
