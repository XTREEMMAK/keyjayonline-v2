/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event);

	const path = event.url.pathname;
	const isAsset = path.startsWith('/_app/') || path.startsWith('/img/');

	if (!isAsset) {
		// Allow the emulator player to be embedded in NeoCities iframe
		if (!path.startsWith('/emulator/player')) {
			response.headers.set('X-Frame-Options', 'SAMEORIGIN');
		}
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

		if (event.url.protocol === 'https:') {
			response.headers.set(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains'
			);
		}

		// Start with Report-Only to observe violations before enforcing.
		// Known third-party origins: GA4, Iconify CDN, reCAPTCHA, YouTube, Vimeo, DO Spaces.
		response.headers.set(
			'Content-Security-Policy-Report-Only',
			[
				"default-src 'self'",
				"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://code.iconify.design",
				"style-src 'self' 'unsafe-inline'",
				"img-src 'self' data: blob: https://kjo.nyc3.cdn.digitaloceanspaces.com https://kjo.nyc3.digitaloceanspaces.com https://img.youtube.com https://i.ytimg.com",
				"media-src 'self' blob: https://kjo.nyc3.cdn.digitaloceanspaces.com",
				"connect-src 'self' https://kjo.nyc3.cdn.digitaloceanspaces.com https://api.iconify.design https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com",
				"frame-src https://www.youtube.com https://player.vimeo.com",
				"font-src 'self' data:",
				"object-src 'none'",
				"base-uri 'self'"
			].join('; ')
		);
	}

	return response;
}
