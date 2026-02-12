<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { togglePlayer, showPlayer, loadPlaylist, loadRandomTrack } from '$lib/stores/musicPlayer.js';
	import AlbumCard from '$lib/components/music/AlbumCard.svelte';
	import AlbumModalSwal from '$lib/components/music/AlbumModalSwal.svelte';
	import NewReleaseModalSwal from '$lib/components/music/NewReleaseModalSwal.svelte';
	import LatestProjectModalSwal from '$lib/components/music/LatestProjectModalSwal.svelte';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import SpinningPlayButton from '$lib/components/music/SpinningPlayButton.svelte';
	import LegacyWorkCard from '$lib/components/music/LegacyWorkCard.svelte';
	import Icon from '@iconify/svelte';
	import { getLegacyWorksByYear } from '$lib/data/legacyWorks.js';
	import { browser } from '$app/environment';
	import { navigateTo, navbarVisible } from '$lib/stores/navigation.js';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';
	import { letterPulse } from '$lib/actions/letterAnimation.js';
	import { sectionData, loadSection } from '$lib/stores/sectionData.js';

	// Title letters for animation
	const titleLetters = 'Music'.split('');

	// Get section data from store (reactive using Svelte 5 runes)
	const sectionState = $derived($sectionData.music);
	const sectionLoaded = $derived(sectionState.status === 'loaded');
	const sectionLoading = $derived(sectionState.status === 'loading');
	const sectionError = $derived(sectionState.status === 'error' ? sectionState.error : null);

	// Extract data from section state when loaded
	const musicData = $derived(sectionState.data || {});
	const albums = $derived(musicData.albums || []);
	const musicNetworks = $derived(musicData.musicNetworks || []);
	const newReleases = $derived(musicData.newReleases || []);

	let container = $state();
	let mixer = $state(null);
	let selectedAlbum = $state(null);
	let albumModal = $state(null);
	let activeFilter = $state('all');
	let view = $state('albums');
	let selectedRelease = $state(null);
	let releaseModal = $state(null);
	let selectedProject = $state(null);
	let projectModal = $state(null);

	// Latest Projects data and configuration
	let customDesignOverride = $state(false);
	let currentProjectIndex = $state(0);
	let isTransitioning = $state(false);
	let visibleElements = $state(new Set());

	// Parallax state for Latest Projects
	let latestProjectsRef = $state(null);
	let scrollY = $state(0);
	let isMobile = $state(false);

	// Derived parallax transform - scrollY dependency triggers recalculation
	const parallaxY = $derived(() => {
		const _scroll = scrollY;
		// Skip parallax on mobile for performance (avoids getBoundingClientRect on every frame)
		if (!browser || !latestProjectsRef || isMobile) return 0;
		const rect = latestProjectsRef.getBoundingClientRect();
		const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
		const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
		return Math.max(-100, Math.min(100, (progress - 0.5) * 200));
	});

	// Use Latest Projects from Directus kjov2_music_releases (fetched via getLatestProjects)
	const latestProjects = $derived(() => {
		// Use latestProjects from API (3 most recent releases)
		const apiProjects = musicData.latestProjects || [];
		if (apiProjects.length > 0) {
			return apiProjects.map(project => ({
				id: project.id,
				title: project.title,
				artist: project.artist,
				description: project.description,
				richContent: project.richContent,
				linerNotes: project.linerNotes,
				backgroundImageUrl: project.backgroundImageUrl || project.coverArt || '/img/hero-music-concert.webp',
				mediaUrl: project.thumbnailUrl || project.coverArt || '/img/hero-music-concert.webp',
				coverArt: project.coverArt,
				mediaType: project.hasVideo ? 'video' : 'image',
				hasVideo: project.hasVideo,
				featuredVideo: project.featuredVideo,
				videos: project.videos || [],
				releaseType: project.releaseType,
				releaseDate: project.releaseDate,
				externalLinks: project.externalLinks || []
			}));
		}

		// Fallback placeholder if no projects
		return [
			{
				id: 'placeholder',
				title: 'New Music Coming Soon',
				description: 'Stay tuned for the latest releases.',
				backgroundImageUrl: '/img/hero-music-concert.webp',
				mediaUrl: '/img/hero-music-concert.webp',
				mediaType: 'image'
			}
		];
	});

	const currentProject = $derived(latestProjects()[currentProjectIndex]);

	// Get unique release types from albums for dynamic filters
	let releaseTypes = $derived(() => {
		const types = new Set();
		albums.forEach(album => {
			if (album.release_type) {
				types.add(album.release_type);
			}
		});
		return Array.from(types).sort();
	});

	// Mock data for beats
	const beats = [
		{
			id: 1,
			title: 'Summer Vibes',
			bpm: 120,
			genre: 'Hip Hop',
			mood: 'Chill',
			price: 29.99,
			audio_url: '/audio/sample.mp3'
		},
		{
			id: 2,
			title: 'Dark Energy',
			bpm: 140,
			genre: 'Trap',
			mood: 'Dark',
			price: 49.99,
			audio_url: '/audio/sample.mp3'
		}
	];

	// Studio gear data
	const studioGear = $derived(musicData.studioGear || []);

	// Studio gear category config
	const studioCategoryLabels = {
		daw: 'DAW',
		plugins: 'Plugins / VSTs',
		microphones: 'Microphones',
		instruments: 'Instruments',
		outboard: 'Outboard',
		monitoring: 'Monitoring'
	};

	const studioCategoryIcons = {
		daw: 'mdi:music-circle',
		plugins: 'mdi:puzzle',
		microphones: 'mdi:microphone',
		instruments: 'mdi:piano',
		outboard: 'mdi:audio-input-stereo-minijack',
		monitoring: 'mdi:headphones'
	};

	const studioCategoryOrder = ['daw', 'plugins', 'microphones', 'instruments', 'outboard', 'monitoring'];

	const gearByCategory = $derived(() => {
		const groups = {};
		for (const item of studioGear) {
			const cat = item.category || 'other';
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(item);
		}
		return groups;
	});

	// Legacy works data (grouped by year)
	const legacyWorksByYear = $derived(getLegacyWorksByYear());

	// Mock albums fallback
	const mockAlbums = [
		{
			id: 1,
			title: 'Ephemeral Echoes',
			artist: 'Key Jay',
			cover_art: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
			release_date: '2024-03-15',
			access_type: 'paid',
			minimum_price: 10,
			track_count: 12,
			genre: 'electronic',
			tracks: []
		}
	];

	onMount(async () => {
		// Load section data if not already loaded
		if (sectionState.status === 'idle') {
			loadSection('music');
		}

		// Scroll listener for parallax effect (rAF throttled)
		let ticking = false;
		const handleScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				scrollY = window.scrollY;
				ticking = false;
			});
		};

		// Detect mobile for parallax disabling
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', checkMobile, { passive: true });

		return () => {
			if (mixer) {
				mixer.destroy();
			}
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', checkMobile);
		};
	});

	onDestroy(() => {
		if (mixer) {
			mixer.destroy();
		}
	});

	async function openAlbumModal(album) {
		selectedAlbum = album;
		await new Promise(resolve => setTimeout(resolve, 10));
		if (albumModal) {
			await albumModal.showModal();
		}
	}

	// Handle clicks on Latest Projects - open the latest project modal
	async function handleProjectClick(project) {
		// Ignore placeholder clicks
		if (project.id === 'placeholder') return;

		// Open the project modal with the selected project
		selectedProject = project;
		await new Promise(resolve => setTimeout(resolve, 10));
		if (projectModal) {
			await projectModal.showModal();
		}
	}

	function setFilter(filter) {
		activeFilter = filter;
		if (filter === 'all') {
			if (mixer) mixer.filter('all');
		} else {
			if (mixer) mixer.filter(`.${filter.toLowerCase().replace(/\s+/g, '-')}`);
		}
	}

	function switchView(newView) {
		if (view === newView) return;
		if (mixer) {
			mixer.destroy();
			mixer = null;
		}
		view = newView;
	}

	// Reactive mixer init/destroy based on view and container
	$effect(() => {
		if (view === 'albums' && container && sectionLoaded && browser) {
			let cancelled = false;
			import('mixitup').then(({ default: mixitup }) => {
				if (!cancelled && container && !mixer) {
					mixer = mixitup(container, {
						selectors: { target: '.mix-item' },
						animation: { duration: 300, effects: 'fade scale(0.5)' }
					});
				}
			});
			return () => {
				cancelled = true;
				if (mixer) {
					mixer.destroy();
					mixer = null;
				}
			};
		}
	});

	function handlePlayButtonClick() {
		loadRandomTrack();
		showPlayer();
	}

	// Project rotator functions
	function prevProject() {
		if (isTransitioning) return;
		const projects = latestProjects();
		const newIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
		isTransitioning = true;
		currentProjectIndex = newIndex;
		setTimeout(() => { isTransitioning = false; }, 600);
	}

	function nextProject() {
		if (isTransitioning) return;
		const projects = latestProjects();
		const newIndex = (currentProjectIndex + 1) % projects.length;
		isTransitioning = true;
		currentProjectIndex = newIndex;
		setTimeout(() => { isTransitioning = false; }, 600);
	}

	function goToProject(index) {
		if (isTransitioning || index === currentProjectIndex) return;
		isTransitioning = true;
		currentProjectIndex = index;
		setTimeout(() => { isTransitioning = false; }, 600);
	}

	// Touch/Swipe handling for carousel
	let touchStartX = 0;
	let touchEndX = 0;
	let touchStartY = 0;
	let touchEndY = 0;
	const swipeThreshold = 80; // Minimum horizontal distance for swipe
	const verticalThreshold = 60; // Maximum vertical drift allowed

	function handleTouchStart(e) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
		touchEndX = touchStartX;
		touchEndY = touchStartY;
	}

	function handleTouchMove(e) {
		touchEndX = e.touches[0].clientX;
		touchEndY = e.touches[0].clientY;
	}

	function handleTouchEnd() {
		const horizontalDiff = touchStartX - touchEndX;
		const verticalDiff = Math.abs(touchStartY - touchEndY);

		// Only trigger swipe if:
		// 1. Horizontal movement exceeds threshold (80px)
		// 2. Vertical movement is minimal (<60px, not scrolling)
		// 3. Not currently transitioning
		// 4. Horizontal movement significantly larger than vertical (1.5x ratio)
		if (
			Math.abs(horizontalDiff) > swipeThreshold &&
			verticalDiff < verticalThreshold &&
			!isTransitioning &&
			Math.abs(horizontalDiff) > verticalDiff * 1.5
		) {
			if (horizontalDiff > 0) {
				nextProject(); // Swiped left
			} else {
				prevProject(); // Swiped right
			}
		}

		// Reset all touch coordinates
		touchStartX = 0;
		touchEndX = 0;
		touchStartY = 0;
		touchEndY = 0;
	}

	function observeElement(node, key) {
		if (!browser) return;
		return createIntersectionObserver(node, (isVisible) => {
			if (isVisible && !visibleElements.has(key)) {
				visibleElements = new Set([...visibleElements, key]);
			}
		}, { threshold: 0.2, rootMargin: '-100px' });
	}

	function handleContactClick() {
		navigateTo('contact');
	}
</script>

<!-- ============================================================================ -->
<!-- MUSIC SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="music-section min-h-screen section-gradient-music gradient-animated relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="music" opacity={0.12} />

	<!-- Section Header with Blue Accent -->
	<div class="pt-16 md:pt-28 pb-8 text-center relative">
		<div class="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-blue-500/5 to-transparent pointer-events-none"></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			{#each titleLetters as letter, i}
				<span
					use:letterPulse={{ delay: i * 60 }}
					class="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent inline-block"
				>{letter}</span>
			{/each}
		</h1>
		<p class="text-lg text-blue-200/70 relative">Explore my musical journey</p>
	</div>

	<!-- Latest Projects Section -->
	{#if !customDesignOverride}
		<section
			bind:this={latestProjectsRef}
			class="relative w-full overflow-hidden py-20 bg-[var(--neu-bg-dark)]"
		>
			<!-- Background with parallax effect -->
			{#key currentProjectIndex}
				<div
					class="absolute inset-0 bg-cover bg-center"
					style="
						background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('{currentProject.backgroundImageUrl}');
						transform: translateY({parallaxY()}px);
						transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), background-image 0.3s ease;
						will-change: transform;
					"
					transition:fade={{ duration: 800 }}>
				</div>
			{/key}

			<div class="relative z-10 container mx-auto px-4">
				<!-- Section Heading -->
				<div
					use:observeElement={'latest-projects-heading'}
					class="text-center mb-12 transition-all duration-1000 transform {
						visibleElements.has('latest-projects-heading') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
					}"
				>
					<h2 class="font-light text-white uppercase tracking-widest text-4xl md:text-5xl lg:text-6xl">Latest Projects</h2>
				</div>

				<!-- Project Media with Arrow Navigation -->
				<div
					use:observeElement={'latest-projects-content'}
					class="flex justify-center items-center w-full transition-all duration-1200 transform relative {
						visibleElements.has('latest-projects-content') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
					}"
					style="transition-delay: 200ms;"
				>
					<div
						class="carousel-wrapper w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl aspect-video rounded-2xl overflow-hidden relative cursor-pointer group neu-card transition-all duration-500"
						onclick={() => handleProjectClick(currentProject)}
						onkeydown={(e) => e.key === 'Enter' && handleProjectClick(currentProject)}
						ontouchstart={handleTouchStart}
						ontouchmove={handleTouchMove}
						ontouchend={handleTouchEnd}
						role="button"
						tabindex="0"
					>
						{#key currentProjectIndex}
							<div class="w-full h-full absolute inset-0"
								 in:fly={{ y: 50, duration: 600, delay: 200 }}
								 out:fly={{ y: -50, duration: 300 }}>
								<img
									src={currentProject.mediaUrl}
									alt={currentProject.title}
									class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 rounded-2xl">

								<!-- Content Overlay -->
								<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>

								<!-- Project Title Overlay -->
								<div class="absolute bottom-6 left-6 right-6">
									<h3 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight text-center">
										{currentProject.title}
									</h3>
								</div>

								<!-- Play button overlay -->
								<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
									<div class="bg-black/60 rounded-full p-6 group-hover:bg-black/70 group-hover:scale-110 transition-transform duration-300">
										<svg width="40" height="40" viewBox="0 0 24 24" fill="white">
											<path d="M8 5v14l11-7z"/>
										</svg>
									</div>
								</div>
							</div>
						{/key}

						<!-- Left Navigation Zone -->
						{#if latestProjects().length > 1}
							<div
								class="carousel-nav-zone carousel-nav-left"
								onclick={(e) => { e.stopPropagation(); prevProject(); }}
								onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); prevProject(); } }}
								role="button"
								tabindex="0"
								aria-label="Previous project"
							>
								<div class="carousel-nav-arrow">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
										<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
									</svg>
								</div>
							</div>
						{/if}

						<!-- Right Navigation Zone -->
						{#if latestProjects().length > 1}
							<div
								class="carousel-nav-zone carousel-nav-right"
								onclick={(e) => { e.stopPropagation(); nextProject(); }}
								onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); nextProject(); } }}
								role="button"
								tabindex="0"
								aria-label="Next project"
							>
								<div class="carousel-nav-arrow">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
										<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
									</svg>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Dot Navigation -->
				<div class="flex justify-center space-x-3 mt-8">
					{#each latestProjects() as project, index}
						<button
							class="w-4 h-4 rounded-full transition-all duration-300 border-2 {index === currentProjectIndex ? 'bg-white border-white scale-125' : 'bg-white/30 border-white/50 hover:bg-blue-400/80'} {isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}"
							onclick={() => goToProject(index)}
							disabled={isTransitioning}
							aria-label="Go to project {index + 1}"
						></button>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- View Switcher -->
	<section
		class="bg-[var(--neu-bg)]/95 backdrop-blur-sm py-6 sticky z-30 transition-[top] duration-300"
		style="top: {$navbarVisible ? '88px' : '0px'}"
	>
		<div class="container mx-auto px-4">
			<!-- Main view switcher - centered -->
			<div class="flex flex-col items-center gap-4">
				<!-- Main category buttons - centered -->
				<div class="flex gap-2 flex-wrap justify-center">
					<button
						onclick={() => switchView('albums')}
						class="px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 {
							view === 'albums'
								? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'
						}"
					>
						<Icon icon="mdi:album" class="text-lg" />
						Albums & Singles
					</button>
					<button
						onclick={() => switchView('beats')}
						class="px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 {
							view === 'beats'
								? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'
						}"
					>
						<Icon icon="mdi:music-note" class="text-lg" />
						Beats for Licensing
					</button>
					<button
						onclick={() => switchView('legacy')}
						class="px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 {
							view === 'legacy'
								? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'
						}"
					>
						<Icon icon="mdi:archive" class="text-lg" />
						Legacy Works
					</button>
					<button
						onclick={() => switchView('studio')}
						class="px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 {
							view === 'studio'
								? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'
						}"
					>
						<Icon icon="mdi:music-box-multiple" class="text-lg" />
						Studio
					</button>
				</div>

				<!-- Filter buttons - centered below main buttons -->
				{#if view === 'albums'}
					<div class="flex gap-2 flex-wrap justify-center">
						<button
							onclick={() => setFilter('all')}
							class="px-3 py-1 text-sm rounded-full transition-all duration-300 {
								activeFilter === 'all'
									? 'bg-blue-600/20 text-blue-400 border border-blue-600'
									: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
							}"
						>
							All
						</button>
						{#each releaseTypes() as releaseType}
							<button
								onclick={() => setFilter(releaseType)}
								class="px-3 py-1 text-sm rounded-full transition-all duration-300 capitalize {
									activeFilter === releaseType
										? 'bg-blue-600/20 text-blue-400 border border-blue-600'
										: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
								}"
							>
								{releaseType.charAt(0).toUpperCase() + releaseType.slice(1).replace(/_/g, ' ')}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Content Section -->
	<section class="container mx-auto px-4 py-12">
		{#key view}
		<div in:fade={{ duration: 250, delay: 50 }} out:fade={{ duration: 150 }}>
			{#if view === 'albums'}
				{#if sectionLoading}
					<div class="flex justify-center items-center py-20">
						<div class="text-center">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
							<p class="text-gray-400">Loading music releases...</p>
						</div>
					</div>
				{:else if sectionError}
					<div class="text-center py-20">
						<div class="text-red-400 mb-4">
							<Icon icon="mdi:alert-circle" class="text-6xl mx-auto" />
						</div>
						<h3 class="text-xl font-semibold text-white mb-2">Failed to Load Albums</h3>
						<p class="text-gray-400 mb-4">{sectionError}</p>
						<button
							onclick={() => loadSection('music')}
							class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
						>
							Try Again
						</button>
					</div>
				{:else if !sectionLoaded}
					<div class="flex justify-center items-center py-20">
						<div class="text-center">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
							<p class="text-gray-400">Loading...</p>
						</div>
					</div>
				{:else if albums.length === 0}
					<div class="text-center py-20">
						<div class="text-gray-400 mb-4">
							<Icon icon="mdi:music-note-off" class="text-6xl mx-auto" />
						</div>
						<h3 class="text-xl font-semibold text-white mb-2">No Albums Found</h3>
						<p class="text-gray-400">Check back soon for new releases!</p>
					</div>
				{:else}
					<div bind:this={container} class="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
						{#each albums as album, i}
							<div class="mix-item {album.release_type ? album.release_type.toLowerCase().replace(/\s+/g, '-') : 'unknown'}">
								<AlbumCard
									{album}
									onclick={openAlbumModal}
									index={i}
								/>
							</div>
						{/each}
					</div>
				{/if}
			{:else if view === 'beats'}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{#each beats as beat, i}
						<div
							class="neu-card p-6"
							in:fly={{ y: 50, duration: 400, delay: i * 100 }}
						>
							<div class="flex items-start justify-between mb-4">
								<div>
									<h3 class="text-xl font-semibold text-white mb-2">{beat.title}</h3>
									<div class="flex flex-wrap gap-2">
										<span class="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
											{beat.bpm} BPM
										</span>
										<span class="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
											{beat.genre}
										</span>
										<span class="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
											{beat.mood}
										</span>
									</div>
								</div>
								<div class="text-right">
									<p class="text-2xl font-bold text-white">${beat.price}</p>
									<p class="text-gray-400 text-sm">License</p>
								</div>
							</div>

							<AudioPlayer
								audioUrl={beat.audio_url}
								trackTitle={beat.title}
								className="mb-4"
							/>

							<div class="flex gap-3">
								<button class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 hover:scale-105">
									License This Beat
								</button>
								<button class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 hover:scale-105">
									<Icon icon="mdi:download" width={20} height={20} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else if view === 'legacy'}
				<!-- Legacy Works Notice -->
				<div
					class="legacy-notice neu-card p-6 mb-12 max-w-3xl mx-auto border-l-4 border-red-500 bg-red-950/30"
					in:fly={{ y: 30, duration: 400 }}
				>
					<div class="flex items-start gap-5">
						<div class="flex-shrink-0 notice-icon-pulse">
							<Icon icon="mdi:alert-circle" class="text-5xl text-red-400" />
						</div>
						<div>
							<h4 class="text-lg font-semibold text-red-300 mb-2">Important Notice</h4>
							<p class="text-gray-300 italic leading-relaxed">
								These pieces come from my early years experimenting with art and music online.
								They don't reflect my current technical ability, but they're part of my creative
								journey and growth.
							</p>
						</div>
					</div>
				</div>

				<!-- Year-Grouped Content -->
				{#each legacyWorksByYear as { year, works }, yearIndex}
					<div id="legacy-year-{year}" class="mb-12" in:fly={{ y: 30, duration: 400, delay: yearIndex * 100 }}>
						<h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
							<span class="bg-amber-600/20 text-amber-400 px-4 py-1 rounded-full">{year}</span>
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each works as work, workIndex}
								<div in:fly={{ y: 20, duration: 300, delay: yearIndex * 100 + workIndex * 50 }}>
									<LegacyWorkCard {work} />
								</div>
							{/each}
						</div>
					</div>
				{/each}

				{#if legacyWorksByYear.length === 0}
					<div class="text-center py-20">
						<div class="text-gray-400 mb-4">
							<Icon icon="mdi:music-note-off" class="text-6xl mx-auto" />
						</div>
						<h3 class="text-xl font-semibold text-white mb-2">No Legacy Works Found</h3>
						<p class="text-gray-400">Content coming soon!</p>
					</div>
				{/if}
			{:else if view === 'studio'}
				<section class="py-12 relative">
					<div class="max-w-6xl mx-auto">
						<h2 class="text-2xl font-bold text-white mb-8 text-center">What I Use</h2>
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<!-- Studio Photo -->
							<div class="neu-card overflow-hidden">
								{#if musicData.studioPhoto}
									<img src={musicData.studioPhoto} alt="Studio setup" class="w-full h-full object-cover" loading="lazy" />
								{:else}
									<div class="aspect-[4/3] bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex flex-col items-center justify-center gap-4">
										<Icon icon="mdi:music-box-multiple" class="text-blue-400/30 text-8xl" />
										<p class="text-gray-500 text-sm">Studio photo coming soon</p>
									</div>
								{/if}
							</div>

							<!-- Gear/Specs List -->
							<div>
								{#if studioGear.length === 0}
									<div class="text-center py-16">
										<Icon icon="mdi:music-box-multiple" class="text-gray-600 text-6xl mb-4 mx-auto" />
										<h3 class="text-xl text-gray-400 mb-2">Studio gear coming soon</h3>
										<p class="text-gray-500">Equipment and software will appear here.</p>
									</div>
								{:else}
									<div class="space-y-6">
										{#each studioCategoryOrder.filter(cat => gearByCategory()[cat]?.length > 0) as category}
											<div>
												<div class="flex items-center gap-2 mb-3">
													<Icon icon={studioCategoryIcons[category]} class="text-blue-400 text-lg" />
													<h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
														{studioCategoryLabels[category]}
													</h3>
													<div class="flex-1 h-px bg-gradient-to-r from-blue-600/30 to-transparent"></div>
												</div>
												<div class="space-y-2">
													{#each gearByCategory()[category] as item (item.id)}
														<div class="neu-card p-4 flex items-center gap-4" in:fly={{ y: 20, duration: 300 }}>
															<div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
																<Icon icon={item.icon} class="text-blue-400 text-xl" />
															</div>
															<div class="min-w-0">
																<span class="text-white font-semibold text-sm">{item.name}</span>
																<p class="text-gray-400 text-xs">{item.description}</p>
															</div>
														</div>
													{/each}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</section>
			{/if}
		</div>
		{/key}
	</section>

	<!-- Listen On Section -->
	{#if view === 'albums'}
		<section class="py-20 subsection-gradient-dark subsection-accent-blue relative">
			<div class="container mx-auto px-4 text-center">
				<h2 class="text-3xl font-bold text-white mb-12">Listen On</h2>
				{#if musicNetworks && musicNetworks.length > 0}
					<div class="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
						{#each musicNetworks as network}
							<a
								href={network.url}
								target="_blank"
								class="group transition-all duration-300 hover:scale-110 opacity-70 hover:opacity-100"
								aria-label="Listen on {network.name}"
							>
								<Icon icon={network.icon} class="text-white text-6xl sm:text-7xl md:text-8xl" />
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-gray-400">Music streaming platforms coming soon!</p>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Contact CTA Section -->
	<section class="bg-gradient-to-b from-[var(--neu-bg)] via-[var(--neu-bg-light)]/50 to-[var(--neu-bg)] py-16 relative">
		<div class="container mx-auto px-4">
			<div class="max-w-2xl mx-auto text-center">
				<h2 class="text-3xl font-bold text-white mb-4">Need Custom Music?</h2>
				<p class="text-gray-400 mb-8">
					Let's create something unique for your project. From commercial licenses to custom compositions.
				</p>
				<button
					onclick={handleContactClick}
					class="neu-button-primary inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300"
				>
					Get in Touch
				</button>
			</div>
		</div>
	</section>

</div>

{#if selectedAlbum}
	<AlbumModalSwal
		album={selectedAlbum}
		bind:this={albumModal}
	/>
{/if}

{#if selectedRelease}
	<NewReleaseModalSwal
		release={selectedRelease}
		bind:this={releaseModal}
	/>
{/if}

{#if selectedProject}
	<LatestProjectModalSwal
		project={selectedProject}
		bind:this={projectModal}
	/>
{/if}

<style>
	.music-section {
		/* Container styles */
	}

	/* Carousel Wrapper */
	.carousel-wrapper {
		position: relative;
	}

	/* Full-height Navigation Zones */
	.carousel-nav-zone {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 80px;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.carousel-nav-zone:focus {
		outline: none;
	}

	.carousel-nav-left {
		left: 0;
		border-radius: 16px 0 0 16px;
		background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent);
	}

	.carousel-nav-right {
		right: 0;
		border-radius: 0 16px 16px 0;
		background: linear-gradient(to left, rgba(0, 0, 0, 0.5), transparent);
	}

	/* Show navigation zones on hover */
	.carousel-wrapper:hover .carousel-nav-zone {
		opacity: 1;
	}

	/* Arrow icon inside the zone */
	.carousel-nav-arrow {
		color: white;
		transition: all 0.3s ease;
		opacity: 0.8;
	}

	.carousel-nav-zone:hover .carousel-nav-arrow {
		opacity: 1;
		transform: scale(1.2);
		color: #60a5fa;
	}

	/* Responsive zone sizing */
	@media (max-width: 1024px) {
		.carousel-nav-zone {
			width: 60px;
		}
		.carousel-nav-arrow svg {
			width: 28px;
			height: 28px;
		}
	}

	@media (max-width: 640px) {
		.carousel-nav-zone {
			width: 50px;
		}
		.carousel-nav-arrow svg {
			width: 24px;
			height: 24px;
		}
	}

	/* Legacy Notice Styles */
	.legacy-notice {
		box-shadow:
			8px 8px 16px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-8px -8px 16px var(--neu-shadow-light, rgba(60, 64, 72, 0.5)),
			inset 0 0 30px rgba(239, 68, 68, 0.05);
	}

	.notice-icon-pulse {
		animation: iconPulse 2s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.8;
		}
	}

	/* Mobile: Disable expensive effects to fix render issues */
	@media (max-width: 768px) {
		.carousel-nav-zone:hover .carousel-nav-arrow {
			transform: none; /* Disable scale transform */
		}

		.notice-icon-pulse {
			animation: none; /* Disable pulse animation */
		}
	}
</style>
