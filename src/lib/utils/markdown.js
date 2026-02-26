/**
 * Markdown rendering utility
 * Uses marked for parsing + DOMPurify for XSS protection
 */
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

marked.setOptions({
	breaks: true,
	gfm: true
});

/**
 * Render markdown to safe HTML
 * @param {string} markdown - Raw markdown string
 * @returns {string} Sanitized HTML
 */
export function renderMarkdown(markdown) {
	if (!markdown || typeof markdown !== 'string') return '';

	const rawHtml = marked.parse(markdown);

	return DOMPurify.sanitize(rawHtml, {
		ALLOWED_TAGS: [
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'p', 'br', 'hr',
			'strong', 'em', 'b', 'i', 'u', 's', 'del',
			'a', 'img',
			'ul', 'ol', 'li',
			'blockquote', 'pre', 'code',
			'table', 'thead', 'tbody', 'tr', 'th', 'td'
		],
		ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
		ADD_ATTR: ['target']
	});
}

/**
 * Sanitize HTML from a WYSIWYG editor (e.g. Directus rich-text-html)
 * Skips markdown parsing — content is already HTML.
 * @param {string} html - Raw HTML string from WYSIWYG
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
	if (!html || typeof html !== 'string') return '';

	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'p', 'br', 'hr',
			'strong', 'em', 'b', 'i', 'u', 's', 'del',
			'a', 'img',
			'ul', 'ol', 'li',
			'blockquote', 'pre', 'code',
			'table', 'thead', 'tbody', 'tr', 'th', 'td'
		],
		ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
		ADD_ATTR: ['target']
	});
}

/**
 * Strip HTML tags to produce plain text (for RSS excerpts from WYSIWYG content)
 * @param {string} html - HTML string
 * @returns {string} Plain text with tags removed
 */
export function stripHtml(html) {
	if (!html || typeof html !== 'string') return '';

	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/**
 * Strip markdown formatting to produce plain text (for RSS descriptions)
 * @param {string} markdown - Raw markdown string
 * @returns {string} Plain text with markdown syntax removed
 */
export function stripMarkdown(markdown) {
	if (!markdown || typeof markdown !== 'string') return '';

	return markdown
		.replace(/#{1,6}\s+/g, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/__(.+?)__/g, '$1')
		.replace(/_(.+?)_/g, '$1')
		.replace(/~~(.+?)~~/g, '$1')
		.replace(/`{1,3}[^`]*`{1,3}/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/>\s+/g, '')
		.replace(/[-*+]\s+/g, '')
		.replace(/\d+\.\s+/g, '')
		.replace(/---+/g, '')
		.replace(/\n{2,}/g, ' ')
		.replace(/\n/g, ' ')
		.trim();
}
