/**
 * SPA Main Page Server Load + Contact Form Action
 * Loads only critical site settings - section data is lazy-loaded client-side
 */

import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { contactFormSchema } from '$lib/schemas/contactForm.js';
import * as v from 'valibot';

export async function load({ parent }) {
	try {
		// Get site settings and CDN URL from parent layout
		const parentData = await parent();

		return {
			cdnBaseUrl: parentData.cdnBaseUrl || '',
			siteSettings: parentData.siteSettings,
			socialLinks: parentData.socialLinks
			// Section data (music, voice, etc.) is now lazy-loaded via /api/sections/* endpoints
		};
	} catch (error) {
		console.error('Error loading page data:', error);

		// Return fallback data
		return {
			cdnBaseUrl: '',
			siteSettings: null,
			socialLinks: []
		};
	}
}

const MIN_SUBMISSION_TIME = 3000; // 3 seconds — bots submit instantly
const MAX_SUBMISSION_TIME = 30 * 60 * 1000; // 30 minutes — matches client-side expiry

export const actions = {
	contact: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		// 1. Honeypot check — silently "succeed" to fool bots
		if (data.honeypot && data.honeypot.length > 0) {
			return { success: true };
		}

		// 2. Time-based validation
		const formStartTime = parseInt(data.form_start_time, 10);
		const now = Date.now();

		if (isNaN(formStartTime) || (now - formStartTime) < MIN_SUBMISSION_TIME) {
			return fail(400, { error: 'Form submitted too quickly. Please try again.' });
		}

		if ((now - formStartTime) > MAX_SUBMISSION_TIME) {
			return fail(400, { error: 'Form session expired. Please refresh and try again.' });
		}

		// 3. Server-side Valibot validation (reuses shared schema)
		const validationData = {
			name: data.name || '',
			email: data.email || '',
			inquiryType: data.inquiryType || '',
			honeypot: data.honeypot || '',
			recaptchaToken: data.recaptchaToken || undefined,
			...(data.inquiryType === 'service'
				? {
						serviceNeeded: data.serviceNeeded || '',
						budgetRange: data.budgetRange || '',
						timeline: data.timeline || '',
						projectDetails: data.projectDetails || ''
					}
				: {
						generalMessage: data.generalMessage || ''
					})
		};

		try {
			v.parse(contactFormSchema, validationData);
		} catch (error) {
			const issues =
				error.issues?.map((i) => ({
					field: i.path?.[0]?.key,
					message: i.message
				})) || [];
			return fail(400, { error: 'Please fix the form errors and try again.', issues });
		}

		// 4. reCAPTCHA server-side verification
		const recaptchaSecretKey = env.RECAPTCHA_SECRET_KEY;

		if (recaptchaSecretKey) {
			const recaptchaToken = data.recaptchaToken;

			if (!recaptchaToken) {
				return fail(400, { error: 'Please complete the reCAPTCHA verification.' });
			}

			try {
				const verifyResponse = await fetch(
					'https://www.google.com/recaptcha/api/siteverify',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
						body: new URLSearchParams({
							secret: recaptchaSecretKey,
							response: recaptchaToken
						}),
						signal: AbortSignal.timeout(5000)
					}
				);

				const verifyResult = await verifyResponse.json();

				if (!verifyResult.success) {
					console.warn('reCAPTCHA verification failed:', verifyResult['error-codes']);
					return fail(400, { error: 'reCAPTCHA verification failed. Please try again.' });
				}
			} catch (error) {
				// On network error to Google, allow submission through
				// Honeypot + time validation still provide baseline protection
				console.error('reCAPTCHA verification error:', error);
			}
		}

		// 5. POST to webhook
		const webhookUrl = env.CONTACT_FORM_WEBHOOK_URL;
		const webhookSecret = env.CONTACT_FORM_WEBHOOK_SECRET;

		if (!webhookUrl) {
			console.error('CONTACT_FORM_WEBHOOK_URL not configured');
			return fail(500, { error: 'Contact form is not configured. Please try again later.' });
		}

		try {
			const webhookPayload = {
				name: data.name,
				email: data.email,
				inquiryType: data.inquiryType,
				...(data.inquiryType === 'service'
					? {
							serviceNeeded: data.serviceNeeded,
							budgetRange: data.budgetRange,
							timeline: data.timeline,
							projectDetails: data.projectDetails
						}
					: {
							generalMessage: data.generalMessage
						}),
				submittedAt: new Date().toISOString(),
				source: 'keyjayonline.com'
			};

			const headers = { 'Content-Type': 'application/json' };

			if (webhookSecret) {
				headers['Authorization'] = `Bearer ${webhookSecret}`;
			}

			const webhookResponse = await fetch(webhookUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(webhookPayload),
				signal: AbortSignal.timeout(10000)
			});

			if (!webhookResponse.ok) {
				console.error(
					'Webhook failed:',
					webhookResponse.status,
					await webhookResponse.text()
				);
				return fail(500, {
					error: 'Failed to send your message. Please try again later.'
				});
			}

			return { success: true };
		} catch (error) {
			console.error('Webhook error:', error);
			return fail(500, { error: 'Failed to send your message. Please try again later.' });
		}
	}
};
