/**
 * Modal History Utility
 * Enables browser back button to close modals instead of navigating away
 */
import { browser } from '$app/environment';

const MODAL_STATE_KEY = 'modalOpen';

/**
 * Push a history state when modal opens
 * @param {string} modalId - Unique identifier for the modal
 */
export function pushModalState(modalId) {
	if (!browser) return;
	history.pushState({ [MODAL_STATE_KEY]: true, modalId }, '');
}

/**
 * Check if current history state is a modal state
 * @returns {boolean}
 */
export function isModalState() {
	if (!browser) return false;
	return history.state?.[MODAL_STATE_KEY] === true;
}

/**
 * Go back in history if we pushed a modal state
 */
export function popModalState() {
	if (!browser) return;
	if (isModalState()) {
		history.back();
	}
}

/**
 * Setup popstate listener for modal closing
 * @param {() => void} closeCallback - Function to close the modal
 * @returns {() => void} Cleanup function
 */
export function setupPopstateHandler(closeCallback) {
	if (!browser) return () => {};

	const handler = () => {
		// If we're navigating back from a modal state, close the modal
		closeCallback();
	};

	window.addEventListener('popstate', handler);
	return () => window.removeEventListener('popstate', handler);
}
