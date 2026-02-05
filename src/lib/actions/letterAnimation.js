/**
 * Letter Animation Action
 * Applies a flowing pulsing animation to elements using the Web Animations API
 * Each letter scales up/down individually with ease-in (up) and ease-out (down)
 * Staggered delays create a wave effect across the title
 * Random pause (5 or 10 seconds) between COMPLETE animation cycles
 */

// Module-level: ensures all letter instances share the same cycle timing
let sharedPauseDuration = null;

export function letterPulse(node, options = {}) {
	const { delay = 0, duration = 800 } = options;

	// Initialize shared pause duration once (same for all letters on the page)
	if (sharedPauseDuration === null) {
		sharedPauseDuration = Math.random() < 0.5 ? 5000 : 10000;
	}

	// Keyframes with individual easing per segment
	// easing property in a keyframe controls the easing TO the next keyframe
	const keyframes = [
		{
			offset: 0,
			transform: 'scale(1) translateY(0)',
			easing: 'ease-in'
		},
		{
			offset: 0.5,
			transform: 'scale(1.2) translateY(-4px)',
			easing: 'ease-out'
		},
		{
			offset: 1,
			transform: 'scale(1) translateY(0)'
		}
	];

	// Ensure inline-block display for transform to work
	node.style.display = 'inline-block';
	node.style.transformOrigin = 'center bottom';

	let animation = null;
	let intervalId = null;
	let initialTimeoutId = null;
	let isDestroyed = false;

	// Function to run one animation cycle for this letter
	function runAnimation() {
		if (isDestroyed) return;

		animation = node.animate(keyframes, {
			duration,
			fill: 'forwards'
		});

		animation.onfinish = () => {
			if (isDestroyed) return;
			// Reset to initial state
			node.style.transform = 'scale(1) translateY(0)';
		};
	}

	// Fixed: Use setInterval with consistent total cycle time
	// Each letter maintains its original delay offset within the cycle
	const waveBuffer = 1200; // Max wave completion time (accounts for all letter delays + animation)
	const totalCycle = waveBuffer + sharedPauseDuration;

	// Initial delayed start - preserves the stagger pattern
	initialTimeoutId = setTimeout(() => {
		if (isDestroyed) return;
		runAnimation();

		// Repeat at fixed intervals (same for ALL letters)
		// This maintains the stagger because each letter started at different times
		intervalId = setInterval(() => {
			if (!isDestroyed) runAnimation();
		}, totalCycle);
	}, delay);

	return {
		destroy() {
			isDestroyed = true;
			if (animation) {
				animation.cancel();
			}
			if (intervalId) {
				clearInterval(intervalId);
			}
			if (initialTimeoutId) {
				clearTimeout(initialTimeoutId);
			}
		},
		update(newOptions) {
			// Handle dynamic updates if needed
		}
	};
}

// Reset function to allow new random selection (e.g., on page navigation)
export function resetAnimationCycle() {
	sharedPauseDuration = null;
}
