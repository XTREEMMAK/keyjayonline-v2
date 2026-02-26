/**
 * New Content Notification Store
 * Tracks whether new content is available since the user's last visit.
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'kjo_last_visit';

export const hasNewContent = writable(false);

let checked = false;

/**
 * Check for new content by comparing latest update timestamp to last visit.
 * Called once on app load from the root layout.
 */
export async function checkForNewContent() {
	if (!browser || checked) return;
	checked = true;

	try {
		const lastVisit = localStorage.getItem(STORAGE_KEY);

		// First-time visitor — set timestamp silently, no indicator
		if (!lastVisit) {
			localStorage.setItem(STORAGE_KEY, new Date().toISOString());
			return;
		}

		const response = await fetch('/api/site/latest-update');
		if (!response.ok) return;

		const { latestUpdate } = await response.json();
		if (!latestUpdate) return;

		const lastVisitTime = new Date(lastVisit).getTime();
		const latestUpdateTime = new Date(latestUpdate).getTime();

		if (latestUpdateTime > lastVisitTime) {
			hasNewContent.set(true);
		}
	} catch {
		// Silently fail — notification is non-critical
	}
}

/**
 * Clear the notification and update last visit timestamp.
 * Called when user interacts with the indicator or after timeout.
 */
export function clearNewContent() {
	if (!browser) return;
	hasNewContent.set(false);
	localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}
