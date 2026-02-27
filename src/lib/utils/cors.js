/**
 * CORS Utility
 *
 * Shared CORS header helpers for external-facing JSON API endpoints.
 * Origins are configurable via the CORS_ALLOWED_ORIGINS env var.
 */

import { env } from '$env/dynamic/private';

export function getAllowedOrigins() {
	const envOrigins = env.CORS_ALLOWED_ORIGINS;
	if (envOrigins) {
		return envOrigins.split(',').map((o) => o.trim());
	}
	return ['https://keyjay.neocities.org'];
}

export function getCorsHeaders(requestOrigin) {
	const allowed = getAllowedOrigins();
	if (requestOrigin && allowed.includes(requestOrigin)) {
		return {
			'Access-Control-Allow-Origin': requestOrigin,
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400',
			Vary: 'Origin'
		};
	}
	return { Vary: 'Origin' };
}

/**
 * Return a JSONP response if a callback parameter is present.
 * Sanitizes callback name to prevent XSS (alphanumeric + underscore only).
 * Returns null if no callback — caller should fall through to json().
 */
export function jsonpResponse(data, callback, headers = {}) {
	if (!callback) return null;
	const safeCb = callback.replace(/[^a-zA-Z0-9_]/g, '');
	if (!safeCb) return null;
	return new Response(safeCb + '(' + JSON.stringify(data) + ')', {
		headers: { 'Content-Type': 'application/javascript; charset=utf-8', ...headers }
	});
}
