<script>
	import Swal from 'sweetalert2';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import VideoEmbed from '$lib/components/media/VideoEmbed.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade } from 'svelte/transition';
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
		const modalContent = createModalContent();
		
		const result = await Swal.fire({
			title: album.title,
			html: modalContent,
			width: '95%',
			maxWidth: '1200px',
			showCloseButton: true,
			showConfirmButton: false,
			customClass: {
				popup: 'album-modal-popup',
				htmlContainer: 'album-modal-content'
			},
			background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				// Initialize any components that need mounting
				initializeModalComponents();
				
				// Disable body scroll and enable modal scroll
				document.body.style.overflow = 'hidden';
			},
			willClose: () => {
				// Re-enable body scroll
				document.body.style.overflow = 'auto';
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

	function createModalContent() {
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
						<h2 class="album-modal-title" style="font-size: clamp(1.25rem, 4vw, 2rem); font-weight: bold; margin-bottom: 8px; color: #ffffff; line-height: 1.2;">${album.title}</h2>
						${album.artist ? `<p style="font-size: clamp(1rem, 3vw, 1.2rem); color: #d1d5db; margin-bottom: 16px;">${album.artist}</p>` : ''}
						
						<div class="streaming-links" style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: nowrap; justify-content: center; overflow-x: auto; padding: 4px; min-width: 0; will-change: transform; scrollbar-width: none; -ms-overflow-style: none;">
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
							
							${album.tracks && album.tracks.length > 0 ? `
							<div style="margin-bottom: 32px;">
								<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Track List</h3>
								<div id="track-list-container" style="display: grid; gap: 16px;">
									${album.tracks.map(/** @type {Track} */ (track, /** @type {number} */ i) => `
										<div style="background: rgba(55, 65, 81, 0.5); border-radius: 8px; padding: 16px;">
											<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
												<div>
													<h4 style="color: #ffffff; font-weight: 500; margin-bottom: 4px;">
														${i + 1}. ${track.title}
													</h4>
													${track.duration ? `<span style="color: #9ca3af; font-size: 0.9rem;">${track.duration}</span>` : ''}
												</div>
												${track.licensable ? `<span style="padding: 4px 8px; background: rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 0.75rem; border-radius: 16px;">Available for licensing</span>` : ''}
											</div>
											
											${track.audio_file_url ? `<div class="track-player" data-track-id="${track.id}" data-audio-url="${track.audio_file_url}" data-track-title="${track.title}" data-artist="${album.artist || ''}" data-can-download="${track.access_type === 'free' || (userAccess?.canDownload ? 'true' : 'false')}" style="margin-bottom: 12px;"></div>` : ''}
											
											${track.track_description ? `<div style="color: #d1d5db; font-size: 0.9rem; line-height: 1.5;">${sanitizeHtml(track.track_description)}</div>` : ''}
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
								${albumCredits.length > 0 ? `
								<div style="display: grid; gap: 16px;">
									${albumCredits.map(/** @type {Credit} */ (credit) => `
										<div style="display: flex; justify-content: space-between; padding: clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px); background: rgba(55, 65, 81, 0.3); border-radius: 8px; border-left: 3px solid #3b82f6; transition: all 0.3s ease; cursor: pointer; gap: 8px; flex-wrap: wrap;" 
											 onmouseover="this.style.background='rgba(55, 65, 81, 0.5)'; this.style.boxShadow='0 0 20px rgba(59, 130, 246, 0.4)'; this.style.borderLeftColor='#60a5fa'"
											 onmouseout="this.style.background='rgba(55, 65, 81, 0.3)'; this.style.boxShadow='none'; this.style.borderLeftColor='#3b82f6'">
											<span style="color: #9ca3af; font-weight: 500; font-size: clamp(0.75rem, 2.5vw, 0.875rem);">${credit.role}</span>
											<span style="color: #ffffff; font-size: clamp(0.75rem, 2.5vw, 0.875rem);">${credit.name}</span>
										</div>
									`).join('')}
								</div>
								` : '<p style="color: #9ca3af; text-align: center; padding: 40px;">No credits available for this album.</p>'}
								
							</div>
						</div>
						
						<!-- Videos Tab -->
						<div id="content-videos" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
							${album.youtube_videos?.length ? `
								<div style="margin-bottom: 32px;">
									<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 20px; text-align: left;">Videos</h3>
									<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-width: 800px;">
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
									
									${album.tracks && album.tracks.length > 0 ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Track List</h3>
										<div class="mobile-track-list-container" style="display: grid; gap: 16px;">
											${album.tracks.map(/** @type {Track} */ (track, /** @type {number} */ i) => `
												<div style="background: rgba(55, 65, 81, 0.5); border-radius: 8px; padding: 16px;">
													<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
														<div>
															<h4 style="color: #ffffff; font-weight: 500; margin-bottom: 4px;">
																${i + 1}. ${track.title}
															</h4>
															${track.duration ? `<span style="color: #9ca3af; font-size: 0.9rem;">${track.duration}</span>` : ''}
														</div>
														${track.licensable ? `<span style="padding: 4px 8px; background: rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 0.75rem; border-radius: 16px;">Available for licensing</span>` : ''}
													</div>
													
													${track.audio_file_url ? `<div class="track-player-mobile" data-track-id="${track.id}" data-audio-url="${track.audio_file_url}" data-track-title="${track.title}" data-artist="${album.artist || ''}" data-can-download="${track.access_type === 'free' || (userAccess?.canDownload ? 'true' : 'false')}" style="margin-bottom: 12px;"></div>` : ''}
													
													${track.track_description ? `<div style="color: #d1d5db; font-size: 0.9rem; line-height: 1.5;">${sanitizeHtml(track.track_description)}</div>` : ''}
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
										${albumCredits.length > 0 ? `
										<div style="display: grid; gap: 16px;">
											${albumCredits.map(/** @type {Credit} */ (credit) => `
												<div style="display: flex; justify-content: space-between; padding: clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px); background: rgba(55, 65, 81, 0.3); border-radius: 8px; border-left: 3px solid #3b82f6; transition: all 0.3s ease; cursor: pointer; gap: 8px; flex-wrap: wrap;" 
													 onmouseover="this.style.background='rgba(55, 65, 81, 0.5)'; this.style.boxShadow='0 0 20px rgba(59, 130, 246, 0.4)'; this.style.borderLeftColor='#60a5fa'"
													 onmouseout="this.style.background='rgba(55, 65, 81, 0.3)'; this.style.boxShadow='none'; this.style.borderLeftColor='#3b82f6'">
													<span style="color: #9ca3af; font-weight: 500; font-size: clamp(0.75rem, 2.5vw, 0.875rem);">${credit.role}</span>
													<span style="color: #ffffff; font-size: clamp(0.75rem, 2.5vw, 0.875rem);">${credit.name}</span>
												</div>
											`).join('')}
										</div>
										` : '<p style="color: #9ca3af; text-align: center; padding: 40px;">No credits available for this album.</p>'}
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
		// Setup streaming links scroll-based visibility animation
		setupStreamingLinksVisibility();
		
		// Initialize audio players for each track (desktop tabs)
		const trackPlayers = document.querySelectorAll('.track-player');
		trackPlayers.forEach(playerEl => {
			const trackId = playerEl.getAttribute('data-track-id');
			const audioUrl = playerEl.getAttribute('data-audio-url');
			// const trackTitle = playerEl.getAttribute('data-track-title');
			// const artist = playerEl.getAttribute('data-artist');
			const canDownload = playerEl.getAttribute('data-can-download') === 'true';
			
			// Create a simple HTML5 audio player
			playerEl.innerHTML = `
				<div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;">
					<button onclick="togglePlay('${trackId}')" id="play-btn-${trackId}" style="background: #3b82f6; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					</button>
					<div style="flex: 1;">
						<audio id="audio-${trackId}" src="${audioUrl}" preload="metadata"></audio>
						<div style="background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; margin-bottom: 4px;">
							<div id="progress-${trackId}" style="background: #3b82f6; height: 100%; border-radius: 2px; width: 0%; transition: width 0.1s;"></div>
						</div>
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
			`;
			
			// Add audio event listeners
			/** @type {HTMLAudioElement | null} */
			const audio = /** @type {HTMLAudioElement | null} */ (document.getElementById(`audio-${trackId}`));
			const playBtn = document.getElementById(`play-btn-${trackId}`);
			const progress = document.getElementById(`progress-${trackId}`);
			const currentTime = document.getElementById(`current-time-${trackId}`);
			const duration = document.getElementById(`duration-${trackId}`);
			
			if (audio) {
				audio.addEventListener('loadedmetadata', () => {
					if (duration) duration.textContent = formatTime(audio.duration);
				});
				
				audio.addEventListener('timeupdate', () => {
					const percent = (audio.currentTime / audio.duration) * 100;
					if (progress) progress.style.width = percent + '%';
					if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
				});
				
				audio.addEventListener('ended', () => {
					if (playBtn) playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
				});
			}
		});
		
		// Initialize audio players for mobile accordion system
		const mobileTrackPlayers = document.querySelectorAll('.track-player-mobile');
		mobileTrackPlayers.forEach(playerEl => {
			const trackId = playerEl.getAttribute('data-track-id');
			const audioUrl = playerEl.getAttribute('data-audio-url');
			const canDownload = playerEl.getAttribute('data-can-download') === 'true';
			
			playerEl.innerHTML = `
				<div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;">
					<button onclick="togglePlay('${trackId}')" id="play-btn-mobile-${trackId}" style="background: #3b82f6; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					</button>
					<div style="flex: 1;">
						<audio id="audio-mobile-${trackId}" src="${audioUrl}" preload="metadata"></audio>
						<div style="background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; margin-bottom: 4px;">
							<div id="progress-mobile-${trackId}" style="background: #3b82f6; height: 100%; border-radius: 2px; width: 0%; transition: width 0.1s;"></div>
						</div>
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
			`;
			
			const audio = document.getElementById(`audio-mobile-${trackId}`);
			const playBtn = document.getElementById(`play-btn-mobile-${trackId}`);
			const progress = document.getElementById(`progress-mobile-${trackId}`);
			const currentTime = document.getElementById(`current-time-mobile-${trackId}`);
			const duration = document.getElementById(`duration-mobile-${trackId}`);
			
			if (audio) {
				audio.addEventListener('loadedmetadata', () => {
					if (duration) duration.textContent = formatTime(audio.duration);
				});
				
				audio.addEventListener('timeupdate', () => {
					const percent = (audio.currentTime / audio.duration) * 100;
					if (progress) progress.style.width = percent + '%';
					if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
				});
				
				audio.addEventListener('ended', () => {
					if (playBtn) playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
				});
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
	
	/** @param {string} trackId */
	window.togglePlay = function(trackId) {
		// Try both desktop and mobile audio elements
		/** @type {HTMLAudioElement | null} */
		const audio = /** @type {HTMLAudioElement | null} */ (document.getElementById(`audio-${trackId}`) || document.getElementById(`audio-mobile-${trackId}`));
		const playBtn = document.getElementById(`play-btn-${trackId}`) || document.getElementById(`play-btn-mobile-${trackId}`);
		
		// Pause all other tracks (both desktop and mobile)
		document.querySelectorAll('[id^="audio-"], [id^="audio-mobile-"]').forEach(otherElement => {
			const otherAudio = /** @type {HTMLAudioElement} */ (otherElement);
			if (otherAudio.id !== `audio-${trackId}` && otherAudio.id !== `audio-mobile-${trackId}` && !otherAudio.paused) {
				otherAudio.pause();
				const otherTrackId = otherAudio.id.replace('audio-', '').replace('audio-mobile-', '');
				const otherPlayBtn = document.getElementById(`play-btn-${otherTrackId}`) || document.getElementById(`play-btn-mobile-${otherTrackId}`);
				if (otherPlayBtn) otherPlayBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
			}
		});
		
		if (audio && playBtn) {
			if (audio.paused) {
				audio.play();
				playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`;
			} else {
				audio.pause();
				playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
			}
		}
	};
	
	/** @param {string} trackId */
	window.handleDownload = function(trackId) {
		// Implementation for download functionality
		console.log('Download track:', trackId);
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
	function formatTime(seconds) {
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}
</script>