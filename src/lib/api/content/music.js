/**
 * Music Content API
 * 
 * This module handles all music-related content fetching from Directus.
 * It provides functions to retrieve music releases, albums, tracks, and
 * associated metadata like cover art, credits, and external links.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';

/**
 * Fetches all published music releases from Directus
 * Includes related data like cover art, external links, credits, and videos
 * Only returns releases with published_status = 'live' or null (backward compatibility)
 * @returns {Promise<Array>} Array of transformed music release objects
 */
export async function getMusicReleases() {
  try {
    const directus = getDirectusInstance();
    
    // Use DirectUS SDK to fetch releases with cover art and credits  
    const releases = await directus.request(
      readItems('kjov2_music_releases', {
        // Filter to only show live releases (published_status = 'live' or null for backward compatibility)
        filter: {
          _or: [
            { published_status: { _eq: 'live' } },
            { published_status: { _null: true } }
          ]
        },
        // Specify fields including the cover art file relationship and credits
        fields: [
          '*',  // All direct fields
          {
            cover_art: ['id', 'filename_disk', 'filename_download']
          },
          {
            credits: [
              'role',
              'additional_info',
              'display_order',
              {
                person_id: ['name', 'bio', 'website_url']
              }
            ]
          },
          {
            videos: [
              'id',
              'title',
              'description',
              'video_type',
              'video_url',
              'thumbnail_url',
              'display_order',
              'featured'
            ]
          },
          {
            external_links: [
              'id',
              'url',
              'label',
              'icon_type',
              'display_order',
              'is_primary',
              {
                icon_value: ['icon_reference_id']
              }
            ]
          }
        ],
        // Sort by release date
        sort: ['-release_date', '-created_at']
      })
    );

    // Transform the data to match our existing format
    return releases.map(release => ({
      id: release.id,
      title: release.title,
      artist: release.main_artist, // Default artist
      release_type: release.release_type,
      // Handle cover_art - it can be a UUID string or an object with file details
      cover_art: release.cover_art ? 
        (typeof release.cover_art === 'object' ? 
          buildAssetUrl(release.cover_art.filename_disk || release.cover_art.id) : 
          buildAssetUrl(release.cover_art)) : null,
      release_date: release.release_date,
      description: release.description,
      rich_content: release.rich_content,
      featured: release.featured,
      liner_notes: release.liner_notes,
      access_type: release.access_type,
      published_status: release.published_status,
      minimum_price: parseFloat(release.minimum_price) || 0,
      suggested_price: parseFloat(release.suggested_price) || 0,
      track_count: 0, // Will need separate query for tracks
      genre: 'Unknown', // Will need tracks data
      
      // These would need additional queries or relationships set up in DirectUS
      tracks: [],
      videos: (release.videos || []).map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        video_type: video.video_type,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
        display_order: video.display_order,
        featured: video.featured
      })),
      youtube_videos: (release.videos || [])
        .filter(video => video.video_type === 'youtube')
        .map(video => ({
          id: video.video_url.includes('youtube.com/watch?v=') 
            ? video.video_url.split('v=')[1]?.split('&')[0]
            : video.video_url.includes('youtu.be/')
            ? video.video_url.split('youtu.be/')[1]?.split('?')[0]
            : video.video_url,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
          featured: video.featured
        })),
      external_links: (release.external_links || []).map(link => {
        // Handle icon field - check if icon_value is an object with icon_reference_id
        let iconValue = null;
        if (link.icon_value && typeof link.icon_value === 'object') {
          iconValue = link.icon_value.icon_reference_id;
        } else {
          iconValue = link.icon_value;
        }
        
        return {
          id: link.id,
          url: link.url,
          label: link.label,
          icon_type: link.icon_type,
          icon_value: iconValue,
          display_order: link.display_order,
          is_primary: link.is_primary
        };
      }),
      credits: (release.credits || []).map(credit => ({
        role: credit.role,
        name: credit.person_id?.name || 'Unknown',
        additional_info: credit.additional_info,
        bio: credit.person_id?.bio,
        website_url: credit.person_id?.website_url,
        display_order: credit.display_order
      })),
      
      // Legacy fields for compatibility
      spotify_url: undefined,
      bandcamp_url: undefined,
      apple_music_url: undefined,
      youtube_url: undefined,
      tidal_url: undefined
    }));

  } catch (error) {
    console.error('DirectUS SDK error:', error);
    // Return empty array as fallback
    return [];
  }
}