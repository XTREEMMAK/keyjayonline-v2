/**
 * Environment Detection Utilities
 * 
 * Provides utilities for detecting development vs production environments
 * and handling environment-specific configurations like CORS bypass.
 */

import { dev } from '$app/environment';

/**
 * Check if we're running in development mode
 * @returns {boolean} True if in development, false in production
 */
export function isDevelopment() {
  return dev;
}

/**
 * Check if we're running in production mode
 * @returns {boolean} True if in production, false in development
 */
export function isProduction() {
  return !dev;
}

/**
 * Check if CORS bypass should be enabled for development
 * Reads from environment variable and development mode detection
 * @returns {boolean} True if CORS bypass should be enabled
 */
export function shouldBypassCors() {
  // Only bypass CORS in development mode
  if (!isDevelopment()) {
    return false;
  }
  
  // Check if explicitly disabled via environment variable
  if (typeof process !== 'undefined' && process.env && process.env.BYPASS_CORS_IN_DEV === 'false') {
    return false;
  }
  
  // Default to bypass in development
  return true;
}

/**
 * Transform a CDN audio URL for development CORS bypass
 * In development: Routes through local proxy
 * In production: Returns original URL
 * @param {string} originalUrl - The original CDN URL
 * @returns {string} - The transformed URL appropriate for current environment
 */
export function getAudioUrl(originalUrl) {
  if (!originalUrl) return originalUrl;
  
  // In production or if bypass disabled, return original URL
  if (!shouldBypassCors()) {
    return originalUrl;
  }
  
  // In development, route through proxy
  // Extract the path from the CDN URL
  const cdnBaseUrl = 'https://kjo.nyc3.cdn.digitaloceanspaces.com';
  if (originalUrl.startsWith(cdnBaseUrl)) {
    const path = originalUrl.replace(cdnBaseUrl, '');
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/api/proxy-audio/${cleanPath}`;
  }
  
  // If not a CDN URL, return as-is
  return originalUrl;
}

/**
 * Get environment-specific WaveSurfer configuration
 * @returns {object} WaveSurfer configuration object
 */
export function getWaveSurferConfig() {
  const baseConfig = {
    waveColor: '#60a5fa',
    progressColor: '#3b82f6',
    cursorColor: '#ffffff',
    height: 40,
    responsive: true,
    mediaControls: false
  };
  
  if (isDevelopment()) {
    return {
      ...baseConfig,
      // Use MediaElement backend in development for better CORS handling
      backend: 'MediaElement',
      // Add more lenient settings for development
      normalize: true,
      fillParent: true
    };
  }
  
  return {
    ...baseConfig,
    // Production can use more advanced features
    normalize: true,
    fillParent: true
  };
}