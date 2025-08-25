/**
 * Social Media & External Links API
 * 
 * This module handles social media links and music network/platform
 * information fetching from Directus. Social links are now managed
 * through the kjov2_general.socials relationship.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { getMusicPlatformColors } from '$lib/utils/colors.js';

/**
 * Fetches music streaming platforms and networks from Directus
 * Used for "Listen On" sections throughout the application
 * @returns {Promise<Array>} Array of music network/platform objects
 */
export async function getMusicNetworks() {
  try {
    const directus = getDirectusInstance();
    
    const musicNetworks = await directus.request(
      readItems('kjov2_music_networks', {
        fields: [
          '*',
          {
            icon_selector_name: ['*']
          }
        ]
      })
    );

    if (musicNetworks && musicNetworks.length > 0) {
      // Transform the data to match our expected format
      const transformedNetworks = musicNetworks.map(network => {
        // Handle icon field - check if icon_selector_name is an object with icon_reference_id
        let iconName = null;
        if (network.icon_selector_name && typeof network.icon_selector_name === 'object') {
          iconName = network.icon_selector_name.icon_reference_id;
        } else {
          iconName = network.icon || network.icon_class || network.icon_name || network.icon_selector_name || `simple-icons:${(network.name || '').toLowerCase()}`;
        }
        
        return {
          id: network.id,
          name: network.name || network.platform,
          icon: iconName,
          url: network.url,
          color: network.color || getMusicPlatformColors(network.name || network.platform),
          display_order: network.display_order || network.sort || network.sort_order || 0
        };
      });
      
      // Sort by display_order
      transformedNetworks.sort((a, b) => a.display_order - b.display_order);
      
      return transformedNetworks;
    }
  } catch (error) {
    console.error('Error fetching music networks:', error);
  }
  
  // Return empty array if database fetch fails
  return [];
}