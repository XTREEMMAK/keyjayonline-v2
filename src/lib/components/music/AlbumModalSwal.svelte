<script>
	import Swal from 'sweetalert2';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import VideoEmbed from '$lib/components/media/VideoEmbed.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade } from 'svelte/transition';
	import { formatTime } from '$lib/utils/time.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { pushModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
import {
	getTrackPlayerConfig,
	setupTrackPlayerEvents,
	pauseOthersAndToggle,
	cleanupTrackPlayer,
	PLAYER_ICONS,
	createTrackPlayerConfig
} from '$lib/utils/wavesurfer-helpers.js';
	// import { getMusicSamples } from '$lib/api/content/musicSamples.js';
	import '$lib/styles/album-modal.css';
	
	/** @typedef {import('$lib/types').Album} Album */
	/** @typedef {import('$lib/types').ExternalLink} ExternalLink */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').Credit} Credit */
	/** @typedef {import('$lib/types').Video} Video */
	
	let {
		/** @type {Album} */
		album,
		userAccess = null
	} = $props();
	
	
	export async function showModal() {
		// Fetch music samples via server-side API endpoint
		let samples = [];
		try {
			const response = await fetch(`/api/music-samples/${album.id}`);
			if (response.ok) {
				samples = await response.json();
			} else {
				console.error('Failed to fetch music samples:', response.status, response.statusText);
			}
		} catch (error) {
			console.error('Error fetching music samples:', error);
		}

		// Generate share URL for this album (prefers database slug, falls back to title)
		const shareUrl = generateShareUrl('album', { id: album.id, title: album.title, slug: album.slug });

		// Set up global share function that can be called from HTML
		window.handleAlbumShare = async () => {
			const shareBtn = document.getElementById('album-share-btn');
			const shareIcon = document.getElementById('album-share-icon');

			if (shareBtn && shareIcon) {
				const success = await copyShareUrl(shareUrl);

				if (success) {
					// Update icon to checkmark
					shareIcon.setAttribute('icon', 'mdi:check');
					shareBtn.style.color = '#22c55e';

					// Reset after 2 seconds
					setTimeout(() => {
						shareIcon.setAttribute('icon', 'mdi:share-variant');
						shareBtn.style.color = '#9ca3af';
					}, 2000);
				}
			}
		};

		const modalContent = createModalContent(samples);

		// Push history state for back button handling
		pushModalState(`album-${album.id}`);

		// Track cleanup function for popstate listener
		let cleanupPopstate;

		const result = await Swal.fire({
			title: album.title,
			html: modalContent,
			width: '95%',
			maxWidth: '110em',
			showCloseButton: true,
			showConfirmButton: false,
			scrollbarPadding: false,
			customClass: {
				popup: 'album-modal-popup',
				htmlContainer: 'album-modal-content'
			},
			background: album.cover_art
				? `linear-gradient(145deg, rgba(26, 26, 46, 0.97) 0%, rgba(22, 33, 62, 0.97) 50%, rgba(15, 23, 42, 0.97) 100%), url('${album.cover_art}')`
				: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				// Setup back button handler
				cleanupPopstate = setupPopstateHandler(() => {
					Swal.close();
				});

				// Initialize any components that need mounting
				initializeModalComponents();
			},
			willClose: () => {
				// Cleanup popstate listener
				if (cleanupPopstate) cleanupPopstate();

				// Clean up global function when modal closes
				delete window.handleAlbumShare;
			}
		});

		return result;
	}
	
	/**
	 * @param {ExternalLink} link
	 * @returns {string}
	 */
	function getExternalLinkIcon(link) {
		// If custom icon type and icon_value is specified, use that
		if (link.icon_type === 'custom' && link.icon_value) {
			return link.icon_value;
		}
		
		// If iconify type is selected with a value, use it
		if (link.icon_type === 'iconify' && link.icon_value) {
			return link.icon_value;
		}
		
		// Otherwise, determine icon based on label
		const platform = (link.label || '').toLowerCase();
		
		// For 'custom' platform with iconify but no icon_value, use web icon
		if (platform === 'custom' && link.icon_type === 'iconify' && !link.icon_value) {
			return 'streamline-plump:web';
		}
		
		// For 'custom' platform without icon specification, use web icon
		if (platform === 'custom') {
			return 'streamline-plump:web';
		}
		
		// Platform-specific iconify icons based on common label names
		const platformIcons = {
			'spotify': 'simple-icons:spotify',
			'apple music': 'simple-icons:applemusic',
			'applemusic': 'simple-icons:applemusic',
			'apple': 'simple-icons:applemusic',
			'youtube': 'simple-icons:youtube',
			'youtube music': 'simple-icons:youtubemusic',
			'bandcamp': 'simple-icons:bandcamp',
			'soundcloud': 'simple-icons:soundcloud',
			'tidal': 'simple-icons:tidal',
			'amazon music': 'simple-icons:amazonmusic',
			'amazon': 'simple-icons:amazonmusic',
			'deezer': 'simple-icons:deezer',
			'pandora': 'simple-icons:pandora'
		};
		
		return platformIcons[platform] || 'mdi:link';
	}

	/**
	 * @param {ExternalLink} link
	 * @returns {{bg: string, bgHover: string, color: string}}
	 */
	function getPlatformColors(link) {
		const platform = (link.label || '').toLowerCase();
		
		// Platform-specific colors based on common label names
		const platformColors = {
			'spotify': { bg: 'rgba(34, 197, 94, 0.2)', bgHover: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
			'apple music': { bg: 'rgba(248, 66, 90, 0.2)', bgHover: 'rgba(248, 66, 90, 0.3)', color: '#f8425a' },
			'applemusic': { bg: 'rgba(248, 66, 90, 0.2)', bgHover: 'rgba(248, 66, 90, 0.3)', color: '#f8425a' },
			'apple': { bg: 'rgba(248, 66, 90, 0.2)', bgHover: 'rgba(248, 66, 90, 0.3)', color: '#f8425a' },
			'youtube': { bg: 'rgba(255, 0, 0, 0.2)', bgHover: 'rgba(255, 0, 0, 0.3)', color: '#ff0000' },
			'youtube music': { bg: 'rgba(255, 0, 0, 0.2)', bgHover: 'rgba(255, 0, 0, 0.3)', color: '#ff0000' },
			'bandcamp': { bg: 'rgba(99, 154, 210, 0.2)', bgHover: 'rgba(99, 154, 210, 0.3)', color: '#639ad2' },
			'soundcloud': { bg: 'rgba(255, 85, 0, 0.2)', bgHover: 'rgba(255, 85, 0, 0.3)', color: '#ff5500' },
			'tidal': { bg: 'rgba(0, 0, 0, 0.2)', bgHover: 'rgba(0, 0, 0, 0.4)', color: '#ffffff' },
			'amazon music': { bg: 'rgba(255, 153, 0, 0.2)', bgHover: 'rgba(255, 153, 0, 0.3)', color: '#ff9900' },
			'amazon': { bg: 'rgba(255, 153, 0, 0.2)', bgHover: 'rgba(255, 153, 0, 0.3)', color: '#ff9900' },
			'deezer': { bg: 'rgba(254, 123, 41, 0.2)', bgHover: 'rgba(254, 123, 41, 0.3)', color: '#fe7b29' },
			'pandora': { bg: 'rgba(0, 112, 204, 0.2)', bgHover: 'rgba(0, 112, 204, 0.3)', color: '#0070cc' }
		};
		
		return platformColors[platform] || { bg: 'rgba(59, 130, 246, 0.2)', bgHover: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
	}

	/**
	 * Generate grouped credits HTML with collapsible sections
	 * @param {Credit[]} credits - Array of credit objects
	 * @param {string} idPrefix - Prefix for unique IDs (desktop/mobile)
	 * @returns {string} HTML string for grouped credits
	 */
	function generateGroupedCreditsHtml(credits, idPrefix = '') {
		if (!credits || credits.length === 0) {
			return '<p style="color: #9ca3af; text-align: center; padding: 40px;">No credits available for this album.</p>';
		}

		// Group credits by category
		const groupedCredits = {};
		credits.forEach(credit => {
			// Get all unique categories from roles
			const categories = new Set();
			if (credit.roles && Array.isArray(credit.roles)) {
				credit.roles.forEach(role => {
					categories.add(role.category || 'Other');
				});
			} else {
				categories.add('Other');
			}

			// Add credit to each category it belongs to
			categories.forEach(category => {
				if (!groupedCredits[category]) {
					groupedCredits[category] = [];
				}
				// Get roles for this category
				const rolesInCategory = credit.roles?.filter(r => (r.category || 'Other') === category) || [{ title: credit.role }];
				groupedCredits[category].push({
					...credit,
					displayRoles: rolesInCategory.map(r => r.title).join(', ')
				});
			});
		});

		// Sort categories by priority - keyboards/roles in specific order
		const priorityOrder = ['Creator', 'Producer', 'Composer', 'Song Writer', 'Vocalists', 'Rapper', 'Mixing', 'Mastering'];
		const sortedCategories = Object.keys(groupedCredits).sort((a, b) => {
			const aIndex = priorityOrder.indexOf(a);
			const bIndex = priorityOrder.indexOf(b);

			// If both are in priority list, sort by that order
			if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
			// Priority categories come first
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;
			// Otherwise sort alphabetically
			return a.localeCompare(b);
		});

		// Generate HTML for each category group
		return sortedCategories.map((category, index) => {
			const categoryCredits = groupedCredits[category];
			const uniqueId = `${idPrefix}credit-group-${index}`;

			return `
				<div class="credit-group" style="margin-bottom: 16px;">
					<button onclick="toggleCreditGroup('${uniqueId}')"
						style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; color: #ffffff; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.3s ease;"
						onmouseover="this.style.background='rgba(59, 130, 246, 0.25)'"
						onmouseout="this.style.background='rgba(59, 130, 246, 0.15)'">
						<span style="display: flex; align-items: center; gap: 8px;">
							<iconify-icon icon="mdi:account-group" width="18" height="18" style="color: #3b82f6;"></iconify-icon>
							${category} <span style="color: #9ca3af; font-weight: 400;">(${categoryCredits.length})</span>
						</span>
						<iconify-icon id="${uniqueId}-arrow" icon="mdi:chevron-down" width="20" height="20" style="color: #9ca3af; transition: transform 0.3s ease; transform: rotate(180deg);"></iconify-icon>
					</button>
					<div id="${uniqueId}" class="credit-group-content" style="max-height: 2000px; overflow: hidden; transition: max-height 0.4s ease; padding-top: 12px;">
						<div style="display: grid; gap: 8px;">
							${categoryCredits.map(credit => `
								<div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(55, 65, 81, 0.3); border-radius: 8px; border-left: 3px solid #3b82f6; transition: all 0.3s ease; cursor: pointer;"
									 onmouseover="this.style.background='rgba(55, 65, 81, 0.5)'; this.style.boxShadow='0 0 20px rgba(59, 130, 246, 0.3)'; this.style.borderLeftColor='#60a5fa'"
									 onmouseout="this.style.background='rgba(55, 65, 81, 0.3)'; this.style.boxShadow='none'; this.style.borderLeftColor='#3b82f6'"
									 ${credit.website_url ? `onclick="window.open('${credit.website_url}', '_blank')"` : ''}>
									${credit.profile_image ? `<img src="${credit.profile_image}" alt="${credit.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid rgba(59, 130, 246, 0.3);" />` : `<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><iconify-icon icon="mdi:account" width="24" height="24" style="color: #3b82f6;"></iconify-icon></div>`}
									<div style="flex: 1; min-width: 0;">
										<div style="color: #ffffff; font-weight: 500; font-size: 0.9rem; margin-bottom: 2px;">${credit.name}</div>
										<div style="color: #9ca3af; font-size: 0.8rem;">${credit.displayRoles || credit.role}</div>
										${credit.website_url ? `<div style="color: #3b82f6; font-size: 0.75rem; margin-top: 2px; display: flex; align-items: center; gap: 4px;"><iconify-icon icon="mdi:open-in-new" width="12" height="12"></iconify-icon>View Profile</div>` : ''}
									</div>
								</div>
							`).join('')}
						</div>
					</div>
				</div>
			`;
		}).join('');
	}

	function createModalContent(samples = []) {
		// Use real credits from album data, or empty array if none
		const albumCredits = album.credits || [];

		// Use external links from database
		/** @type {ExternalLink[]} */
		const albumLinks = (album.external_links || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
		
		return `
			<div class="album-modal-container">
				<div class="album-info-section">
					<div class="album-artwork">
						<img src="${album.cover_art || 'https://placehold.co/400x400/1a1a1a/3B82F6?text=Album+Cover'}"
							 alt="${album.title}"
							 style="width: 100%; max-width: 350px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);" />
					</div>
					<div class="album-details">
						<h2 class="album-modal-title" style="font-size: clamp(1.25rem, 4vw, 2rem); font-weight: bold; color: #ffffff; line-height: 1.2; margin: 0 0 8px 0; text-align: center;">${album.title}</h2>
						${album.artist ? `<p style="font-size: clamp(1rem, 3vw, 1.2rem); color: #d1d5db; margin-bottom: 16px; text-align: center;">${album.artist}</p>` : ''}

						<div class="streaming-links" style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center; align-items: center; padding: 4px; min-width: 0; max-width: 100%; box-sizing: border-box;">
							<style>
								.streaming-links::-webkit-scrollbar { display: none; }
							</style>
							${albumLinks.length > 0 ? albumLinks.map(/** @type {ExternalLink} */ (link) => {
								const colors = getPlatformColors(link);
								return `
								<a href="${link.url}" target="_blank" title="${link.label}" style="display: inline-block; padding: 10px; background: ${colors.bg}; border-radius: 50%; color: ${colors.color}; text-decoration: none; transition: all 0.3s; flex-shrink: 0;"
								   onmouseover="this.style.transform='scale(1.1)'; this.style.background='${colors.bgHover}'"
								   onmouseout="this.style.transform='scale(1)'; this.style.background='${colors.bg}'">
									<iconify-icon icon="${getExternalLinkIcon(link)}" width="28" height="28" style="display: block; pointer-events: none;"></iconify-icon>
								</a>
								`;
							}).join('') : ''}
							<!-- Divider -->
							<span style="color: rgba(255, 255, 255, 0.3); font-size: 1.5rem; font-weight: 300; flex-shrink: 0;">|</span>
							<!-- Share Button -->
							<button id="album-share-btn" onclick="handleAlbumShare()" title="Share album" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px; background: rgba(139, 92, 246, 0.2); border-radius: 50%; color: #a78bfa; border: none; cursor: pointer; transition: all 0.3s; flex-shrink: 0;"
							   onmouseover="this.style.transform='scale(1.1)'; this.style.background='rgba(139, 92, 246, 0.3)'"
							   onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(139, 92, 246, 0.2)'">
								<iconify-icon id="album-share-icon" icon="mdi:share-variant" width="28" height="28" style="display: block; pointer-events: none;"></iconify-icon>
							</button>
						</div>
						
						${album.access_type === 'paid' || album.access_type === 'subscriber' ? `
							<button onclick="handlePurchase()" style="padding: 12px 24px; background: linear-gradient(45deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 25px; font-weight: 600; cursor: pointer; margin-bottom: 16px;">
								${album.access_type === 'paid' ? 'Purchase Album' : 'Subscribe for Access'}
							</button>
							${album.minimum_price ? `<p style="color: #9ca3af; font-size: 0.9rem;">Starting at $${album.minimum_price}</p>` : ''}
						` : ''}
					</div>
				</div>
				
				<div class="album-content-section">
					<!-- Desktop Tab System -->
					<div class="desktop-tabs-system">
						<!-- Tab Navigation -->
						<div class="tab-navigation" style="display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 0; overflow-x: auto;">
							<button id="tab-details" class="tab-button active" onclick="switchTab('details')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #ffffff; border: none; border-bottom: 2px solid #3b82f6; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Main Details
							</button>
							<button id="tab-credits" class="tab-button" onclick="switchTab('credits')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Credits
							</button>
							<button id="tab-videos" class="tab-button" onclick="switchTab('videos')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Videos
							</button>
						</div>
						
						<!-- Tab Content -->
						<div class="tab-content" style="position: relative; height: clamp(400px, 60vh, 600px); overflow: hidden;">
						<!-- Main Details Tab -->
						<div id="content-details" class="tab-panel active" style="opacity: 1; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; transition: opacity 0.3s ease;">
							${album.rich_content || album.description ? `
							<div style="margin-bottom: 32px;">
								<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Album Details</h3>
								${album.rich_content ? 
									`<div class="album-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${sanitizeHtml(album.rich_content)}</div>` : 
									`<p class="album-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${album.description}</p>`}
							</div>
							` : ''}
							
							${samples && samples.length > 0 ? `
							<div style="margin-bottom: 32px;">
								<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Track Samples</h3>
								<div id="track-list-container" style="display: grid; gap: 16px;">
									${samples.map(/** @type {any} */ (sample, /** @type {number} */ i) => `
										<div style="background: rgba(55, 65, 81, 0.5); border-radius: 8px; padding: 16px;">
											<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
												<div>
													<h4 style="color: #ffffff; font-weight: 500; margin-bottom: 4px;">
														${sample.trackNumber || i + 1}. ${sample.title}
													</h4>
													${sample.duration ? `<span style="color: #9ca3af; font-size: 0.9rem;">${sample.duration}</span>` : ''}
												</div>
												${sample.isFeatured ? `<span style="padding: 4px 8px; background: rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 0.75rem; border-radius: 16px;">Featured</span>` : ''}
											</div>
											
											${sample.previewUrl ? `<div class="track-player" data-track-id="${sample.id}" data-audio-url="${sample.previewUrl}" data-track-title="${sample.title}" data-artist="${album.artist || ''}" data-can-download="false" style="margin-bottom: 12px;"></div>` : ''}
										</div>
									`).join('')}
								</div>
							</div>
							` : ''}
							
							
							${album.liner_notes ? `
								<div style="margin-bottom: 32px;">
									<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Liner Notes</h3>
									<div style="color: #d1d5db; white-space: pre-wrap; line-height: 1.6; text-align: left;">${album.liner_notes}</div>
								</div>
							` : ''}
						</div>
						
						<!-- Credits Tab -->
						<div id="content-credits" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
							<div style="margin-bottom: 32px;">
								<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 20px; text-align: left;">Album Credits</h3>
								${generateGroupedCreditsHtml(albumCredits, 'desktop-')}
							</div>
						</div>
						
						<!-- Videos Tab -->
						<div id="content-videos" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
							${album.youtube_videos?.length ? `
								<div style="margin-bottom: 32px;">
									<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 20px; text-align: left;">Videos</h3>
									<div style="display: grid; grid-template-columns: ${album.youtube_videos.length === 1 ? '1fr' : album.youtube_videos.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'}; gap: 16px; max-width: ${album.youtube_videos.length === 1 ? '600px' : '100%'};">
										${album.youtube_videos.map(/** @type {Video} */ (video) => `
											<div style="background: rgba(55, 65, 81, 0.3); border-radius: 12px; overflow: hidden; transition: transform 0.3s;" 
												 onmouseover="this.style.transform='scale(1.02)'" 
												 onmouseout="this.style.transform='scale(1)'">
												<div style="position: relative; aspect-ratio: 16/9; background: #1a1a2e;">
													<iframe src="https://www.youtube.com/embed/${video.id}" 
															title="${video.title || 'Video'}"
															frameborder="0"
															allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
															allowfullscreen
															style="position: absolute; inset: 0; width: 100%; height: 100%;"></iframe>
												</div>
												${video.title ? `<div style="padding: 12px;"><h4 style="color: #ffffff; font-weight: 500; font-size: 0.95rem;">${video.title}</h4></div>` : ''}
											</div>
										`).join('')}
									</div>
								</div>
							` : '<p style="color: #9ca3af; text-align: center; padding: 40px;">No videos available for this album.</p>'}
						</div>
					</div>
					</div>
					
					<!-- Mobile Accordion System -->
					<div class="mobile-accordion-system">
						<!-- Main Details Accordion -->
						<div class="accordion-section">
							<button class="accordion-header" onclick="toggleAccordion('accordion-details')" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(55, 65, 81, 0.3); border: none; border-radius: 8px; color: #ffffff; font-weight: 600; font-size: 1rem; cursor: pointer; margin-bottom: 8px; transition: all 0.3s ease;">
								<span>Main Details</span>
								<iconify-icon class="accordion-arrow" icon="mdi:chevron-down" width="20" height="20" style="transition: transform 0.3s ease; color: #9ca3af;"></iconify-icon>
							</button>
							<div id="accordion-details" class="accordion-content expanded">
								<div class="accordion-content-inner" style="padding: 0 16px 16px;">
									${album.rich_content || album.description ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Album Details</h3>
										${album.rich_content ? 
											`<div class="album-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${sanitizeHtml(album.rich_content)}</div>` : 
											`<p class="album-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${album.description}</p>`}
									</div>
									` : ''}
									
									${samples && samples.length > 0 ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Track List</h3>
										<div class="mobile-track-list-container" style="display: grid; gap: 16px;">
											${samples.map(/** @type {any} */ (sample, /** @type {number} */ i) => `
												<div style="background: rgba(55, 65, 81, 0.5); border-radius: 8px; padding: 16px;">
													<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
														<div>
															<h4 style="color: #ffffff; font-weight: 500; margin-bottom: 4px;">
																${sample.trackNumber || i + 1}. ${sample.title}
															</h4>
															${sample.duration ? `<span style="color: #9ca3af; font-size: 0.9rem;">${sample.duration}</span>` : ''}
														</div>
														${sample.isFeatured ? `<span style="padding: 4px 8px; background: rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 0.75rem; border-radius: 16px;">Featured</span>` : ''}
													</div>
													
													${sample.previewUrl ? `<div class="track-player-mobile" data-track-id="${sample.id}" data-audio-url="${sample.previewUrl}" data-track-title="${sample.title}" data-artist="${album.artist || ''}" data-can-download="false" style="margin-bottom: 12px;"></div>` : ''}
												</div>
											`).join('')}
										</div>
									</div>
									` : ''}
									
									${album.liner_notes ? `
										<div style="margin-bottom: 32px;">
											<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Liner Notes</h3>
											<div style="color: #d1d5db; white-space: pre-wrap; line-height: 1.6; text-align: left;">${album.liner_notes}</div>
										</div>
									` : ''}
								</div>
							</div>
						</div>
						
						<!-- Credits Accordion -->
						<div class="accordion-section">
							<button class="accordion-header" onclick="toggleAccordion('accordion-credits')" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(55, 65, 81, 0.3); border: none; border-radius: 8px; color: #ffffff; font-weight: 600; font-size: 1rem; cursor: pointer; margin-bottom: 8px; transition: all 0.3s ease;">
								<span>Credits</span>
								<iconify-icon class="accordion-arrow" icon="mdi:chevron-down" width="20" height="20" style="transition: transform 0.3s ease; color: #9ca3af;"></iconify-icon>
							</button>
							<div id="accordion-credits" class="accordion-content collapsed">
								<div class="accordion-content-inner" style="padding: 0 16px 16px;">
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 20px; text-align: left;">Album Credits</h3>
										${generateGroupedCreditsHtml(albumCredits, 'mobile-')}
									</div>
								</div>
							</div>
						</div>
						
						<!-- Videos Accordion -->
						<div class="accordion-section">
							<button class="accordion-header" onclick="toggleAccordion('accordion-videos')" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(55, 65, 81, 0.3); border: none; border-radius: 8px; color: #ffffff; font-weight: 600; font-size: 1rem; cursor: pointer; margin-bottom: 8px; transition: all 0.3s ease;">
								<span>Videos</span>
								<iconify-icon class="accordion-arrow" icon="mdi:chevron-down" width="20" height="20" style="transition: transform 0.3s ease; color: #9ca3af;"></iconify-icon>
							</button>
							<div id="accordion-videos" class="accordion-content collapsed">
								<div class="accordion-content-inner" style="padding: 0 16px 16px;">
									${album.youtube_videos?.length ? `
										<div style="margin-bottom: 32px;">
											<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 20px; text-align: left;">Videos</h3>
											<div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
												${album.youtube_videos.map(/** @type {Video} */ (video) => `
													<div style="background: rgba(55, 65, 81, 0.3); border-radius: 12px; overflow: hidden; transition: transform 0.3s;" 
														 onmouseover="this.style.transform='scale(1.02)'" 
														 onmouseout="this.style.transform='scale(1)'">
														<div style="position: relative; aspect-ratio: 16/9; background: #1a1a2e;">
															<iframe src="https://www.youtube.com/embed/${video.id}" 
																	title="${video.title || 'Video'}"
																	frameborder="0"
																	allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
																	allowfullscreen
																	style="position: absolute; inset: 0; width: 100%; height: 100%;"></iframe>
														</div>
														${video.title ? `<div style="padding: 12px;"><h4 style="color: #ffffff; font-weight: 500; font-size: 0.95rem;">${video.title}</h4></div>` : ''}
													</div>
												`).join('')}
											</div>
										</div>
									` : '<p style="color: #9ca3af; text-align: center; padding: 40px;">No videos available for this album.</p>'}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}
	
	function initializeModalComponents() {
		// Hide skeleton loader once image loads
		const artwork = document.querySelector('.album-artwork');
		const img = artwork?.querySelector('img');
		if (img) {
			img.onload = () => {
				if (artwork) artwork.style.setProperty('--img-loaded', '1');
			};
			// If image is already cached/loaded
			if (img.complete) {
				if (artwork) artwork.style.setProperty('--img-loaded', '1');
			}
		}

		// Setup streaming links scroll-based visibility animation
		setupStreamingLinksVisibility();
		
		// Initialize WaveSurfer audio players for each track (desktop tabs)
		const trackPlayers = document.querySelectorAll('.track-player');
		trackPlayers.forEach(async (playerEl) => {
			const trackId = playerEl.getAttribute('data-track-id');
			const audioUrl = playerEl.getAttribute('data-audio-url');
			const trackTitle = playerEl.getAttribute('data-track-title');
			const canDownload = playerEl.getAttribute('data-can-download') === 'true';
			
			// Create WaveSurfer player container
			playerEl.innerHTML = `
				<div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px;">
					<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
						<button id="play-btn-${trackId}" style="background: #3b82f6; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
							${PLAYER_ICONS.play}
						</button>
						<div style="flex: 1;">
							<div style="font-size: 0.875rem; color: #ffffff; margin-bottom: 4px;">${trackTitle}</div>
							<div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #9ca3af;">
								<span id="current-time-${trackId}">0:00</span>
								<span id="duration-${trackId}">0:00</span>
							</div>
						</div>
						${canDownload ? `<button onclick="handleDownload('${trackId}')" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
							</svg>
						</button>` : ''}
					</div>
					<div id="waveform-${trackId}" style="margin: 8px 0;"></div>
				</div>
			`;
			
			try {
				// Transform audio URL for environment-aware CORS handling
				const transformedAudioUrl = getAudioUrl(audioUrl);
				console.log('Initializing WaveSurfer for track:', trackId);
				console.log('Original URL:', audioUrl);
				console.log('Transformed URL:', transformedAudioUrl);
				
				// Dynamic import WaveSurfer to avoid SSR issues
				const WaveSurfer = (await import('wavesurfer.js')).default;
				console.log('WaveSurfer imported successfully');
				
				// Initialize WaveSurfer with shared track player configuration
				const wavesurfer = WaveSurfer.create(
					createTrackPlayerConfig(`#waveform-${trackId}`, transformedAudioUrl)
				);
				console.log('WaveSurfer instance created for track:', trackId);
				
				// Get UI elements
				const playBtn = document.getElementById(`play-btn-${trackId}`);
				const currentTime = document.getElementById(`current-time-${trackId}`);
				const duration = document.getElementById(`duration-${trackId}`);
				
				// Setup standard event listeners using shared helper
				setupTrackPlayerEvents(wavesurfer, { playBtn, currentTime, duration }, trackId);
				
			} catch (error) {
				console.error('Error initializing WaveSurfer for track:', trackId, error);
				// Fallback to basic audio if WaveSurfer fails
				playerEl.innerHTML = `<p style="color: #ef4444;">Error loading audio player</p>`;
			}
		});
		
		// Initialize WaveSurfer audio players for mobile accordion system
		const mobileTrackPlayers = document.querySelectorAll('.track-player-mobile');
		mobileTrackPlayers.forEach(async (playerEl) => {
			const trackId = playerEl.getAttribute('data-track-id');
			const audioUrl = playerEl.getAttribute('data-audio-url');
			const trackTitle = playerEl.getAttribute('data-track-title');
			const canDownload = playerEl.getAttribute('data-can-download') === 'true';
			
			// Create WaveSurfer player container for mobile
			playerEl.innerHTML = `
				<div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px;">
					<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
						<button id="play-btn-mobile-${trackId}" style="background: #3b82f6; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
							${PLAYER_ICONS.play}
						</button>
						<div style="flex: 1;">
							<div style="font-size: 0.875rem; color: #ffffff; margin-bottom: 4px;">${trackTitle}</div>
							<div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #9ca3af;">
								<span id="current-time-mobile-${trackId}">0:00</span>
								<span id="duration-mobile-${trackId}">0:00</span>
							</div>
						</div>
						${canDownload ? `<button onclick="handleDownload('${trackId}')" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
							</svg>
						</button>` : ''}
					</div>
					<div id="waveform-mobile-${trackId}" style="margin: 8px 0;"></div>
				</div>
			`;
			
			try {
				// Transform audio URL for environment-aware CORS handling
				const transformedAudioUrl = getAudioUrl(audioUrl);
				console.log('Initializing mobile WaveSurfer for track:', trackId);
				console.log('Original URL:', audioUrl);
				console.log('Transformed URL:', transformedAudioUrl);
				
				// Dynamic import WaveSurfer to avoid SSR issues
				const WaveSurfer = (await import('wavesurfer.js')).default;
				
				// Initialize WaveSurfer with shared track player configuration
				const wavesurfer = WaveSurfer.create(
					createTrackPlayerConfig(`#waveform-mobile-${trackId}`, transformedAudioUrl)
				);
				
				// Get UI elements
				const playBtn = document.getElementById(`play-btn-mobile-${trackId}`);
				const currentTime = document.getElementById(`current-time-mobile-${trackId}`);
				const duration = document.getElementById(`duration-mobile-${trackId}`);
				
				// Setup standard event listeners using shared helper with mobile prefix
				setupTrackPlayerEvents(wavesurfer, { playBtn, currentTime, duration }, `mobile-${trackId}`);
				
			} catch (error) {
				console.error('Error initializing WaveSurfer for mobile track:', trackId, error);
				// Fallback to error message if WaveSurfer fails
				playerEl.innerHTML = `<p style="color: #ef4444;">Error loading audio player</p>`;
			}
		});
	}
	
	// Global functions for the modal
	/** @param {string} tabName */
	window.switchTab = function(tabName) {
		// Get all tabs and contents
		const tabs = document.querySelectorAll('.tab-button');
		const contents = document.querySelectorAll('.tab-panel');

		// Update tab buttons
		tabs.forEach(tab => {
			const tabEl = /** @type {HTMLElement} */ (tab);
			if (tabEl.id === `tab-${tabName}`) {
				tabEl.classList.add('active');
				tabEl.style.color = '#ffffff';
				tabEl.style.borderBottomColor = '#3b82f6';
			} else {
				tabEl.classList.remove('active');
				tabEl.style.color = '#9ca3af';
				tabEl.style.borderBottomColor = 'transparent';
			}
		});

		// Fade out current content, then fade in new content
		contents.forEach(content => {
			const contentEl = /** @type {HTMLElement} */ (content);
			if (contentEl.id === `content-${tabName}`) {
				setTimeout(() => {
					contentEl.classList.add('active');
					contentEl.style.opacity = '1';
					contentEl.style.pointerEvents = 'auto';
				}, 150);
			} else {
				contentEl.classList.remove('active');
				contentEl.style.opacity = '0';
				setTimeout(() => {
					if (!contentEl.classList.contains('active')) {
						contentEl.style.pointerEvents = 'none';
					}
				}, 300);
			}
		});
	};

	/** @param {string} groupId */
	window.toggleCreditGroup = function(groupId) {
		const content = document.getElementById(groupId);
		const arrow = document.getElementById(`${groupId}-arrow`);

		if (!content) return;

		const isCollapsed = content.style.maxHeight === '0px';

		if (isCollapsed) {
			// Expand
			content.style.maxHeight = '2000px';
			if (arrow) arrow.style.transform = 'rotate(180deg)';
		} else {
			// Collapse
			content.style.maxHeight = '0px';
			if (arrow) arrow.style.transform = 'rotate(0deg)';
		}
	};

	/** @param {string} trackId */
	window.togglePlay = function(trackId) {
		// Try to get WaveSurfer instances (both desktop and mobile)
		const wavesurfer = window[`wavesurfer-${trackId}`] || window[`wavesurfer-mobile-${trackId}`];
		
		if (wavesurfer) {
			pauseOthersAndToggle(wavesurfer, trackId);
		}
	};
	
	/** @param {string} trackId */
	window.handleDownload = function(trackId) {
		// Implementation for download functionality
	};
	
	window.handlePurchase = function() {
		// Implementation for purchase functionality
		Swal.fire({
			title: 'Purchase Album',
			text: 'Purchase functionality will be implemented here',
			icon: 'info'
		});
	};
	
	/** @param {string} accordionId */
	window.toggleAccordion = function(accordionId) {
		const content = document.getElementById(accordionId);
		const header = content?.previousElementSibling;
		const arrow = header?.querySelector('.accordion-arrow');

		if (!content || !arrow) return;

		const isCollapsed = content.classList.contains('collapsed');

		if (isCollapsed) {
			// Expand animation
			const innerContent = content.querySelector('.accordion-content-inner');
			const fullHeight = innerContent ? innerContent.scrollHeight : content.scrollHeight;

			// Remove collapsed class and set initial height
			content.classList.remove('collapsed');
			content.style.maxHeight = '0px';

			// Force reflow to ensure starting state
			content.offsetHeight;

			// Start expansion with requestAnimationFrame for smooth animation
			requestAnimationFrame(() => {
				content.style.maxHeight = fullHeight + 'px';
				arrow.style.transform = 'rotate(180deg)';
			});

			// Scroll to accordion header on mobile after expansion starts
			if (window.innerWidth <= 768 && header) {
				setTimeout(() => {
					header.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 100); // Small delay to let expansion start
			}

			// After animation completes, set to auto for dynamic content
			setTimeout(() => {
				if (!content.classList.contains('collapsed')) {
					content.style.maxHeight = 'auto';
				}
			}, 500);
		} else {
			// Collapse animation
			const innerContent = content.querySelector('.accordion-content-inner');
			const currentHeight = innerContent ? innerContent.scrollHeight : content.scrollHeight;
			
			// Set current height first to ensure smooth collapse
			content.style.maxHeight = currentHeight + 'px';
			
			// Force reflow
			content.offsetHeight;
			
			// Start collapse
			requestAnimationFrame(() => {
				content.style.maxHeight = '0px';
				content.classList.add('collapsed');
				arrow.style.transform = 'rotate(0deg)';
			});
		}
		
		// Trigger streaming links visibility check after animation
		setTimeout(() => {
			const streamingLinks = document.querySelector('.streaming-links');
			if (streamingLinks) {
				const modalContent = streamingLinks.closest('.swal2-html-container');
				if (modalContent) {
					const event = new Event('scroll');
					modalContent.dispatchEvent(event);
				}
			}
		}, 500);
	};
	
	/**
	 * Show individual streaming link icons
	 */
	function showStreamingIcons(streamingLinks) {
		const iconLinks = streamingLinks.querySelectorAll('a');
		iconLinks.forEach(iconLink => {
			iconLink.style.opacity = '1';
			iconLink.style.transform = 'translateY(0)';
			iconLink.style.pointerEvents = 'auto';
		});
	}
	
	/**
	 * Hide individual streaming link icons while maintaining container dimensions
	 */
	function hideStreamingIcons(streamingLinks) {
		const iconLinks = streamingLinks.querySelectorAll('a');
		iconLinks.forEach(iconLink => {
			iconLink.style.opacity = '0';
			iconLink.style.transform = 'translateY(-10px)';
			iconLink.style.pointerEvents = 'none';
			// Icon containers maintain their 48px x 48px size
		});
	}
	
	/**
	 * Setup scroll-based visibility animation for streaming links
	 */
	function setupStreamingLinksVisibility() {
		const streamingLinks = document.querySelector('.streaming-links');
		if (!streamingLinks) return;
		
		// Store original dimensions to maintain container size
		const originalHeight = streamingLinks.offsetHeight;
		const computedStyle = window.getComputedStyle(streamingLinks);
		const originalMarginTop = computedStyle.marginTop;
		const originalMarginBottom = computedStyle.marginBottom;
		
		// Fix icon container dimensions to prevent collapse when iconify icons are hidden
		const iconLinks = streamingLinks.querySelectorAll('a');
		iconLinks.forEach(iconLink => {
			// Set fixed dimensions for each icon container
			iconLink.style.width = '48px';
			iconLink.style.height = '48px';
			iconLink.style.minWidth = '48px';
			iconLink.style.minHeight = '48px';
			iconLink.style.flexShrink = '0';
			iconLink.style.display = 'inline-flex';
			iconLink.style.alignItems = 'center';
			iconLink.style.justifyContent = 'center';
			iconLink.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
			
			// Ensure iconify icons maintain size
			const iconElement = iconLink.querySelector('iconify-icon');
			if (iconElement) {
				iconElement.style.width = '28px';
				iconElement.style.height = '28px';
				iconElement.style.minWidth = '28px';
				iconElement.style.minHeight = '28px';
				iconElement.style.flexShrink = '0';
			}
		});
		
		let isVisible = true;
		let scrollTimeout;
		
		// Find the modal scroll container
		const modalContent = streamingLinks.closest('.album-modal-content') || 
							 streamingLinks.closest('.swal2-html-container') ||
							 document.querySelector('.swal2-html-container');
		
		if (modalContent) {
			const handleScroll = () => {
				const scrollTop = modalContent.scrollTop;
				const scrollHeight = modalContent.scrollHeight;
				const clientHeight = modalContent.clientHeight;
				
				// Check if there's actually scrollable content
				const hasScrollableContent = scrollHeight > clientHeight;
				
				// Check if we're on mobile (where accordions exist)
				const isMobile = window.innerWidth <= 768;
				
				// If on mobile, check accordion states
				if (isMobile) {
					const expandedAccordions = document.querySelectorAll('.accordion-content:not(.collapsed)');
					const hasExpandedContent = expandedAccordions.length > 0;
					
					// If no accordions are expanded, always show streaming links
					if (!hasExpandedContent) {
						if (!isVisible) {
							isVisible = true;
							showStreamingIcons(streamingLinks);
						}
						return;
					}
					
					// If accordions are expanded but no scrollable content, also show
					if (!hasScrollableContent) {
						if (!isVisible) {
							isVisible = true;
							showStreamingIcons(streamingLinks);
						}
						return;
					}
				} else {
					// Desktop logic - if no scrollable content, always show streaming links
					if (!hasScrollableContent) {
						if (!isVisible) {
							isVisible = true;
							showStreamingIcons(streamingLinks);
						}
						return;
					}
				}
				
				// Check if scrolled all the way to the bottom (with larger tolerance for accordion changes)
				const isAtBottom = Math.abs((scrollTop + clientHeight) - scrollHeight) < 20;
				
				// Show streaming links when NOT at bottom
				const shouldShow = !isAtBottom;
				
				if (shouldShow !== isVisible) {
					isVisible = shouldShow;
					
					if (isVisible) {
						showStreamingIcons(streamingLinks);
					} else {
						hideStreamingIcons(streamingLinks);
					}
				}
			};
			
			// Throttled scroll listener for smooth performance
			modalContent.addEventListener('scroll', () => {
				if (scrollTimeout) clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(handleScroll, 10);
			});
			
			
			// Run initial check
			handleScroll();
		}
	}
	
	/**
	 * @param {number} seconds
	 * @returns {string}
	 */
</script>