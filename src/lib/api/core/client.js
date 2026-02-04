/**
 * Core Directus Client Setup
 * 
 * This module provides the centralized Directus client configuration
 * that all other API modules will use. This abstraction layer makes it
 * easier to switch to different CMS solutions in the future.
 */

import { createDirectus, rest, staticToken } from '@directus/sdk';
// Use dynamic imports to avoid build failures in CI when env vars are not set
import { env } from '$env/dynamic/private';

const DIRECTUS_URL = env.DIRECTUS_URL ?? 'http://localhost:8055';
const DIRECTUS_TOKEN = env.DIRECTUS_TOKEN ?? '';

/**
 * Creates and returns a configured Directus client instance
 * @returns {Object} Configured Directus client with REST API and authentication
 */
export function getDirectusInstance() {
  const directus = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(staticToken(DIRECTUS_TOKEN));
  
  return directus;
}

/**
 * Re-export commonly used Directus SDK functions for convenience
 * This makes it easier to replace with different query builders later
 */
export { readItems, readItem, createItem, updateItem } from '@directus/sdk';