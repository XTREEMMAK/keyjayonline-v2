import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - HTML content to sanitize
 * @param {object} options - DOMPurify options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ...options
  };

  return DOMPurify.sanitize(html, defaultOptions);
}

/**
 * Sanitize plain text by escaping HTML entities
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text with HTML entities escaped
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize text but preserve line breaks as <br> tags safely
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text with safe line breaks
 */
export function sanitizeTextWithLineBreaks(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // First sanitize the text to escape HTML
  const sanitized = sanitizeText(text);
  
  // Then convert line breaks to <br> tags (safe since we already escaped everything)
  return sanitized.replace(/\n/g, '<br>');
}

/**
 * Sanitize email address
 * @param {string} email - Email to validate and sanitize
 * @returns {string} Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return '';
  }

  // Additional sanitization - remove any potential dangerous characters
  return trimmed.replace(/[<>"'&]/g, '');
}

/**
 * Sanitize all form data
 * @param {object} formData - Form data object to sanitize
 * @returns {object} Sanitized form data
 */
export function sanitizeFormData(formData) {
  const sanitized = {};

  for (const [key, value] of Object.entries(formData)) {
    if (typeof value !== 'string') {
      sanitized[key] = value;
      continue;
    }

    // Special handling for different field types
    switch (key) {
      case 'email':
        sanitized[key] = sanitizeEmail(value);
        break;
      case 'projectDetails':
      case 'generalMessage':
        // These fields allow line breaks but need HTML sanitization
        sanitized[key] = sanitizeTextWithLineBreaks(value);
        break;
      case 'honeypot':
        // Honeypot should always be empty - if not, it's suspicious
        sanitized[key] = '';
        break;
      default:
        // All other fields get basic text sanitization
        sanitized[key] = sanitizeText(value);
        break;
    }
  }

  return sanitized;
}

/**
 * Generate a secure hash of a string (for IP addresses, etc.)
 * @param {string} input - String to hash
 * @returns {string} Hashed string
 */
export function hashString(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Simple hash function for privacy (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sanitize user agent string
 * @param {string} userAgent - User agent string
 * @returns {string} Sanitized user agent (truncated and cleaned)
 */
export function sanitizeUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Unknown';
  }

  // Truncate and remove potentially dangerous characters
  return userAgent
    .substring(0, 200)
    .replace(/[<>"'&]/g, '')
    .trim() || 'Unknown';
}

/**
 * Validate and sanitize webhook payload
 * @param {object} payload - Webhook payload to sanitize
 * @returns {object} Sanitized webhook payload
 */
export function sanitizeWebhookPayload(payload) {
  return {
    formData: sanitizeFormData(payload.formData || {}),
    metadata: {
      formId: sanitizeText(payload.metadata?.formId || ''),
      formVersion: sanitizeText(payload.metadata?.formVersion || ''),
      submittedAt: payload.metadata?.submittedAt || new Date().toISOString(),
      processingTime: Number(payload.metadata?.processingTime) || 0,
      environment: sanitizeText(payload.metadata?.environment || '')
    },
    security: {
      honeypotPassed: Boolean(payload.security?.honeypotPassed),
      timeValidationPassed: Boolean(payload.security?.timeValidationPassed),
      rateLimitStatus: sanitizeText(payload.security?.rateLimitStatus || ''),
      clientIp: hashString(payload.security?.clientIp || ''),
      userAgent: sanitizeUserAgent(payload.security?.userAgent || '')
    },
    validation: {
      passed: Boolean(payload.validation?.passed),
      schema: sanitizeText(payload.validation?.schema || ''),
      errors: Array.isArray(payload.validation?.errors) ? payload.validation.errors.map(sanitizeText) : []
    }
  };
}