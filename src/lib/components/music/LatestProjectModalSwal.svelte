<script>
	import Swal from 'sweetalert2';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { pushModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import { markImageLoaded } from '$lib/utils/imageCache.js';
	import '$lib/styles/latest-project-modal.css';

	let {
		project
	} = $props();

	export async function showModal() {
		if (!project) return;

		const modalContent = createModalContent();

		// Push history state for back button handling
		pushModalState(`latest-project-${project.id || project.title}`);

		// Track cleanup function for popstate listener
		let cleanupPopstate;

		const result = await Swal.fire({
			title: '',
			html: modalContent,
			width: '95%',
			showCloseButton: true,
			showConfirmButton: false,
			scrollbarPadding: false,
			customClass: {
				popup: 'latest-project-modal-popup',
				htmlContainer: 'latest-project-modal-content modal-scrollbar'
			},
			background: project.backgroundImageUrl
				? `linear-gradient(145deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%), url('${project.backgroundImageUrl}')`
				: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				// Setup back button handler
				cleanupPopstate = setupPopstateHandler(() => {
					Swal.close();
				});

				// Lock body scroll on mobile
				document.body.classList.add('swal2-shown');

				// Register project image in global cache once loaded
				const img = document.querySelector('.project-image');
				if (img) {
					const imgSrc = img.getAttribute('src');
					img.onload = () => markImageLoaded(imgSrc);
					if (img.complete) markImageLoaded(imgSrc);
				}
			},
			willClose: () => {
				// Cleanup popstate listener
				if (cleanupPopstate) cleanupPopstate();

				// Unlock body scroll
				document.body.classList.remove('swal2-shown');
			}
		});

		return result;
	}

	function formatDate(dateString) {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getPlatformClass(link) {
		const label = (link.label || '').toLowerCase();
		const icon = (link.iconValue || '').toLowerCase();

		if (label.includes('youtube') || icon.includes('youtube')) return 'platform-youtube';
		if (label.includes('spotify') || icon.includes('spotify')) return 'platform-spotify';
		if (label.includes('bandcamp') || icon.includes('bandcamp')) return 'platform-bandcamp';
		if (label.includes('apple') || icon.includes('apple')) return 'platform-apple';
		if (label.includes('amazon') || icon.includes('amazon')) return 'platform-amazon';
		if (label.includes('tidal') || icon.includes('tidal')) return 'platform-tidal';
		if (label.includes('soundcloud') || icon.includes('soundcloud')) return 'platform-soundcloud';
		if (label.includes('deezer') || icon.includes('deezer')) return 'platform-deezer';
		return '';
	}

	function createModalContent() {
		const hasVideo = project.hasVideo && project.featuredVideo?.videoId;
		const videoId = project.featuredVideo?.videoId;

		return `
			<div class="latest-project-modal-container">
				<!-- Main Video/Media Section - Big at Top -->
				<div class="project-media-section">
					${hasVideo ? `
						<div class="video-container">
							<iframe
								src="https://www.youtube.com/embed/${videoId}?rel=0"
								title="${project.title}"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
							></iframe>
						</div>
					` : `
						<div class="image-container">
							<img src="${project.thumbnailUrl || project.coverArt}" alt="${project.title}" class="project-image" />
						</div>
					`}
				</div>

				<!-- Header with Title and Meta -->
				<div class="project-header">
					<div class="project-meta">
						${project.releaseType ? `<span class="release-type-badge">${project.releaseType}</span>` : ''}
						${project.releaseDate ? `<span class="release-date">${formatDate(project.releaseDate)}</span>` : ''}
					</div>
					<h2 class="project-title">${project.title}</h2>
					${project.artist ? `<p class="project-artist">by ${project.artist}</p>` : ''}
				</div>

				<!-- Content Section -->
				<div class="project-content-section">
					<!-- Description and Liner Notes -->
					${project.richContent || project.description || project.linerNotes ? `
						<div class="project-description">
							${project.richContent ?
								sanitizeHtml(project.richContent) :
								project.description ? `<p>${project.description}</p>` : ''}
							${project.linerNotes ? `<br/>${sanitizeHtml(project.linerNotes)}` : ''}
						</div>
					` : ''}

					<!-- External Links -->
					${project.externalLinks && project.externalLinks.length > 0 ? `
						<div class="external-links-section">
							<h4 class="section-label">Links</h4>
							<div class="external-links-grid">
								${project.externalLinks.map(link => `
									<a href="${link.url}" target="_blank" rel="noopener noreferrer"
									   class="external-link-btn ${link.isPrimary ? 'primary' : ''} ${getPlatformClass(link)}">
										${link.iconValue ? `<iconify-icon noobserver icon="${link.iconValue}" width="18" height="18"></iconify-icon>` : `<iconify-icon noobserver icon="mdi:link-variant" width="18" height="18"></iconify-icon>`}
										${link.label}
									</a>
								`).join('')}
							</div>
						</div>
					` : ''}

					<!-- Additional Videos (if more than featured) -->
					${project.videos && project.videos.length > 1 ? `
						<div class="more-videos-section">
							<h4 class="section-label">More Videos</h4>
							<div class="videos-grid">
								${project.videos.filter(v => v.id !== project.featuredVideo?.id).map(video => `
									<a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener noreferrer"
									   class="video-thumbnail-link">
										<img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}" />
										<div class="video-play-overlay">
											<iconify-icon noobserver icon="mdi:play-circle" width="40" height="40"></iconify-icon>
										</div>
										<span class="video-title">${video.title}</span>
									</a>
								`).join('')}
							</div>
						</div>
					` : ''}
				</div>
			</div>
		`;
	}
</script>
