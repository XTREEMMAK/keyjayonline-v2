/**
 * Wrap a promise so it resolves to null on error instead of rejecting.
 * @param {Promise<any>} promise
 * @param {string} [name] - Label for error logging
 * @returns {Promise<any>}
 */
export const safePromise = (promise, name = 'Promise') =>
	promise.catch((err) => {
		console.error(`${name} failed:`, err);
		return null;
	});
