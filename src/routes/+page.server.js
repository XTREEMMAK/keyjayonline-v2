import { getFeaturedWorks, getBlogPosts } from '$lib/services/directus-sdk.js';

export async function load() {
	try {
		const [featuredWorks, latestBlogPosts] = await Promise.all([
			getFeaturedWorks(),
			getBlogPosts(null, 6) // Fetch latest 6 blog posts
		]);
		
		return {
			featuredWorks,
			latestBlogPosts: latestBlogPosts || []
		};
	} catch (error) {
		console.error('Error loading data on homepage:', error);
		
		// Return fallback data
		return {
			featuredWorks: [],
			latestBlogPosts: []
		};
	}
}