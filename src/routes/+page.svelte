<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Hero from '$lib/components/layout/Hero.svelte';
	import NeumorphicNavbar from '$lib/components/ui/NeumorphicNavbar.svelte';
	import SpinningPlayButton from '$lib/components/music/SpinningPlayButton.svelte';
	import { showPlayer, loadRandomTrack, playerVisible, isPlaying } from '$lib/stores/musicPlayer.js';
	import { browser } from '$app/environment';
	import {
		activeSection,
		isContentVisible,
		isNavigatingToHome,
		initFromHash,
		cleanupNavigation,
		sectionMeta,
		disabledPages
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
	import TechSection from '$lib/components/sections/TechSection.svelte';
	import AboutSection from '$lib/components/sections/AboutSection.svelte';
	import ContactSection from '$lib/components/sections/ContactSection.svelte';
	import AboutStickyNav from '$lib/components/sections/AboutStickyNav.svelte';
	import SectionStickyNav from '$lib/components/ui/SectionStickyNav.svelte';
	import Icon from '@iconify/svelte';

	// Sticky nav stores
	import {
		hideStickyNav,
		hideSectionSubNav,
		musicActiveView,
		musicActiveFilter,
		techActiveTab,
		productionsActiveFilter,
		setPortalScrollLock
	} from '$lib/stores/stickyNav.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { sectionData } from '$lib/stores/sectionData.js';

	let { data } = $props();

	// Reference to AboutSection for tab switching
	let aboutSectionRef = $state(null);

	// Track scroll position for desktop scroll button
	let scrollY = $state(0);
	let showDesktopScrollButton = $derived(scrollY > 300);

	onMount(() => {
		// Initialize disabled pages from server data before hash navigation
		if (data?.siteSettings?.pages) {
			disabledPages.set(data.siteSettings.pages);
		}

		// Normal hash-based navigation
		initFromHash();

		// Track scroll position for desktop scroll button
		if (browser) {
			let ticking = false;
			function handleScroll() {
				if (ticking) return;
				ticking = true;
				requestAnimationFrame(() => {
					scrollY = window.scrollY;
					ticking = false;
				});
			}

			window.addEventListener('scroll', handleScroll, { passive: true });

			return () => {
				window.removeEventListener('scroll', handleScroll);
			};
		}
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

	// Hide section sub-nav when switching sections
	$effect(() => {
		// Access activeSection to create dependency
		const section = $activeSection;
		if (!['music', 'tech', 'productions'].includes(section)) {
			hideSectionSubNav();
		}
	});

	// Derived data for portal sub-nav buttons
	const musicData = $derived($sectionData.music?.data || {});
	const musicAlbums = $derived(musicData.albums || []);
	const musicReleaseTypes = $derived(() => {
		const types = new Set();
		musicAlbums.forEach(a => { if (a.release_type) types.add(a.release_type); });
		return Array.from(types).sort();
	});
	const productionsData = $derived($sectionData.productions?.data || {});
	const productionCategories = $derived([
		{ id: 'all', label: 'All', icon: 'mdi:view-grid', slug: 'all' },
		...(productionsData.categories || []).map(cat => ({
			id: cat.slug,
			label: cat.name,
			icon: cat.icon || 'mdi:folder',
			slug: cat.slug
		}))
	]);

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

	// Dynamic meta descriptions per section
	const sectionDescriptions = {
		home: 'KEY JAY ONLINE - The official website of musician, composer, and producer KEY JAY. Music, voice acting, productions, and creative works.',
		music: 'Explore KEY JAY\'s music catalog including original compositions, albums, and beats. Listen to samples and discover new releases.',
		games: 'Gaming content and reviews by KEY JAY. Game development projects, reviews, and gaming related content.',
		voice: 'Professional voice acting services by KEY JAY. Animation, video games, audio dramas, and commercial voice work portfolio.',
		tech: 'Technology projects and tutorials by KEY JAY. Software development, web projects, and technical content.',
		productions: 'Creative productions by KEY JAY including webcomics, audio dramas, video content, and interactive media projects.',
		about: 'Learn about KEY JAY\'s professional journey in music, technology, and creative arts. Skills, experience, and achievements.',
		contact: 'Get in touch with KEY JAY for collaborations, commissions, and project inquiries. Start your creative project today.'
	};

	const pageDescription = $derived(sectionDescriptions[$activeSection] || sectionDescriptions.home);

	// Show play button when on music section AND player is not visible (desktop only)
	const showPlayButton = $derived($activeSection === 'music' && !$playerVisible);

	function handlePlayButtonClick() {
		loadRandomTrack();
		showPlayer();
	}

	// Show scroll button when scrolled down (desktop only), hidden when modals are open
	const showScrollButton = $derived(showDesktopScrollButton && $activeSection !== 'home' && !$contentViewerOpen);

	/**
	 * Scroll to the content area below the portal nav bar.
	 * Defers to next frame so DOM has updated after tab/filter changes.
	 * Uses scroll lock to prevent the observer from deactivating the portal.
	 */
	function scrollToSectionContent() {
		if (!browser) return;

		requestAnimationFrame(() => {
			const sentinel = document.querySelector('.section-transition-container .sub-nav-sentinel');
			if (!sentinel) return;

			setPortalScrollLock(true);

			const portalBar = document.querySelector('.section-sticky-nav');
			const portalBarHeight = portalBar ? portalBar.offsetHeight : 55;

			const sentinelAbsTop = sentinel.getBoundingClientRect().top + window.scrollY;
			const targetY = sentinelAbsTop - portalBarHeight + 2;
			window.scrollTo({ top: targetY, behavior: 'smooth' });

			setTimeout(() => {
				setPortalScrollLock(false);
			}, 600);
		});
	}

	function handleScrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="description" content={pageDescription} />
</svelte:head>

<!-- Floating Neumorphic Navbar -->
<NeumorphicNavbar />

<!-- Persistent Video Background (Hero) -->
<Hero />

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
					in:fly={{ x: 50, duration: 300, easing: cubicOut }}
					out:sectionOut
				>
					{#if $activeSection === 'music'}
						<MusicSection />
					{:else if $activeSection === 'voice'}
						<VoiceSection />
					{:else if $activeSection === 'productions'}
						<ProductionsSection />
					{:else if $activeSection === 'tech'}
						<TechSection />
					{:else if $activeSection === 'about'}
						<AboutSection bind:this={aboutSectionRef} />
					{:else if $activeSection === 'contact'}
						<ContactSection />
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

<!-- Music Section Sticky Sub-Nav Portal -->
{#if $activeSection === 'music'}
	<SectionStickyNav section="music">
		<div class="flex gap-2 flex-wrap justify-center">
			<button
				onclick={() => { musicActiveView.set('albums'); scrollToSectionContent(); }}
				class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
					$musicActiveView === 'albums'
						? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'
				}"
			>
				<Icon icon="mdi:album" class="text-base" />
				Albums
			</button>
			<button
				onclick={() => { musicActiveView.set('legacy'); scrollToSectionContent(); }}
				class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
					$musicActiveView === 'legacy'
						? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'
				}"
			>
				<Icon icon="mdi:archive" class="text-base" />
				Legacy
			</button>
			<button
				onclick={() => { musicActiveView.set('studio'); scrollToSectionContent(); }}
				class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
					$musicActiveView === 'studio'
						? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'
				}"
			>
				<Icon icon="mdi:music-box-multiple" class="text-base" />
				Studio
			</button>
		</div>
		{#if $musicActiveView === 'albums'}
			<div class="flex gap-1.5 flex-wrap justify-center mt-2">
				<button
					onclick={() => { musicActiveFilter.set('all'); scrollToSectionContent(); }}
					class="px-2.5 py-1 text-xs rounded-full transition-all duration-300 {
						$musicActiveFilter === 'all'
							? 'bg-blue-600/20 text-blue-400 border border-blue-600'
							: 'text-gray-400 hover:text-white hover:bg-white/10'
					}"
				>
					All
				</button>
				{#each musicReleaseTypes() as releaseType}
					<button
						onclick={() => { musicActiveFilter.set(releaseType); scrollToSectionContent(); }}
						class="px-2.5 py-1 text-xs rounded-full transition-all duration-300 capitalize {
							$musicActiveFilter === releaseType
								? 'bg-blue-600/20 text-blue-400 border border-blue-600'
								: 'text-gray-400 hover:text-white hover:bg-white/10'
						}"
					>
						{releaseType.charAt(0).toUpperCase() + releaseType.slice(1).replace(/_/g, ' ')}
					</button>
				{/each}
			</div>
		{/if}
	</SectionStickyNav>
{/if}

<!-- Tech Section Sticky Sub-Nav Portal -->
{#if $activeSection === 'tech'}
	<SectionStickyNav section="tech">
		<div class="flex gap-2 flex-wrap justify-center">
			<button
				onclick={() => { techActiveTab.set('stack'); scrollToSectionContent(); }}
				class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
					$techActiveTab === 'stack'
						? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'
				}"
			>
				<Icon icon="mdi:layers-triple" class="text-base" />
				Stack
			</button>
			<button
				onclick={() => { techActiveTab.set('projects'); scrollToSectionContent(); }}
				class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
					$techActiveTab === 'projects'
						? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'
				}"
			>
				<Icon icon="mdi:rocket-launch" class="text-base" />
				Projects
			</button>
			<button
				onclick={() => { techActiveTab.set('showcase'); scrollToSectionContent(); }}
				class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
					$techActiveTab === 'showcase'
						? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
						: 'text-gray-300 hover:text-white hover:bg-white/10'
				}"
			>
				<Icon icon="mdi:view-gallery" class="text-base" />
				Showcase
			</button>
		</div>
	</SectionStickyNav>
{/if}

<!-- Productions Section Sticky Sub-Nav Portal -->
{#if $activeSection === 'productions'}
	<SectionStickyNav section="productions">
		<div class="flex gap-2 flex-wrap justify-center">
			{#each productionCategories as category}
				<button
					onclick={() => { productionsActiveFilter.set(category.id); scrollToSectionContent(); }}
					class="px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-1.5 {
						$productionsActiveFilter === category.id
							? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
							: 'text-gray-300 hover:text-white hover:bg-white/10'
					}"
				>
					<Icon icon={category.icon} class="text-base" />
					{category.label}
				</button>
			{/each}
		</div>
	</SectionStickyNav>
{/if}

<!-- Fixed Play Button (Desktop Only) - Outside transition containers for proper fixed positioning -->
{#if showPlayButton}
	<div
		class="fixed-play-button desktop-only"
		class:pulsing={$isPlaying}
		in:fade={{ duration: 300 }}
		out:fade={{ duration: 200 }}
	>
		<SpinningPlayButton onClick={handlePlayButtonClick} />
	</div>
{/if}

<!-- Fixed Scroll to Top Button (Desktop Only) - Above play button -->
{#if showScrollButton}
	<button
		class="fixed-scroll-button desktop-only"
		style="bottom: {$activeSection === 'music' ? '188px' : '76px'}; right: {$activeSection === 'music' ? '76px' : '44px'};"
		onclick={handleScrollToTop}
		aria-label="Scroll to top"
		in:fade={{ duration: 300 }}
		out:fade={{ duration: 200 }}
	>
		<svg class="scroll-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path>
		</svg>
	</button>
{/if}

<style>
	/* Home spacer - creates full page height so footer appears at the bottom */
	.home-spacer {
		min-height: calc(100vh - 100px); /* Full viewport minus footer space */
		pointer-events: none;
	}

	/* Section transition wrapper - grid stacking for smooth crossfade */
	.neu-content-container > :global(*) {
		grid-area: 1 / 1;
	}

	/* Section transition container */
	.section-transition-container {
		/* Content can overflow vertically but horizontal overflow hidden to prevent
		   fly animations from causing viewport shift (which affects fixed elements) */
		overflow-x: hidden;
		overflow-y: visible;
	}

	/* Content container - prevent horizontal overflow from fly transitions */
	.neu-content-container {
		overflow-x: hidden;
	}

	/* Desktop Only - Hide on mobile */
	.desktop-only {
		display: none !important;
	}

	/* Desktop Only Buttons (hidden on mobile where FloatingButtonContainer provides buttons) */
	@media (min-width: 769px) {
		.desktop-only {
			display: block !important;
		}

		/* Fixed Play Button - Lower position */
		.fixed-play-button {
			position: fixed;
			bottom: 24px;
			right: 32px;
			z-index: 35;
			transform: scale(0.85);
			transform-origin: bottom right;
			pointer-events: auto;
			visibility: visible;
			opacity: 1;
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

		/* Fixed Scroll to Top Button - Above play button */
		.fixed-scroll-button {
			position: fixed;
			/* bottom and right set via inline styles based on active section */
			z-index: 36;
			width: 56px;
			height: 56px;
			border-radius: 50%;
			background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
			border: none;
			color: white;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
			transition: all 0.2s ease;
		}

		.fixed-scroll-button:hover {
			transform: scale(1.1);
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4),
			           0 0 20px rgba(139, 92, 246, 0.5);
		}

		.fixed-scroll-button:active {
			transform: scale(0.95);
		}

		.fixed-scroll-button .scroll-icon {
			width: 28px;
			height: 28px;
			display: block;
			margin: auto;
			flex-shrink: 0;
		}
	}
</style>
