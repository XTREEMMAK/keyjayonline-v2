/**
 * External link icon and color resolution utilities.
 * Shared across productions detail modal, featured section, and share page.
 * Matches the music section's icon fallback pattern from AlbumModalSwal.
 */

/**
 * Resolve the display icon for an external link.
 * Priority: network icon → iconValue → label-based platform lookup → fallback
 * @param {Object} link - Normalized external link { iconValue, network, label, linkType }
 * @returns {string} Iconify icon string
 */
export function getExternalLinkIcon(link) {
	// 1. Network-derived icon (from kjov2_music_networks relation)
	if (link.network?.icon) return link.network.icon;

	// 2. Explicit icon value (from kjov2_icon_references relation)
	if (link.iconValue) return link.iconValue;

	// 3. Label/linkType-based platform lookup
	const key = (link.label || link.linkType || '').toLowerCase();

	const platformIcons = {
		'github': 'mdi:github',
		'youtube': 'simple-icons:youtube',
		'itch.io': 'simple-icons:itchdotio',
		'itchio': 'simple-icons:itchdotio',
		'steam': 'simple-icons:steam',
		'website': 'mdi:web',
		'demo': 'mdi:play-circle-outline',
		'download': 'mdi:download',
		'app store': 'simple-icons:appstore',
		'google play': 'simple-icons:googleplay',
		'imdb': 'simple-icons:imdb',
		'vimeo': 'simple-icons:vimeo',
		'twitter': 'mdi:twitter',
		'x': 'ri:twitter-x-fill',
		'instagram': 'line-md:instagram',
		'newgrounds': 'simple-icons:newgrounds',
		'spotify': 'simple-icons:spotify',
		'apple music': 'simple-icons:applemusic',
		'bandcamp': 'simple-icons:bandcamp',
		'soundcloud': 'simple-icons:soundcloud',
		'read': 'mdi:book-open-variant',
		'watch': 'mdi:play-circle',
		'listen': 'mdi:headphones',
		'play': 'mdi:gamepad-variant'
	};

	if (platformIcons[key]) return platformIcons[key];

	// 4. URL domain-based detection
	if (link.url) {
		const domainIcons = {
			'youtube.com': 'simple-icons:youtube',
			'youtu.be': 'simple-icons:youtube',
			'spotify.com': 'simple-icons:spotify',
			'open.spotify.com': 'simple-icons:spotify',
			'github.com': 'mdi:github',
			'soundcloud.com': 'simple-icons:soundcloud',
			'bandcamp.com': 'simple-icons:bandcamp',
			'store.steampowered.com': 'simple-icons:steam',
			'steampowered.com': 'simple-icons:steam',
			'itch.io': 'simple-icons:itchdotio',
			'vimeo.com': 'simple-icons:vimeo',
			'instagram.com': 'line-md:instagram',
			'twitter.com': 'mdi:twitter',
			'x.com': 'ri:twitter-x-fill',
			'imdb.com': 'simple-icons:imdb',
			'newgrounds.com': 'simple-icons:newgrounds',
			'apple.com': 'simple-icons:applemusic',
			'music.apple.com': 'simple-icons:applemusic',
			'play.google.com': 'simple-icons:googleplay',
			'apps.apple.com': 'simple-icons:appstore',
			'tidal.com': 'simple-icons:tidal',
			'deezer.com': 'simple-icons:deezer',
			'amazon.com': 'simple-icons:amazonmusic',
			'music.amazon.com': 'simple-icons:amazonmusic'
		};
		try {
			const hostname = new URL(link.url).hostname;
			for (const [domain, icon] of Object.entries(domainIcons)) {
				if (hostname.includes(domain)) return icon;
			}
		} catch {
			// Invalid URL, fall through to default
		}
	}

	return 'mdi:open-in-new';
}

/**
 * Get the network color for an external link button.
 * @param {Object} link - Normalized external link { network }
 * @returns {string|null} CSS color string or null for default styling
 */
export function getExternalLinkColor(link) {
	return link.network?.color || null;
}
