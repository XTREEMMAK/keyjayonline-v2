/**
 * Asset Management Utilities
 * 
 * This module handles asset URL building and optimization.
 * It provides an abstraction layer that can be adapted for different
 * CMS or CDN solutions while maintaining consistent interfaces.
 */

import {
  DIRECTUS_URL,
  DIRECTUS_TOKEN,
  CDN_BASE_URL,
  S3_BUCKET_URL
} from '$env/static/private';

// Use dynamic import for optional env vars to avoid build failures
import { env } from '$env/dynamic/private';
const USE_CDN_FOR_ASSETS = env.USE_CDN_FOR_ASSETS ?? 'true';
const NODE_ENV = env.NODE_ENV ?? 'production';

/**
 * Builds optimized asset URLs for images and files
 * Automatically switches between CDN and Directus assets endpoint based on environment
 * @param {string|Object} fileId - File ID or Directus file object
 * @param {Object} transforms - Optional image transformations
 * @returns {string|null} Complete asset URL or null if no file provided
 */
export function buildAssetUrl(fileId, transforms = {}) {
  if (!fileId) return null;
  
  // Handle both string IDs and file objects from Directus
  let actualFileId = fileId;
  if (typeof fileId === 'object' && fileId !== null) {
    // If it's a file object from Directus, use filename_disk which includes the extension
    actualFileId = fileId.filename_disk || fileId.id;
  }
  
  // If it's already a full URL, return as-is
  if (typeof actualFileId === 'string' && (actualFileId.startsWith('http://') || actualFileId.startsWith('https://'))) {
    return actualFileId;
  }

  // Determine whether to use CDN based on configuration
  const shouldUseCDN = USE_CDN_FOR_ASSETS === 'true' || NODE_ENV === 'production';
  
  // Use CDN URL when configured (DirectUS files are stored in S3/DigitalOcean Spaces)
  // The CDN serves the files directly without going through DirectUS
  if (shouldUseCDN && (CDN_BASE_URL || S3_BUCKET_URL)) {
    const baseUrl = CDN_BASE_URL || S3_BUCKET_URL;
    
    // If we have a file object but no filename_disk, fall back to Directus assets endpoint
    if (typeof fileId === 'object' && fileId !== null && !fileId.filename_disk) {
      const assetId = fileId.id;
      return `${DIRECTUS_URL}/assets/${assetId}?access_token=${DIRECTUS_TOKEN}`;
    }
    
    // When using CDN, we can't use DirectUS transforms, just return direct file URL
    return `${baseUrl}/${actualFileId}`;
  }
  
  // Fallback to DirectUS assets endpoint for local development
  // This would only be used if CDN is not configured
  const baseUrl = DIRECTUS_URL;
  const params = new URLSearchParams(transforms);
  params.set('access_token', DIRECTUS_TOKEN);
  const queryString = `?${params.toString()}`;

  // For DirectUS assets endpoint, use the ID without extension
  const assetId = typeof fileId === 'object' ? fileId.id : fileId;
  return `${baseUrl}/assets/${assetId}${queryString}`;
}