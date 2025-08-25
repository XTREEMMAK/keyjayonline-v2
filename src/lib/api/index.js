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
  getMusicReleases 
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

// Social APIs
export { 
  getMusicNetworks 
} from './social/links.js';

// Site APIs
export { 
  getSiteSettings 
} from './site/settings.js';