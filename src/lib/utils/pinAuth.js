/**
 * Shared PIN Authentication Utility
 *
 * Used by maintenance bypass and (future) resume PIN protection.
 * Zero external dependencies — uses only Node.js built-in crypto.
 */

import { createHmac, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Cookie & Duration Constants
// ---------------------------------------------------------------------------

/** Maintenance bypass cookie */
export const MAINT_COOKIE_NAME = '__kjo_maint_bypass';
export const MAINT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const MAINT_DURATION_SECONDS = 28800;

/** Resume access cookie (future use) */
export const RESUME_COOKIE_NAME = '__kjo_resume_access';
export const RESUME_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const RESUME_DURATION_SECONDS = 1800;

// ---------------------------------------------------------------------------
// PIN Verification — Direct Comparison (env var PINs)
// ---------------------------------------------------------------------------

/**
 * Constant-time comparison of two plaintext strings.
 * Used when PIN is stored as an environment variable (not hashed).
 * @param {string} submitted - User-submitted PIN
 * @param {string} correct - Correct PIN from env var
 * @returns {boolean}
 */
export function verifyPin(submitted, correct) {
	if (typeof submitted !== 'string' || typeof correct !== 'string') return false;
	if (submitted.length === 0 || correct.length === 0) return false;

	const submittedBuf = Buffer.from(submitted, 'utf-8');
	const correctBuf = Buffer.from(correct, 'utf-8');

	// If lengths differ, compare submitted against itself to maintain constant time
	if (submittedBuf.length !== correctBuf.length) {
		timingSafeEqual(submittedBuf, submittedBuf);
		return false;
	}

	return timingSafeEqual(submittedBuf, correctBuf);
}

// ---------------------------------------------------------------------------
// PIN Hashing — scrypt (for DB-stored PINs, e.g. resume feature)
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p

/**
 * Hash a PIN for database storage using scrypt.
 * Returns "salt:hash" format (both hex-encoded).
 * @param {string} pin
 * @returns {string}
 */
export function hashPin(pin) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(pin, salt, SCRYPT_KEYLEN, {
		N: SCRYPT_COST,
		r: SCRYPT_BLOCK_SIZE,
		p: SCRYPT_PARALLELIZATION
	}).toString('hex');
	return `${salt}:${hash}`;
}

/**
 * Verify a submitted PIN against a stored "salt:hash" string.
 * @param {string} submitted - User-submitted PIN
 * @param {string} storedHash - "salt:hash" from database
 * @returns {boolean}
 */
export function verifyHashedPin(submitted, storedHash) {
	if (typeof submitted !== 'string' || typeof storedHash !== 'string') return false;

	const parts = storedHash.split(':');
	if (parts.length !== 2) return false;

	const [salt, expectedHash] = parts;
	const submittedHash = scryptSync(submitted, salt, SCRYPT_KEYLEN, {
		N: SCRYPT_COST,
		r: SCRYPT_BLOCK_SIZE,
		p: SCRYPT_PARALLELIZATION
	}).toString('hex');

	const submittedBuf = Buffer.from(submittedHash, 'hex');
	const expectedBuf = Buffer.from(expectedHash, 'hex');

	if (submittedBuf.length !== expectedBuf.length) {
		timingSafeEqual(submittedBuf, submittedBuf);
		return false;
	}

	return timingSafeEqual(submittedBuf, expectedBuf);
}

// ---------------------------------------------------------------------------
// HMAC-Signed Bypass Tokens (cookie session management)
// ---------------------------------------------------------------------------

/**
 * Generate an HMAC-signed bypass token with an expiry timestamp.
 * Token format: "{expiryMs}.{hmacSha256Hex}"
 * @param {string} secret - HMAC signing secret
 * @param {number} durationMs - Token lifetime in milliseconds
 * @returns {string}
 */
export function generateBypassToken(secret, durationMs) {
	const expiryMs = Date.now() + durationMs;
	const signature = createHmac('sha256', secret).update(expiryMs.toString()).digest('hex');
	return `${expiryMs}.${signature}`;
}

/**
 * Validate an HMAC-signed bypass token.
 * @param {string} token - Token string from cookie
 * @param {string} secret - HMAC signing secret
 * @returns {{ valid: boolean, expiresAt: number | null }}
 */
export function validateBypassToken(token, secret) {
	if (typeof token !== 'string' || typeof secret !== 'string') {
		return { valid: false, expiresAt: null };
	}

	const dotIndex = token.indexOf('.');
	if (dotIndex === -1) return { valid: false, expiresAt: null };

	const expiryStr = token.slice(0, dotIndex);
	const providedSig = token.slice(dotIndex + 1);

	const expiryMs = Number(expiryStr);
	if (!Number.isFinite(expiryMs)) return { valid: false, expiresAt: null };

	// Check expiry before doing HMAC (fast reject for expired tokens)
	if (expiryMs <= Date.now()) return { valid: false, expiresAt: expiryMs };

	// Recompute HMAC and compare
	const expectedSig = createHmac('sha256', secret).update(expiryStr).digest('hex');

	const providedBuf = Buffer.from(providedSig, 'utf-8');
	const expectedBuf = Buffer.from(expectedSig, 'utf-8');

	if (providedBuf.length !== expectedBuf.length) {
		timingSafeEqual(providedBuf, providedBuf);
		return { valid: false, expiresAt: expiryMs };
	}

	const sigValid = timingSafeEqual(providedBuf, expectedBuf);
	return { valid: sigValid, expiresAt: sigValid ? expiryMs : null };
}

// ---------------------------------------------------------------------------
// Dedicated Rate Limiter for PIN Endpoints
// ---------------------------------------------------------------------------

const pinAttempts = new Map();

const PIN_RATE_CONFIG = {
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxAttempts: 3
};

function getClientIp(request) {
	const headers = request.headers;
	return (
		headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		headers.get('x-real-ip') ||
		headers.get('cf-connecting-ip') ||
		'unknown'
	);
}

/**
 * Check if a PIN verification request should be rate limited.
 * Separate from contact form rate limiter — uses its own store.
 * @param {Request} request
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function checkPinRateLimit(request) {
	const ip = getClientIp(request);
	const now = Date.now();

	// Probabilistic cleanup
	if (Math.random() < 0.05) {
		const cutoff = now - PIN_RATE_CONFIG.windowMs * 2;
		for (const [key, data] of pinAttempts.entries()) {
			if (data.firstAttempt < cutoff) pinAttempts.delete(key);
		}
	}

	let ipData = pinAttempts.get(ip);
	if (!ipData) {
		ipData = { attempts: [], firstAttempt: now };
		pinAttempts.set(ip, ipData);
	}

	// Prune attempts outside the window
	const windowStart = now - PIN_RATE_CONFIG.windowMs;
	ipData.attempts = ipData.attempts.filter((t) => t > windowStart);

	if (ipData.attempts.length >= PIN_RATE_CONFIG.maxAttempts) {
		const resetTime = ipData.attempts[0] + PIN_RATE_CONFIG.windowMs;
		const retryAfter = Math.ceil((resetTime - now) / 1000);
		return { allowed: false, remaining: 0, retryAfter };
	}

	ipData.attempts.push(now);
	const remaining = PIN_RATE_CONFIG.maxAttempts - ipData.attempts.length;

	return { allowed: true, remaining, retryAfter: 0 };
}
