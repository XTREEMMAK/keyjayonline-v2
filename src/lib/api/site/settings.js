/**
 * Site Configuration & Settings API
 * 
 * This module handles site-wide configuration settings from Directus.
 * It manages maintenance mode status, page enable/disable states, 
 * featured works relationships, and social media links.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';
import { extractYouTubeId } from '$lib/utils/youtube.js';
import { getSocialPlatformColors } from '$lib/utils/colors.js';

/**
 * Fetches general site configuration from Directus
 * Includes maintenance mode status, page enable/disable states, featured works, and social links
 * Provides comprehensive fallback data if database is unavailable
 * @returns {Promise<Object>} Site configuration object with status and page settings
 */
export async function getSiteSettings() {
  try {
    const directus = getDirectusInstance();
    
    // Fetch general settings with explicit fields that exist in Directus
    console.log('Fetching kjov2_general...');
    const settings = await directus.request(
      readItems('kjov2_general', {
        fields: [
          'id',
          'status',
          'music_page_disabled',
          'music_page_header',
          'games_page_disabled',
          'games_page_header',
          'tech_page_disabled',
          'tech_page_header',
          'blog_page_disabled',
          'blog_page_header'
        ],
        limit: 1
      })
    );
    console.log('kjov2_general fetched successfully');

    // Fetch socials from separate table with icon reference expanded
    let socials = [];
    try {
      console.log('Fetching socials from kjov2_socials...');
      socials = await directus.request(
        readItems('kjov2_socials', {
          fields: ['id', 'name', 'url', 'sort', 'icon_selector_name.icon_reference_id'],
          sort: ['sort', 'id']
        })
      );
      console.log('Raw socials from kjov2_socials:', JSON.stringify(socials, null, 2));
    } catch (socialsError) {
      console.error('Error fetching socials:', socialsError);
      // Continue with empty socials array
    }

    // Handle the case where settings is an object (single record) instead of array
    const siteConfig = Array.isArray(settings) ? settings[0] : settings;

    // Check if we got valid data from the database
    if (!siteConfig || Object.keys(siteConfig).length === 0) {
      throw new Error('No data from database, using fallback');
    }
    
    // Process featured works if they exist
    const featuredWorks = siteConfig.featured ? siteConfig.featured.map(work => ({
      id: work.id || work.feat_id,
      title: work.header || work.title,
      description: work.details || work.description,
      backgroundImageUrl: work.background ? buildAssetUrl(work.background) : 'https://images.unsplash.com/photo-1729575846511-f499d2e17d79?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFzaWMlMjBiYWNrZ3JvdW5kfGVufDB8fDB8fHww',
      leftContent: {
        type: work.hosted_type || work.video_type || 'image',
        src: (work.hosted_type === 'youtube' || work.video_type === 'youtube')
          ? null 
          : (work.left_local_content ? 
              buildAssetUrl(work.left_local_content) :
              (work.thumbnail_image ? 
                (typeof work.thumbnail_image === 'object' ? 
                  buildAssetUrl(work.thumbnail_image.filename_disk || work.thumbnail_image.id) : 
                  buildAssetUrl(work.thumbnail_image)) : 
                'https://placehold.co/800x600/1a1a1a/ffffff?text=Featured+Work')),
        videoId: (work.hosted_type === 'youtube' || work.video_type === 'youtube') && 
                 (work.left_remote_content || work.video_url) ? 
          extractYouTubeId(work.left_remote_content || work.video_url) : null
      },
      video_url: work.left_remote_content || work.video_url,
      video_type: work.hosted_type || work.video_type,
      featured: work.featured || false,
      display_order: work.sort || work.display_order || 0,
      link: work.project_link || '#'
    })) : [];

    // Process social links if they exist (from kjov2_socials table)
    const socialLinks = socials && socials.length > 0 ? socials.map(social => {
      // Handle icon field - check various possible formats from Directus
      let iconName = null;

      if (social.icon_selector_name) {
        if (typeof social.icon_selector_name === 'object') {
          // If it's a relation object, try to get the icon reference
          iconName = social.icon_selector_name.icon_reference_id || social.icon_selector_name.icon || social.icon_selector_name.name;
        } else if (typeof social.icon_selector_name === 'string') {
          // If it's a string, use it directly
          iconName = social.icon_selector_name;
        }
      }

      // Fallback: generate icon name from social platform name
      if (!iconName && social.name) {
        const platformName = social.name.toLowerCase();
        // Map common platform names to Iconify icons
        const iconMap = {
          'youtube': 'line-md:youtube-filled',
          'instagram': 'line-md:instagram',
          'twitter': 'mdi:twitter',
          'x': 'ri:twitter-x-fill',
          'bluesky': 'line-md:bluesky',
          'facebook': 'mdi:facebook',
          'tiktok': 'ic:baseline-tiktok',
          'spotify': 'mdi:spotify',
          'bandcamp': 'fa7-brands:bandcamp',
          'soundcloud': 'mdi:soundcloud',
          'twitch': 'mdi:twitch',
          'linkedin': 'mdi:linkedin',
          'github': 'mdi:github'
        };
        iconName = iconMap[platformName] || `mdi:${platformName}`;
      }

      return {
        id: social.id,
        name: social.name,
        icon: iconName,
        url: social.url,
        color: getSocialPlatformColors(social.name),
        display_order: 0 // Default since display_order field doesn't exist
      };
    }) : [];

    // Debug: Log processed socialLinks
    console.log('Processed socialLinks:', JSON.stringify(socialLinks, null, 2));

    const result = {
      status: siteConfig.status?.toLowerCase() || 'live', // Normalize to lowercase: 'live' or 'maintenance'
      featuredWorks,
      socialLinks,
      pages: {
        music: {
          disabled: siteConfig.music_page_disabled || false,
          header_background: siteConfig.music_page_header || null
        },
        games: {
          disabled: siteConfig.games_page_disabled || false,
          header_background: siteConfig.games_page_header || null
        },
        voice: {
          disabled: siteConfig.voice_page_disabled || false,
          header_background: siteConfig.voice_page_header || null
        },
        tech: {
          disabled: siteConfig.tech_page_disabled || false,
          header_background: siteConfig.tech_page_header || null
        },
        productions: {
          disabled: siteConfig.productions_page_disabled || false,
          header_background: siteConfig.productions_page_header || null
        },
        blog: {
          disabled: siteConfig.blog_page_disabled || false,
          header_background: siteConfig.blog_page_header || null
        },
        about: {
          disabled: siteConfig.about_page_disabled || false,
          header_background: siteConfig.about_page_header || null
        },
        contact: {
          disabled: siteConfig.contact_page_disabled || false,
          header_background: siteConfig.contact_page_header || null
        }
      }
    };

    return result;

  } catch (error) {
    console.error('Error fetching site settings:', error);
    
    // Realistic fallback data that matches production database state
    const fallbackResult = {
      status: 'live',
      featuredWorks: [], // Empty array if database is unavailable
      socialLinks: [], // Empty array if database is unavailable
      pages: {
        music: { disabled: false, header_background: null },
        games: { disabled: false, header_background: null },
        voice: { disabled: false, header_background: null },
        tech: { disabled: false, header_background: null }, // Tech is NOT disabled in production
        productions: { disabled: false, header_background: null },
        blog: { disabled: false, header_background: null },
        about: { disabled: false, header_background: null },
        contact: { disabled: false, header_background: null }
      }
    };
    
    return fallbackResult;
  }
}