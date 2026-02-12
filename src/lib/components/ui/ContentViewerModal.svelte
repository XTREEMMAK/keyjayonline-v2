<script>
	/**
	 * ContentViewerModal - Full-screen modal for viewing image galleries and page content
	 *
	 * Features:
	 * - Pinch-zoom on mobile
	 * - Click-to-zoom toggle (100% → 120% → ... → 400% → 100%, step 20%)
	 * - Swipe/arrow navigation
	 * - Page counter
	 * - Keyboard support (arrows, escape)
	 * - Loading state
	 */

	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';

	// Props
	let {
		isOpen = false,
		pages = [],
		initialPage = 0,
		title = '',
		onClose = () => {},
		loading = false,
		manageOverlayStore = true
	} = $props();

	// State
	let currentPage = $state(initialPage);
	let zoomLevel = $state(1); // 1 = fit (100%), up to 4 (400%)
	let imageLoading = $state(true);
	let containerRef = $state(null);
	let captionExpanded = $state(false);

	// Drag-to-pan state (active when zoomed in)
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartPanX = 0;
	let dragStartPanY = 0;
	let totalDragDistance = 0;

	// Computed
	const currentPageData = $derived(pages[currentPage] || null);
	const totalPages = $derived(pages.length);
	const hasNext = $derived(currentPage < totalPages - 1);
	const hasPrev = $derived(currentPage > 0);

	// Zoom configuration
	const ZOOM_MIN = 1;
	const ZOOM_MAX = 4;
	const ZOOM_STEP = 0.2;

	// Navigate to next/prev page
	function nextPage() {
		if (hasNext) {
			currentPage++;
			zoomLevel = 1;
			panX = 0;
			panY = 0;
			imageLoading = true;
			captionExpanded = false;
		}
	}

	function prevPage() {
		if (hasPrev) {
			currentPage--;
			zoomLevel = 1;
			panX = 0;
			panY = 0;
			imageLoading = true;
			captionExpanded = false;
		}
	}

	// Toggle zoom on click
	function toggleZoom() {
		const next = Math.round((zoomLevel + ZOOM_STEP) * 100) / 100;
		if (next > ZOOM_MAX) {
			zoomLevel = ZOOM_MIN;
			panX = 0;
			panY = 0;
		} else {
			zoomLevel = next;
		}
	}

	// Scroll wheel zoom
	function handleWheel(event) {
		event.preventDefault();
		if (event.deltaY < 0) {
			// Scroll up → zoom in
			const next = Math.round((zoomLevel + ZOOM_STEP) * 100) / 100;
			if (next <= ZOOM_MAX) {
				zoomLevel = next;
			}
		} else {
			// Scroll down → zoom out
			const next = Math.round((zoomLevel - ZOOM_STEP) * 100) / 100;
			if (next >= ZOOM_MIN) {
				zoomLevel = next;
				if (zoomLevel === ZOOM_MIN) { panX = 0; panY = 0; }
			}
		}
	}

	// Drag-to-pan handlers (mouse)
	function handleMouseDown(event) {
		if (zoomLevel <= 1) return;
		isPanning = true;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragStartPanX = panX;
		dragStartPanY = panY;
		totalDragDistance = 0;
		event.preventDefault();
	}

	function handleMouseMove(event) {
		if (!isPanning) return;
		const dx = event.clientX - dragStartX;
		const dy = event.clientY - dragStartY;
		totalDragDistance = Math.sqrt(dx * dx + dy * dy);
		panX = dragStartPanX + dx;
		panY = dragStartPanY + dy;
	}

	function handleMouseUp() {
		if (!isPanning) {
			// Not panning — treat as click for zoom toggle
			toggleZoom();
			return;
		}
		isPanning = false;
		// If barely moved, treat as click (zoom toggle)
		if (totalDragDistance < 5) {
			toggleZoom();
		}
	}

	// Close modal
	function handleClose() {
		popModalState(); // Go back in history if we pushed a state
		currentPage = 0;
		zoomLevel = 1;
		panX = 0;
		panY = 0;
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
			panX = 0;
			panY = 0;
			imageLoading = true;
			captionExpanded = false;

			// Update store to hide navbar and scroll button (skip if parent modal handles it)
			if (manageOverlayStore) contentViewerOpen.set(true);

			// Lock body scroll when modal is open
			if (browser) {
				// Push history state for back button handling
				pushModalState('content-viewer');

				// Setup popstate listener for back button (modal-aware)
				const cleanupPopstate = setupPopstateHandler('content-viewer', () => {
					currentPage = 0;
					zoomLevel = 1;
					onClose();
				});

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
					cleanupPopstate();
					document.body.style.overflow = originalOverflow;
					document.body.style.paddingRight = originalPaddingRight;
					window.removeEventListener('keydown', handleKeydown);
				};
			}
		} else {
			// Update store to show navbar and scroll button again (skip if parent modal handles it)
			if (manageOverlayStore) contentViewerOpen.set(false);

			// Remove keyboard listener
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
			}
		}
	});

	// Collapse caption when zooming in
	$effect(() => {
		if (zoomLevel > 1) {
			captionExpanded = false;
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
				<!-- Image + caption container -->
				<div class="flex flex-col items-center max-w-[90vw]" class:max-h-full={!captionExpanded}>
					<!-- Image container with zoom -->
					<div
						class="relative ease-out select-none"
						class:transition-transform={!isPanning}
						style="transform: scale({zoomLevel}) translate({panX / zoomLevel}px, {panY / zoomLevel}px); touch-action: pinch-zoom;"
						onmousedown={handleMouseDown}
						onmousemove={handleMouseMove}
						onmouseup={handleMouseUp}
						onmouseleave={() => { if (isPanning) isPanning = false; }}
						onwheel={handleWheel}
						role="presentation"
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
							class="max-w-[90vw] object-contain rounded-lg shadow-2xl {currentPageData.caption || currentPageData.title ? 'max-h-[65vh]' : 'max-h-[80vh]'} {zoomLevel > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}"
							onload={handleImageLoad}
							draggable="false"
						/>
					</div>

					<!-- Caption panel (hidden when zoomed) -->
					{#if (currentPageData.caption || currentPageData.title) && zoomLevel <= 1}
						<div class="w-full mt-2 rounded-lg bg-black/80 backdrop-blur-sm">
							<!-- Caption header (always visible, centered when collapsed) -->
							<button
								class="w-full flex items-center justify-center px-4 py-2.5 gap-2"
								onclick={() => (captionExpanded = !captionExpanded)}
							>
								{#if currentPageData.title}
									<span class="text-white font-medium text-sm truncate">
										{currentPageData.title}
									</span>
								{/if}
								<span class="flex-shrink-0 caption-chevron" class:caption-chevron-hint={!captionExpanded}>
									<Icon
										icon={captionExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
										class="text-lg text-white/70"
									/>
								</span>
							</button>

							<!-- Expandable caption body (CSS grid for smooth open/close) -->
							<div class="caption-body" class:caption-body-open={captionExpanded}>
								<div class="overflow-hidden">
									{#if currentPageData.caption}
										<div class="px-4 pb-3 caption-content custom-scrollbar">
											<div class="caption-rich-content text-gray-300 text-sm leading-relaxed">
												{@html sanitizeHtml(currentPageData.caption, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })}
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
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
								panX = 0;
								panY = 0;
								imageLoading = true;
								captionExpanded = false;
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

<style>
	/* Ghost ring glow — expanding ring pulse when collapsed */
	.caption-chevron {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.caption-chevron-hint::before,
	.caption-chevron-hint::after {
		content: '';
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 1.5px solid rgba(255, 255, 255, 0.5);
		animation: ring-glow 2s ease-out infinite;
	}

	.caption-chevron-hint::after {
		animation-delay: 1s;
	}

	@keyframes ring-glow {
		0% { transform: scale(1); opacity: 0.6; }
		100% { transform: scale(2.2); opacity: 0; }
	}

	/* Caption body — CSS grid expand/collapse for smooth animation in both directions */
	.caption-body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 300ms ease-in-out;
	}

	.caption-body-open {
		grid-template-rows: 1fr;
	}

	.caption-content {
		max-height: 30vh;
		overflow-y: auto;
	}

	/* Caption scrollbar */
	.caption-content::-webkit-scrollbar {
		width: 6px;
	}

	.caption-content::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
	}

	.caption-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 6px;
	}

	.caption-content::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.4);
	}

	.caption-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.3);
	}

	/* Rich content in captions */
	.caption-rich-content :global(p) {
		margin-bottom: 0.5rem;
	}

	.caption-rich-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.caption-rich-content :global(strong),
	.caption-rich-content :global(b) {
		font-weight: 600;
		color: #fff;
	}

	.caption-rich-content :global(a) {
		color: #fb923c;
		text-decoration: underline;
	}

	.caption-rich-content :global(a:hover) {
		color: #fdba74;
	}
</style>
