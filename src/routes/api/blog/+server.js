import { getBlogPosts, searchBlogPosts } from '$lib/services/directus-sdk.js';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	try {
		const page = Number(url.searchParams.get('page')) || 1;
		const limit = Number(url.searchParams.get('limit')) || 9;
		const search = url.searchParams.get('search');
		const section = url.searchParams.get('section');
		const offset = (page - 1) * limit;

		let blogPosts;
		
		if (search && search.trim()) {
			// Search posts
			blogPosts = await searchBlogPosts(search.trim(), limit, offset);
		} else {
			// Get regular posts
			blogPosts = await getBlogPosts(section, limit, offset);
		}

		return json({
			posts: blogPosts || [],
			pagination: {
				page,
				limit,
				hasMore: blogPosts && blogPosts.length === limit
			}
		});

	} catch (error) {
		console.error('API Error loading blog posts:', error);
		return json(
			{ error: 'Failed to load blog posts' },
			{ status: 500 }
		);
	}
}