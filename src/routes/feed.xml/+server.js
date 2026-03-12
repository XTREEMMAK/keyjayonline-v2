/**
 * RSS 2.0 Feed Generator
 * Merges items from now_entries, music_samples, and productions.
 * Most recent 20 items, 15-min in-memory cache.
 */

import { PUBLIC_SITE_URL } from '$env/static/public';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';
import { stripMarkdown, stripHtml, sanitizeHtml } from '$lib/utils/markdown.js';

let cachedFeed = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Convert a Date to RFC 822 format (required by RSS 2.0)
 */
function toRFC822(date) {
	return new Date(date).toUTCString();
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export async function GET() {
	const now = Date.now();

	if (cachedFeed && now - cacheTimestamp < CACHE_TTL_MS) {
		return new Response(cachedFeed, {
			headers: {
				'Content-Type': 'application/rss+xml; charset=utf-8',
				'Cache-Control': 'public, max-age=900'
			}
		});
	}

	try {
		const baseUrl = PUBLIC_SITE_URL || 'https://keyjayonline.com';
		const directus = getDirectusInstance();

		const [nowEntries, musicSamples, productions] = await Promise.all([
			directus
				.request(
					readItems('kjov2_now_entries', {
						filter: { status: { _eq: 'published' } },
						fields: ['id', 'slug', 'content', 'summary', 'date_created'],
						sort: ['-date_created'],
						limit: 20
					})
				)
				.catch(() => []),
			directus
				.request(
					readItems('kjov2_music_samples', {
						filter: { status: { _eq: 'published' }, is_radio_new: { _eq: true } },
						fields: ['id', 'track_name', 'artist', 'slug', 'date_created', 'genre'],
						sort: ['-date_created'],
						limit: 10
					})
				)
				.catch(() => []),
			directus
				.request(
					readItems('kjov2_productions', {
						filter: { status: { _eq: 'live' } },
						fields: ['id', 'title', 'slug', 'description', 'date_created'],
						sort: ['-date_created'],
						limit: 10
					})
				)
				.catch(() => [])
		]);

		const items = [];

		for (const entry of nowEntries) {
			const date = entry.date_created;
			const plainText = stripHtml(entry.content || '');
			const contentExcerpt =
				plainText.length > 60 ? plainText.substring(0, 60) + '...' : plainText;

			// Use summary for title if available, fall back to content excerpt
			const hasSummary = entry.summary && entry.summary.trim();
			const title = hasSummary
				? `Now: ${entry.summary.trim()}`
				: `Now: ${contentExcerpt}`;

			// Description is always the full WYSIWYG content (CDATA-wrapped)
			const description = sanitizeHtml(entry.content || '');

			const entryLink = entry.slug
				? `${baseUrl}/now?entry=${entry.slug}`
				: `${baseUrl}/now#entry-${entry.id}`;
			items.push({
				title,
				link: entryLink,
				description,
				htmlDescription: true,
				pubDate: date,
				guid: entryLink,
				category: 'Updates'
			});
		}

		for (const sample of musicSamples) {
			const link = sample.slug
				? `${baseUrl}/share/sample/${sample.slug}`
				: `${baseUrl}/#music`;

			items.push({
				title: `New Track: ${sample.track_name}`,
				link,
				description: `${sample.artist || 'Key Jay'} released a new track: ${sample.track_name}`,
				pubDate: sample.date_created,
				guid: `${baseUrl}/music/sample/${sample.id}`,
				category: 'Music'
			});
		}

		for (const prod of productions) {
			const link = prod.slug
				? `${baseUrl}/share/production/${prod.slug}`
				: `${baseUrl}/#productions`;
			const description = prod.description
				? stripMarkdown(prod.description).substring(0, 200)
				: `New production: ${prod.title}`;

			items.push({
				title: `New Production: ${prod.title}`,
				link,
				description,
				pubDate: prod.date_created,
				guid: `${baseUrl}/production/${prod.id}`,
				category: 'Productions'
			});
		}

		items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
		const feedItems = items.slice(0, 20);

		const rssItems = feedItems
			.map(
				(item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${item.htmlDescription ? `<![CDATA[${item.description}]]>` : escapeXml(item.description)}</description>
      <pubDate>${toRFC822(item.pubDate)}</pubDate>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <category>${escapeXml(item.category)}</category>
    </item>`
			)
			.join('');

		const lastBuildDate =
			feedItems.length > 0 ? toRFC822(feedItems[0].pubDate) : toRFC822(new Date());

		const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Key Jay Online</title>
    <link>${baseUrl}</link>
    <description>Music composition, voice acting, productions, and tech — updates from Key Jay</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />${rssItems}
  </channel>
</rss>`;

		cachedFeed = rss.trim();
		cacheTimestamp = Date.now();

		return new Response(cachedFeed, {
			headers: {
				'Content-Type': 'application/rss+xml; charset=utf-8',
				'Cache-Control': 'public, max-age=900'
			}
		});
	} catch (error) {
		console.error('Error generating RSS feed:', error);

		const baseUrl = PUBLIC_SITE_URL || 'https://keyjayonline.com';
		return new Response(
			`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Key Jay Online</title>
  <link>${baseUrl}</link>
  <description>Music composition, voice acting, productions, and tech — updates from Key Jay</description>
</channel></rss>`,
			{
				headers: {
					'Content-Type': 'application/rss+xml; charset=utf-8',
					'Cache-Control': 'no-cache'
				}
			}
		);
	}
}
