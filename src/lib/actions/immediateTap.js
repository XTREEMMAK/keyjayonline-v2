/**
 * Svelte action for immediate tap response on mobile.
 *
 * During momentum scrolling, mobile browsers consume the first touch to stop
 * the scroll and suppress the subsequent `click` event. This means fixed
 * elements (bottom nav, scroll-to-top) require two taps: one to stop scrolling,
 * another to trigger the action.
 *
 * This action listens for `touchend` and fires the callback immediately if the
 * touch was a tap (moved less than 10px). It calls `preventDefault()` on
 * `touchend` to suppress the delayed `click`, so the existing `onclick` handler
 * serves as a fallback for mouse/keyboard input only.
 *
 * Usage: <button use:immediateTap={handleClick} onclick={handleClick}>
 */
export function immediateTap(node, callback) {
	let startX, startY;
	const THRESHOLD = 10;

	function onTouchStart(e) {
		const t = e.touches[0];
		startX = t.clientX;
		startY = t.clientY;
	}

	function onTouchEnd(e) {
		if (startX == null) return;
		const t = e.changedTouches[0];
		const dx = Math.abs(t.clientX - startX);
		const dy = Math.abs(t.clientY - startY);
		startX = startY = undefined;

		if (dx < THRESHOLD && dy < THRESHOLD) {
			e.preventDefault();
			callback();
		}
	}

	node.addEventListener('touchstart', onTouchStart, { passive: true });
	node.addEventListener('touchend', onTouchEnd, { passive: false });

	return {
		update(newCallback) {
			callback = newCallback;
		},
		destroy() {
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('touchend', onTouchEnd);
		}
	};
}
