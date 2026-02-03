/**
 * Dynamic Sitemap Generator
 * Generates sitemap.xml with static sections and dynamic content from Directus
 */

import { PUBLIC_SITE_URL } from '$env/static/public';

// Static sections with their priorities and change frequencies
const staticSections = [
	{ path: '', priority: 1.0, changefreq: 'weekly' }, // Home
	{ path: '#music', priority: 0.9, changefreq: 'weekly' },
	{ path: '#voice', priority: 0.8, changefreq: 'monthly' },
	{ path: '#productions', priority: 0.8, changefreq: 'weekly' },
	{ path: '#about', priority: 0.7, changefreq: 'monthly' },
	{ path: '#contact', priority: 0.6, changefreq: 'monthly' }
];

/**
 * Generate sitemap XML
 */
export async function GET() {
	const baseUrl = PUBLIC_SITE_URL || 'https://keyjayonline.com';
	const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

	// Generate XML for static sections
	const staticUrls = staticSections.map(section => `
	<url>
		<loc>${baseUrl}/${section.path}</loc>
		<lastmod>${now}</lastmod>
		<changefreq>${section.changefreq}</changefreq>
		<priority>${section.priority}</priority>
	</url>`).join('');

	// Build sitemap XML
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
</urlset>`;

	return new Response(sitemap.trim(), {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600' // Cache for 1 hour
		}
	});
}
