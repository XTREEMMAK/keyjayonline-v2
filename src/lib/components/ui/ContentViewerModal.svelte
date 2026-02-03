<script>
	/**
	 * ContentViewerModal - Full-screen modal for viewing comic pages and image galleries
	 *
	 * Features:
	 * - Pinch-zoom on mobile
	 * - Click-to-zoom toggle (fit → 150% → 200% → fit)
	 * - Swipe/arrow navigation
	 * - Page counter
	 * - Keyboard support (arrows, escape)
	 * - Loading state
	 */

	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';

	// Props
	let {
		isOpen = false,
		pages = [],
		initialPage = 0,
		title = '',
		onClose = () => {},
		loading = false
	} = $props();

	// State
	let currentPage = $state(initialPage);
	let zoomLevel = $state(1); // 1 = fit, 1.5 = 150%, 2 = 200%
	let imageLoading = $state(true);
	let containerRef = $state(null);

	// Computed
	const currentPageData = $derived(pages[currentPage] || null);
	const totalPages = $derived(pages.length);
	const hasNext = $derived(currentPage < totalPages - 1);
	const hasPrev = $derived(currentPage > 0);

	// Zoom levels for click-to-zoom toggle
	const zoomLevels = [1, 1.5, 2];

	// Navigate to next/prev page
	function nextPage() {
		if (hasNext) {
			currentPage++;
			zoomLevel = 1;
			imageLoading = true;
		}
	}

	function prevPage() {
		if (hasPrev) {
			currentPage--;
			zoomLevel = 1;
			imageLoading = true;
		}
	}

	// Toggle zoom on click
	function toggleZoom() {
		const currentIndex = zoomLevels.indexOf(zoomLevel);
		const nextIndex = (currentIndex + 1) % zoomLevels.length;
		zoomLevel = zoomLevels[nextIndex];
	}

	// Close modal
	function handleClose() {
		currentPage = 0;
		zoomLevel = 1;
		onClose();
	}

	// Handle keyboard navigation
	function handleKeydown(event) {
		if (!isOpen) return;

		switch (event.key) {
			case 'Escape':
				handleClose();
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				nextPage();
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				prevPage();
				break;
			case ' ':
				event.preventDefault();
				toggleZoom();
				break;
		}
	}

	// Handle swipe gestures
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(event) {
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event) {
		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;
		const diffX = touchStartX - touchEndX;
		const diffY = touchStartY - touchEndY;

		// Only swipe if horizontal movement is greater than vertical
		if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
			if (diffX > 0) {
				nextPage();
			} else {
				prevPage();
			}
		}
	}

	// Handle image load
	function handleImageLoad() {
		imageLoading = false;
	}

	// Reset state when modal opens and handle body scroll lock
	$effect(() => {
		if (isOpen) {
			currentPage = initialPage;
			zoomLevel = 1;
			imageLoading = true;

			// Update store to hide navbar and scroll button
			contentViewerOpen.set(true);

			// Lock body scroll when modal is open
			if (browser) {
				// Store original overflow value
				const originalOverflow = document.body.style.overflow;
				const originalPaddingRight = document.body.style.paddingRight;

				// Get scrollbar width to prevent layout shift
				const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

				// Lock scroll and add padding to prevent layout shift
				document.body.style.overflow = 'hidden';
				if (scrollbarWidth > 0) {
					document.body.style.paddingRight = `${scrollbarWidth}px`;
				}

				// Add keyboard listener
				window.addEventListener('keydown', handleKeydown);

				// Cleanup function to restore scroll
				return () => {
					document.body.style.overflow = originalOverflow;
					document.body.style.paddingRight = originalPaddingRight;
					window.removeEventListener('keydown', handleKeydown);
				};
			}
		} else {
			// Update store to show navbar and scroll button again
			contentViewerOpen.set(false);

			// Remove keyboard listener
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
			}
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
			}
		};
	});
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Content viewer'}
	>
		<!-- Header -->
		<div
			class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent"
		>
			<!-- Title & Page Counter -->
			<div class="flex items-center gap-4">
				{#if title}
					<h2 class="text-white font-semibold text-lg truncate max-w-[200px] md:max-w-[400px]">
						{title}
					</h2>
				{/if}
				{#if totalPages > 1}
					<span class="text-white/70 text-sm">
						{currentPage + 1} / {totalPages}
					</span>
				{/if}
			</div>

			<!-- Controls -->
			<div class="flex items-center gap-2">
				<!-- Zoom indicator -->
				<button
					onclick={toggleZoom}
					class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
					title="Toggle zoom (Space)"
				>
					<Icon icon="mdi:magnify-plus" class="text-xl" />
					<span class="text-xs ml-1">{Math.round(zoomLevel * 100)}%</span>
				</button>

				<!-- Close button -->
				<button
					onclick={handleClose}
					class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
					title="Close (Escape)"
				>
					<Icon icon="mdi:close" class="text-2xl" />
				</button>
			</div>
		</div>

		<!-- Main content area -->
		<div
			bind:this={containerRef}
			class="absolute inset-0 flex items-center justify-center overflow-hidden pt-14 pb-16"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
			role="presentation"
		>
			{#if loading}
				<!-- Loading state -->
				<div class="flex flex-col items-center gap-4 text-white/70">
					<Icon icon="mdi:loading" class="text-5xl animate-spin" />
					<p>Loading pages...</p>
				</div>
			{:else if !currentPageData}
				<!-- No content -->
				<div class="flex flex-col items-center gap-4 text-white/70">
					<Icon icon="mdi:image-off" class="text-5xl" />
					<p>No pages available</p>
				</div>
			{:else}
				<!-- Image container with zoom -->
				<div
					class="relative max-w-full max-h-full transition-transform duration-200 ease-out"
					style="transform: scale({zoomLevel}); touch-action: pinch-zoom;"
				>
					{#if imageLoading}
						<div
							class="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg"
						>
							<Icon icon="mdi:loading" class="text-4xl text-white/70 animate-spin" />
						</div>
					{/if}

					<!-- Image -->
					<img
						src={currentPageData.imageUrl}
						alt={currentPageData.title || `Page ${currentPage + 1}`}
						class="max-w-[90vw] max-h-[80vh] object-contain cursor-zoom-in rounded-lg shadow-2xl"
						class:cursor-zoom-out={zoomLevel > 1}
						onclick={toggleZoom}
						onload={handleImageLoad}
						draggable="false"
					/>

					<!-- Caption -->
					{#if currentPageData.caption}
						<p
							class="absolute bottom-0 left-0 right-0 p-3 bg-black/70 text-white text-sm text-center rounded-b-lg"
						>
							{currentPageData.caption}
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Navigation arrows -->
		{#if totalPages > 1}
			<!-- Previous -->
			<button
				onclick={prevPage}
				disabled={!hasPrev}
				class="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white transition-all
                       {hasPrev ? 'hover:bg-white/20 hover:scale-110' : 'opacity-30 cursor-not-allowed'}"
				title="Previous page"
			>
				<Icon icon="mdi:chevron-left" class="text-3xl" />
			</button>

			<!-- Next -->
			<button
				onclick={nextPage}
				disabled={!hasNext}
				class="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white transition-all
                       {hasNext ? 'hover:bg-white/20 hover:scale-110' : 'opacity-30 cursor-not-allowed'}"
				title="Next page"
			>
				<Icon icon="mdi:chevron-right" class="text-3xl" />
			</button>
		{/if}

		<!-- Footer with page thumbnails (optional, for many pages) -->
		{#if totalPages > 1}
			<div
				class="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent"
			>
				<!-- Page dots -->
				<div class="flex gap-1.5 max-w-full overflow-x-auto py-1">
					{#each pages as page, index}
						<button
							onclick={() => {
								currentPage = index;
								zoomLevel = 1;
								imageLoading = true;
							}}
							class="w-2 h-2 rounded-full transition-all duration-200 flex-shrink-0
                                   {index === currentPage
								? 'bg-white w-6'
								: 'bg-white/40 hover:bg-white/70'}"
							title={page.title || `Page ${index + 1}`}
						></button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
