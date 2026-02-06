<script>
	import Swal from 'sweetalert2';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { pushModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import '$lib/styles/new-release-modal.css';

	let {
		release
	} = $props();

	export async function showModal() {
		if (!release) return;

		const modalContent = createModalContent();

		// Push history state for back button handling
		pushModalState(`new-release-${release.id || release.title}`);

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
				popup: 'new-release-modal-popup',
				htmlContainer: 'new-release-modal-content'
			},
			background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				// Setup back button handler
				cleanupPopstate = setupPopstateHandler(() => {
					Swal.close();
				});

				// Lock body scroll on mobile
				document.body.classList.add('swal2-shown');
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

	function createModalContent() {
		const hasVideo = release.videoId && release.mediaType === 'video';

		return `
			<div class="new-release-modal-container">
				<!-- Header with Title -->
				<div class="release-header">
					<h2 class="release-title">${release.title}</h2>
					${release.releaseType ? `<span class="release-type-badge">${release.releaseType}</span>` : ''}
					${release.releaseDate ? `<p class="release-date">${formatDate(release.releaseDate)}</p>` : ''}
				</div>

				<!-- Main Media Section -->
				<div class="release-media-section">
					${hasVideo ? `
						<div class="video-container">
							<iframe
								src="https://www.youtube.com/embed/${release.videoId}?rel=0"
								title="${release.title}"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
							></iframe>
						</div>
					` : `
						<div class="image-container">
							<img src="${release.mediaUrl}" alt="${release.title}" class="release-image" />
						</div>
					`}
				</div>

				<!-- Content Section -->
				<div class="release-content-section">
					<!-- Description -->
					${release.richContent || release.description ? `
						<div class="release-description">
							${release.richContent ?
								sanitizeHtml(release.richContent) :
								`<p>${release.description}</p>`}
						</div>
					` : ''}

					<!-- Project Link Button -->
					${release.projectLink ? `
						<div class="project-link-container">
							<a href="${release.projectLink}" target="_blank" rel="noopener noreferrer" class="project-link-btn">
								<iconify-icon icon="mdi:open-in-new" width="20" height="20"></iconify-icon>
								${release.projectLinkLabel || 'View Project'}
							</a>
						</div>
					` : ''}

					<!-- Streaming Platforms -->
					${release.streamingPlatforms && release.streamingPlatforms.length > 0 ? `
						<div class="streaming-platforms-section">
							<h4 class="section-label">Listen On</h4>
							<div class="streaming-platforms-grid">
								${release.streamingPlatforms.map(platform => `
									<a href="${platform.url}" target="_blank" rel="noopener noreferrer"
									   class="streaming-platform-link" title="${platform.name}">
										<iconify-icon icon="${platform.icon}" width="32" height="32"></iconify-icon>
										<span class="platform-name">${platform.name}</span>
									</a>
								`).join('')}
							</div>
						</div>
					` : ''}

					<!-- External Links -->
					${release.externalLinks && release.externalLinks.length > 0 ? `
						<div class="external-links-section">
							<h4 class="section-label">More Links</h4>
							<div class="external-links-grid">
								${release.externalLinks.map(link => `
									<a href="${link.url}" target="_blank" rel="noopener noreferrer"
									   class="external-link-btn">
										<iconify-icon icon="mdi:link-variant" width="18" height="18"></iconify-icon>
										${link.label}
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
