/**
 * Page Headers Content API
 * 
 * This module handles fetching page-specific header images from Directus.
 * It provides functions to retrieve hero images for different pages,
 * similar to how the blog page header is handled.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';
// Use dynamic imports to avoid build failures in CI when env vars are not set
import { env } from '$env/dynamic/private';

const CDN_BASE_URL = env.CDN_BASE_URL ?? '';
const S3_BUCKET_URL = env.S3_BUCKET_URL ?? '';

/**
 * Fetches the music page header image from Directus general settings
 * Used for the music page hero section background
 * @returns {Promise<string|null>} URL of header image or null
 */
export async function getMusicPageHeader() {
  try {
    const directus = getDirectusInstance();
    
    const generalData = await directus.request(
      readItems('kjov2_general', {
        fields: [
          '*',
          {
            music_page_header: ['*']
          }
        ],
        limit: 1
      })
    );

    // Handle both array and single object responses
    const firstRecord = Array.isArray(generalData) ? generalData[0] : generalData;
    
    if (firstRecord && firstRecord.music_page_header) {
      const headerFile = firstRecord.music_page_header;
      
      // Directly use filename_disk since it's available
      if (headerFile.filename_disk) {
        return `${CDN_BASE_URL || S3_BUCKET_URL}/${headerFile.filename_disk}`;
      }
      
      // Fallback to buildAssetUrl
      return buildAssetUrl(headerFile);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching music page header:', error);
    return null;
  }
}

/**
 * Fetches the tech page header image from Directus general settings
 * Used for the tech page hero section background
 * @returns {Promise<string|null>} URL of header image or null
 */
export async function getTechPageHeader() {
  try {
    const directus = getDirectusInstance();
    
    const generalData = await directus.request(
      readItems('kjov2_general', {
        fields: [
          '*',
          {
            tech_page_header: ['*']
          }
        ],
        limit: 1
      })
    );

    // Handle both array and single object responses
    const firstRecord = Array.isArray(generalData) ? generalData[0] : generalData;
    
    if (firstRecord && firstRecord.tech_page_header) {
      const headerFile = firstRecord.tech_page_header;
      
      // Directly use filename_disk since it's available
      if (headerFile.filename_disk) {
        return `${CDN_BASE_URL || S3_BUCKET_URL}/${headerFile.filename_disk}`;
      }
      
      // Fallback to buildAssetUrl
      return buildAssetUrl(headerFile);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching tech page header:', error);
    return null;
  }
}

/**
 * Fetches the studio photo from Directus general settings (kjov2_general.studio_picture)
 * Used in the Music section's Studio tab
 * @returns {Promise<string|null>} URL of studio photo or null
 */
export async function getStudioPhoto() {
  try {
    const directus = getDirectusInstance();

    const generalData = await directus.request(
      readItems('kjov2_general', {
        fields: [
          { studio_picture: ['id', 'filename_disk'] }
        ],
        limit: 1
      })
    );

    const firstRecord = Array.isArray(generalData) ? generalData[0] : generalData;

    if (firstRecord && firstRecord.studio_picture) {
      const file = firstRecord.studio_picture;
      const baseUrl = CDN_BASE_URL || S3_BUCKET_URL;
      if (typeof file === 'object' && file.filename_disk && baseUrl) {
        return `${baseUrl}/${file.filename_disk}`;
      }
      return buildAssetUrl(file);
    }

    return null;
  } catch (error) {
    console.error('Error fetching studio photo:', error);
    return null;
  }
}

/**
 * Fetches the games page header image from Directus general settings
 * Used for the games page hero section background
 * @returns {Promise<string|null>} URL of header image or null
 */
export async function getGamesPageHeader() {
  try {
    const directus = getDirectusInstance();
    
    const generalData = await directus.request(
      readItems('kjov2_general', {
        fields: [
          '*',
          {
            games_page_header: ['*']
          }
        ],
        limit: 1
      })
    );

    // Handle both array and single object responses
    const firstRecord = Array.isArray(generalData) ? generalData[0] : generalData;
    
    if (firstRecord && firstRecord.games_page_header) {
      const headerFile = firstRecord.games_page_header;
      
      // Directly use filename_disk since it's available
      if (headerFile.filename_disk) {
        return `${CDN_BASE_URL || S3_BUCKET_URL}/${headerFile.filename_disk}`;
      }
      
      // Fallback to buildAssetUrl
      return buildAssetUrl(headerFile);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching games page header:', error);
    return null;
  }
}