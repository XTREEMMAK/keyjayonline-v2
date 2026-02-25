<script>
	/**
	 * VideoPlayerModal - Full-screen modal for playing hosted or embedded videos
	 *
	 * Supports:
	 * - YouTube videos and playlists (iframe embed)
	 * - Vimeo videos (iframe embed)
	 * - Hosted/direct video URLs (HTML5 <video>)
	 *
	 * On open: stops all Wavesurfer audio, locks scroll, pushes history state.
	 * z-[99999] to sit above all other modals including ProductionDetailModal.
	 */

	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { fade, fly } from 'svelte/transition';
	import { pauseAllTrackPlayers } from '$lib/utils/wavesurfer-helpers.js';
	import { pauseMusic } from '$lib/stores/musicPlayer.js';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';

	let {
		isOpen = false,
		videoUrl = '',
		title = '',
		onClose = () => {}
	} = $props();

	/**
	 * Detect video type from URL
	 * @returns {'youtube'|'vimeo'|'hosted'|null}
	 */
	function getVideoType(url) {
		if (!url) return null;
		if (url.match(/youtube\.com|youtu\.be/)) return 'youtube';
		if (url.match(/vimeo\.com/)) return 'vimeo';
		return 'hosted';
	}

	/**
	 * Build the appropriate embed URL from the source URL
	 */
	function getEmbedUrl(url) {
		if (!url) return '';
		const type = getVideoType(url);

		if (type === 'youtube') {
			// Check for playlist
			const playlistMatch = url.match(/[?&]list=([^&]+)/);
			const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);

			if (playlistMatch && videoMatch) {
				return `https://www.youtube.com/embed/${videoMatch[1]}?list=${playlistMatch[1]}&autoplay=1&rel=0`;
			}
			if (playlistMatch) {
				return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&autoplay=1&rel=0`;
			}
			if (videoMatch) {
				return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1&rel=0`;
			}
		}

		if (type === 'vimeo') {
			const match = url.match(/vimeo\.com\/(\d+)/);
			if (match) {
				return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
			}
		}

		return url;
	}

	const videoType = $derived(getVideoType(videoUrl));
	const embedUrl = $derived(getEmbedUrl(videoUrl));

	function handleClose() {
		popModalState();
		onClose();
	}

	function handleKeydown(event) {
		if (!isOpen) return;
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	// Backdrop click — close only if clicking the backdrop itself
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	$effect(() => {
		if (isOpen) {
			// Stop all audio players
			pauseAllTrackPlayers();
			pauseMusic();

			// Signal to other modals that a top-level viewer is open
			contentViewerOpen.set(true);

			if (browser) {
				pushModalState('video-player');

				const cleanupPopstate = setupPopstateHandler('video-player', () => {
					onClose();
				});

				// Save original scroll state
				const originalOverflow = document.body.style.overflow;
				const originalPaddingRight = document.body.style.paddingRight;
				const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

				// Lock scroll with scrollbar compensation
				document.body.style.overflow = 'hidden';
				if (scrollbarWidth > 0) {
					document.body.style.paddingRight = `${scrollbarWidth}px`;
				}

				window.addEventListener('keydown', handleKeydown);

				return () => {
					cleanupPopstate();
					contentViewerOpen.set(false);
					document.body.style.overflow = originalOverflow;
					document.body.style.paddingRight = originalPaddingRight;
					window.removeEventListener('keydown', handleKeydown);
				};
			}
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (browser) {
				contentViewerOpen.set(false);
				window.removeEventListener('keydown', handleKeydown);
				document.body.style.overflow = '';
			}
		};
	});
</script>

{#if isOpen && videoUrl}
	<!-- Full-screen backdrop -->
	<div
		class="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Video player'}
		transition:fade={{ duration: 250 }}
		onclick={handleBackdropClick}
	>
		<!-- Header bar -->
		<div
			class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent"
			in:fly={{ y: -20, duration: 300, delay: 100 }}
		>
			{#if title}
				<h2 class="text-white font-semibold text-lg truncate max-w-[60vw]">
					{title}
				</h2>
			{:else}
				<div></div>
			{/if}
			<button
				onclick={handleClose}
				class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
				title="Close (Escape)"
			>
				<Icon icon="mdi:close" class="text-2xl" />
			</button>
		</div>

		<!-- Video container -->
		<div
			class="w-full max-w-5xl px-4"
			in:fly={{ y: 30, duration: 350, delay: 150 }}
		>
			<div class="relative aspect-video rounded-lg overflow-hidden bg-black shadow-2xl">
				{#if videoType === 'hosted'}
					<!-- HTML5 video for hosted/direct URLs -->
					<video
						src={videoUrl}
						controls
						autoplay
						class="absolute inset-0 w-full h-full"
					>
						<track kind="captions" />
					</video>
				{:else if embedUrl}
					<!-- YouTube/Vimeo iframe embed -->
					<iframe
						src={embedUrl}
						title={title || 'Video'}
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen
						class="absolute inset-0 w-full h-full"
					></iframe>
				{/if}
			</div>
		</div>
	</div>
{/if}
