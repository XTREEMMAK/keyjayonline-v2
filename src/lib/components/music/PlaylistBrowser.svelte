<script>
	import { onMount } from 'svelte';
	import { fly, slide, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';
	import { audioPlaylists } from '$lib/data/audioPlaylists.js';
	import { loadPlaylist, showPlayer, currentTrack, isPlaying } from '$lib/stores/musicPlayer.js';
	import { getCachedCoverArt } from '$lib/utils/coverArtExtractor.js';
	import { groupSamplesByLibrary, getLibraryMetadata } from '$lib/api/content/musicLibrary.js';

	let currentView = $state('folders'); // 'folders' or 'tracks'
	let selectedGenre = $state(null);
	let isExpanded = $state(false);
	let transitionDirection = $state('forward'); // 'forward' or 'backward'
	let thumbnailErrors = $state(new Set()); // Track which thumbnails have failed to load
	let libraries = $state({}); // Libraries fetched from API
	let loading = $state(true);
	let usingDirectus = $state(false);

	// Get ordered genres (descending by name)
	const genres = $derived(
		Object.keys(libraries).sort((a, b) => b.localeCompare(a))
	);

	// Get all tracks from all libraries
	const allTracks = $derived(
		genres.flatMap(genreKey => libraries[genreKey]?.tracks || [])
	);

	// Fetch libraries from API on mount
	onMount(async () => {
		try {
			const response = await fetch('/api/music-samples');
			if (response.ok) {
				const samples = await response.json();

				if (samples && samples.length > 0) {
					// Group samples by library
					libraries = groupSamplesByLibrary(samples);
					usingDirectus = true;
					console.log('Loaded music libraries from Directus');
				} else {
					throw new Error('No samples returned from API');
				}
			} else {
				throw new Error('API request failed');
			}
		} catch (error) {
			console.log('Failed to load from Directus, using static audioPlaylists:', error.message);

			// Fallback to static audioPlaylists
			libraries = Object.entries(audioPlaylists).reduce((acc, [key, playlist]) => {
				acc[key] = {
					...playlist,
					key
				};
				return acc;
			}, {});
			usingDirectus = false;
		} finally {
			loading = false;
		}
	});
	
	function selectGenre(genreKey) {
		transitionDirection = 'forward';
		selectedGenre = genreKey;
		currentView = 'tracks';
		// Clear thumbnail errors when switching genres for fresh attempts
		thumbnailErrors.clear();
	}
	
	function backToFolders() {
		transitionDirection = 'backward';
		currentView = 'folders';
		selectedGenre = null;
	}
	
	function playGenrePlaylist(genreKey) {
		const library = libraries[genreKey];
		if (library && library.tracks.length > 0) {
			loadPlaylist(library.tracks, 0);
			showPlayer();
		}
	}
	
	function playTrack(tracks, index) {
		loadPlaylist(tracks, index);
		showPlayer();
	}
	
	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function playAllTracks() {
		if (allTracks.length > 0) {
			loadPlaylist(allTracks, 0);
			showPlayer();
		}
	}
</script>

<div class="playlist-browser bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg">
	<!-- Header -->
	<div class="flex items-center justify-between p-5 border-b border-gray-700 gap-3">
		<!-- Clickable title section -->
		<button
			onclick={toggleExpanded}
			class="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
			title={isExpanded ? 'Collapse' : 'Expand'}
		>
			<Icon icon="mdi:folder-music" width={20} height={20} class="text-blue-400" />
			<span class="text-white font-medium">Music Library</span>
			{#if !loading && allTracks.length > 0}
				<span class="text-gray-400 text-sm">({allTracks.length} tracks)</span>
			{/if}
		</button>

		<!-- Action buttons -->
		<div class="flex items-center gap-2">
			{#if !loading && allTracks.length > 0}
				<button
					onclick={playAllTracks}
					class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-1.5"
					title="Play all tracks"
				>
					<Icon icon="mdi:play" width={16} height={16} />
					<span>Play All</span>
				</button>
			{/if}
			<button
				onclick={(e) => {
					e.stopPropagation();
					toggleExpanded();
				}}
				class="p-1 hover:bg-gray-700 rounded transition-colors"
				title={isExpanded ? 'Collapse' : 'Expand'}
			>
				<Icon
					icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
					width={20}
					height={20}
					class="text-gray-400"
				/>
			</button>
		</div>
	</div>
	
	{#if isExpanded}
		<div class="p-5" transition:slide={{ duration: 300 }}>
			{#if loading}
				<!-- Loading state -->
				<div
					class="flex items-center justify-center py-8"
					in:fade={{ duration: 200 }}
				>
					<div class="text-gray-400 loading-text">Loading music library...</div>
				</div>
			{:else}
				{#key currentView}
					{#if currentView === 'folders'}
						<!-- Genre/Folder List -->
						<div
							class="space-y-3"
							in:fly={{
								x: transitionDirection === 'backward' ? -200 : 200,
								duration: 400,
								opacity: 0,
								easing: cubicOut
							}}
							out:fly={{
								x: transitionDirection === 'forward' ? -200 : 200,
								duration: 300,
								opacity: 0,
								easing: cubicOut
							}}
						>
							{#each genres as genreKey, index}
								{@const library = libraries[genreKey]}
								<div
									class="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
									in:fly={{ y: 20, duration: 300, delay: 150 + (index * 60), easing: cubicOut }}
								>
								<button
									onclick={() => selectGenre(genreKey)}
									class="flex items-center gap-3 flex-1 text-left"
								>
									<Icon icon={library.icon} width={24} height={24} class="text-blue-400" />
									<div>
										<div class="text-white font-medium">{library.name}</div>
										<div class="text-gray-400 text-sm">{library.tracks.length} tracks</div>
									</div>
								</button>
								<button
									onclick={() => playGenrePlaylist(genreKey)}
									class="p-2 bg-blue-600 hover:bg-blue-700 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
									title="Play all"
								>
									<Icon icon="mdi:play" width={16} height={16} class="text-white" />
								</button>
								</div>
							{/each}
						</div>
			
				{:else if currentView === 'tracks' && selectedGenre}
					<!-- Track List -->
					<div
						class="space-y-3"
						in:fly={{
							x: transitionDirection === 'forward' ? 200 : -200,
							duration: 400,
							opacity: 0,
							easing: cubicOut
						}}
						out:fly={{
							x: transitionDirection === 'backward' ? 200 : -200,
							duration: 300,
							opacity: 0,
							easing: cubicOut
						}}
					>
					<!-- Back button -->
					<button
						onclick={backToFolders}
						class="flex items-center gap-2 p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white mb-4"
						in:fly={{ x: -40, duration: 300, delay: 100, easing: cubicOut }}
					>
						<Icon icon="mdi:arrow-left" width={20} height={20} />
						<span>Back to folders</span>
					</button>

					{#if selectedGenre}
						{@const library = libraries[selectedGenre]}
						<!-- Genre header -->
						<div
							class="flex items-center justify-between mb-5"
							in:fade={{ duration: 300, delay: 100 }}
						>
							<div class="flex items-center gap-3">
								<Icon icon={library.icon} width={32} height={32} class="text-blue-400" />
								<div>
									<h3 class="text-white font-semibold text-lg">{library.name}</h3>
									<p class="text-gray-400 text-sm">{library.tracks.length} tracks</p>
								</div>
							</div>
							<button
								onclick={() => playGenrePlaylist(selectedGenre)}
								class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
							>
								Play All
							</button>
						</div>

						<!-- Track list -->
						<div class="max-h-80 overflow-y-auto space-y-2">
							{#key selectedGenre}
								{#each library.tracks as track, index}
									{@const cachedArtwork = getCachedCoverArt(track.audioUrl)}
									<button
										onclick={() => playTrack(library.tracks, index)}
										class="w-full text-left p-3.5 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center gap-3 {
											$currentTrack?.audioUrl === track.audioUrl ? 'bg-gray-700/70 text-blue-400' : 'text-gray-300'
										}"
										in:fly={{ x: 30, duration: 300, delay: 150 + (index * 50), easing: cubicOut }}
									>
									<div class="w-8 h-8 bg-gray-700 rounded flex-shrink-0 overflow-hidden relative">
										{#if cachedArtwork}
											<!-- Cached extracted artwork -->
											<img 
												src={cachedArtwork} 
												alt="Album cover for {track.title}"
												class="w-full h-full object-cover"
											/>
										{:else if track.thumbnail && track.thumbnail !== null && !thumbnailErrors.has(track.audioUrl)}
											<!-- Fallback to existing thumbnail -->
											<img 
												src={track.thumbnail} 
												alt="Album cover for {track.title}"
												class="w-full h-full object-cover"
												onerror={() => {
													thumbnailErrors.add(track.audioUrl);
													thumbnailErrors = thumbnailErrors; // Trigger reactivity
												}}
											/>
										{:else}
											<!-- Default icon for tracks with no artwork -->
											<div class="w-full h-full flex items-center justify-center bg-gray-600">
												<Icon icon="mdi:music-note" width={16} height={16} class="text-gray-300" />
											</div>
										{/if}
										
										<!-- Playing indicator overlay -->
										{#if $currentTrack?.audioUrl === track.audioUrl && $isPlaying}
											<div class="absolute inset-0 bg-black/60 flex items-center justify-center">
												<Icon icon="mdi:equalizer" width={14} height={14} class="text-blue-400" />
											</div>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<div class="truncate font-medium">{track.title}</div>
										<div class="truncate text-sm text-gray-500">{track.artist}</div>
									</div>
									<div class="text-xs text-gray-500 uppercase">{track.genre}</div>
								</button>
							{/each}
						{/key}
						</div>
					{/if}
					</div>
				{/if}
			{/key}
			{/if}
		</div>
	{/if}
</div>

<style>
	.playlist-browser {
		min-width: 360px;
		max-width: 480px;
		width: 100%;
	}

	/* Loading text pulse animation */
	.loading-text {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Smooth hover transitions for buttons */
	.playlist-browser button {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Play button hover scale effect */
	.playlist-browser button:hover {
		transform: translateY(-1px);
	}

	.playlist-browser button:active {
		transform: translateY(0);
	}

	/* Genre/Track item hover effect */
	.playlist-browser .group:hover {
		transform: translateX(4px);
		transition: transform 0.2s ease-out;
	}

	/* Play button icon hover animation */
	.playlist-browser button:hover :global(svg) {
		animation: play-pulse 0.6s ease-in-out;
	}

	@keyframes play-pulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	/* Mobile optimizations */
	@media (max-width: 640px) {
		.playlist-browser {
			min-width: 100%;
			max-width: 100%;
			max-height: calc(100vh - 100px);
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}

		/* Make content area scrollable on mobile */
		.playlist-browser > div:last-child {
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
			overscroll-behavior: contain;
		}

		/* Reduce track list height on mobile to fit viewport */
		.playlist-browser :global(.max-h-80) {
			max-height: 40vh !important;
		}
	}
</style>