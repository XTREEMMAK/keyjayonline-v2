<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getSectionBackground } from '$lib/utils/sectionBackgrounds.js';

	let { section = 'music', opacity = 0.15 } = $props();

	let backgroundUrl = $state('');
	let imageLoaded = $state(false);

	onMount(() => {
		if (browser) {
			// Section background images are small and served locally
			backgroundUrl = getSectionBackground(section);

			// Preload image
			const img = new Image();
			img.onload = () => {
				imageLoaded = true;
			};
			img.src = backgroundUrl;
		}
	});
</script>

{#if backgroundUrl}
	<div
		class="section-bg-container"
		class:loaded={imageLoaded}
	>
		<div
			class="section-bg-image"
			style="
				background-image: url('{backgroundUrl}');
				opacity: {imageLoaded ? opacity : 0};
			"
		></div>
	</div>
{/if}

<style>
	.section-bg-container {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		/* clip-path creates containing block that clips fixed children */
		clip-path: inset(0);
		/* Mask to fade out at top (header area shows video) */
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 0px,
			rgba(0, 0, 0, 0.3) 120px,
			rgba(0, 0, 0, 0.7) 200px,
			black 280px
		);
		mask-image: linear-gradient(
			to bottom,
			transparent 0px,
			rgba(0, 0, 0, 0.3) 120px,
			rgba(0, 0, 0, 0.7) 200px,
			black 280px
		);
	}

	.section-bg-image {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		height: 100vh;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		filter: blur(8px);
		transform: scale(1.05);
		transition: opacity 1s ease-in-out;
	}

	@media (max-width: 1024px) {
		/* Disable expensive mask on mobile to fix render issues */
		.section-bg-container {
			-webkit-mask-image: none !important;
			mask-image: none !important;
		}

		.section-bg-image {
			filter: none;
			transform: none; /* Remove all transforms on mobile */
			position: absolute; /* Switch from fixed to absolute */
		}
	}
</style>
