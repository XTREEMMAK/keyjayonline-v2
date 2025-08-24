import { error } from '@sveltejs/kit';

export async function load({ setHeaders }) {
	// Set proper HTTP status code for maintenance page
	setHeaders({
		'Retry-After': '3600' // Suggest retry after 1 hour
	});
	
	// Return data for the page
	// The 503 status will be set automatically by SvelteKit when throwing an error
	// But we want to show our custom maintenance page, so we return normally
	return {
		status: 503
	};
}