<script>
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { activeSection } from '$lib/stores/navigation.js';
	import { asset } from '$app/paths';

	let videoElement = $state();
	let showAnimations = $state(false);

	// Show hero content only when on home section
	const isHome = $derived($activeSection === 'home');

	onMount(() => {
		// Ensure video plays even if autoplay is blocked
		if (videoElement) {
			videoElement.play().catch(() => {
				// Autoplay was prevented, video will show poster instead
				console.log('Autoplay prevented, showing poster image');
			});
		}

		// Start animations after component mounts
		setTimeout(() => {
			showAnimations = true;
		}, 100);
	});
</script>

<!-- Persistent Video Background - Fixed position, always visible -->
<div class="video-hero-fixed">
	<video
		bind:this={videoElement}
		autoplay
		muted
		loop
		playsinline
		disablepictureinpicture
		class="pointer-events-none"
		poster={asset('/videos/MAIN-poster-00001.jpg')}
		preload="metadata"
	>
		<source src={asset('/videos/MAIN-transcode.webm')} type="video/webm" />
		<source src={asset('/videos/MAIN-transcode.mp4')} type="video/mp4" />
		Your browser does not support the video tag.
	</video>

	<!-- Dark overlay for readability -->
	<div class="video-overlay"></div>

	<!-- Hero Content - Only visible when on home section -->
	{#if isHome}
		<div class="hero-content-wrapper">
			<div class="hero-content" transition:fade={{ duration: 400 }}>
				<!-- Animated Text Bar -->
				{#if showAnimations}
					<div
						class="overflow-hidden w-full mb-2"
						transition:fade={{ duration: 800, delay: 1200 }}
					>
						<div
							class="animated-text-bar text-xs sm:text-sm text-gray-400/60 opacity-70 whitespace-nowrap inline-flex"
						>
							<span class="inline-block px-2"
								>MUSICIAN | GAMER | TECH NERD | PRODUCER | WRITER | DIYer | DOG DAD | DEVELOPER |
								SINGER | VOICE ACTOR</span
							>
							<span class="inline-block px-2"
								>| MUSICIAN | GAMER | TECH NERD | PRODUCER | WRITER | DIYer | DOG DAD | DEVELOPER |
								SINGER | VOICE ACTOR</span
							>
							<span class="inline-block px-2"
								>| MUSICIAN | GAMER | TECH NERD | PRODUCER | WRITER | DIYer | DOG DAD | DEVELOPER |
								SINGER | VOICE ACTOR</span
							>
							<span class="inline-block px-2"
								>| MUSICIAN | GAMER | TECH NERD | PRODUCER | WRITER | DIYer | DOG DAD | DEVELOPER |
								SINGER | VOICE ACTOR</span
							>
						</div>
					</div>
				{/if}

				<!-- Title with animated spans - hidden until animation starts -->
				<h1 class="hero-title" class:hero-title-hidden={!showAnimations}>
					{#if showAnimations}
						<span class="key-jay-text" transition:fly={{ x: -100, duration: 600, delay: 0 }}
							>KEYJAY</span
						>
						<span class="online-text" transition:fly={{ x: 100, duration: 600, delay: 200 }}
							>ONLINE</span
						>
					{/if}
				</h1>

				<!-- Subtext -->
				{#if showAnimations}
					<p class="hero-subtext" transition:fly={{ y: 30, duration: 500, delay: 800 }}>
						Where Everything Key Jay Comes Together!
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Fixed video background - always visible behind everything */
	.video-hero-fixed {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
	}

	.video-hero-fixed video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Dark overlay */
	.video-overlay {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.4);
	}

	/* Hero content wrapper - centers content */
	.hero-content-wrapper {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.hero-content {
		text-align: center;
		width: 100%;
		max-width: 100%;
		margin-top: 20rem;
	}

	.hero-title {
		font-size: clamp(2.5rem, 12vw, 4rem);
		font-weight: bold;
		text-transform: uppercase;
		line-height: 0.9;
		margin-bottom: 0.5rem;
		color: white;
		min-height: 1em; /* Maintain space even when hidden */
	}

	.hero-title-hidden {
		visibility: hidden;
	}

	.hero-subtext {
		font-size: clamp(0.875rem, 3vw, 1.5rem);
		color: #d1d5db;
		font-weight: 300;
		max-width: 430px;
		margin: 0 auto 1rem;
		padding: 0 1rem;
		border-top: 1px solid #4b5563;
		padding-top: 0.5rem;
		font-variant: all-small-caps;
		letter-spacing: 2px;
	}

	/* Responsive adjustments */
	@media (max-width: 480px) {
		.hero-title {
			font-size: clamp(2rem, 11vw, 3rem);
		}

		.key-jay-text,
		.online-text {
			display: block;
		}
	}

	@media (max-width: 424px) {
		.hero-subtext {
			max-width: 330px;
		}
	}

	@media (max-width: 360px) {
		.hero-title {
			font-size: clamp(1.75rem, 10vw, 2.5rem);
		}
	}

	@media (min-width: 1024px) {
		.hero-content {
			margin-top: 24rem;
		}

		.hero-subtext {
			max-width: 600px;
		}
	}

	@media (min-width: 1750px) {
		.hero-title {
			font-size: clamp(4rem, 12vw, 8rem);
		}
	}

	@media (min-width: 1024px) and (min-height: 900px) {
		.hero-content {
			margin-top: 32rem;
		}
	}

	@media (max-height: 800px) {
		.hero-content {
			margin-top: 15rem;
		}
	}

	@media (max-height: 700px) {
		.hero-content {
			margin-top: 12rem;
		}

		.hero-title {
			font-size: clamp(2rem, 10vw, 5rem);
		}

		.hero-subtext {
			margin-bottom: 0.5rem;
			padding-top: 0.25rem;
		}
	}

	@media (max-height: 500px) {
		.hero-content {
			margin-top: 8rem;
		}

		.animated-text-bar {
			display: none;
		}

		.hero-title {
			font-size: clamp(1.5rem, 8vw, 3rem);
			margin-bottom: 0.25rem;
		}

		.hero-subtext {
			font-size: 0.75rem;
			border: none;
			padding-top: 0;
		}
	}

	/* Text styling with animations */
	.key-jay-text {
		display: inline-block;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		position: relative;
	}

	.key-jay-text::after {
		content: 'KEYJAY';
		position: absolute;
		top: 0;
		left: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			transparent 40%,
			rgba(255, 255, 255, 0.9) 50%,
			transparent 60%,
			transparent 100%
		);
		background-size: 200% 100%;
		background-position: -200% 0;
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		animation: lightWipe 3s ease-in-out 1s 1 forwards;
		z-index: 1;
	}

	.online-text {
		display: inline-block;
		background: linear-gradient(
			90deg,
			transparent 0%,
			transparent 30%,
			rgba(255, 255, 255, 0.9) 40%,
			rgba(255, 255, 255, 1) 50%,
			rgba(255, 255, 255, 0.9) 60%,
			transparent 70%,
			transparent 100%
		);
		background-size: 200% 100%;
		background-position: -200% 0;
		animation: lightWipe 3s ease-in-out 2s 1 forwards;
		background-clip: text;
		-webkit-background-clip: text;
	}

	@keyframes lightWipe {
		0% {
			background-position: -200% 0;
		}
		50% {
			background-position: 0% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	@supports not (background-clip: text) {
		.key-jay-text {
			background: none;
			color: #667eea;
		}

		.key-jay-text::after {
			display: none;
		}

		.online-text {
			background: none;
			color: white;
		}
	}

	/* Animated text bar */
	.animated-text-bar {
		animation: scrollText 40s linear infinite;
		display: inline-flex;
	}

	@keyframes scrollText {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-25%);
		}
	}
</style>
