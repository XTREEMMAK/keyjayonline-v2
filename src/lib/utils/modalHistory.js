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
 * Setup popstate listener for modal closing.
 * When modalId is provided, the handler only fires when navigating
 * AWAY from this modal's state (i.e. current state's modalId differs).
 * This prevents stacked modals from all closing on a single popstate.
 * @param {string|(() => void)} modalIdOrCallback - Modal identifier, or callback for legacy usage
 * @param {(() => void)} [closeCallback] - Function to close the modal
 * @returns {() => void} Cleanup function
 */
export function setupPopstateHandler(modalIdOrCallback, closeCallback) {
	if (!browser) return () => {};

	// Support legacy signature: setupPopstateHandler(callback)
	let modalId = null;
	let callback;
	if (typeof modalIdOrCallback === 'function') {
		callback = modalIdOrCallback;
	} else {
		modalId = modalIdOrCallback;
		callback = closeCallback;
	}

	const handler = () => {
		if (modalId) {
			// Only close if current state is NOT this modal's state
			if (!history.state || history.state.modalId !== modalId) {
				callback();
			}
		} else {
			callback();
		}
	};

	window.addEventListener('popstate', handler);
	return () => window.removeEventListener('popstate', handler);
}
