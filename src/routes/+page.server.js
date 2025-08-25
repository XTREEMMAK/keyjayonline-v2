import { getFeaturedWorks, getBlogPosts } from '$lib/api/index.js';

export async function load({ parent }) {
	try {
		// Get site settings from parent layout (includes featured works relationship)
		const parentData = await parent();
		
		const latestBlogPosts = await getBlogPosts(null, 6); // Fetch latest 6 blog posts
		
		// Use featured works from site settings if available, otherwise fallback to direct query
		const featuredWorks = parentData.siteSettings?.featuredWorks?.length > 0 
			? await getFeaturedWorks(parentData.siteSettings.featuredWorks)
			: await getFeaturedWorks();
		
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