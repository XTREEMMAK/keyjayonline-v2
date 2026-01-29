<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { togglePlayer, showPlayer, loadPlaylist, loadRandomTrack } from '$lib/stores/musicPlayer.js';
	import AlbumCard from '$lib/components/music/AlbumCard.svelte';
	import AlbumModalSwal from '$lib/components/music/AlbumModalSwal.svelte';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import SpinningPlayButton from '$lib/components/music/SpinningPlayButton.svelte';
	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { navigateTo, navbarVisible } from '$lib/stores/navigation.js';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';

	// Accept data as props from parent (passed via SPA container)
	let { data = {} } = $props();

	let container = $state();
	let mixer = $state(null);
	let selectedAlbum = $state(null);
	let albumModal = $state(null);
	let activeFilter = $state('all');
	let view = $state('albums');
	let albums = $state(data.albums || []);
	let musicNetworks = $state(data.musicNetworks || []);
	let featuredWorks = $state(data.featuredWorks || []);
	let loading = $state(false);
	let error = $state(data.error || null);

	// Latest Projects data and configuration
	let customDesignOverride = $state(data.customDesignOverride || false);
	let currentProjectIndex = $state(0);
	let isTransitioning = $state(false);
	let visibleElements = $state(new Set());

	// Use Featured Works from Directus kjov2_general.featured for Latest Projects
	const latestProjects = $derived(() => {
		// Use featuredWorks from Directus if available
		if (featuredWorks && featuredWorks.length > 0) {
			return [...featuredWorks]
				.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
				.map(work => ({
					id: work.id,
					title: work.title,
					description: work.description || 'Featured Project',
					backgroundImageUrl: work.backgroundImageUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
					mediaUrl: work.leftContent?.src || work.backgroundImageUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
					mediaType: work.leftContent?.type || 'image',
					videoId: work.leftContent?.videoId || null,
					tags: ['Featured'],
					link: work.link || '#',
					// No album reference for featured works - they link externally
					album: null
				}));
		}

		// Fallback to albums if no featured works
		if (albums && albums.length > 0) {
			const featured = albums.filter(a => a.featured);
			const recent = albums.filter(a => !a.featured).slice(0, 3 - featured.length);
			const projectAlbums = [...featured, ...recent].slice(0, 3);

			return projectAlbums.map(album => ({
				id: album.id,
				title: album.title,
				description: album.description || `${album.release_type || 'Release'} by ${album.artist || 'Key Jay'}`,
				backgroundImageUrl: album.cover_art || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
				mediaUrl: album.cover_art || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
				mediaType: 'image',
				tags: [album.release_type, album.genre].filter(Boolean),
				album // Keep reference for modal opening
			}));
		}

		// Final fallback - placeholder
		return [
			{
				id: 1,
				title: 'New Music Coming Soon',
				description: 'Stay tuned for the latest releases.',
				backgroundImageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
				mediaUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
				mediaType: 'image',
				tags: ['Music', 'Coming Soon'],
				album: null
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
		// Initialize with fallback if no data
		if (albums.length === 0 && !error) {
			albums = mockAlbums;
		}

		if (browser && container && view === 'albums') {
			const { default: mixitup } = await import('mixitup');
			mixer = mixitup(container, {
				selectors: {
					target: '.mix-item'
				},
				animation: {
					duration: 300,
					effects: 'fade scale(0.5)'
				}
			});
		}

		return () => {
			if (mixer) {
				mixer.destroy();
			}
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

	// Handle clicks on Latest Projects - either open album modal or navigate to link
	function handleProjectClick(project) {
		if (project.album) {
			// It's an album - open the modal
			openAlbumModal(project.album);
		} else if (project.link && project.link !== '#') {
			// It's a featured work with an external link - navigate
			window.open(project.link, '_blank', 'noopener,noreferrer');
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

	async function switchView(newView) {
		if (view === newView) return;

		if (browser) {
			const contentEl = document.querySelector('.content-container');
			if (contentEl) {
				contentEl.style.opacity = '0';
				setTimeout(async () => {
					view = newView;
					if (mixer) {
						mixer.destroy();
						mixer = null;
					}

					await new Promise(resolve => setTimeout(resolve, 100));

					if (newView === 'albums' && container) {
						const { default: mixitup } = await import('mixitup');
						mixer = mixitup(container, {
							selectors: { target: '.mix-item' },
							animation: { duration: 300, effects: 'fade scale(0.5)' }
						});
					}

					setTimeout(() => {
						if (contentEl) contentEl.style.opacity = '1';
					}, 50);
				}, 150);
			} else {
				view = newView;
				if (mixer) {
					mixer.destroy();
					mixer = null;
				}

				if (newView === 'albums' && container) {
					await new Promise(resolve => setTimeout(resolve, 100));
					const { default: mixitup } = await import('mixitup');
					mixer = mixitup(container, {
						selectors: { target: '.mix-item' },
						animation: { duration: 300, effects: 'fade scale(0.5)' }
					});
				}
			}
		} else {
			view = newView;
		}
	}

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
<div class="music-section min-h-screen bg-gradient-to-br from-[var(--neu-bg)] via-blue-900/10 to-[var(--neu-bg)] relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="music" opacity={0.12} />

	<!-- Section Header with Blue Accent -->
	<div class="pt-28 pb-8 text-center relative">
		<div class="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-blue-500/5 to-transparent pointer-events-none"></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			<span class="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">Music</span>
		</h1>
		<p class="text-lg text-blue-200/70 relative">Explore my musical journey</p>
	</div>

	<!-- Latest Projects Section -->
	{#if !customDesignOverride}
		<section class="relative w-full overflow-hidden py-20 bg-[var(--neu-bg-dark)]">
			<!-- Background with fade transition -->
			{#key currentProjectIndex}
				<div
					class="absolute inset-0 bg-cover bg-center transition-all duration-1000"
					style="background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('{currentProject.backgroundImageUrl}');"
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

				<!-- Project Media -->
				<div
					use:observeElement={'latest-projects-content'}
					class="flex justify-center items-center w-full transition-all duration-1200 transform {
						visibleElements.has('latest-projects-content') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
					}"
					style="transition-delay: 200ms;"
				>
					<div
						class="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden relative cursor-pointer group neu-card"
						onclick={() => handleProjectClick(currentProject)}
						onkeydown={(e) => e.key === 'Enter' && handleProjectClick(currentProject)}
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
									<div class="bg-black/40 backdrop-blur-sm rounded-full p-6 group-hover:bg-black/60 group-hover:scale-110 transition-all duration-300">
										<svg width="40" height="40" viewBox="0 0 24 24" fill="white">
											<path d="M8 5v14l11-7z"/>
										</svg>
									</div>
								</div>
							</div>
						{/key}
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
	<div
		class="bg-[var(--neu-bg)]/95 backdrop-blur-sm border-b border-gray-800 sticky z-30 transition-[top] duration-300"
		style="top: {$navbarVisible ? '88px' : '0px'}"
	>
		<div class="container mx-auto px-4">
			<!-- Main view switcher row -->
			<div class="flex items-center justify-between py-4">
				<div class="flex gap-2">
					<button
						onclick={() => switchView('albums')}
						class="px-4 py-2 rounded-lg font-medium transition-all duration-300 {
							view === 'albums'
								? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
								: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
						}"
					>
						Albums & Singles
					</button>
					<button
						onclick={() => switchView('beats')}
						class="px-4 py-2 rounded-lg font-medium transition-all duration-300 {
							view === 'beats'
								? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
								: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
						}"
					>
						Beats for Licensing
					</button>
				</div>

				{#if view === 'albums'}
					<!-- Desktop filters -->
					<div class="hidden md:flex gap-2 flex-wrap">
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

			<!-- Mobile filters row -->
			{#if view === 'albums'}
				<div class="md:hidden border-t border-gray-800 py-3">
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
				</div>
			{/if}
		</div>
	</div>

	<!-- Content Section -->
	<section class="container mx-auto px-4 py-12">
		<div class="content-container" style="transition: opacity 0.3s ease-in-out;">
			{#if view === 'albums'}
				{#if loading}
					<div class="flex justify-center items-center py-20">
						<div class="text-center">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
							<p class="text-gray-400">Loading music releases...</p>
						</div>
					</div>
				{:else if error}
					<div class="text-center py-20">
						<div class="text-red-400 mb-4">
							<Icon icon="mdi:alert-circle" class="text-6xl mx-auto" />
						</div>
						<h3 class="text-xl font-semibold text-white mb-2">Failed to Load Albums</h3>
						<p class="text-gray-400 mb-4">{error}</p>
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
					<div bind:this={container} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
			{/if}
		</div>
	</section>

	<!-- Listen On Section -->
	{#if view === 'albums'}
		<section class="py-20 bg-[var(--neu-bg-dark)]">
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
	<section class="bg-[var(--neu-bg)] py-16">
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

<style>
	.music-section {
		/* Container styles */
	}

	.content-container {
		transition: opacity 0.3s ease-in-out;
	}

	/* Neumorphic card styles (fallback if not in global CSS) */
	.neu-card {
		background: var(--neu-bg, #2a2d35);
		border-radius: 16px;
		box-shadow:
			8px 8px 16px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-8px -8px 16px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-button-primary {
		border-radius: 50px;
		box-shadow:
			6px 6px 12px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-6px -6px 12px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}
</style>
