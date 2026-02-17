<script>
	import Swal from 'sweetalert2';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade } from 'svelte/transition';
	import { getYouTubeThumbnail } from '$lib/utils/youtube.js';
	import { pushModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import '$lib/styles/album-modal.css';
	
	let {
		/** @type {{id: number, title: string, description: string, video_url: string, video_type: string, leftContent: {type: string, videoId: string | null, src: string | null}}} */
		featuredWork
	} = $props();
	
	export async function showModal() {
		const modalContent = createModalContent();

		// Push history state for back button handling
		pushModalState(`video-${featuredWork.id || featuredWork.title}`);

		// Track cleanup function for popstate listener
		let cleanupPopstate;

		const result = await Swal.fire({
			title: featuredWork.title,
			html: modalContent,
			width: '90%',
			maxWidth: '1200px',
			showCloseButton: true,
			showConfirmButton: false,
			customClass: {
				popup: 'album-modal-popup video-modal-popup',
				htmlContainer: 'album-modal-content modal-scrollbar'
			},
			background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				// Setup back button handler
				cleanupPopstate = setupPopstateHandler(() => {
					Swal.close();
				});

				// Initialize any components that need mounting
				initializeModalComponents();

				// Fix HTML rendering in description
				const descriptionElement = document.querySelector('.featured-work-description');
				if (descriptionElement && featuredWork.description) {
					descriptionElement.innerHTML = sanitizeHtml(featuredWork.description);
				}

				// Calculate scrollbar width for compensation
				const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
				document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
				// Lock body scroll
				document.body.classList.add('modal-open');
			},
			willClose: () => {
				// Cleanup popstate listener
				if (cleanupPopstate) cleanupPopstate();

				document.body.classList.remove('modal-open');
				document.documentElement.style.removeProperty('--scrollbar-width');
			}
		});

		return result;
	}
	
	function createModalContent() {
		const isYouTubeVideo = featuredWork.video_type === 'youtube' && featuredWork.leftContent.videoId;
		const thumbnailUrl = isYouTubeVideo ? 
			getYouTubeThumbnail(featuredWork.leftContent.videoId, 'maxresdefault') : 
			featuredWork.leftContent.src;
		
		return `
			<div class="video-modal-container" style="display: flex; flex-direction: column; gap: clamp(16px, 2vw, 20px); height: 100%; max-height: 80vh; padding: clamp(12px, 4vw, 20px);">
				<!-- Video Section with max-width constraint -->
				<div class="video-section" style="flex: 0 1 auto; display: flex; flex-direction: column; align-items: center;">
					<div class="video-container" style="position: relative; width: 100%; max-width: 900px; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
						${isYouTubeVideo ? `
							<iframe 
								id="youtube-player"
								src="https://www.youtube.com/embed/${featuredWork.leftContent.videoId}?autoplay=0&rel=0&showinfo=0&controls=1"
								title="${featuredWork.title}"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
								style="position: absolute; inset: 0; width: 100%; height: 100%;">
							</iframe>
						` : `
							<div class="video-placeholder" style="position: absolute; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;">
								<div style="background: rgba(0,0,0,0.7); border-radius: 50%; padding: 20px; cursor: pointer;" onclick="playVideo()">
									<svg width="48" height="48" viewBox="0 0 24 24" fill="white">
										<path d="M8 5v14l11-7z"/>
									</svg>
								</div>
							</div>
						`}
					</div>
				</div>
				
				<!-- Content Section -->
				<div class="content-section" style="flex: 1 1 auto; min-height: 0; overflow-y: auto;">
					<div style="text-align: left;">
						<h2 style="font-size: 1.75rem; font-weight: bold; margin-bottom: 16px; color: #ffffff;">${featuredWork.title}</h2>
						
						${featuredWork.description ? `
							<div class="featured-work-description" style="color: #d1d5db; line-height: 1.6; font-size: 1rem; margin-bottom: clamp(8px, 1.5vw, 16px);">
								<!-- HTML content will be inserted here via JavaScript -->
								<style>
									.featured-work-description p { margin-bottom: clamp(6px, 1.5vw, 0.75rem); }
									.featured-work-description p:last-child { margin-bottom: 0; }
								</style>
							</div>
						` : ''}
						
						${featuredWork.video_type === 'youtube' && featuredWork.video_url ? `
							<div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
								<a href="${featuredWork.video_url}" target="_blank" 
								   style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 0, 0, 0.2); color: #ff0000; text-decoration: none; border-radius: 8px; transition: all 0.3s;"
								   onmouseover="this.style.background='rgba(255, 0, 0, 0.3)'; this.style.transform='scale(1.05)'"
								   onmouseout="this.style.background='rgba(255, 0, 0, 0.2)'; this.style.transform='scale(1)'">
									<iconify-icon noobserver icon="simple-icons:youtube" width="20" height="20"></iconify-icon>
									<span style="font-size: 0.9rem; font-weight: 500;">Watch on YouTube</span>
								</a>
							</div>
						` : ''}
						
						${featuredWork.link && featuredWork.link !== '#' ? `
							<div style="margin-top: 24px;">
								<a href="${featuredWork.link}" target="_blank"
								   style="display: inline-block; padding: 12px 24px; background: linear-gradient(45deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s;"
								   onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 10px 20px rgba(59, 130, 246, 0.4)'"
								   onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
									View Full Project
								</a>
							</div>
						` : ''}
					</div>
				</div>
			</div>
		`;
	}
	
	function initializeModalComponents() {
		// Initialize video player if needed
		if (featuredWork.video_type !== 'youtube') {
			window.playVideo = function() {
				// For non-YouTube videos, could implement custom video player
				console.log('Play video:', featuredWork.video_url);
			};
		}
	}
</script>

<style>
	:global(.video-modal-popup) {
		border-radius: 16px;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
	}
	
	:global(.video-modal-container) {
		scrollbar-width: thin;
		scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.1);
	}
	
	:global(.video-modal-container::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(.video-modal-container::-webkit-scrollbar-track) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}
	
	:global(.video-modal-container::-webkit-scrollbar-thumb) {
		background: rgba(59, 130, 246, 0.5);
		border-radius: 3px;
	}
	
	:global(.video-modal-container::-webkit-scrollbar-thumb:hover) {
		background: rgba(59, 130, 246, 0.7);
	}
</style>