/**
 * Guestbook Entries Endpoint
 *
 * GET  — Returns paginated published entries (same-origin for /guestbook page)
 * POST — Accepts new entries with reCAPTCHA Enterprise verification.
 *        Entries are created as draft (moderation queue) in Directus.
 *        Rate-limited to 5 submissions per 15 minutes per IP.
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { checkRateLimit, getRateLimitHeaders } from '$lib/utils/rateLimit.js';
import { getAllowedOrigins } from '$lib/utils/cors.js';
import { bustCache, createGuestbookEntry, getGuestbookEntriesPaginated } from '$lib/api/content/guestbook.js';

function getPostCorsHeaders(requestOrigin) {
	const allowed = getAllowedOrigins();
	if (requestOrigin && allowed.includes(requestOrigin)) {
		return {
			'Access-Control-Allow-Origin': requestOrigin,
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400',
			Vary: 'Origin'
		};
	}
	return { Vary: 'Origin' };
}

export async function OPTIONS({ request }) {
	const origin = request.headers.get('origin');
	return new Response(null, {
		status: 204,
		headers: getPostCorsHeaders(origin)
	});
}

export async function GET({ url }) {
	const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
	const limit = parseInt(url.searchParams.get('limit') || '25', 10) || 25;

	try {
		const result = await getGuestbookEntriesPaginated(page, limit);
		return json(result);
	} catch (error) {
		console.error('Error fetching guestbook entries:', error);
		return json({ error: 'Guestbook unavailable' }, { status: 503 });
	}
}

export async function POST({ request }) {
	const origin = request.headers.get('origin');
	const corsHeaders = getPostCorsHeaders(origin);

	// 1. Rate limit
	const rateLimit = checkRateLimit(request);
	if (!rateLimit.allowed) {
		return json(
			{ error: 'Too many submissions. Please try again later.' },
			{ status: 429, headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimit) } }
		);
	}

	// 2. Parse body
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, { status: 400, headers: corsHeaders });
	}

	const { name, website, message, recaptcha_token } = body;

	// 3. Validate fields
	const errors = [];

	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		errors.push({ field: 'name', message: 'Name is required.' });
	} else if (name.trim().length > 50) {
		errors.push({ field: 'name', message: 'Name must be 50 characters or fewer.' });
	}

	if (!message || typeof message !== 'string' || message.trim().length === 0) {
		errors.push({ field: 'message', message: 'Message is required.' });
	} else if (message.trim().length > 500) {
		errors.push({ field: 'message', message: 'Message must be 500 characters or fewer.' });
	}

	let cleanWebsite = '';
	if (website && typeof website === 'string' && website.trim().length > 0) {
		if (!/^https?:\/\//i.test(website.trim())) {
			errors.push({ field: 'website', message: 'Website must start with http:// or https://.' });
		} else {
			cleanWebsite = website.trim();
		}
	}

	if (errors.length > 0) {
		return json({ error: 'Validation failed.', issues: errors }, { status: 400, headers: corsHeaders });
	}

	// 4. reCAPTCHA Enterprise verification
	const recaptchaApiKey = env.RECAPTCHA_API_KEY;
	const recaptchaProjectId = env.RECAPTCHA_PROJECT_ID;
	const recaptchaSiteKey = publicEnv.PUBLIC_RECAPTCHA_SITE_KEY;

	if (recaptchaApiKey && recaptchaProjectId) {
		if (!recaptcha_token) {
			return json(
				{ error: 'reCAPTCHA verification is required.' },
				{ status: 400, headers: corsHeaders }
			);
		}

		try {
			const assessmentUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${recaptchaProjectId}/assessments?key=${recaptchaApiKey}`;

			const assessmentResponse = await fetch(assessmentUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event: {
						token: recaptcha_token,
						siteKey: recaptchaSiteKey,
						expectedAction: 'guestbook'
					}
				}),
				signal: AbortSignal.timeout(5000)
			});

			if (!assessmentResponse.ok) {
				const errorBody = await assessmentResponse.text();
				console.error(`reCAPTCHA Enterprise API error (${assessmentResponse.status}):`, errorBody);
			} else {
				const assessment = await assessmentResponse.json();

				if (!assessment.tokenProperties?.valid) {
					console.warn('reCAPTCHA token invalid:', assessment.tokenProperties?.invalidReason);
					return json(
						{ error: 'reCAPTCHA verification failed. Please try again.' },
						{ status: 400, headers: corsHeaders }
					);
				}

				if (assessment.tokenProperties.action !== 'guestbook') {
					console.warn('reCAPTCHA action mismatch:', assessment.tokenProperties.action);
					return json(
						{ error: 'reCAPTCHA verification failed. Please try again.' },
						{ status: 400, headers: corsHeaders }
					);
				}

				const scoreThreshold = parseFloat(env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
				const score = assessment.riskAnalysis?.score ?? 0;

				if (score < scoreThreshold) {
					console.warn(`reCAPTCHA score too low: ${score} < ${scoreThreshold}`);
					return json(
						{ error: 'Unable to verify your request. Please try again.' },
						{ status: 400, headers: corsHeaders }
					);
				}
			}
		} catch (error) {
			// On network error to Google, allow submission through
			console.error('reCAPTCHA Enterprise verification error:', error);
		}
	}

	// 5. Create Directus item (defaults to draft for moderation)
	try {
		await createGuestbookEntry({
			name: name.trim(),
			website: cleanWebsite,
			message: message.trim()
		});

		// 6. Bust GET endpoint cache
		bustCache();

		// 7. Fire-and-forget webhook notification
		const webhookUrl = env.GUESTBOOK_WEBHOOK_URL;
		console.log('Guestbook webhook URL configured:', !!webhookUrl);
		if (webhookUrl) {
			const webhookHeaders = { 'Content-Type': 'application/json' };
			if (env.GUESTBOOK_WEBHOOK_SECRET) {
				webhookHeaders['KJOv2-Guestbook-Auth'] = `Bearer ${env.GUESTBOOK_WEBHOOK_SECRET}`;
			}
			fetch(webhookUrl, {
				method: 'POST',
				headers: webhookHeaders,
				body: JSON.stringify({
					name: name.trim(),
					website: cleanWebsite,
					message: message.trim(),
					submitted_at: new Date().toISOString()
				}),
				signal: AbortSignal.timeout(5000)
			}).then((res) => console.log('Guestbook webhook response:', res.status))
			  .catch((err) => console.error('Guestbook webhook error:', err));
		}

		return json(
			{ success: true, message: 'Your message has been submitted for review!' },
			{ status: 201, headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error creating guestbook entry:', error);
		return json(
			{ error: 'Failed to submit your message. Please try again later.' },
			{ status: 500, headers: corsHeaders }
		);
	}
}
