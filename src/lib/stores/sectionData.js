/**
 * Section Data Store
 * Manages lazy-loaded section data with caching
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * @typedef {'idle' | 'loading' | 'loaded' | 'error'} LoadingStatus
 * @typedef {{ status: LoadingStatus, data: any, error: string | null }} SectionState
 */

// Initial state for all sections
const initialState = {
	music: { status: 'idle', data: null, error: null },
	voice: { status: 'idle', data: null, error: null },
	productions: { status: 'idle', data: null, error: null },
	about: { status: 'idle', data: null, error: null },
	contact: { status: 'idle', data: null, error: null }
};

// Create the store
export const sectionData = writable(initialState);

/**
 * Load section data if not already loaded
 * @param {string} section - Section name to load
 * @returns {Promise<any>} Section data
 */
export async function loadSection(section) {
	if (!browser) return null;

	const current = get(sectionData);

	// Validate section exists
	if (!(section in current)) {
		console.warn(`Unknown section: ${section}`);
		return null;
	}

	// Already loaded? Return cached data
	if (current[section].status === 'loaded') {
		return current[section].data;
	}

	// Already loading? Wait for it
	if (current[section].status === 'loading') {
		return new Promise((resolve, reject) => {
			const unsubscribe = sectionData.subscribe((state) => {
				if (state[section].status === 'loaded') {
					unsubscribe();
					resolve(state[section].data);
				} else if (state[section].status === 'error') {
					unsubscribe();
					reject(new Error(state[section].error));
				}
			});
		});
	}

	// Start loading
	sectionData.update((s) => ({
		...s,
		[section]: { ...s[section], status: 'loading' }
	}));

	try {
		const response = await fetch(`/api/sections/${section}`);

		if (!response.ok) {
			throw new Error(`Failed to load ${section}: ${response.statusText}`);
		}

		const data = await response.json();

		sectionData.update((s) => ({
			...s,
			[section]: { status: 'loaded', data, error: null }
		}));

		return data;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		sectionData.update((s) => ({
			...s,
			[section]: { status: 'error', data: null, error: errorMessage }
		}));

		throw error;
	}
}

/**
 * Prefetch section data in the background (fire and forget)
 * Useful for prefetching on hover
 * @param {string} section - Section name to prefetch
 */
export function prefetchSection(section) {
	if (!browser) return;

	const current = get(sectionData);

	// Only prefetch if idle (not already loading/loaded)
	if (current[section]?.status === 'idle') {
		loadSection(section).catch(() => {
			// Silently ignore prefetch errors
		});
	}
}

/**
 * Force refresh a section's data
 * @param {string} section - Section name to refresh
 * @returns {Promise<any>} Fresh section data
 */
export async function refreshSection(section) {
	if (!browser) return null;

	// Reset to idle state
	sectionData.update((s) => ({
		...s,
		[section]: { status: 'idle', data: null, error: null }
	}));

	// Then load fresh
	return loadSection(section);
}

/**
 * Check if a section is loaded
 * @param {string} section - Section name to check
 * @returns {boolean}
 */
export function isSectionLoaded(section) {
	const current = get(sectionData);
	return current[section]?.status === 'loaded';
}

/**
 * Get section data synchronously (may be null if not loaded)
 * @param {string} section - Section name
 * @returns {any} Section data or null
 */
export function getSectionData(section) {
	const current = get(sectionData);
	return current[section]?.data ?? null;
}

/**
 * Reset all section data (useful for testing or logout)
 */
export function resetAllSections() {
	sectionData.set(initialState);
}
