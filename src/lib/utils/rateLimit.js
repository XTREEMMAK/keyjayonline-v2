/**
 * Simple in-memory rate limiter for contact form submissions
 * In production, you might want to use Redis or a database for persistence
 */

// Store for tracking submissions per IP
const submissions = new Map();

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Maximum 5 requests per window
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

/**
 * Clean up old entries from the rate limit store
 * Should be called periodically to prevent memory leaks
 */
function cleanupOldEntries() {
  const now = Date.now();
  const cutoff = now - (RATE_LIMIT_CONFIG.windowMs * 2); // Keep entries for 2x the window
  
  for (const [ip, data] of submissions.entries()) {
    if (data.firstRequest < cutoff) {
      submissions.delete(ip);
    }
  }
}

/**
 * Get client IP address from request
 * @param {Request} request - The request object
 * @returns {string} Client IP address
 */
function getClientIp(request) {
  // Check various headers for the real IP
  const headers = request.headers;
  
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('x-client-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-forwarded') ||
    headers.get('forwarded-for') ||
    headers.get('forwarded') ||
    'unknown'
  );
}

/**
 * Check if request should be rate limited
 * @param {Request} request - The request object
 * @returns {Object} Rate limit result
 */
export function checkRateLimit(request) {
  const ip = getClientIp(request);
  const now = Date.now();
  
  // Clean up old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupOldEntries();
  }
  
  // Get or create submission data for this IP
  let ipData = submissions.get(ip);
  
  if (!ipData) {
    ipData = {
      count: 0,
      firstRequest: now,
      lastRequest: now,
      requests: []
    };
    submissions.set(ip, ipData);
  }
  
  // Clean old requests outside the window
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  ipData.requests = ipData.requests.filter(timestamp => timestamp > windowStart);
  ipData.count = ipData.requests.length;
  
  // Check if rate limit exceeded
  if (ipData.count >= RATE_LIMIT_CONFIG.maxRequests) {
    const resetTime = ipData.requests[0] + RATE_LIMIT_CONFIG.windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    
    return {
      allowed: false,
      limit: RATE_LIMIT_CONFIG.maxRequests,
      remaining: 0,
      reset: resetTime,
      retryAfter: retryAfter,
      status: 'rate_limited',
      ip: ip // Include for logging (will be hashed later)
    };
  }
  
  // Add this request
  ipData.requests.push(now);
  ipData.count++;
  ipData.lastRequest = now;
  
  const remaining = RATE_LIMIT_CONFIG.maxRequests - ipData.count;
  const resetTime = now + RATE_LIMIT_CONFIG.windowMs;
  
  return {
    allowed: true,
    limit: RATE_LIMIT_CONFIG.maxRequests,
    remaining: remaining,
    reset: resetTime,
    retryAfter: 0,
    status: 'allowed',
    ip: ip // Include for logging (will be hashed later)
  };
}

/**
 * Create rate limit headers for response
 * @param {Object} rateLimit - Rate limit result
 * @returns {Object} Headers object
 */
export function getRateLimitHeaders(rateLimit) {
  return {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toString(),
    ...(rateLimit.retryAfter > 0 && {
      'Retry-After': rateLimit.retryAfter.toString()
    })
  };
}

/**
 * Time-based validation - check if form was filled too quickly
 * @param {number} startTime - Form start timestamp
 * @param {number} minTime - Minimum time in milliseconds (default: 3 seconds)
 * @returns {Object} Validation result
 */
export function validateSubmissionTime(startTime, minTime = 3000) {
  if (!startTime || typeof startTime !== 'number') {
    return {
      valid: false,
      reason: 'missing_start_time',
      message: 'Form timing validation failed'
    };
  }
  
  const now = Date.now();
  const timeTaken = now - startTime;
  
  // Check if too fast (likely bot)
  if (timeTaken < minTime) {
    return {
      valid: false,
      reason: 'too_fast',
      message: 'Form submitted too quickly',
      timeTaken: timeTaken,
      minTime: minTime
    };
  }
  
  // Check if too slow (likely stale form - optional check)
  const maxTime = 30 * 60 * 1000; // 30 minutes
  if (timeTaken > maxTime) {
    return {
      valid: false,
      reason: 'too_slow',
      message: 'Form session expired',
      timeTaken: timeTaken,
      maxTime: maxTime
    };
  }
  
  return {
    valid: true,
    reason: 'valid',
    message: 'Timing validation passed',
    timeTaken: timeTaken
  };
}

/**
 * Get rate limit statistics (for monitoring)
 * @returns {Object} Statistics object
 */
export function getRateLimitStats() {
  const stats = {
    totalIPs: submissions.size,
    activeIPs: 0,
    totalRequests: 0,
    rateLimitedIPs: 0
  };
  
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  
  for (const [ip, data] of submissions.entries()) {
    const recentRequests = data.requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length > 0) {
      stats.activeIPs++;
      stats.totalRequests += recentRequests.length;
      
      if (recentRequests.length >= RATE_LIMIT_CONFIG.maxRequests) {
        stats.rateLimitedIPs++;
      }
    }
  }
  
  return stats;
}

/**
 * Reset rate limit for a specific IP (admin function)
 * @param {string} ip - IP address to reset
 * @returns {boolean} Success status
 */
export function resetRateLimit(ip) {
  return submissions.delete(ip);
}

/**
 * Configure rate limits (for testing or different environments)
 * @param {Object} config - Configuration object
 */
export function configureRateLimit(config) {
  Object.assign(RATE_LIMIT_CONFIG, config);
}

// Export configuration for reference
export { RATE_LIMIT_CONFIG };