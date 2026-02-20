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
	import { fade, fly, scale } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { markImageLoaded } from '$lib/utils/imageCache.js';
	import SkeletonImage from '$lib/components/ui/SkeletonImage.svelte';

	// Props
	let {
		isOpen = false,
		pages = [],
		initialPage = 0,
		title = '',
		onClose = () => {},
		loading = false,
		manageOverlayStore = true,
		canDownload = false
	} = $props();

	// State
	let currentPage = $state(initialPage);
	let zoomLevel = $state(1); // 1 = fit (100%), up to 4 (400%)
	let imageLoading = $state(true);
	let containerRef = $state(null);
	let captionExpanded = $state(false);
	let slideDirection = $state(1); // 1 = forward (slide left), -1 = backward (slide right)
	let showAllPages = $state(false);
	let downloading = $state(false);
	let isFullscreen = $state(false);
	let modalRef = $state(null);
	let overlaysVisible = $state(true);
	let inactivityTimer = null;

	// Overlay auto-hide
	const INACTIVITY_TIMEOUT = 3000;
	const POST_DRAG_COOLDOWN = 2000; // Delay before showing controls after a drag release
	const isTouchDevice = browser && ('ontouchstart' in window);
	let dragCooldownTimer = null;

	// Drag-to-pan state (active when zoomed in)
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let isPinching = $state(false);
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

	// Touch gesture constants
	const SWIPE_THRESHOLD = 50;
	const SWIPE_MAX_TIME = 300;
	const LONG_PRESS_TIME = 200;
	const TAP_THRESHOLD = 10;
	const DOUBLE_TAP_INTERVAL = 300;

	// Touch gesture state
	let touchState = 'idle'; // 'idle' | 'waiting' | 'swiping' | 'panning' | 'pinching'
	let touchStartTime = 0;
	let initialPinchDistance = 0;
	let initialPinchZoom = 1;
	let lastTouchX = 0;
	let lastTouchY = 0;
	let lastTapTime = 0;
	let lastTapX = 0;
	let lastTapY = 0;
	let longPressTimer = null;

	// Pan momentum (inertia) state
	let prevMoveX = 0;
	let prevMoveY = 0;
	let prevMoveTime = 0;
	let momentumRaf = null;

	// Guard against synthesized mouse events after touch interactions.
	// Mobile browsers fire mousedown/mouseup ~300ms after touchend, which
	// can re-trigger toggleZoom() and undo a touch-initiated zoom exit.
	let lastTouchEnd = 0;

	// Fullscreen support detection
	const fullscreenSupported = browser && (document.fullscreenEnabled || document.webkitFullscreenEnabled || false);

	// Navigate to next/prev page
	function nextPage() {
		if (hasNext) {
			slideDirection = 1;
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
			slideDirection = -1;
			currentPage--;
			zoomLevel = 1;
			panX = 0;
			panY = 0;
			imageLoading = true;
			captionExpanded = false;
		}
	}

	// Navigate to specific page (from grid or dots)
	function goToPage(index) {
		if (index === currentPage) return;
		slideDirection = index > currentPage ? 1 : -1;
		currentPage = index;
		zoomLevel = 1;
		panX = 0;
		panY = 0;
		imageLoading = true;
		captionExpanded = false;
		showAllPages = false;
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
		if (Date.now() - lastTouchEnd < 500) return;
		if (zoomLevel <= 1) return;
		isPanning = true;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragStartPanX = panX;
		dragStartPanY = panY;
		totalDragDistance = 0;
		// Hide controls during drag
		overlaysVisible = false;
		clearInactivityTimer();
		clearTimeout(dragCooldownTimer);
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
		if (Date.now() - lastTouchEnd < 500) return;
		if (!isPanning) {
			// Not panning — treat as click for zoom toggle
			toggleZoom();
			return;
		}
		isPanning = false;
		// If barely moved, treat as click (zoom toggle)
		if (totalDragDistance < 5) {
			toggleZoom();
		} else {
			// After a real drag, suppress activity resets for a cooldown period
			dragCooldownTimer = setTimeout(() => {
				dragCooldownTimer = null;
			}, POST_DRAG_COOLDOWN);
		}
	}

	// Close modal
	function handleClose() {
		// Exit fullscreen if active
		if (document.fullscreenElement || document.webkitFullscreenElement) {
			document.exitFullscreen?.() || document.webkitExitFullscreen?.();
		}
		cancelMomentum();
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
				if (zoomLevel > 1) {
					zoomLevel = 1;
					panX = 0;
					panY = 0;
					resetInactivityTimer();
				} else if (showAllPages) {
					showAllPages = false;
				} else {
					handleClose();
				}
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				if (!showAllPages) nextPage();
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				if (!showAllPages) prevPage();
				break;
			case ' ':
				if (!showAllPages) {
					event.preventDefault();
					toggleZoom();
				}
				break;
			case 'f':
				if (fullscreenSupported) toggleFullscreen();
				break;
		}
	}

	// Touch gesture state machine: handles swipe, pan, pinch, double-tap
	let touchStartX = 0;
	let touchStartY = 0;

	function getTouchDistance(touches) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function handleDoubleTap() {
		if (zoomLevel > 1) {
			cancelMomentum();
			zoomLevel = 1;
			panX = 0;
			panY = 0;
			if (isTouchDevice) resetInactivityTimer();
		} else {
			zoomLevel = 2;
			if (isTouchDevice) {
				overlaysVisible = false;
				clearInactivityTimer();
			}
		}
	}

	// Overlay auto-hide helpers (mobile only)
	let hintVisible = $state(false);
	let hintTimer = null;
	const HINT_DURATION = 2500;
	let zoomHintShown = false; // Only show "Tap to exit zoom" once per zoom-in

	function showHint() {
		clearTimeout(hintTimer);
		hintVisible = true;
		hintTimer = setTimeout(() => {
			hintVisible = false;
		}, HINT_DURATION);
	}

	function clearHintTimer() {
		clearTimeout(hintTimer);
		hintTimer = null;
		hintVisible = false;
	}

	function resetInactivityTimer() {
		clearTimeout(inactivityTimer);
		overlaysVisible = true;
		clearHintTimer();
		inactivityTimer = setTimeout(() => {
			overlaysVisible = false;
			showHint();
		}, INACTIVITY_TIMEOUT);
	}

	function clearInactivityTimer() {
		clearTimeout(inactivityTimer);
		inactivityTimer = null;
	}

	// Reset timer when interacting with header controls or moving mouse
	function handleHeaderInteraction() {
		resetInactivityTimer();
	}

	function cancelMomentum() {
		if (momentumRaf) {
			cancelAnimationFrame(momentumRaf);
			momentumRaf = null;
		}
	}

	function startMomentum(vx, vy) {
		const friction = 0.90;
		const minVelocity = 0.1;

		function animate() {
			vx *= friction;
			vy *= friction;
			panX += vx * 16;
			panY += vy * 16;

			if (Math.abs(vx) > minVelocity || Math.abs(vy) > minVelocity) {
				momentumRaf = requestAnimationFrame(animate);
			} else {
				momentumRaf = null;
				isPanning = false;
			}
		}

		momentumRaf = requestAnimationFrame(animate);
	}

	function handleMouseActivity() {
		// Skip during drag-pan and post-drag cooldown
		if (isPanning || dragCooldownTimer) return;
		resetInactivityTimer();
	}

	function handleTouchStart(event) {
		// Cancel any running momentum from a previous pan
		cancelMomentum();

		const touches = event.touches;

		if (touches.length === 2) {
			// Two fingers: pinch zoom — hide overlays immediately
			touchState = 'pinching';
			isPinching = true;
			clearTimeout(longPressTimer);
			initialPinchDistance = getTouchDistance(touches);
			initialPinchZoom = zoomLevel;
			overlaysVisible = false;
			clearInactivityTimer();
			event.preventDefault();
			return;
		}

		// Single finger
		const touch = touches[0];
		lastTouchX = touch.clientX;
		lastTouchY = touch.clientY;
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchStartTime = Date.now();
		prevMoveX = touch.clientX;
		prevMoveY = touch.clientY;
		prevMoveTime = Date.now();

		if (zoomLevel > 1) {
			// At >1x zoom: immediate pan mode
			touchState = 'panning';
			isPanning = true;
			dragStartX = touch.clientX;
			dragStartY = touch.clientY;
			dragStartPanX = panX;
			dragStartPanY = panY;
			totalDragDistance = 0;
		} else {
			// At 1x zoom: wait to determine intent (swipe vs long-press-pan)
			touchState = 'waiting';
			longPressTimer = setTimeout(() => {
				if (touchState === 'waiting') {
					touchState = 'panning';
					isPanning = true;
					zoomLevel = 2;
					dragStartX = lastTouchX;
					dragStartY = lastTouchY;
					dragStartPanX = panX;
					dragStartPanY = panY;
					totalDragDistance = 0;
				}
			}, LONG_PRESS_TIME);
		}
	}

	function handleTouchMove(event) {
		const touches = event.touches;

		if (touchState === 'pinching' && touches.length === 2) {
			event.preventDefault();
			const currentDistance = getTouchDistance(touches);
			const pinchScale = currentDistance / initialPinchDistance;
			let newZoom = Math.round((initialPinchZoom * pinchScale) * 100) / 100;
			newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
			zoomLevel = newZoom;
			if (zoomLevel <= 1) {
				panX = 0;
				panY = 0;
			}
			return;
		}

		if (touches.length !== 1) return;
		const touch = touches[0];
		const dx = touch.clientX - touchStartX;
		const dy = touch.clientY - touchStartY;

		if (touchState === 'waiting') {
			// If moved enough before long-press fires, it's a swipe
			if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
				clearTimeout(longPressTimer);
				touchState = 'swiping';
			}
		}

		if (touchState === 'panning') {
			event.preventDefault();
			const moveDx = touch.clientX - dragStartX;
			const moveDy = touch.clientY - dragStartY;
			totalDragDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
			panX = dragStartPanX + moveDx;
			panY = dragStartPanY + moveDy;
			// Track velocity for momentum
			prevMoveX = lastTouchX;
			prevMoveY = lastTouchY;
			prevMoveTime = Date.now();
		}

		lastTouchX = touch.clientX;
		lastTouchY = touch.clientY;
	}

	function handleTouchEnd(event) {
		clearTimeout(longPressTimer);
		const touchEndTime = Date.now();
		lastTouchEnd = touchEndTime;
		const duration = touchEndTime - touchStartTime;

		if (touchState === 'pinching') {
			isPinching = false;
			// Snap to 1x if close enough
			if (zoomLevel < 1.1) {
				zoomLevel = 1;
				panX = 0;
				panY = 0;
				if (isTouchDevice) resetInactivityTimer();
			}
			// Stay zoomed in — keep overlays hidden
			touchState = 'idle';
			return;
		}

		if (touchState === 'panning') {
			// Tap-to-exit-zoom: must be quick (< 250ms) AND minimal movement (< 15px).
			// Both constraints prevent short deliberate drags from triggering exit.
			if (totalDragDistance < 15 && duration < 250) {
				isPanning = false;
				cancelMomentum();
				zoomLevel = 1;
				panX = 0;
				panY = 0;
				if (isTouchDevice) resetInactivityTimer();
			} else {
				// Calculate velocity for momentum
				const now = Date.now();
				const dt = Math.max(now - prevMoveTime, 1);
				const vx = (lastTouchX - prevMoveX) / dt;
				const vy = (lastTouchY - prevMoveY) / dt;

				if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
					// Start momentum — isPanning stays true during animation
					startMomentum(vx, vy);
				} else {
					isPanning = false;
				}
			}
			touchState = 'idle';
			return;
		}

		if (touchState === 'swiping' || touchState === 'waiting') {
			const endTouch = event.changedTouches[0];
			const endX = endTouch ? endTouch.clientX : lastTouchX;
			const endY = endTouch ? endTouch.clientY : lastTouchY;
			const diffX = touchStartX - endX;
			const diffY = touchStartY - endY;

			// Check for tap (minimal movement)
			if (Math.abs(diffX) < TAP_THRESHOLD && Math.abs(diffY) < TAP_THRESHOLD && duration < SWIPE_MAX_TIME) {
				// Double-tap detection
				if (touchEndTime - lastTapTime < DOUBLE_TAP_INTERVAL &&
					Math.abs(endX - lastTapX) < 50 && Math.abs(endY - lastTapY) < 50) {
					handleDoubleTap();
					lastTapTime = 0;
				} else {
					lastTapTime = touchEndTime;
					lastTapX = endX;
					lastTapY = endY;
					// Single tap: toggle overlay visibility on touch devices
					// (zoom exit is handled in the panning touchend handler above)
					if (isTouchDevice) {
						if (overlaysVisible) {
							overlaysVisible = false;
							clearInactivityTimer();
							showHint();
						} else {
							resetInactivityTimer();
						}
					}
				}
				touchState = 'idle';
				return;
			}

			// Check for swipe (horizontal, quick)
			if (Math.abs(diffX) > Math.abs(diffY) &&
				Math.abs(diffX) > SWIPE_THRESHOLD &&
				duration < SWIPE_MAX_TIME) {
				if (diffX > 0) {
					nextPage();
				} else {
					prevPage();
				}
				if (isTouchDevice) resetInactivityTimer();
			}
			touchState = 'idle';
			return;
		}

		touchState = 'idle';
	}

	// Toggle fullscreen on the modal container
	async function toggleFullscreen() {
		if (!modalRef) return;
		try {
			if (!document.fullscreenElement && !document.webkitFullscreenElement) {
				if (modalRef.requestFullscreen) {
					await modalRef.requestFullscreen();
				} else if (modalRef.webkitRequestFullscreen) {
					await modalRef.webkitRequestFullscreen();
				}
			} else {
				if (document.exitFullscreen) {
					await document.exitFullscreen();
				} else if (document.webkitExitFullscreen) {
					await document.webkitExitFullscreen();
				}
			}
		} catch (err) {
			console.warn('Fullscreen toggle failed:', err);
		}
	}

	// Handle image load
	function handleImageLoad() {
		imageLoading = false;
		markImageLoaded(currentPageData?.imageUrl);
	}

	// Detect memory-cached images synchronously on mount — skip skeleton with no flash
	function checkComplete(node) {
		if (node.complete && node.naturalWidth > 0) {
			imageLoading = false;
			markImageLoaded(currentPageData?.imageUrl);
		}
	}

	// Download original image via fetch + Blob to force file save (cross-origin download attr is ignored)
	async function handleDownload() {
		if (!currentPageData?.downloadUrl || downloading) return;
		downloading = true;
		try {
			const response = await fetch(currentPageData.downloadUrl);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const ext = currentPageData.downloadUrl.split('.').pop()?.split('?')[0] || 'jpg';
			a.download = `${currentPageData.title || `page-${currentPage + 1}`}.${ext}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Download failed:', err);
			window.open(currentPageData.downloadUrl, '_blank');
		} finally {
			downloading = false;
		}
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
			showAllPages = false;
			downloading = false;
			slideDirection = 1;
			overlaysVisible = true;

			// Start auto-hide timer for overlay chrome
			resetInactivityTimer();

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

				// Fullscreen change listener
				const handleFullscreenChange = () => {
					isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
				};
				document.addEventListener('fullscreenchange', handleFullscreenChange);
				document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

				// Cleanup function to restore scroll
				return () => {
					cleanupPopstate();
					clearTimeout(longPressTimer);
					clearInactivityTimer();
					clearHintTimer();
					clearTimeout(dragCooldownTimer);
					document.body.style.overflow = originalOverflow;
					document.body.style.paddingRight = originalPaddingRight;
					window.removeEventListener('keydown', handleKeydown);
					document.removeEventListener('fullscreenchange', handleFullscreenChange);
					document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
					// Exit fullscreen if modal closes while fullscreen
					if (document.fullscreenElement || document.webkitFullscreenElement) {
						document.exitFullscreen?.() || document.webkitExitFullscreen?.();
					}
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

	// Register touch listeners imperatively for passive: false (needed for preventDefault in pinch/pan)
	$effect(() => {
		const el = containerRef;
		const gridActive = showAllPages;
		if (!el || gridActive) return;

		el.addEventListener('touchstart', handleTouchStart, { passive: false });
		el.addEventListener('touchmove', handleTouchMove, { passive: false });
		el.addEventListener('touchend', handleTouchEnd, { passive: true });

		return () => {
			el.removeEventListener('touchstart', handleTouchStart);
			el.removeEventListener('touchmove', handleTouchMove);
			el.removeEventListener('touchend', handleTouchEnd);
		};
	});

	// Collapse caption when zooming in; hide overlays (touch only — desktop keeps header visible)
	$effect(() => {
		if (zoomLevel > 1) {
			captionExpanded = false;
			if (isTouchDevice) {
				overlaysVisible = false;
				clearInactivityTimer();
				// Show zoom hint only once per zoom-in session
				if (!zoomHintShown) {
					zoomHintShown = true;
					showHint();
				}
			}
		} else {
			// Reset so hint can show again on next zoom-in
			zoomHintShown = false;
			// On desktop, restore overlays when zooming back to 1x
			if (!isTouchDevice) {
				overlaysVisible = true;
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
		bind:this={modalRef}
		class="fixed inset-0 z-[99999] bg-black/95"
		transition:fade={{ duration: 250 }}
		onmousemove={handleMouseActivity}
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Content viewer'}
	>
		<!-- Header -->
		<div
			class="overlay-chrome absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent"
			class:overlay-chrome-hidden={!overlaysVisible}
			onclick={handleHeaderInteraction}
			in:fly={{ y: -20, duration: 300, delay: 100 }}
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
				<!-- All pages grid button -->
				{#if totalPages > 1}
					<button
						onclick={() => (showAllPages = !showAllPages)}
						class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 {showAllPages ? 'bg-white/20 text-white' : ''}"
						title={showAllPages ? 'Back to viewer' : 'View all pages'}
					>
						<Icon icon={showAllPages ? 'mdi:image' : 'mdi:view-grid'} class="text-xl" />
					</button>
				{/if}

				<!-- Download button -->
				{#if canDownload && currentPageData?.downloadUrl}
					<button
						onclick={handleDownload}
						disabled={downloading}
						class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 {downloading ? 'opacity-50' : ''}"
						title="Download original"
					>
						<Icon icon={downloading ? 'mdi:loading' : 'mdi:download'} class="text-xl {downloading ? 'animate-spin' : ''}" />
					</button>
				{/if}

				<!-- Zoom indicator -->
				{#if !showAllPages}
					<button
						onclick={toggleZoom}
						class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
						title="Toggle zoom (Space)"
					>
						<Icon icon="mdi:magnify-plus" class="text-xl" />
						<span class="text-xs ml-1">{Math.round(zoomLevel * 100)}%</span>
					</button>
				{/if}

				<!-- Fullscreen button -->
				{#if fullscreenSupported}
					<button
						onclick={toggleFullscreen}
						class="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
						title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
					>
						<Icon icon={isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'} class="text-xl" />
					</button>
				{/if}

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
			in:fade={{ duration: 300, delay: 150 }}
			role="presentation"
		>
			{#if showAllPages}
				<!-- All pages grid view -->
				<div
					class="w-full h-full overflow-y-auto px-4 py-4 custom-scrollbar"
					in:fade={{ duration: 250, delay: 100 }}
					out:fade={{ duration: 200 }}
				>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
						{#each pages as page, index}
							<button
								onclick={() => goToPage(index)}
								class="group relative rounded-lg overflow-hidden bg-gray-900/50 aspect-[3/4] transition-all duration-200 hover:scale-[1.03]
									{index === currentPage ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:ring-1 hover:ring-white/40'}"
							in:scale={{ duration: 200, delay: 30 + Math.min(index, 15) * 20, start: 0.85, opacity: 0 }}
							>
								<SkeletonImage
									src={page.imageUrl}
									alt={page.title || `Page ${index + 1}`}
									class="w-full h-full"
								/>
								<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
									<span class="text-white text-xs font-medium">
										{index + 1}
									</span>
									{#if page.title}
										<p class="text-white/70 text-xs truncate">{page.title}</p>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{:else if loading}
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
				<!-- Image + caption container with slide transition -->
				<div in:fade={{ duration: 200, delay: 50 }} out:fade={{ duration: 150 }}>
				{#key currentPage}
					<div
						class="flex flex-col items-center max-w-[90vw]"
						class:max-h-full={!captionExpanded}
						in:fly={{ x: slideDirection * 200, duration: 350 }}
					>
						<!-- Image container with zoom -->
						<div
							class="relative ease-out select-none"
							class:transition-transform={!isPanning && !isPinching}
							style="transform: scale({zoomLevel}) translate({panX / zoomLevel}px, {panY / zoomLevel}px); touch-action: none; will-change: transform; backface-visibility: hidden;"
							onmousedown={handleMouseDown}
							onmousemove={handleMouseMove}
							onmouseup={handleMouseUp}
							onmouseleave={() => { if (isPanning) isPanning = false; }}
							onwheel={handleWheel}
							role="presentation"
						>
							<!-- Skeleton loading overlay (CSS opacity crossfade) -->
							<div
								class="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg viewer-skeleton transition-opacity duration-500"
								class:opacity-0={!imageLoading}
								class:pointer-events-none={!imageLoading}
							>
								<div class="absolute inset-0 viewer-skeleton-shimmer rounded-lg"></div>
								<svg class="viewer-skeleton-logo relative" width="40" height="40" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
									<g fill="white">
										<path d="M 21.15 170.22 C 68.37 170.21 115.59 170.22 162.81 170.22 C 162.62 212.00 162.48 253.78 162.33 295.56 C 232.18 254.01 302.00 212.41 371.85 170.87 C 373.04 170.06 374.52 170.24 375.90 170.19 C 442.87 170.30 509.85 170.12 576.83 170.28 C 482.44 219.28 388.12 268.39 293.81 317.54 C 336.47 341.25 379.23 364.79 421.96 388.39 C 355.39 388.30 288.82 388.04 222.26 387.59 C 202.82 374.82 183.58 361.66 164.34 348.57 C 164.37 392.98 164.33 437.40 164.35 481.81 C 116.62 481.80 68.88 481.81 21.15 481.80 C 21.18 377.94 21.18 274.08 21.15 170.22 Z" />
										<path d="M 644.94 170.27 C 689.89 170.16 734.83 170.24 779.77 170.23 C 779.44 198.89 779.69 227.55 779.39 256.20 C 733.96 256.20 688.53 256.20 643.10 256.20 C 643.54 227.55 644.46 198.92 644.94 170.27 Z" />
										<path d="M 642.85 262.23 C 688.37 262.12 733.89 262.21 779.42 262.18 C 779.19 290.46 778.78 318.73 778.16 347.01 C 777.78 353.69 777.82 360.42 776.73 367.04 C 773.55 389.04 763.75 410.24 748.13 426.16 C 736.98 437.74 723.07 446.46 708.18 452.39 C 691.66 458.84 675.01 465.05 657.86 469.63 C 640.19 474.42 622.07 477.36 603.89 479.46 C 602.34 479.49 600.61 480.06 599.22 479.13 C 555.15 454.70 511.11 430.21 467.02 405.81 C 497.89 405.36 528.78 405.18 559.65 404.49 C 575.25 401.98 590.64 397.62 605.02 391.02 C 616.44 385.61 627.67 378.50 634.77 367.78 C 638.41 362.23 640.71 355.69 640.77 349.02 C 641.59 320.09 642.23 291.16 642.85 262.23 Z" />
										<path d="M 255.23 408.66 C 320.16 407.76 385.09 406.83 450.03 406.11 C 452.01 406.06 454.13 405.95 455.84 407.16 C 500.06 431.85 544.51 456.16 588.64 481.01 C 534.18 485.03 479.54 484.15 424.99 483.11 C 410.80 482.34 396.53 482.80 382.38 481.54 C 339.93 457.38 297.62 432.94 255.23 408.66 Z" />
									</g>
								</svg>
								<div class="relative flex gap-1.5">
									<div class="viewer-loading-dot"></div>
									<div class="viewer-loading-dot" style="animation-delay: 0.15s"></div>
									<div class="viewer-loading-dot" style="animation-delay: 0.3s"></div>
								</div>
							</div>

							<!-- Image -->
							<img
								src={currentPageData.imageUrl}
								alt={currentPageData.title || `Page ${currentPage + 1}`}
								class="max-w-[90vw] object-contain rounded-lg shadow-2xl transition-opacity duration-500 {imageLoading ? 'opacity-0' : 'opacity-100'} {currentPageData.caption || currentPageData.title ? 'max-h-[65vh]' : 'max-h-[80vh]'} {zoomLevel > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}"
								onload={handleImageLoad}
								use:checkComplete
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
				{/key}
				</div>
			{/if}
		</div>

		<!-- Navigation arrows (hidden in grid view) -->
		{#if totalPages > 1 && !showAllPages}
			<!-- Previous -->
			<button
				onclick={prevPage}
				disabled={!hasPrev}
				class="overlay-chrome absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white transition-all
                       {hasPrev ? 'hover:bg-white/20 hover:scale-110' : 'opacity-30 cursor-not-allowed'}"
				class:overlay-chrome-hidden={!overlaysVisible}
				title="Previous page"
			>
				<Icon icon="mdi:chevron-left" class="text-3xl" />
			</button>

			<!-- Next -->
			<button
				onclick={nextPage}
				disabled={!hasNext}
				class="overlay-chrome absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white transition-all
                       {hasNext ? 'hover:bg-white/20 hover:scale-110' : 'opacity-30 cursor-not-allowed'}"
				class:overlay-chrome-hidden={!overlaysVisible}
				title="Next page"
			>
				<Icon icon="mdi:chevron-right" class="text-3xl" />
			</button>
		{/if}

		<!-- Footer with page dots (hidden in grid view) -->
		{#if totalPages > 1 && !showAllPages}
			<div
				class="overlay-chrome absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent"
				class:overlay-chrome-hidden={!overlaysVisible}
				in:fly={{ y: 20, duration: 300, delay: 200 }}
			>
				<!-- Page dots -->
				<div class="flex gap-1.5 max-w-full overflow-x-auto py-1">
					{#each pages as page, index}
						<button
							onclick={() => goToPage(index)}
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

		<!-- Contextual tap hint (mobile only, shown when overlays hidden) -->
		{#if isTouchDevice && hintVisible && !showAllPages}
			<div
				class="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white/80 text-xs pointer-events-none"
				in:fade={{ duration: 200 }}
				out:fade={{ duration: 300 }}
			>
				{zoomLevel > 1 ? 'Tap to exit zoom' : 'Tap to show controls'}
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

	/* Overlay chrome auto-hide (mobile) */
	.overlay-chrome {
		transition: opacity 300ms ease;
	}

	.overlay-chrome-hidden {
		opacity: 0 !important;
		pointer-events: none !important;
	}

	/* Viewer skeleton loading overlay */
	.viewer-skeleton {
		background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0f172a 100%);
	}

	.viewer-skeleton-shimmer {
		background: linear-gradient(90deg, transparent 0%, rgba(75, 85, 99, 0.15) 50%, transparent 100%);
		background-size: 200% 100%;
		animation: viewer-shimmer 1.5s ease-in-out infinite;
	}

	@keyframes viewer-shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.viewer-skeleton-logo {
		opacity: 0.15;
		animation: viewer-logo-pulse 2s ease-in-out infinite;
	}

	@keyframes viewer-logo-pulse {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.25; }
	}

	.viewer-loading-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: rgba(6, 182, 212, 0.4);
		animation: viewer-dot-bounce 1s ease-in-out infinite;
	}

	@keyframes viewer-dot-bounce {
		0%, 100% { transform: translateY(0); opacity: 0.4; }
		50% { transform: translateY(-4px); opacity: 0.8; }
	}
</style>
