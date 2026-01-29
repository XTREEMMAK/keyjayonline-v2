<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Hero from '$lib/components/layout/Hero.svelte';
	import NeumorphicNavbar from '$lib/components/ui/NeumorphicNavbar.svelte';
	import SpinningPlayButton from '$lib/components/music/SpinningPlayButton.svelte';
	import { showPlayer, loadRandomTrack, playerVisible, isPlaying } from '$lib/stores/musicPlayer.js';
	import {
		activeSection,
		isContentVisible,
		isNavigatingToHome,
		initFromHash,
		cleanupNavigation,
		sectionMeta
	} from '$lib/stores/navigation.js';

	// Custom transition that uses fade when going to home, fly otherwise
	function sectionOut(node, params) {
		if ($isNavigatingToHome) {
			return fade(node, { duration: 200 });
		}
		return fly(node, { x: -50, duration: 200, easing: cubicOut });
	}

	// Section Components
	import MusicSection from '$lib/components/sections/MusicSection.svelte';
	import VoiceSection from '$lib/components/sections/VoiceSection.svelte';
	import ProductionsSection from '$lib/components/sections/ProductionsSection.svelte';
	import AboutSection from '$lib/components/sections/AboutSection.svelte';
	import ContactSection from '$lib/components/sections/ContactSection.svelte';
	import AboutStickyNav from '$lib/components/sections/AboutStickyNav.svelte';

	// Sticky nav store for About section portal
	import { hideStickyNav } from '$lib/stores/stickyNav.js';

	let { data } = $props();

	// Reference to AboutSection for tab switching
	let aboutSectionRef = $state(null);

	onMount(() => {
		initFromHash();
	});

	onDestroy(() => {
		cleanupNavigation();
		hideStickyNav();
	});

	// Hide sticky nav when leaving about section
	$effect(() => {
		if ($activeSection !== 'about') {
			hideStickyNav();
		}
	});

	// Handle tab switch from portal
	function handleAboutTabSwitch(tab) {
		if (aboutSectionRef?.switchTab) {
			aboutSectionRef.switchTab(tab);
		}
	}

	// Dynamic page title based on section
	const pageTitle = $derived(
		$activeSection === 'home'
			? 'KEY JAY ONLINE'
			: `${sectionMeta[$activeSection]?.label || ''} | KEY JAY ONLINE`
	);

	// Show play button when on music section AND player is not visible
	const showPlayButton = $derived($activeSection === 'music' && !$playerVisible);

	function handlePlayButtonClick() {
		loadRandomTrack();
		showPlayer();
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="description" content="KEY JAY ONLINE - Music | Voice | Productions | Creative Works" />
</svelte:head>

<!-- Floating Neumorphic Navbar -->
<NeumorphicNavbar />

<!-- Persistent Video Background (Hero) -->
<Hero cdnBaseUrl={data.cdnBaseUrl} />

<!-- Main Content Layer -->
<div class="relative z-10">
	<!-- Home State: Full viewport height section that scrolls to reveal footer -->
	{#if !$isContentVisible}
		<div class="home-spacer"></div>
	{/if}

	<!-- Content Container - Only visible when not on home -->
	{#if $isContentVisible}
		<div
			class="neu-content-container min-h-screen"
			in:fade={{ duration: 400 }}
			out:fade={{ duration: 200 }}
		>
			{#key $activeSection}
				<div
					class="section-transition-container"
					in:fly={{ x: 50, duration: 300, delay: 100, easing: cubicOut }}
					out:sectionOut
				>
					{#if $activeSection === 'music'}
						<MusicSection data={data.musicData} />
					{:else if $activeSection === 'voice'}
						<VoiceSection />
					{:else if $activeSection === 'productions'}
						<ProductionsSection />
					{:else if $activeSection === 'about'}
						<AboutSection bind:this={aboutSectionRef} />
					{:else if $activeSection === 'contact'}
						<ContactSection data={data.contactData} />
					{/if}
				</div>
			{/key}
		</div>
	{/if}
</div>

<!-- About Section Sticky Nav Portal - Outside transition containers for proper fixed positioning -->
{#if $activeSection === 'about'}
	<AboutStickyNav onTabSwitch={handleAboutTabSwitch} />
{/if}

<!-- Fixed Play Button - Outside transition containers for proper fixed positioning -->
{#if showPlayButton}
	<div
		class="fixed-play-button"
		class:pulsing={$isPlaying}
		in:fade={{ duration: 300, delay: 200 }}
		out:fade={{ duration: 200 }}
	>
		<SpinningPlayButton onClick={handlePlayButtonClick} />
	</div>
{/if}

<style>
	/* Home spacer - creates full viewport height so footer appears when scrolling down */
	.home-spacer {
		height: 100vh;
		pointer-events: none;
	}

	/* Section transition container - prevent overflow:hidden from breaking sticky */
	.section-transition-container {
		overflow: visible !important;
	}

	/* Fixed Play Button - positioned above scroll-to-top button */
	.fixed-play-button {
		position: fixed;
		bottom: 80px; /* Above scroll-to-top button */
		right: 0px;
		z-index: 35;
		transform: scale(0.65);
		transform-origin: bottom right;
	}

	@media (min-width: 640px) {
		.fixed-play-button {
			bottom: 84px;
			transform: scale(0.75);
		}
	}

	@media (min-width: 1024px) {
		.fixed-play-button {
			bottom: 88px;
			transform: scale(0.85);
		}
	}

	/* Pulse animation when music is playing */
	.fixed-play-button.pulsing {
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%, 100% {
			filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
		}
		50% {
			filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.8));
		}
	}
</style>
