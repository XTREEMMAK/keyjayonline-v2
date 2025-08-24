<script>
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '@iconify/svelte';
	import { audioPlaylists } from '$lib/data/audioPlaylists.js';
	import { loadPlaylist, showPlayer, currentTrack, isPlaying } from '$lib/stores/musicPlayer.js';
	import { getCachedCoverArt } from '$lib/utils/coverArtExtractor.js';
	
	let currentView = $state('folders'); // 'folders' or 'tracks'
	let selectedGenre = $state(null);
	let isExpanded = $state(false);
	let transitionDirection = $state('forward'); // 'forward' or 'backward'
	let thumbnailErrors = $state(new Set()); // Track which thumbnails have failed to load
	
	// Get ordered genres (descending by name)
	const genres = $derived(
		Object.keys(audioPlaylists).sort((a, b) => b.localeCompare(a))
	);
	
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
		const playlist = audioPlaylists[genreKey];
		if (playlist && playlist.tracks.length > 0) {
			loadPlaylist(playlist.tracks, 0);
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
</script>

<div class="playlist-browser bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-gray-700">
		<div class="flex items-center gap-2">
			<Icon icon="mdi:folder-music" width={20} height={20} class="text-blue-400" />
			<span class="text-white font-medium">Music Library</span>
		</div>
		<button 
			onclick={toggleExpanded}
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
	
	{#if isExpanded}
		<div class="p-4" transition:slide={{ duration: 300 }}>
			{#key currentView}
				{#if currentView === 'folders'}
					<!-- Genre/Folder List -->
					<div 
						class="space-y-2" 
						in:fly={{ 
							x: transitionDirection === 'backward' ? -300 : 300, 
							duration: 400,
							easing: cubicOut
						}}
						out:fly={{ 
							x: transitionDirection === 'forward' ? -300 : 300, 
							duration: 300,
							easing: cubicOut
						}}
					>
					{#each genres as genreKey}
						{@const playlist = audioPlaylists[genreKey]}
						<div class="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group">
							<button 
								onclick={() => selectGenre(genreKey)}
								class="flex items-center gap-3 flex-1 text-left"
							>
								<Icon icon={playlist.icon} width={24} height={24} class="text-blue-400" />
								<div>
									<div class="text-white font-medium">{playlist.name}</div>
									<div class="text-gray-400 text-sm">{playlist.tracks.length} tracks</div>
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
						class="space-y-2"
						in:fly={{ 
							x: transitionDirection === 'forward' ? 300 : -300, 
							duration: 400,
							easing: cubicOut
						}}
						out:fly={{ 
							x: transitionDirection === 'backward' ? 300 : -300, 
							duration: 300,
							easing: cubicOut
						}}
					>
					<!-- Back button -->
					<button 
						onclick={backToFolders}
						class="flex items-center gap-2 p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white mb-4"
					>
						<Icon icon="mdi:arrow-left" width={20} height={20} />
						<span>Back to folders</span>
					</button>
					
					{#if selectedGenre}
						{@const playlist = audioPlaylists[selectedGenre]}
						<!-- Genre header -->
						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-3">
								<Icon icon={playlist.icon} width={32} height={32} class="text-blue-400" />
								<div>
									<h3 class="text-white font-semibold text-lg">{playlist.name}</h3>
									<p class="text-gray-400 text-sm">{playlist.tracks.length} tracks</p>
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
						<div class="max-h-64 overflow-y-auto space-y-1">
							{#each playlist.tracks as track, index}
								{@const cachedArtwork = getCachedCoverArt(track.audioUrl)}
								<button
									onclick={() => playTrack(playlist.tracks, index)}
									class="w-full text-left p-3 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center gap-3 {
										$currentTrack?.audioUrl === track.audioUrl ? 'bg-gray-700/70 text-blue-400' : 'text-gray-300'
									}"
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
						</div>
					{/if}
					</div>
				{/if}
			{/key}
		</div>
	{/if}
</div>

<style>
	.playlist-browser {
		min-width: 320px;
		max-width: 400px;
	}
</style>