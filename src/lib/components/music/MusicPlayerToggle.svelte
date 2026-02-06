<script>
	import { fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { playerVisible, isPlaying, currentTrack, showPlayer } from '$lib/stores/musicPlayer.js';
	
	function togglePlayer() {
		showPlayer();
	}
</script>

<!-- Floating music player toggle button - only show when player is hidden and there's a current track -->
{#if !$playerVisible && $currentTrack}
	<button
		onclick={togglePlayer}
		class="fixed bottom-8 left-8 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
		aria-label="Open music player"
		in:fly={{ x: -100, duration: 400 }}
		out:fly={{ x: -100, duration: 400 }}
	>
		<div class="relative">
			<Icon 
				icon={$isPlaying ? "mdi:pause" : "mdi:play"} 
				width={24} 
				height={24} 
				class="text-white" 
			/>
			
			<!-- Pulsing animation when playing -->
			{#if $isPlaying}
				<div class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
			{/if}
		</div>
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

	/* Mobile: Minimal icon-only style */
	@media (max-width: 768px) {
		button {
			padding: 0 !important;
			bottom: 1.5rem !important;
			left: 1.5rem !important;
			background: transparent !important;
			backdrop-filter: none !important;
			border: none !important;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
			width: auto !important;
			height: auto !important;
		}

		button:hover {
			background: transparent !important;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
		}

		button :global(svg) {
			width: 32px !important;
			height: 32px !important;
			filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
		}

		/* Hide the pulsing animation ring on mobile */
		button :global(.animate-ping) {
			display: none !important;
		}
	}
</style>