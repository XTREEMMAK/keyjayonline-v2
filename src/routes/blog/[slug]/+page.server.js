import { getBlogPost } from '$lib/services/directus-sdk.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		const blogPost = await getBlogPost(params.slug);
		
		if (!blogPost) {
			throw error(404, 'Blog post not found');
		}
		
		return {
			blogPost
		};
	} catch (err) {
		console.error('Error loading blog post:', err);
		
		// If it's already an error with status, re-throw it
		if (err.status) {
			throw err;
		}
		
		// Return 404 for other errors
		throw error(404, 'Blog post not found');
	}
}