<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import { playerVisible, playerMinimized } from '$lib/stores/musicPlayer.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { scrollButtonVisible } from '$lib/stores/scrollButton.js';
	import { sectionModalOpen } from '$lib/stores/stickyNav.js';

	let visible = $state(false);
	let scrollY = $state(0);

	// Sync visibility with store
	$effect(() => {
		scrollButtonVisible.set(visible && !$contentViewerOpen && !$sectionModalOpen);
	});

	onMount(() => {
		if (!browser) return;

		let ticking = false;
		function handleScroll() {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				scrollY = window.scrollY;
				visible = scrollY > 300;
				ticking = false;
			});
		}

		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function scrollToTop() {
		if (!browser) return;

		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}

	// Calculate bottom position based on player visibility
	const bottomClass = $derived(
		$playerVisible && !$playerMinimized ? 'with-player' : 'without-player'
	);
</script>

{#if visible && !$contentViewerOpen && !$sectionModalOpen}
	<button
		onclick={scrollToTop}
		class="scroll-to-top-btn {bottomClass}"
		aria-label="Scroll to top"
		in:fly={{ y: 20, duration: 300 }}
		out:fly={{ y: 20, duration: 200 }}
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
		</svg>
	</button>
{/if}

<style>
	.scroll-to-top-btn {
		position: fixed;
		right: 2rem;
		z-index: 30;
		background: linear-gradient(to right, #2563eb, #7c3aed);
		color: white;
		padding: 1rem;
		border-radius: 50%;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
		           0 10px 10px -5px rgba(0, 0, 0, 0.04);
		transition: all 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		cursor: pointer;
		/* Hide on desktop - page has its own desktop scroll button */
		display: none;
	}

	.scroll-to-top-btn:hover {
		transform: scale(1.1);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
		           0 10px 10px -5px rgba(0, 0, 0, 0.04),
		           0 0 20px rgba(59, 130, 246, 0.3);
	}

	.scroll-to-top-btn:focus {
		outline: none;
	}

	.scroll-to-top-btn:focus-visible {
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
		           0 10px 10px -5px rgba(0, 0, 0, 0.04),
		           0 0 0 4px rgba(59, 130, 246, 0.5);
	}

	/* Desktop: Adjust bottom based on player visibility */
	.scroll-to-top-btn.with-player {
		bottom: 6rem; /* 96px - above player */
	}

	.scroll-to-top-btn.without-player {
		bottom: 1rem; /* 16px - normal position */
	}

	/* Mobile: Show and position above bottom nav bar */
	@media (max-width: 768px) {
		.scroll-to-top-btn {
			display: block; /* Show on mobile */
			right: 1rem;
			padding: 0.625rem; /* 10px - slightly smaller */
		}

		.scroll-to-top-btn :global(svg) {
			width: 20px;
			height: 20px;
		}

		/* Fixed position above bottom bar (64px + 16px spacing) - player overlays */
		.scroll-to-top-btn.without-player,
		.scroll-to-top-btn.with-player {
			bottom: 80px;
		}
	}
</style>
