<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import { playerVisible } from '$lib/stores/musicPlayer.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { scrollButtonVisible } from '$lib/stores/scrollButton.js';

	let visible = $state(false);
	let scrollY = $state(0);

	// Sync visibility with store
	$effect(() => {
		scrollButtonVisible.set(visible && !$contentViewerOpen);
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
</script>

{#if visible && !$contentViewerOpen}
	<button
		onclick={scrollToTop}
		class="fixed right-8 z-30 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/50 {
			$playerVisible ? 'bottom-24' : 'bottom-4'
		}"
		aria-label="Scroll to top"
		in:fly={{ x: 100, duration: 400 }}
		out:fly={{ x: 100, duration: 400 }}
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
		</svg>
	</button>
{/if}

<style>
	button {
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	button:hover {
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
		           0 10px 10px -5px rgba(0, 0, 0, 0.04),
		           0 0 20px rgba(59, 130, 246, 0.3);
	}

	/* Mobile: Reduce size slightly to match play button */
	@media (max-width: 768px) {
		button {
			padding: 0.625rem !important; /* 10px - slightly smaller than desktop */
			right: 1rem !important; /* Match play button offset */
		}

		button :global(svg) {
			width: 20px !important;
			height: 20px !important;
		}
	}
</style>