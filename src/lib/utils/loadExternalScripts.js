/**
 * Utility functions for loading external scripts in SvelteKit
 */

/**
 * Loads an external script dynamically
 * @param {string} src - Script source URL
 * @param {Object} options - Script options
 * @returns {Promise<void>}
 */
export function loadScript(src, options = {}) {
	return new Promise((resolve, reject) => {
		// Check if script is already loaded
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve();
			return;
		}

		const script = document.createElement('script');
		script.src = src;
		script.async = options.async ?? true;
		script.defer = options.defer ?? false;
		
		// Add any additional attributes
		if (options.integrity) script.integrity = options.integrity;
		if (options.crossorigin) script.crossOrigin = options.crossorigin;

		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

		document.head.appendChild(script);
	});
}

/**
 * Loads multiple scripts in sequence
 * @param {Array<string|Object>} scripts - Array of script URLs or config objects
 * @returns {Promise<void>}
 */
export async function loadScripts(scripts) {
	for (const script of scripts) {
		if (typeof script === 'string') {
			await loadScript(script);
		} else {
			await loadScript(script.src, script.options);
		}
	}
}

/**
 * Loads Three.js and Vanta.js for background effects
 * @returns {Promise<void>}
 */
export async function loadVantaScripts() {
	try {
		await loadScripts([
			'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js',
			'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.clouds.min.js'
		]);
		console.log('Vanta scripts loaded successfully');
	} catch (error) {
		console.error('Failed to load Vanta scripts:', error);
		throw error;
	}
}

/**
 * Checks if a global variable exists (useful for checking if library loaded)
 * @param {string} varName - Global variable name to check
 * @returns {boolean}
 */
export function isLibraryLoaded(varName) {
	return typeof window !== 'undefined' && window[varName] !== undefined;
}

/**
 * Waits for a global variable to be available
 * @param {string} varName - Global variable name to wait for
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<any>}
 */
export function waitForLibrary(varName, timeout = 5000) {
	return new Promise((resolve, reject) => {
		if (isLibraryLoaded(varName)) {
			resolve(window[varName]);
			return;
		}

		const checkInterval = 100;
		let elapsed = 0;

		const interval = setInterval(() => {
			elapsed += checkInterval;

			if (isLibraryLoaded(varName)) {
				clearInterval(interval);
				resolve(window[varName]);
			} else if (elapsed >= timeout) {
				clearInterval(interval);
				reject(new Error(`Timeout waiting for library: ${varName}`));
			}
		}, checkInterval);
	});
}