<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { togglePlayer, showPlayer, loadPlaylist, loadRandomTrack } from '$lib/stores/musicPlayer.js';
	import { getAllTracks, audioPlaylists } from '$lib/data/audioPlaylists.js';
	import AlbumCard from '$lib/components/music/AlbumCard.svelte';
	import AlbumModalSwal from '$lib/components/music/AlbumModalSwal.svelte';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import SpinningPlayButton from '$lib/components/music/SpinningPlayButton.svelte';
	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';
	
	let { data } = $props();
	
	let container = $state();
	let mixer = $state(null);
	let selectedAlbum = $state(null);
	let albumModal = $state(null);
	let activeFilter = $state('all');
	let view = $state('albums');
	let heroRef = $state();
	let scrollY = $state(0);
	let titleVisible = $state(true);
	let titleAnimated = $state(false);
	let albums = $state(data.albums || mockAlbums);
	let musicNetworks = $state(data.musicNetworks || []);
	let loading = $state(false);
	let error = $state(data.error || null);
	
	// Latest Projects data and configuration
	let customDesignOverride = $state(data.customDesignOverride || false);
	let currentProjectIndex = $state(0);
	let isTransitioning = $state(false);
	let visibleElements = $state(new Set());
	
	// Mock data for latest projects
	const latestProjects = [
		{
			id: 1,
			title: '"Ephemeral Echoes" - New Album',
			description: 'My latest album exploring the intersection of organic and digital soundscapes. A deep dive into experimental production techniques and collaborative artistry.<br><br>Features 12 original tracks spanning electronic, ambient, and experimental genres with guest appearances from emerging Miami artists.',
			backgroundImageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
			mediaUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
			mediaType: 'image',
			tags: ['Electronic', 'Ambient', 'Experimental'],
			link: '/music#albums'
		},
		{
			id: 2,
			title: 'Miami Music Festival 2024 - Live Performance',
			description: 'An electrifying live performance showcasing new material and fan favorites at Miami Music Festival 2024.<br><br>This 90-minute set featured special guest appearances and improvised segments that created an unforgettable musical experience for over 5,000 attendees.',
			backgroundImageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
			mediaUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
			mediaType: 'image',
			tags: ['Live Performance', 'Festival', 'Improvisation'],
			link: '/productions'
		},
		{
			id: 3,
			title: 'Nexus Sessions - Collaborative EP',
			description: 'A groundbreaking collaborative project with emerging artists from the Miami music scene.<br><br>Each of the 6 tracks represents a different fusion of styles and creative perspectives, blending jazz fusion, hip hop, and R&B elements into a cohesive artistic statement.',
			backgroundImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200',
			mediaUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
			mediaType: 'image',
			tags: ['Jazz Fusion', 'Hip Hop', 'R&B'],
			link: '/music#albums'
		}
	];
	
	const currentProject = $derived(latestProjects[currentProjectIndex]);
	
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
	
	// Retry loading albums by refreshing the page (server-side data)
	function retryLoadAlbums() {
		if (browser) {
			window.location.reload();
		}
	}
	
	// Mock data - fallback if database fails
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
			tracks: [
				{
					id: 1,
					title: 'Digital Dreams',
					duration: '4:23',
					audio_file_url: 'https://www.soundjay.com/misc/sounds/click_02.mp3',
					access_type: 'free'
				},
				{
					id: 2,
					title: 'Neon Nights',
					duration: '3:45',
					audio_file_url: 'https://www.soundjay.com/misc/sounds/click_02.mp3',
					access_type: 'paid'
				},
				{
					id: 3,
					title: 'Cybernetic Flow',
					duration: '5:12',
					audio_file_url: 'https://www.soundjay.com/misc/sounds/click_02.mp3',
					access_type: 'paid'
				}
			],
			rich_content: '<p>This album explores the intersection of digital and organic sounds.</p>',
			youtube_videos: [
				{ id: 'dQw4w9WgXcQ', title: 'Behind the Scenes' }
			]
		},
		{
			id: 2,
			title: 'Urban Landscapes',
			artist: 'Key Jay',
			cover_art: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
			release_date: '2024-01-20',
			access_type: 'free',
			track_count: 8,
			genre: 'ambient',
			tracks: [
				{
					id: 4,
					title: 'City Pulse',
					duration: '6:30',
					audio_file_url: 'https://www.soundjay.com/misc/sounds/click_02.mp3',
					access_type: 'free'
				},
				{
					id: 5,
					title: 'Metro Rhythms',
					duration: '4:45',
					audio_file_url: 'https://www.soundjay.com/misc/sounds/click_02.mp3',
					access_type: 'free'
				}
			]
		},
		{
			id: 3,
			title: 'Midnight Sessions',
			artist: 'Key Jay',
			cover_art: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
			release_date: '2023-11-10',
			access_type: 'subscriber',
			track_count: 15,
			genre: 'electronic',
			tracks: [
				{
					id: 6,
					title: 'Late Night Vibes',
					duration: '5:18',
					audio_file_url: 'https://www.soundjay.com/misc/sounds/click_02.mp3',
					access_type: 'subscriber'
				}
			]
		}
	];
	
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
	
	onMount(async () => {
		// Server-side data should already be loaded via +page.server.js
		// No need to load albums client-side
		
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
		
		// Parallax scroll effect and title visibility
		if (browser) {
			let ticking = false;
			
			function updateParallax() {
				scrollY = window.scrollY;
				
				// Check if hero is mostly out of view
				if (heroRef) {
					const heroHeight = heroRef.offsetHeight;
					const heroRect = heroRef.getBoundingClientRect();
					
					// Hide title when 70% of hero is out of view
					if (heroRect.top < -(heroHeight * 0.7)) {
						// Animate out first, then hide
						if (titleVisible && titleAnimated) {
							titleAnimated = false;
							setTimeout(() => {
								titleVisible = false;
							}, 300); // Wait for animation to complete
						}
					} else {
						if (!titleVisible) {
							titleVisible = true;
							// Small delay before triggering animation
							setTimeout(() => {
								titleAnimated = true;
							}, 100);
						} else if (!titleAnimated) {
							titleAnimated = true;
						}
					}
				}
				
				ticking = false;
			}
			
			function handleScroll() {
				if (!ticking) {
					requestAnimationFrame(updateParallax);
					ticking = true;
				}
			}
			
			// Initial animation trigger
			setTimeout(() => {
				titleAnimated = true;
			}, 500);
			
			window.addEventListener('scroll', handleScroll);
			
			return () => {
				if (mixer) {
					mixer.destroy();
				}
				window.removeEventListener('scroll', handleScroll);
			};
		}
		
		return () => {
			if (mixer) {
				mixer.destroy();
			}
		};
	});
	
	async function openAlbumModal(album) {
		selectedAlbum = album;
		// Small delay to ensure component is properly mounted
		await new Promise(resolve => setTimeout(resolve, 10));
		if (albumModal) {
			await albumModal.showModal();
		}
	}
	
	function setFilter(filter) {
		activeFilter = filter;
		// For now, we'll filter on the client side since MixItUp might not be configured yet
		// You can update this to work with MixItUp or implement your own filtering logic
		if (filter === 'all') {
			// Show all albums
			if (mixer) {
				mixer.filter('all');
			}
		} else {
			// Filter by release_type
			if (mixer) {
				mixer.filter(`.${filter.toLowerCase().replace(/\s+/g, '-')}`);
			}
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
					
					// Wait for DOM to update before reinitializing MixItUp
					await new Promise(resolve => setTimeout(resolve, 100));
					
					// Reinitialize MixItUp if switching to albums
					if (newView === 'albums' && container) {
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
					
					setTimeout(() => {
						contentEl.style.opacity = '1';
					}, 50);
				}, 150);
			} else {
				view = newView;
				if (mixer) {
					mixer.destroy();
					mixer = null;
				}
				
				// Still need to reinitialize MixItUp for albums view
				if (newView === 'albums' && container) {
					await new Promise(resolve => setTimeout(resolve, 100));
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
			}
		} else {
			view = newView;
		}
	}
	
	// Handle play button click - start music player with random track
	function handlePlayButtonClick() {
		console.log('Play button clicked - loading random track');
		
		// Load a random track from all available tracks
		loadRandomTrack();
		showPlayer();
	}
	
	// Project rotator functions
	function prevProject() {
		if (isTransitioning) return;
		const newIndex = (currentProjectIndex - 1 + latestProjects.length) % latestProjects.length;
		isTransitioning = true;
		currentProjectIndex = newIndex;
		setTimeout(() => {
			isTransitioning = false;
		}, 600);
	}

	function nextProject() {
		if (isTransitioning) return;
		const newIndex = (currentProjectIndex + 1) % latestProjects.length;
		isTransitioning = true;
		currentProjectIndex = newIndex;
		setTimeout(() => {
			isTransitioning = false;
		}, 600);
	}

	function goToProject(index) {
		if (isTransitioning || index === currentProjectIndex) return;
		isTransitioning = true;
		currentProjectIndex = index;
		setTimeout(() => {
			isTransitioning = false;
		}, 600);
	}

	// Intersection Observer function
	function observeElement(node, key) {
		if (!browser) return;
		return createIntersectionObserver(node, (isVisible) => {
			if (isVisible && !visibleElements.has(key)) {
				visibleElements = new Set([...visibleElements, key]);
			}
		}, { threshold: 0.2, rootMargin: '-100px' });
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden section-triangle z-20">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="/img/J_Header_5k.webp" 
				alt="Key Jay"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<!-- Spinning Play Button - Responsive positioning for mobile -->
		<div class="absolute z-20 
			left-[calc(100vw-80px)] top-[min(15vh,calc(70vh-120px))]
			min-[384px]:left-[61vw] min-[384px]:-top-8
			min-[520px]:left-[73vw] min-[520px]:-top-8
			sm:left-[83vw] sm:top-[min(48vh,calc(70vh-120px))]
			lg:left-[83vw] lg:top-[min(48vh,calc(70vh-120px))]
		">
			{#if titleVisible}
				<div in:fly={{ x: 200, duration: 800, delay: 300 }}>
					<div class="scale-75 sm:scale-100 xl:scale-150 2xl:scale-[230%] transition-transform">
						<SpinningPlayButton onClick={handlePlayButtonClick} />
					</div>
				</div>
			{/if}
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="music-title hero-title-responsive font-bold text-white" class:animate={titleAnimated}>
						MUSIC
					</h1>
					<p class="music-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Explore my musical journey through albums, singles, and beats available for licensing
					</p>
				</div>
			{/if}
		</div>
	</section>
	
	<!-- Latest Projects Section -->
	<!-- Custom Design Override Toggle - Full Viewport Section -->
		{#if customDesignOverride}
			<section class="relative w-full overflow-hidden min-h-screen" style="margin-top: -120px; z-index: 5;">
				<!-- Full viewport custom section placeholder - can be populated from DirectUS -->
				<div class="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-gray-900 to-purple-900/20"></div>
				<div class="relative z-10 min-h-screen flex items-center justify-center">
					<div class="text-center">
						<h2 class="text-6xl font-bold text-white mb-4">Custom Featured Section</h2>
						<p class="text-gray-400 text-xl">This section can be customized from DirectUS CMS</p>
					</div>
				</div>
			</section>
		{:else}
			<!-- Default Featured Work Style Layout -->
			<section 
				class="relative w-full overflow-hidden min-h-screen"
				style="margin-top: -120px; z-index: 5;">
				
				<!-- Background with fade transition -->
				{#key currentProjectIndex}
					<div 
						class="absolute inset-0 bg-cover bg-center transition-all duration-1000"
						style="background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('{currentProject.backgroundImageUrl}');"
						transition:fade={{ duration: 800 }}>
					</div>
				{/key}
				
				<div class="relative z-10 min-h-screen flex flex-col">
					<!-- Section Heading -->
					<div 
						use:observeElement={'latest-projects-heading'}
						class="flex-shrink-0 text-center pt-32 sm:pt-24 lg:pt-32 xl:pt-[188px] pb-8 px-4 sm:px-8 transition-all duration-1000 transform {
							visibleElements.has('latest-projects-heading') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
						}"
					>
						<h2 class="font-light text-white uppercase tracking-widest text-3xl sm:text-4xl md:text-5xl lg:text-6xl" style="line-height: 1;">Latest Projects</h2>
					</div>
					
					<!-- Content Container -->
					<div class="flex-1 flex items-center justify-center px-4 sm:px-8 pb-20">
						<div class="container mx-auto max-w-4xl">
							<!-- Single Centered Column - Project Media -->
							<div 
								use:observeElement={'latest-projects-content'}
								class="flex justify-center items-center w-full transition-all duration-1200 transform {
									visibleElements.has('latest-projects-content') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
								}"
								style="transition-delay: 200ms;"
							>
								<div class="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden relative cursor-pointer group">
									{#key currentProjectIndex}
										<div class="w-full h-full absolute inset-0" 
											 in:fly={{ y: 50, duration: 600, delay: 200 }}
											 out:fly={{ y: -50, duration: 300 }}>
											<img 
												src={currentProject.mediaUrl}
												alt={currentProject.title}
												class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 rounded-2xl shadow-2xl">
											
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
						</div>
					</div>
				</div>
				
				<!-- Dot Navigation for multiple projects -->
				<div 
					use:observeElement={'latest-projects-dots'}
					class="absolute bottom-8 sm:bottom-12 lg:bottom-16 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3 transition-all duration-1000 {
						visibleElements.has('latest-projects-dots') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
					}"
					style="transition-delay: 400ms;"
				>
					{#each latestProjects as project, index}
						<button
							class="w-4 h-4 rounded-full transition-all duration-300 border-2 {index === currentProjectIndex ? 'bg-white border-white scale-125 shadow-lg shadow-white/30' : 'bg-white/30 border-white/50 hover:bg-blue-400/80 hover:border-blue-400 hover:scale-110'} {isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}"
							onclick={() => goToProject(index)}
							disabled={isTransitioning}
							aria-label="Go to project {index + 1}"
						></button>
					{/each}
				</div>
			</section>
		{/if}
	
	<!-- View Switcher -->
	<div class="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
		<div class="container mx-auto px-4">
			<!-- Main view switcher row -->
			<div class="flex items-center justify-between py-4">
				<div class="flex gap-2">
					<button 
						onclick={() => switchView('albums')}
						class="px-4 py-2 rounded-lg font-medium transition-all duration-300 {
							view === 'albums' 
								? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
								: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/20'
						}"
					>
						Albums & Singles
					</button>
					<button 
						onclick={() => switchView('beats')}
						class="px-4 py-2 rounded-lg font-medium transition-all duration-300 {
							view === 'beats' 
								? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
								: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/20'
						}"
					>
						Beats for Licensing
					</button>
				</div>
				
				{#if view === 'albums'}
					<!-- Desktop filters - hidden on mobile -->
					<div class="hidden md:flex gap-2 flex-wrap">
						<button 
							onclick={() => setFilter('all')}
							class="px-3 py-1 text-sm rounded-full transition-all duration-300 {
								activeFilter === 'all'
									? 'bg-blue-600/20 text-blue-400 border border-blue-600 shadow-lg shadow-blue-500/20'
									: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md hover:shadow-gray-500/15'
							}"
						>
							All
						</button>
						{#each releaseTypes() as releaseType}
							<button 
								onclick={() => setFilter(releaseType)}
								class="px-3 py-1 text-sm rounded-full transition-all duration-300 capitalize {
									activeFilter === releaseType
										? 'bg-blue-600/20 text-blue-400 border border-blue-600 shadow-lg shadow-blue-500/20'
										: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md hover:shadow-gray-500/15'
								}"
							>
								{releaseType.charAt(0).toUpperCase() + releaseType.slice(1).replace(/_/g, ' ')}
							</button>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Mobile filters row - separate bar -->
			{#if view === 'albums'}
				<div class="md:hidden border-t border-gray-800 py-3">
					<div class="flex gap-2 flex-wrap justify-center">
						<button 
							onclick={() => setFilter('all')}
							class="px-3 py-1 text-sm rounded-full transition-all duration-300 {
								activeFilter === 'all'
									? 'bg-blue-600/20 text-blue-400 border border-blue-600 shadow-lg shadow-blue-500/20'
									: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md hover:shadow-gray-500/15'
							}"
						>
							All
						</button>
						{#each releaseTypes() as releaseType}
							<button 
								onclick={() => setFilter(releaseType)}
								class="px-3 py-1 text-sm rounded-full transition-all duration-300 capitalize {
									activeFilter === releaseType
										? 'bg-blue-600/20 text-blue-400 border border-blue-600 shadow-lg shadow-blue-500/20'
										: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md hover:shadow-gray-500/15'
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
	<section class="container mx-auto px-4 py-12" style="margin-top: -60px; padding-top: 80px;">
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
						<iconify-icon icon="mdi:alert-circle" class="text-6xl"></iconify-icon>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">Failed to Load Albums</h3>
					<p class="text-gray-400 mb-4">{error}</p>
					<button 
						onclick={retryLoadAlbums}
						class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
					>
						Try Again
					</button>
				</div>
			{:else if albums.length === 0}
				<div class="text-center py-20">
					<div class="text-gray-400 mb-4">
						<iconify-icon icon="mdi:music-note-off" class="text-6xl"></iconify-icon>
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
						class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
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
							<button class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105">
								License This Beat
							</button>
							<button class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105">
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
		<SvgDivider type="wave" className="text-gray-900 z-20" />
		<section class="py-20" style="background-color: oklch(0.21 0.03 263.45);">
			<div class="container mx-auto px-4 text-center">
				<h2 class="text-3point5xl font-bold text-white mb-12">Listen On</h2>
				{#if musicNetworks && musicNetworks.length > 0}
					<div class="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
						{#each musicNetworks as network}
							<a 
								href={network.url}
								target="_blank"
								class="group transition-all duration-300 hover:scale-110 opacity-70 hover:opacity-100"
								aria-label="Listen on {network.name}"
							>
								<iconify-icon icon={network.icon} class="text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl"></iconify-icon>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-gray-400">Music streaming platforms coming soon!</p>
				{/if}
			</div>
		</section>
	{/if}
	
	<!-- Behind the Scenes Section -->
	{#if view === 'albums'}
		<SvgDivider type="wave" flipY={true} className="text-gray-900 z-20" />
		<section class="bg-gradient-to-br from-blue-900/20 via-gray-900 to-purple-900/20 py-20 z-0" style="margin-top: -80px; padding-top: 180px;">
			<div class="container mx-auto px-4">
				<div class="text-center mb-12">
					<h2 class="text-3point5xl font-bold text-white mb-4">Behind the Scenes</h2>
					<p class="text-gray-400 max-w-2xl mx-auto">
						Get an inside look at the creative process, studio sessions, and stories behind the music
					</p>
				</div>
		
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 flex flex-col min-h-[500px]">
						<div class="aspect-video bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative">
							<img 
								src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500" 
								alt="Studio Session"
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute bottom-4 left-4">
								<span class="bg-blue-600/20 text-blue-400 px-2 py-1 text-xs rounded-full border border-blue-600/30">Behind the Scenes</span>
							</div>
						</div>
						<div class="p-8 flex-1 flex flex-col justify-between">
							<h3 class="text-xl font-semibold text-white mb-3 line-clamp-2">
								Creating "Ephemeral Echoes": A Studio Journey
							</h3>
							<p class="text-gray-400 text-sm mb-4 line-clamp-3">
								Dive into the creative process behind my latest album. From initial concepts to final mastering, discover the techniques and inspiration that shaped each track.
							</p>
							<div class="flex items-center justify-between">
								<span class="text-gray-500 text-xs">March 10, 2024</span>
								<a href="/blog/creating-ephemeral-echoes" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
									Read More →
								</a>
							</div>
						</div>
					</article>
					
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 flex flex-col min-h-[500px]">
						<div class="aspect-video bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative">
							<img 
								src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500" 
								alt="Equipment Setup"
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute bottom-4 left-4">
								<span class="bg-purple-600/20 text-purple-400 px-2 py-1 text-xs rounded-full border border-purple-600/30">Gear & Tech</span>
							</div>
						</div>
						<div class="p-8 flex-1 flex flex-col justify-between">
							<h3 class="text-xl font-semibold text-white mb-3 line-clamp-2">
								My Home Studio Setup: Gear That Shapes the Sound
							</h3>
							<p class="text-gray-400 text-sm mb-4 line-clamp-3">
								Take a tour through my home studio and discover the equipment, software, and techniques I use to bring musical ideas to life.
							</p>
							<div class="flex items-center justify-between">
								<span class="text-gray-500 text-xs">February 28, 2024</span>
								<a href="/blog/home-studio-setup" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
									Read More →
								</a>
							</div>
						</div>
					</article>
					
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 flex flex-col min-h-[500px]">
						<div class="aspect-video bg-gradient-to-br from-green-600/20 to-blue-600/20 relative">
							<img 
								src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" 
								alt="Collaboration"
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute bottom-4 left-4">
								<span class="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded-full border border-green-600/30">Collaboration</span>
							</div>
						</div>
						<div class="p-8 flex-1 flex flex-col justify-between">
							<h3 class="text-xl font-semibold text-white mb-3 line-clamp-2">
								Collaborating Across Distances: Remote Music Production
							</h3>
							<p class="text-gray-400 text-sm mb-4 line-clamp-3">
								Learn about my approach to remote collaboration and how technology enables creative partnerships with artists around the world.
							</p>
							<div class="flex items-center justify-between">
								<span class="text-gray-500 text-xs">February 15, 2024</span>
								<a href="/blog/remote-collaboration" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
									Read More →
								</a>
							</div>
						</div>
					</article>
				</div>
				
				<div class="text-center mt-12">
					<a 
						href="/blog?tag=music" 
						class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-full transition-all duration-300 hover:scale-105"
					>
						View All Music Posts
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
						</svg>
					</a>
				</div>
			</div>
		</section>
	{/if}
	
	<!-- Contact Section -->
	<section id="contact" class="bg-gray-900 py-16 section-curve-top z-30" style="margin-top: -80px; isolation: isolate;">
		<div class="container mx-auto px-4">
			<div class="max-w-2xl mx-auto text-center">
				<h2 class="text-3point5xl font-bold text-white mb-4">Need Custom Music?</h2>
				<p class="text-gray-400 mb-8">
					Let's create something unique for your project. From commercial licenses to custom compositions.
				</p>
				<button class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transform">
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
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 3rem; /* Ensure minimum height for 2 lines */
		line-clamp: 2;
	}
	
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 4.5rem; /* Ensure minimum height for 3 lines */
		line-clamp: 3;
	}
	
	.content-container {
		transition: opacity 0.3s ease-in-out;
	}
	
	.music-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.music-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.music-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.music-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}
	
	/* Divider mask styles */
	.section-wave-top {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Wave shape using polygon points */
		clip-path: polygon(
			0 60px,
			10% 40px, 20% 50px, 30% 30px, 40% 50px, 50% 20px,
			60% 50px, 70% 30px, 80% 50px, 90% 40px, 100% 60px,
			100% 100%, 0 100%
		);
	}
	
	.section-wave-bottom {
		position: relative;
		/* Wave shape at bottom - flipped version of top wave */
		clip-path: polygon(
			0 0, 100% 0,
			100% calc(100% - 60px),
			90% calc(100% - 40px), 80% calc(100% - 50px), 70% calc(100% - 30px), 
			60% calc(100% - 50px), 50% calc(100% - 20px), 40% calc(100% - 50px), 
			30% calc(100% - 30px), 20% calc(100% - 50px), 10% calc(100% - 40px), 
			0 calc(100% - 60px)
		);
	}
	
	.section-curve-top {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Smooth curve using multiple polygon points */
		clip-path: polygon(
			0 80px,
			5% 72px, 10% 65px, 15% 58px, 20% 52px, 25% 46px,
			30% 40px, 35% 35px, 40% 31px, 45% 28px, 50% 26px,
			55% 28px, 60% 31px, 65% 35px, 70% 40px, 75% 46px,
			80% 52px, 85% 58px, 90% 65px, 95% 72px, 100% 80px,
			100% 100%, 0 100%
		);
	}
	
	.section-slant-top {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		clip-path: polygon(0 0, 100% 80px, 100% 100%, 0 100%);
	}
	
	.section-curve-bottom {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Smooth curve at the bottom using multiple polygon points */
		clip-path: polygon(
			0 0, 100% 0,
			100% calc(100% - 80px),
			95% calc(100% - 72px), 90% calc(100% - 65px), 85% calc(100% - 58px), 
			80% calc(100% - 52px), 75% calc(100% - 46px), 70% calc(100% - 40px), 
			65% calc(100% - 35px), 60% calc(100% - 31px), 55% calc(100% - 28px), 
			50% calc(100% - 26px),
			45% calc(100% - 28px), 40% calc(100% - 31px), 35% calc(100% - 35px), 
			30% calc(100% - 40px), 25% calc(100% - 46px), 20% calc(100% - 52px), 
			15% calc(100% - 58px), 10% calc(100% - 65px), 5% calc(100% - 72px), 
			0 calc(100% - 80px)
		);
	}
	
	.section-triangle {
		position: relative;
		/* Triangle pointing down from bottom center */
		clip-path: polygon(
			0 0, 100% 0, 100% calc(100% - 60px),
			50% 100%, 0 calc(100% - 60px)
		);
	}
	
	/* Wave top and curve bottom combined */
	.section-wave-top.section-curve-bottom {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Wave at top, curve at bottom */
		clip-path: polygon(
			0 60px,
			10% 40px, 20% 50px, 30% 30px, 40% 50px, 50% 20px,
			60% 50px, 70% 30px, 80% 50px, 90% 40px, 100% 60px,
			100% calc(100% - 80px),
			95% calc(100% - 72px), 90% calc(100% - 65px), 85% calc(100% - 58px), 
			80% calc(100% - 52px), 75% calc(100% - 46px), 70% calc(100% - 40px), 
			65% calc(100% - 35px), 60% calc(100% - 31px), 55% calc(100% - 28px), 
			50% calc(100% - 26px),
			45% calc(100% - 28px), 40% calc(100% - 31px), 35% calc(100% - 35px), 
			30% calc(100% - 40px), 25% calc(100% - 46px), 20% calc(100% - 52px), 
			15% calc(100% - 58px), 10% calc(100% - 65px), 5% calc(100% - 72px), 
			0 calc(100% - 80px)
		);
	}
	
	.spinning-play-container {
		opacity: 0;
		transform: translateX(-50px) scale(0.8);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.spinning-play-container.animate {
		opacity: 1;
		transform: translateX(0) scale(1);
	}
</style>