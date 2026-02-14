/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const CACHE = `cache-${version}`;
const IMAGE_CACHE = 'cdn-images-v1';
const ASSETS = [...build, ...files];
const CDN_HOST = 'kjo.nyc3.cdn.digitaloceanspaces.com';

// Install: pre-cache all built assets and static files, then activate immediately
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

// Activate: clean up old version caches, then claim all clients immediately
// Without clients.claim(), the SW won't intercept requests until the next navigation
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) =>
				Promise.all(
					keys.map((key) => {
						if (key !== CACHE && key !== IMAGE_CACHE) return caches.delete(key);
					})
				)
			)
			.then(() => sw.clients.claim())
	);
});

// Fetch handler
sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// CDN images: cache-first strategy
	if (url.hostname === CDN_HOST) {
		event.respondWith(cacheFirstImage(event.request));
		return;
	}

	// Directus asset images: cache-first strategy
	// These URLs match /assets/{uuid}.ext?access_token=... pattern
	if (url.pathname.includes('/assets/') && url.searchParams.has('access_token')) {
		event.respondWith(cacheFirstImage(event.request));
		return;
	}

	// Built assets: serve from pre-cache
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((r) => r || fetch(event.request)));
		return;
	}

	// Everything else: network-first, cache fallback
	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.status === 200) {
					const clone = response.clone();
					caches.open(CACHE).then((cache) => cache.put(event.request, clone));
				}
				return response;
			})
			.catch(() => caches.match(event.request).then((r) => r || new Response('', { status: 503 })))
	);
});

/**
 * Cache-first strategy for CDN images.
 * Returns cached response instantly if available, otherwise fetches and caches.
 * Handles both transparent (CORS) and opaque (no-cors img tag) responses.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirstImage(request) {
	const cache = await caches.open(IMAGE_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);
		// Cache successful transparent responses and opaque responses
		// (opaque = no-cors img tag requests; status is 0 but usable by <img>)
		if (response.ok || response.type === 'opaque') {
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('', { status: 503 });
	}
}
