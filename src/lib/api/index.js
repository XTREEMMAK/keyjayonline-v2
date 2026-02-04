/**
 * API Library Barrel Export
 * 
 * This file re-exports all API functions to maintain backward compatibility
 * while providing a clean, organized API structure. Applications can import
 * from this single entry point or import specific modules as needed.
 */

// Core utilities
export { buildAssetUrl } from './core/assets.js';
export { getDirectusInstance } from './core/client.js';

// Content APIs
export {
  getMusicReleases,
  getMusicNewReleases,
  getLatestProjects
  // getMusicSamples removed to avoid circular import issues - import directly from content/music.js if needed
} from './content/music.js';

export { 
  getBlogPosts, 
  searchBlogPosts, 
  getBlogPost,
  getBlogPageHeader 
} from './content/blog.js';

export { 
  getFeaturedWorks 
} from './content/featured.js';

export {
  getGamesLibrary,
  getCurrentDiscordActivity,
  getRecentGamingSessions,
  getGameById,
  searchGamesLibrary
} from './content/gaming.js';

export {
  getResourceCategories,
  getResources,
  getFeaturedResources,
  getCodeSnippets,
  getResourceById,
  searchResources
} from './content/resources.js';

export {
  getPhotoGalleries,
  getPhotos,
  getFeaturedPhotos,
  getPhotoById,
  getPhotoTags,
  searchPhotos
} from './content/photos.js';

export {
  getVoiceProjects,
  getVoiceCategories
} from './content/voice.js';

export {
  getProductions,
  getProductionsCategories,
  getProductionPages,
  getProductionById
} from './content/productions.js';

export {
  getTestimonials,
  getTestimonialsByServiceType,
  getTestimonialsForBio,
  getTestimonialsByCategory
} from './content/testimonials.js';

export {
  getMusicPageHeader,
  getTechPageHeader,
  getGamesPageHeader
} from './content/pages.js';

// Social APIs
export { 
  getMusicNetworks 
} from './social/links.js';

// Site APIs
export { 
  getSiteSettings 
} from './site/settings.js';