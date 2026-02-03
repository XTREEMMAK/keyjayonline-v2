/**
 * Music Content API
 * 
 * This module handles all music-related content fetching from Directus.
 * It provides functions to retrieve music releases, albums, tracks, and
 * associated metadata like cover art, credits, and external links.
 */

import { getDirectusInstance, readItems } from '../core/client.js';
import { buildAssetUrl } from '../core/assets.js';
import { extractYouTubeId } from '../../utils/youtube.js';

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
                person_id: ['name', 'bio', 'website_url', 'profile_image.id', 'profile_image.filename_disk']
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
        display_order: credit.display_order,
        profile_image: credit.person_id?.profile_image
          ? buildAssetUrl(
              typeof credit.person_id.profile_image === 'object'
                ? credit.person_id.profile_image.filename_disk
                : credit.person_id.profile_image
            )
          : null
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

/**
 * Fetches music samples for a specific release from Directus
 * @param {number} releaseId - The ID of the music release
 * @returns {Promise<Array>} Array of music sample objects with track info
 */
export async function getMusicSamples(releaseId) {
  // Completely disabled - return empty array to stop Vite errors
  console.log('getMusicSamples disabled - releaseId:', releaseId);
  return [];
}

/**
 * Fetches the latest music releases for the Latest Projects section
 * Uses kjov2_music_releases table with background_image and thumbnail_url support
 * @param {number} limit - Maximum number of releases to fetch (default: 3)
 * @returns {Promise<Array>} Array of transformed latest project objects
 */
export async function getLatestProjects(limit = 3) {
  try {
    const directus = getDirectusInstance();

    // Note: background_image and thumbnail_url fields may not exist yet in Directus
    // The query will still work - missing fields just won't be returned
    const releases = await directus.request(
      readItems('kjov2_music_releases', {
        filter: {
          _or: [
            { published_status: { _eq: 'live' } },
            { published_status: { _null: true } }
          ]
        },
        sort: ['-release_date', '-created_at'],
        limit: limit,
        // Use wildcard for base fields, then specify relationships
        // Note: liner_notes explicitly included to ensure it's fetched
        fields: [
          '*',
          'liner_notes',
          'cover_art.id',
          'cover_art.filename_disk',
          'videos.*',
          'external_links.*',
          'external_links.icon_value.icon_reference_id'
        ]
      })
    );

    console.log('getLatestProjects - fetched', releases?.length || 0, 'releases');

    return releases.map(release => {
      // Build cover art URL - handle both object and string formats
      let coverArtUrl = null;
      if (release.cover_art) {
        if (typeof release.cover_art === 'object') {
          coverArtUrl = buildAssetUrl(release.cover_art.filename_disk || release.cover_art.id);
        } else {
          coverArtUrl = buildAssetUrl(release.cover_art);
        }
      }

      // Build background image URL (fallback to cover art)
      // This field may not exist yet in Directus
      let backgroundImageUrl = coverArtUrl;
      if (release.background_image) {
        if (typeof release.background_image === 'object') {
          backgroundImageUrl = buildAssetUrl(release.background_image.filename_disk || release.background_image.id);
        } else {
          backgroundImageUrl = buildAssetUrl(release.background_image);
        }
      }

      // Build thumbnail URL (fallback to cover art)
      // This field may not exist yet in Directus
      let thumbnailUrl = coverArtUrl;
      if (release.thumbnail_url) {
        if (typeof release.thumbnail_url === 'object') {
          thumbnailUrl = buildAssetUrl(release.thumbnail_url.filename_disk || release.thumbnail_url.id);
        } else {
          thumbnailUrl = buildAssetUrl(release.thumbnail_url);
        }
      }

      // Find featured video (first with featured=true, or first by display_order)
      const sortedVideos = [...(release.videos || [])].sort((a, b) => {
        // Featured videos first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        // Then by display_order
        return (a.display_order || 0) - (b.display_order || 0);
      });

      const featuredVideo = sortedVideos[0] || null;
      const videoId = featuredVideo?.video_url ? extractYouTubeId(featuredVideo.video_url) : null;

      return {
        id: release.id,
        title: release.title,
        artist: release.main_artist,
        releaseType: release.release_type,
        releaseDate: release.release_date,
        description: release.description,
        richContent: release.rich_content,
        linerNotes: release.liner_notes,
        coverArt: coverArtUrl,
        backgroundImageUrl: backgroundImageUrl,
        thumbnailUrl: thumbnailUrl,
        hasVideo: !!featuredVideo,
        featuredVideo: featuredVideo ? {
          id: featuredVideo.id,
          title: featuredVideo.title,
          description: featuredVideo.description,
          videoType: featuredVideo.video_type,
          videoUrl: featuredVideo.video_url,
          videoId: videoId,
          thumbnailUrl: featuredVideo.thumbnail_url ? buildAssetUrl(featuredVideo.thumbnail_url) : null
        } : null,
        videos: sortedVideos.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description,
          videoType: video.video_type,
          videoUrl: video.video_url,
          videoId: extractYouTubeId(video.video_url),
          thumbnailUrl: video.thumbnail_url ? buildAssetUrl(video.thumbnail_url) : null,
          featured: video.featured
        })),
        externalLinks: (release.external_links || []).map(link => {
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
            iconType: link.icon_type,
            iconValue: iconValue,
            displayOrder: link.display_order,
            isPrimary: link.is_primary
          };
        })
      };
    });

  } catch (error) {
    console.error('Error fetching latest projects:', error);
    return [];
  }
}

/**
 * Fetches new music releases for the Latest Projects carousel from Directus
 * Uses kjov2_music_new_releases collection with M2M streaming platforms
 * @returns {Promise<Array>} Array of transformed new release objects
 */
export async function getMusicNewReleases() {
  try {
    const directus = getDirectusInstance();

    const releases = await directus.request(
      readItems('kjov2_music_new_releases', {
        filter: {
          status: { _eq: 'published' }
        },
        sort: ['sort', '-release_date'],
        fields: [
          'id',
          'title',
          'description',
          'rich_content',
          'release_date',
          'release_type',
          'video_type',
          'video_url',
          'project_link',
          'project_link_label',
          'external_links',
          { background_image: ['id', 'filename_disk'] },
          { thumbnail_image: ['id', 'filename_disk'] },
          // M2M streaming platforms relationship
          { streaming_platforms: [
            { kjov2_music_networks_id: ['id', 'name', 'url', 'icon'] }
          ]}
        ]
      })
    );

    return releases.map(release => ({
      id: release.id,
      title: release.title,
      description: release.description,
      richContent: release.rich_content,
      releaseDate: release.release_date,
      releaseType: release.release_type,
      videoType: release.video_type,
      videoUrl: release.video_url,
      projectLink: release.project_link,
      projectLinkLabel: release.project_link_label,
      externalLinks: release.external_links || [],
      // Build asset URLs for images
      backgroundImageUrl: release.background_image
        ? buildAssetUrl(release.background_image.filename_disk || release.background_image.id)
        : null,
      thumbnailUrl: release.thumbnail_image
        ? buildAssetUrl(release.thumbnail_image.filename_disk || release.thumbnail_image.id)
        : null,
      // Extract YouTube video ID if applicable
      videoId: release.video_url ? extractYouTubeId(release.video_url) : null,
      // Flatten M2M relationship to array of streaming platforms
      streamingPlatforms: (release.streaming_platforms || [])
        .map(sp => sp.kjov2_music_networks_id)
        .filter(Boolean)
    }));

  } catch (error) {
    console.error('Error fetching new releases:', error);
    return [];
  }
}