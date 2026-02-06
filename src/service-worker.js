/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const CACHE_NAME = `kjo-cache-v${version}`;
const ASSETS = [...build, ...files];

// Install: Cache all static assets
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
	);
	sw.skipWaiting();
});

// Activate: Clean old caches
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			)
		)
	);
	sw.clients.claim();
});

// Fetch: Cache-first for assets, network-first for API/navigation
sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// Skip cross-origin requests (except for CDN assets which we might want later)
	if (url.origin !== sw.location.origin) {
		return;
	}

	// Cache-first for build assets and static files
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				return cached || fetch(event.request);
			})
		);
		return;
	}

	// Network-first for API calls
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					// Optionally cache successful API responses
					return response;
				})
				.catch(() => {
					// Return cached version if offline
					return caches.match(event.request);
				})
		);
		return;
	}

	// Network-first for navigation requests, fallback to cached home page
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request)
				.catch(() => {
					// If offline, serve the cached home page
					// The app uses hash-based routing, so / will handle all routes
					return caches.match('/');
				})
		);
		return;
	}

	// Default: network with cache fallback
	event.respondWith(
		fetch(event.request)
			.catch(() => caches.match(event.request))
	);
});
