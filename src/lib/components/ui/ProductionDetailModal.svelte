<script>
	/**
	 * ProductionDetailModal - Contained modal for viewing production details
	 *
	 * Features:
	 * - Centered, max-width modal with scrollable content
	 * - Hero image with status badge
	 * - Description and rich content
	 * - Video/media embed support
	 * - Links (watch, listen, read, play)
	 * - Comic page viewer integration
	 * - Keyboard support (escape to close)
	 * - Share button for shareable links
	 */

	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { fade, fly } from 'svelte/transition';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { extractYouTubeId } from '$lib/utils/youtube.js';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';

	// Props
	let {
		isOpen = false,
		production = null,
		onClose = () => {},
		onViewPages = () => {},
		loading = false
	} = $props();

	// Share state
	let shareSuccess = $state(false);

	// Get YouTube video ID if available
	const youtubeId = $derived(
		production?.contentEmbedUrl ? extractYouTubeId(production.contentEmbedUrl) : null
	);

	// Get primary action based on content type
	const primaryAction = $derived(() => {
		if (!production) return null;
		if (production.contentType === 'comic_pages') {
			return { label: 'Read Now', icon: 'mdi:book-open-page-variant', action: 'pages' };
		}
		if (production.links?.watch) {
			return { label: 'Watch Now', icon: 'mdi:play-circle', url: production.links.watch };
		}
		if (production.links?.listen) {
			return { label: 'Listen Now', icon: 'mdi:headphones', url: production.links.listen };
		}
		if (production.links?.read) {
			return { label: 'Read Now', icon: 'mdi:book-open-variant', url: production.links.read };
		}
		if (production.links?.play) {
			return { label: 'Play Now', icon: 'mdi:gamepad-variant', url: production.links.play };
		}
		return null;
	});

	// Close modal
	function handleClose() {
		popModalState(); // Go back in history if we pushed a state
		onClose();
	}

	// Handle primary action
	function handlePrimaryAction() {
		const action = primaryAction();
		if (!action) return;

		if (action.action === 'pages') {
			onViewPages(production);
		} else if (action.url && action.url !== '#') {
			window.open(action.url, '_blank');
		}
	}

	// Handle keyboard navigation
	function handleKeydown(event) {
		if (!isOpen) return;

		if (event.key === 'Escape') {
			handleClose();
		}
	}

	// Handle share action
	async function handleShare() {
		if (!production?.slug) {
			console.warn('Cannot share - production has no slug');
			return;
		}
		const shareUrl = generateShareUrl('production', { slug: production.slug });
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			// Add keyboard listener and history handling
			if (browser) {
				// Push history state for back button handling
				pushModalState('production-detail');

				// Setup popstate listener for back button
				const cleanupPopstate = setupPopstateHandler(() => {
					onClose();
				});

				window.addEventListener('keydown', handleKeydown);
				// Prevent body scroll
				document.body.style.overflow = 'hidden';

				return () => {
					cleanupPopstate();
					window.removeEventListener('keydown', handleKeydown);
					document.body.style.overflow = '';
				};
			}
		} else {
			// Remove keyboard listener
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
				// Restore body scroll
				document.body.style.overflow = '';
			}
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
				document.body.style.overflow = '';
			}
		};
	});

	function getStatusColor(status) {
		switch (status) {
			case 'Released':
			case 'Complete':
				return 'bg-green-600/80 text-green-100';
			case 'In Production':
			case 'In Development':
				return 'bg-yellow-600/80 text-yellow-100';
			case 'Ongoing':
				return 'bg-blue-600/80 text-blue-100';
			default:
				return 'bg-gray-600/80 text-gray-100';
		}
	}

	function getCategoryIcon(category) {
		switch (category) {
			case 'video':
				return 'mdi:video';
			case 'comic':
				return 'mdi:book-open-page-variant';
			case 'game':
				return 'mdi:gamepad-variant';
			case 'audio':
				return 'mdi:headphones';
			default:
				return 'mdi:folder';
		}
	}
</script>

{#if isOpen && production}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8"
		role="dialog"
		aria-modal="true"
		aria-label={production.title || 'Production details'}
		transition:fade={{ duration: 200 }}
	>
		<!-- Click outside to close -->
		<div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick={handleClose}></div>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-full md:max-w-4xl h-full md:h-auto max-h-full md:max-h-[90vh] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a] rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<!-- Header Buttons -->
			<div class="absolute top-4 right-4 z-20 flex items-center gap-2">
				<!-- Share button -->
				{#if production?.slug}
					<button
						onclick={handleShare}
						class="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/30 hover:bg-black/50"
						title={shareSuccess ? 'Link copied!' : 'Share'}
					>
						<Icon icon={shareSuccess ? 'mdi:check' : 'mdi:share-variant'} class="text-2xl" />
					</button>
				{/if}
				<!-- Close button -->
				<button
					onclick={handleClose}
					class="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/30 hover:bg-black/50"
					title="Close (Escape)"
				>
					<Icon icon="mdi:close" class="text-2xl" />
				</button>
			</div>

			<!-- Scrollable content -->
			<div class="overflow-y-auto flex-1 custom-scrollbar">
				{#if loading}
					<!-- Loading state -->
					<div class="flex flex-col items-center justify-center gap-4 py-32 text-white/70">
						<Icon icon="mdi:loading" class="text-5xl animate-spin" />
						<p>Loading...</p>
					</div>
				{:else}
					<!-- Hero Image -->
					<div class="relative aspect-video md:aspect-[21/9] overflow-hidden">
						<img
							src={production.image ||
								'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200'}
							alt={production.title}
							class="w-full h-full object-cover"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent"
						></div>

						<!-- Status Badge -->
						<div class="absolute top-4 left-4">
							<span class="px-3 py-1 text-sm font-semibold rounded-full {getStatusColor(production.status)}">
								{production.status}
							</span>
						</div>

						<!-- Category Badge -->
						<div class="absolute top-4 left-auto right-14">
							<span
								class="px-3 py-1 text-sm rounded-full bg-black/50 text-white flex items-center gap-2"
							>
								<Icon icon={getCategoryIcon(production.category)} class="text-lg" />
								{production.type}
							</span>
						</div>
					</div>

					<!-- Content -->
					<div class="p-6 md:p-8 -mt-12 relative">
						<!-- Title & Meta -->
						<div class="mb-6">
							<h2 class="text-2xl md:text-3xl font-bold text-white mb-2">
								{production.title}
							</h2>

							<!-- Meta Info -->
							<div class="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
								{#if production.year}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:calendar" class="text-lg" />
										{production.year}
									</span>
								{/if}
								{#if production.episodes}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:playlist-play" class="text-lg" />
										{production.episodes}
									</span>
								{/if}
								{#if production.platform}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:devices" class="text-lg" />
										{production.platform}
									</span>
								{/if}
								{#if production.duration}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:clock-outline" class="text-lg" />
										{production.duration}
									</span>
								{/if}
							</div>
						</div>

						<!-- Tags -->
						{#if production.tags && production.tags.length > 0}
							<div class="flex flex-wrap gap-2 mb-6">
								{#each production.tags as tag}
									<span class="bg-white/10 text-gray-300 px-3 py-1 text-sm rounded-full">
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						<!-- Description -->
						{#if production.description}
							<div class="mb-8">
								<p class="text-gray-300 text-lg leading-relaxed">
									{production.description}
								</p>
							</div>
						{/if}

						<!-- Video Embed (if YouTube) -->
						{#if youtubeId}
							<div class="mb-8">
								<h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
									<Icon icon="mdi:youtube" class="text-red-500" />
									Video
								</h3>
								<div class="aspect-video rounded-xl overflow-hidden bg-black">
									<iframe
										src="https://www.youtube.com/embed/{youtubeId}"
										title={production.title}
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										allowfullscreen
										class="w-full h-full"
									></iframe>
								</div>
							</div>
						{/if}

						<!-- Action Buttons -->
						<div class="flex flex-wrap gap-3 mb-6">
							<!-- Primary Action -->
							{#if primaryAction()}
								<button
									onclick={handlePrimaryAction}
									class="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2 shadow-lg"
								>
									<Icon icon={primaryAction().icon} class="text-xl" />
									{primaryAction().label}
								</button>
							{/if}

							<!-- Secondary Links -->
							{#if production.links?.watch && production.links.watch !== primaryAction()?.url}
								<a
									href={production.links.watch}
									target="_blank"
									rel="noopener noreferrer"
									class="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-2"
								>
									<Icon icon="mdi:play-circle" class="text-lg" />
									Watch
								</a>
							{/if}

							{#if production.links?.listen && production.links.listen !== primaryAction()?.url}
								<a
									href={production.links.listen}
									target="_blank"
									rel="noopener noreferrer"
									class="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-2"
								>
									<Icon icon="mdi:headphones" class="text-lg" />
									Listen
								</a>
							{/if}

							{#if production.links?.read && production.links.read !== primaryAction()?.url}
								<a
									href={production.links.read}
									target="_blank"
									rel="noopener noreferrer"
									class="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-2"
								>
									<Icon icon="mdi:book-open-variant" class="text-lg" />
									Read
								</a>
							{/if}
						</div>

						<!-- External Links -->
						{#if production.externalLinks && production.externalLinks.length > 0}
							<div class="border-t border-white/10 pt-6">
								<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
									More Links
								</h3>
								<div class="flex flex-wrap gap-3">
									{#each production.externalLinks as link}
										<a
											href={link.url}
											target="_blank"
											rel="noopener noreferrer"
											class="px-4 py-2 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
										>
											<Icon icon={link.icon || 'mdi:link'} class="text-lg" />
											{link.label || 'Link'}
										</a>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar styling */
	.custom-scrollbar::-webkit-scrollbar {
		width: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(15, 23, 42, 0.5);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, rgba(59, 130, 246, 0.6), rgba(139, 92, 246, 0.6));
		border-radius: 10px;
		border: 2px solid rgba(15, 23, 42, 0.5);
		transition: background 0.3s ease;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(180deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8));
	}

	/* Firefox scrollbar styling */
	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(59, 130, 246, 0.6) rgba(15, 23, 42, 0.5);
	}
</style>
