/**
 * Creates an intersection observer that triggers visibility state for Svelte transitions
 * @param {HTMLElement} element - Element to observe
 * @param {Function} callback - Callback function when element becomes visible
 * @param {number} threshold - Intersection threshold (default: 0.2)
 */
export function createScrollObserver(element, callback, threshold = 0.2) {
	const observerOptions = {
		root: null, // use the viewport as the root
		threshold // trigger when threshold% of the element is visible
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				callback(true);
				observer.unobserve(entry.target); // Stop observing once animated
			}
		});
	}, observerOptions);

	if (element) {
		observer.observe(element);
	}

	return observer;
}