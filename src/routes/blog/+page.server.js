import { getBlogPosts, getBlogPageHeader } from '$lib/services/directus-sdk.js';

export async function load({ url }) {
	try {
		const page = Number(url.searchParams.get('page')) || 1;
		const limit = 9; // Initial load - show 9 posts per page
		const offset = (page - 1) * limit;
		
		const [blogPosts, blogPageHeader] = await Promise.all([
			getBlogPosts(null, limit, offset),
			getBlogPageHeader()
		]);
		
		console.log('Blog posts:', blogPosts?.length || 0, 'Header:', blogPageHeader ? 'Found' : 'Not found');
		
		return {
			blogPageHeader,
			blogPosts: blogPosts || [],
			pagination: {
				page,
				limit,
				hasMore: blogPosts && blogPosts.length === limit // Assume more if we got full page
			}
		};
	} catch (error) {
		console.error('Error loading blog data:', error);
		
		return {
			blogPageHeader: null,
			blogPosts: [],
			pagination: {
				page: 1,
				limit: 9,
				hasMore: false
			}
		};
	}
}