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
