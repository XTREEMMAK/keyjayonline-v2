import { fail, redirect } from '@sveltejs/kit';
import { contactFormSchema } from '$lib/schemas/contactForm.js';
import * as v from 'valibot';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { sanitizeFormData, sanitizeWebhookPayload, hashString, sanitizeUserAgent } from '$lib/utils/sanitize.js';
import { checkRateLimit, getRateLimitHeaders, validateSubmissionTime } from '$lib/utils/rateLimit.js';

export async function load({ url }) {
  // Return basic form structure for compatibility
  return { 
    form: {
      name: '',
      email: '',
      inquiryType: '',
      serviceNeeded: '',
      budgetRange: '',
      timeline: '',
      projectDetails: '',
      generalMessage: '',
      honeypot: '',
      recaptchaToken: ''
    }
  };
}

export const actions = {
  contact: async ({ request, fetch, getClientAddress }) => {
    const startTime = Date.now();
    
    // Rate limiting check (with dev bypass for testing)
    const rateLimit = checkRateLimit(request);
    const rateLimitHeaders = getRateLimitHeaders(rateLimit);
    
    // In development, log but don't block for testing
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${hashString(rateLimit.ip)}`);
      if (dev) {
        console.log('⚠️  DEV MODE: Bypassing rate limit for testing');
      } else {
        return fail(429, 
          { error: 'Too many requests. Please try again later.' },
          { headers: rateLimitHeaders }
        );
      }
    }

    const formData = await request.formData();
    
    // Extract and sanitize form data
    let rawData = {
      name: formData.get('name')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      inquiryType: formData.get('inquiryType')?.toString() || '',
      serviceNeeded: formData.get('serviceNeeded')?.toString() || '',
      budgetRange: formData.get('budgetRange')?.toString() || '',
      timeline: formData.get('timeline')?.toString() || '',
      projectDetails: formData.get('projectDetails')?.toString() || '',
      generalMessage: formData.get('generalMessage')?.toString() || '',
      honeypot: formData.get('honeypot')?.toString() || '',
      recaptchaToken: formData.get('recaptchaToken')?.toString() || '',
      form_start_time: Number(formData.get('form_start_time')) || 0
    };

    // Sanitize form data
    const sanitizedData = sanitizeFormData(rawData);

    // Time-based validation
    const timeValidation = validateSubmissionTime(rawData.form_start_time);
    if (!timeValidation.valid) {
      console.log(`Time validation failed: ${timeValidation.reason} for IP: ${hashString(rateLimit.ip)}`);
      return fail(400, { error: 'Form submission validation failed' });
    }

    // Check honeypot for spam protection
    if (sanitizedData.honeypot) {
      console.log(`Spam detected via honeypot for IP: ${hashString(rateLimit.ip)}`);
      return fail(400, { error: 'Spam detected' });
    }

    // Validate with Valibot schema
    let validatedData;
    try {
      validatedData = v.parse(contactFormSchema, sanitizedData);
    } catch (error) {
      console.error('Validation error:', error);
      
      // Extract specific field errors
      if (error.issues && error.issues.length > 0) {
        const firstError = error.issues[0];
        return fail(400, { 
          error: firstError.message,
          field: firstError.path?.[0]?.key || firstError.path?.[0] || 'unknown'
        });
      }
      
      return fail(400, { error: 'Please check your form data and try again' });
    }

    try {
      // Prepare enhanced webhook payload with security and validation metadata
      const webhookPayload = {
        event: 'contact_form_submission',
        timestamp: new Date().toISOString(),
        data: {
          name: validatedData.name,
          email: validatedData.email,
          inquiryType: validatedData.inquiryType,
          ...(validatedData.inquiryType === 'service' && {
            serviceNeeded: validatedData.serviceNeeded,
            budgetRange: validatedData.budgetRange,
            timeline: validatedData.timeline,
            projectDetails: validatedData.projectDetails
          }),
          ...(validatedData.inquiryType === 'general' && {
            generalMessage: validatedData.generalMessage
          })
        },
        metadata: {
          formId: 'contact-form',
          formVersion: '2.0',
          submittedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          environment: dev ? 'development' : 'production'
        },
        security: {
          honeypotPassed: true,
          timeValidationPassed: timeValidation.valid,
          rateLimitStatus: 'allowed',
          clientIp: hashString(rateLimit.ip),
          userAgent: sanitizeUserAgent(request.headers.get('user-agent') || '')
        },
        validation: {
          passed: true,
          schema: 'contactFormSchema',
          errors: []
        }
      };

      // Send webhook with authentication headers
      const webhookResult = await sendWebhook(webhookPayload);

      if (dev) {
        console.log('🪝 Development Mode - Webhook submission:');
        console.log('  Webhook Result:', webhookResult);
        console.log('  Payload:', JSON.stringify(webhookPayload, null, 2));
      }

      if (!webhookResult.success) {
        throw new Error(`Webhook delivery failed: ${webhookResult.error}`);
      }

      return {
        success: true,
        message: 'Your message has been sent successfully! We\'ll get back to you soon.'
      };

    } catch (error) {
      console.error('Form submission error:', error);
      
      return fail(500, {
        error: 'Sorry, there was an error sending your message. Please try again later.'
      });
    }
  }
};

async function sendWebhook(payload) {
  try {
    const webhookUrl = env.CONTACT_FORM_WEBHOOK_URL;
    const webhookSecret = env.CONTACT_FORM_WEBHOOK_SECRET;
    
    if (!webhookUrl) {
      if (dev) {
        console.log('\n=== 🪝 WEBHOOK SIMULATION ===');
        console.log('No webhook URL configured (this is normal for development)');
        console.log('To test webhooks, set CONTACT_FORM_WEBHOOK_URL environment variable');
        console.log('Webhook payload would be:', JSON.stringify(payload, null, 2));
        console.log('==========================\n');
        return { success: true, simulated: true };
      }
      console.log('No webhook URL configured - form submission cannot be processed');
      return { success: false, error: 'Webhook URL not configured' };
    }

    // Prepare headers with authentication
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'KeyJay-ContactForm/2.0',
      'X-Webhook-Source': 'keyjaymusic-contact-form',
      'X-Webhook-Timestamp': payload.timestamp
    };

    // Add authentication header if secret is configured
    if (webhookSecret) {
      headers['Authorization'] = `Bearer ${webhookSecret}`;
      headers['X-Webhook-Signature'] = await generateWebhookSignature(JSON.stringify(payload), webhookSecret);
    } else if (dev) {
      console.log('⚠️  No webhook secret configured - consider setting CONTACT_FORM_WEBHOOK_SECRET for production');
    }

    // Send webhook with retry logic
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        console.log(`Webhook sent successfully on attempt ${attempt}`);
        return { success: true, attempt };

      } catch (error) {
        lastError = error;
        console.log(`Webhook attempt ${attempt} failed:`, error.message);
        
        if (attempt < 3) {
          // Exponential backoff: wait 1s, then 2s
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    throw lastError;

  } catch (error) {
    console.error('Webhook sending failed after all retries:', error);
    return { success: false, error: error.message };
  }
}

// Generate HMAC signature for webhook authentication
async function generateWebhookSignature(payload, secret) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Failed to generate webhook signature:', error);
    return 'signature-generation-failed';
  }
}

// Helper functions (duplicated from schema for server-side use)
function getInquiryTypeDisplayName(inquiryType) {
  const inquiryNames = {
    'general': 'General Message',
    'service': 'Service Request'
  };
  return inquiryNames[inquiryType] || inquiryType;
}

function getServiceDisplayName(service) {
  const serviceNames = {
    'music-production': 'Music Production',
    'voice-over': 'Voice-Over',
    'gaming-content': 'Gaming Content',
    'technical-consulting': 'Technical Consulting',
    'creative-direction': 'Creative Direction',
    'other': 'Other'
  };
  return serviceNames[service] || service;
}

function getBudgetDisplayName(budget) {
  const budgetNames = {
    'under-500': 'Under $500',
    '500-1000': '$500 - $1,000',
    '1000-2500': '$1,000 - $2,500',
    '2500-5000': '$2,500 - $5,000',
    '5000-10000': '$5,000 - $10,000',
    '10000-plus': '$10,000+',
    'lets-discuss': "Let's discuss"
  };
  return budgetNames[budget] || budget;
}

function getTimelineDisplayName(timeline) {
  const timelineNames = {
    'asap': 'ASAP',
    'within-1-week': 'Within 1 week',
    'within-2-weeks': 'Within 2 weeks',
    'within-1-month': 'Within 1 month',
    'within-3-months': 'Within 3 months',
    'no-rush': 'No rush',
    'flexible': 'Flexible'
  };
  return timelineNames[timeline] || timeline;
}