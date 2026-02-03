/**
 * Content Viewer Store
 *
 * Manages the state of the content viewer modal.
 * Used to hide other UI elements (navbar, scroll button) when viewer is open.
 */

import { writable } from 'svelte/store';

export const contentViewerOpen = writable(false);
