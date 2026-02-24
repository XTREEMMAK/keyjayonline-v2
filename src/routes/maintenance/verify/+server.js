/**
 * Maintenance Bypass PIN Verification Endpoint
 *
 * POST /maintenance/verify
 * Body: { pin: string }
 * Sets an HMAC-signed httpOnly cookie on success.
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	verifyPin,
	generateBypassToken,
	checkPinRateLimit,
	MAINT_COOKIE_NAME,
	MAINT_DURATION_MS,
	MAINT_DURATION_SECONDS
} from '$lib/utils/pinAuth.js';

export async function POST({ request, cookies, url }) {
	// Rate limit check
	const rateLimit = checkPinRateLimit(request);
	if (!rateLimit.allowed) {
		return json(
			{ success: false, message: 'Too many attempts. Please try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': rateLimit.retryAfter.toString() }
			}
		);
	}

	// Parse body
	let pin;
	try {
		const body = await request.json();
		pin = body?.pin;
	} catch {
		return json({ success: false, message: 'Invalid request' }, { status: 400 });
	}

	if (!pin || typeof pin !== 'string') {
		return json({ success: false, message: 'Invalid request' }, { status: 400 });
	}

	// Read env vars
	const correctPin = env.MAINTENANCE_BYPASS_PIN;
	const secret = env.MAINTENANCE_BYPASS_SECRET;

	if (!correctPin) {
		// PIN not configured — return generic error (don't reveal configuration state)
		return json({ success: false, message: 'Invalid PIN' }, { status: 403 });
	}

	if (!secret) {
		console.error('MAINTENANCE_BYPASS_SECRET is not configured');
		return json({ success: false, message: 'Service unavailable' }, { status: 500 });
	}

	// Verify PIN
	if (!verifyPin(pin, correctPin)) {
		return json({ success: false, message: 'Invalid PIN' }, { status: 403 });
	}

	// Success — generate token and set cookie
	const token = generateBypassToken(secret, MAINT_DURATION_MS);

	cookies.set(MAINT_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'strict',
		maxAge: MAINT_DURATION_SECONDS
	});

	return json({ success: true });
}
