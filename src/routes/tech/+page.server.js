import { getTechPageHeader } from '$lib/api/index.js';

export async function load() {
	try {
		const techPageHeader = await getTechPageHeader();
		
		return {
			techPageHeader
		};
	} catch (error) {
		console.error('Failed to load tech page header:', error);
		
		return {
			techPageHeader: null
		};
	}
}