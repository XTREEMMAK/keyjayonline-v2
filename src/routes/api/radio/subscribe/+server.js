/**
 * Radio Subscribe API Endpoint
 *
 * POST /api/radio/subscribe
 * Handles email subscription for radio notifications.
 * Validates email, checks for duplicates, and creates subscriber record.
 */

import { json } from '@sveltejs/kit';
import { createRadioSubscriber } from '$lib/api/content/radio.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      return json({ error: 'Email is too long' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return json({ error: 'Invalid email format' }, { status: 400 });
    }

    const result = await createRadioSubscriber(trimmedEmail);

    if (!result.success) {
      if (result.error === 'Already subscribed') {
        return json({ error: result.error }, { status: 409 });
      }
      return json({ error: result.error }, { status: 500 });
    }

    // TODO: N8N webhook integration
    // When a new subscriber is created, optionally trigger N8N workflow:
    // await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ email: trimmedEmail, subscribedAt: new Date().toISOString() }) });
    // The N8N workflow handles welcome email sending.
    //
    // For "new track" notifications, a Directus Flow triggers when
    // kjov2_music_samples.include_in_radio changes to true.
    // That Directus Flow calls N8N webhook with track details.
    // N8N queries kjov2_radio_subscribers and sends batch emails.

    return json({ success: true });
  } catch (error) {
    console.error('Error processing radio subscription:', error);
    return json(
      { error: 'Failed to process subscription', message: error.message },
      { status: 500 }
    );
  }
}
