<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import WaveSurfer from 'wavesurfer.js';
	import Icon from '@iconify/svelte';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { getPersistentPlayerConfig } from '$lib/utils/wavesurfer-helpers.js';
	import { activeSection } from '$lib/stores/navigation.js';
	import {
		playerVisible,
		playerMinimized,
		isPlaying,
		currentTrack,
		currentTrackArtwork,
		artworkLoading,
		playlist,
		currentTrackIndex,
		playerPosition,
		playerDuration,
		volume,
		wavesurferInstance,
		hidePlayer,
		closePlayerCompletely,
		nextTrack,
		previousTrack,
		playlistSource
	} from '$lib/stores/musicPlayer.js';
	import { extractCoverArt } from '$lib/utils/coverArtExtractor.js';
	import { formatTime } from '$lib/utils/time.js';
	import PlaylistBrowser from '$lib/components/music/PlaylistBrowser.svelte';
	
	let container = $state();
	let visualContainer = $state();
	let wavesurfer = $state(null);
	let visualWavesurfer = $state(null);
	// $playerMinimized now managed by store (playerMinimized)
	let showPlaylist = $state(false);
	let showBrowser = $state(false);
	let currentTime = $state('0:00');
	let duration = $state('0:00');
	let isLoading = $state(false);
	let wavesurferReady = $state(false);
	let visualWavesurferReady = $state(false);
	let thumbnailError = $state(false);
	let isLoadingTrack = false; // Guard: ignore spurious 'finish' events during wavesurfer.load()

	// Initialize wavesurfer when container becomes available
	$effect(() => {
		console.log('PersistentMusicPlayer effect, container:', !!container);
		if (!container || wavesurfer) {
			// Don't initialize if already initialized or container not ready
			return;
		}
		
		try {
			console.log('Creating wavesurfer instance with container:', container);
			wavesurfer = WaveSurfer.create({
				container,
				...getPersistentPlayerConfig()
			});
			
			console.log('Wavesurfer instance created:', !!wavesurfer);
			wavesurferReady = true;
			
			// Store the instance for other components to access
			wavesurferInstance.set(wavesurfer);

			// Setup Media Session API for car/Bluetooth controls
			if ('mediaSession' in navigator) {
				navigator.mediaSession.setActionHandler('play', () => {
					wavesurfer.play();
				});

				navigator.mediaSession.setActionHandler('pause', () => {
					wavesurfer.pause();
				});

				navigator.mediaSession.setActionHandler('seekbackward', () => {
					const currentTime = wavesurfer.getCurrentTime();
					const duration = wavesurfer.getDuration();
					if (duration > 0) {
						wavesurfer.seekTo(Math.max(0, currentTime - 10) / duration);
					}
				});

				navigator.mediaSession.setActionHandler('seekforward', () => {
					const currentTime = wavesurfer.getCurrentTime();
					const duration = wavesurfer.getDuration();
					if (duration > 0) {
						wavesurfer.seekTo(Math.min(duration, currentTime + 10) / duration);
					}
				});

				navigator.mediaSession.setActionHandler('previoustrack', () => {
					previousTrack();
				});

				navigator.mediaSession.setActionHandler('nexttrack', () => {
					nextTrack();
				});
			}

			// Set initial volume
			wavesurfer.setVolume($volume);
			
			// Wavesurfer event listeners
			wavesurfer.on('ready', () => {
				console.log('Wavesurfer ready event fired');
				isLoading = false;
				const dur = wavesurfer.getDuration();
				duration = formatTime(dur);
				playerDuration.set(dur);
			});
			
			wavesurfer.on('audioprocess', () => {
				const current = wavesurfer.getCurrentTime();
				currentTime = formatTime(current);
				playerPosition.set(current);
				
				// Sync visual wavesurfer progress
				if (visualWavesurfer && visualWavesurfer.getDuration() > 0) {
					const progress = current / wavesurfer.getDuration();
					visualWavesurfer.seekTo(progress);
				}
			});
			
			wavesurfer.on('play', () => {
				console.log('Wavesurfer play event');
				isPlaying.set(true);
				// Sync Media Session playback state
				if ('mediaSession' in navigator) {
					navigator.mediaSession.playbackState = 'playing';
				}
			});

			wavesurfer.on('pause', () => {
				console.log('Wavesurfer pause event');
				isPlaying.set(false);
				// Sync Media Session playback state
				if ('mediaSession' in navigator) {
					navigator.mediaSession.playbackState = 'paused';
				}
			});
			
			wavesurfer.on('finish', () => {
				// Ignore spurious 'finish' events emitted by wavesurfer.load()
				// when it cleans up the old audio that was at the end position
				if (isLoadingTrack) {
					console.log('Ignoring spurious finish event during track loading');
					return;
				}
				console.log('Wavesurfer finish event — advancing');
				isPlaying.set(false);
				nextTrack();
			});
			
			wavesurfer.on('error', (error) => {
				console.error('Wavesurfer error:', error);
				isLoading = false;
			});
			
			} catch (error) {
				console.error('Failed to create wavesurfer:', error);
			}
	});
	
	// Create visual wavesurfer for expanded view
	$effect(() => {
		// Track player visibility to trigger recreation when reopening after close
		const isVisible = $playerVisible;

		if ($playerMinimized || !isVisible) {
			// Clean up visual wavesurfer when minimized OR player is hidden
			if (visualWavesurfer) {
				visualWavesurfer.destroy();
				visualWavesurfer = null;
				visualWavesurferReady = false;
			}
			return;
		}

		// Don't recreate if already exists
		if (visualWavesurfer) {
			return;
		}

		// Access container synchronously to track it as a reactive dependency
		const container = visualContainer;

		// If container not ready yet, effect will re-run when it becomes available
		if (!container) {
			console.log('Visual container not yet available, waiting...');
			return;
		}

		// Use tick() to ensure DOM is fully settled
		tick().then(() => {
			// Double-check container still exists and we haven't already created the instance
			if (!visualContainer || visualWavesurfer) {
				return;
			}

			try {
				console.log('Creating visual wavesurfer instance');
				visualWavesurfer = WaveSurfer.create({
					container: visualContainer,
					...getPersistentPlayerConfig()
				});

				// Mark as ready when waveform finishes rendering
				visualWavesurfer.on('ready', () => {
					console.log('Visual wavesurfer ready event fired');
					visualWavesurferReady = true;
				});

				// Load current track if available (with CORS bypass)
				if (wavesurfer && $currentTrack?.audioUrl) {
					const transformedUrl = getAudioUrl($currentTrack.audioUrl);
					visualWavesurfer.load(transformedUrl);
				}

				// Handle interaction - when user clicks visual waveform, control main wavesurfer
				visualWavesurfer.on('interaction', () => {
					if (wavesurfer && visualWavesurfer) {
						const progress = visualWavesurfer.getCurrentTime() / visualWavesurfer.getDuration();
						wavesurfer.seekTo(progress);
					}
				});

				visualWavesurfer.on('click', (progress) => {
					if (wavesurfer) {
						wavesurfer.seekTo(progress);
					}
				});

			} catch (error) {
				console.error('Failed to create visual wavesurfer:', error);
				visualWavesurferReady = false;
			}
		});
	});
	
	// React to track changes via direct store subscription.
	// Store .subscribe() callbacks fire synchronously on .set(), so they always
	// receive the fresh value. Svelte 5 $effect can deliver stale $currentTrack
	// when the store is updated from external (non-Svelte) callbacks like
	// WaveSurfer's 'finish' event, causing the OLD track to reload.
	$effect(() => {
		if (!wavesurfer || !wavesurferReady) return;

		let isFirst = true;
		const unsub = currentTrack.subscribe(track => {
			// Skip the initial call (current value at subscribe time)
			if (isFirst) {
				isFirst = false;
				return;
			}
			console.log('Track changed (subscription):', track?.title, 'ready:', wavesurferReady);
			thumbnailError = false;

			if (track?.audioUrl) {
				loadTrack(track, true);
			}
		});

		return unsub;
	});

	// Sync visual wavesurfer when it becomes available or track changes
	$effect(() => {
		// Only sync when visual wavesurfer exists, we're not minimized, and there's a track
		if (!visualWavesurfer || $playerMinimized || !$currentTrack?.audioUrl) {
			return;
		}

		// Check if visual wavesurfer needs to load the track
		const visualDuration = visualWavesurfer.getDuration();
		if (visualDuration === 0 || !visualWavesurferReady) {
			console.log('Syncing visual wavesurfer with current track');
			visualWavesurferReady = false;
			const transformedUrl = getAudioUrl($currentTrack.audioUrl);
			visualWavesurfer.load(transformedUrl).catch(error => {
				console.error('Error loading visual wavesurfer:', error);
			});
		}
	});
	
	// React to volume changes
	$effect(() => {
		if (wavesurfer) {
			wavesurfer.setVolume($volume);
		}
	});
	
	// Load track when wavesurfer becomes ready if track was set before
	$effect(() => {
		if (wavesurferReady && wavesurfer && wavesurfer.getDuration() === 0) {
			// Read store directly to avoid stale $currentTrack
			let track;
			currentTrack.subscribe(t => track = t)();
			if (track?.audioUrl) {
				console.log('Wavesurfer became ready, loading pending track:', track.title);
				loadTrack(track, true);
			}
		}
	});

	// Handle player reopening after being closed - reload existing track
	let wasVisible = $state(false);
	$effect(() => {
		const isNowVisible = $playerVisible;

		// Detect when player transitions from hidden to visible
		if (isNowVisible && !wasVisible) {
			// Player just became visible - if we have a track and wavesurfer is ready, reload it
			if (wavesurferReady && wavesurfer && $currentTrack?.audioUrl) {
				console.log('Player reopened, reloading track:', $currentTrack.title);
				// Use setTimeout to ensure wavesurfer is fully initialized
				setTimeout(() => {
					if (wavesurfer && wavesurfer.getDuration() === 0) {
						loadTrack($currentTrack, true);
					}
				}, 100);
			}
		}

		wasVisible = isNowVisible;
	});

	// Update Media Session metadata when track or artwork changes
	$effect(() => {
		if ('mediaSession' in navigator && $currentTrack) {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: $currentTrack.title || 'Unknown Track',
				artist: $currentTrack.artist || 'KEY JAY',
				album: $currentTrack.album || 'Streaming',
				artwork: $currentTrackArtwork ? [
					{ src: $currentTrackArtwork, sizes: '512x512', type: 'image/png' }
				] : []
			});
		}
	});

	async function loadTrack(track, autoPlay = false) {
		if (!wavesurfer || !track.audioUrl) {
			console.log('Cannot load track:', { wavesurfer: !!wavesurfer, audioUrl: track?.audioUrl });
			return;
		}

		isLoading = true;
		isLoadingTrack = true; // Block spurious 'finish' events during load
		const url = getAudioUrl(track.audioUrl);
		console.log('loadTrack:', track.title, 'autoPlay:', autoPlay);

		try {
			if (wavesurfer.isPlaying()) {
				wavesurfer.pause();
			}

			await wavesurfer.load(url);
			console.log('Track loaded:', track.title);

			// Sync visual wavesurfer
			if (visualWavesurfer) {
				try {
					visualWavesurferReady = false;
					await visualWavesurfer.load(url);
				} catch (err) {
					console.error('Visual wavesurfer load error:', err);
					visualWavesurferReady = false;
				}
			}

			if (autoPlay) {
				console.log('Auto-playing:', track.title);
				await wavesurfer.play();
			}
		} catch (error) {
			console.error('loadTrack error:', error, track.audioUrl);
			isLoading = false;
		} finally {
			isLoadingTrack = false; // Re-enable finish event handling
		}
	}
	
	async function togglePlayPause() {
		if (!wavesurfer || !wavesurferReady) {
			console.log('No wavesurfer instance available or not ready:', { wavesurfer: !!wavesurfer, ready: wavesurferReady });
			return;
		}
		
		if (!$currentTrack || !$currentTrack.audioUrl) {
			console.log('No current track or audio URL');
			return;
		}
		
		console.log('Toggle play/pause. Current state - playing:', wavesurfer.isPlaying(), 'loaded:', wavesurfer.getDuration() > 0);
		
		try {
			if (wavesurfer.isPlaying()) {
				console.log('Pausing playback');
				wavesurfer.pause();
			} else {
				// Check if audio is loaded
				if (wavesurfer.getDuration() === 0) {
					console.log('Audio not loaded, loading first...');
					await loadTrack($currentTrack);
				}

				// Safety check: ensure visual waveform is synced when starting playback
				if (visualWavesurfer && !$playerMinimized) {
					const visualDuration = visualWavesurfer.getDuration();
					const mainDuration = wavesurfer.getDuration();

					// If visual waveform not ready or has wrong track, reload it
					if (!visualWavesurferReady || visualDuration === 0 || Math.abs(visualDuration - mainDuration) > 0.1) {
						console.log('Visual waveform out of sync, reloading...', {
							ready: visualWavesurferReady,
							visualDuration,
							mainDuration
						});
						try {
							visualWavesurferReady = false;
							const transformedUrl = getAudioUrl($currentTrack.audioUrl);
							await visualWavesurfer.load(transformedUrl);
							console.log('Visual waveform resynced');
						} catch (error) {
							console.error('Error resyncing visual waveform:', error);
						}
					}
				}

				console.log('Starting playback');
				await wavesurfer.play();
			}
		} catch (error) {
			console.error('Error toggling playback:', error);
		}
	}
	
	function handleVolumeChange(e) {
		const newVolume = parseFloat(e.target.value);
		volume.set(newVolume);
	}
	
	async function toggleMinimize() {
		const wasMinimized = $playerMinimized;

		playerMinimized.update(v => !v);

		// Resize wavesurfer after animation completes
		if (wavesurfer) {
			setTimeout(() => {
				if (wavesurfer.resize) {
					wavesurfer.resize();
				}
			}, 350); // After transition duration
		}

		// Safety check: sync visual waveform when expanding
		if (wasMinimized && !$playerMinimized && $currentTrack?.audioUrl) {
			// Wait for animation and visual effect to complete
			setTimeout(async () => {
				if (!visualWavesurfer) {
					console.log('Visual wavesurfer not created yet, waiting for effect...');
					return;
				}

				const visualDuration = visualWavesurfer.getDuration();
				const mainDuration = wavesurfer?.getDuration() || 0;

				// If visual waveform not ready or has wrong track, reload it
				if (!visualWavesurferReady || visualDuration === 0 || Math.abs(visualDuration - mainDuration) > 0.1) {
					console.log('Visual waveform out of sync after expand, reloading...', {
						ready: visualWavesurferReady,
						visualDuration,
						mainDuration
					});
					try {
						visualWavesurferReady = false;
						const transformedUrl = getAudioUrl($currentTrack.audioUrl);
						await visualWavesurfer.load(transformedUrl);
						console.log('Visual waveform synced after expand');
					} catch (error) {
						console.error('Error syncing visual waveform after expand:', error);
					}
				}
			}, 400); // Wait slightly longer than animation
		}
	}
	
	function closePlayer() {
		if (wavesurfer) {
			wavesurfer.pause();
		}
		// Clear all track state so next open loads a fresh track
		closePlayerCompletely();
	}
	
	onDestroy(() => {
		if (wavesurfer) {
			wavesurfer.destroy();
		}
		if (visualWavesurfer) {
			visualWavesurfer.destroy();
		}
	});
</script>

{#if $playerVisible}
	<div
		class="music-player fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-white/10 shadow-2xl"
		class:minimized={$playerMinimized}
		transition:slide={{ duration: 300 }}>
		
		<!-- Persistent waveform container - always present -->
		<div bind:this={container} class="waveform-container" style="position: absolute; top: -1000px; width: 300px; height: 50px; visibility: hidden;"></div>
		
		{#if !$playerMinimized}
			<!-- Full Player -->
			<div class="p-4" transition:slide={{ duration: 300 }}>
				<!-- Track Info & Controls Row -->
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-3 flex-1 min-w-0">
						<!-- Album Art -->
						<div class="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden relative">
							{#if $artworkLoading}
								<!-- Loading state while extracting artwork -->
								<div class="w-full h-full flex items-center justify-center bg-gray-700">
									<Icon icon="mdi:loading" width={20} height={20} class="text-gray-400 animate-spin" />
								</div>
							{:else if $currentTrackArtwork}
								<!-- Extracted embedded artwork -->
								<img 
									src={$currentTrackArtwork} 
									alt="Album cover for {$currentTrack?.title || 'Unknown Track'}"
									class="w-full h-full object-cover"
								/>
							{:else if $currentTrack?.thumbnail && !thumbnailError}
								<!-- Fallback to existing thumbnail -->
								<img 
									src={$currentTrack.thumbnail} 
									alt="Album cover for {$currentTrack?.title || 'Unknown Track'}"
									class="w-full h-full object-cover"
									onerror={() => { 
										console.log('Thumbnail failed to load:', $currentTrack.thumbnail);
										thumbnailError = true; 
									}}
								/>
							{:else}
								<!-- Default icon for tracks with no artwork -->
								<div class="w-full h-full flex items-center justify-center bg-gray-600">
									<Icon icon="mdi:music-note" width={24} height={24} class="text-gray-300" />
								</div>
							{/if}
						</div>
						
						<!-- Track Info -->
						<div class="min-w-0 flex-1">
							{#if $currentTrack}
								<h4 class="text-white font-medium truncate">{$currentTrack.title || 'Unknown Track'}</h4>
								<p class="text-gray-400 text-sm truncate">{$currentTrack.artist || 'Unknown Artist'}</p>
							{:else}
								<h4 class="text-gray-400">No track loaded</h4>
							{/if}
						</div>
					</div>
					
					<!-- Player Controls -->
					<div class="flex items-center gap-2">
						<button 
							onclick={() => previousTrack()}
							class="p-2 hover:bg-white/10 rounded-full transition-colors"
							title="Previous track"
							disabled={$playlist.length <= 1}
						>
							<Icon icon="mdi:skip-previous" width={24} height={24} class="text-white" />
						</button>
						
						<button
							onclick={togglePlayPause}
							disabled={isLoading || !$currentTrack}
							class="play-btn p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							class:playing={$isPlaying && !isLoading}
						>
							{#if isLoading}
								<Icon icon="mdi:loading" width={24} height={24} class="text-white animate-spin" />
							{:else if $isPlaying}
								<Icon icon="mdi:pause" width={24} height={24} class="text-white" />
							{:else}
								<Icon icon="mdi:play" width={24} height={24} class="text-white" />
							{/if}
						</button>
						
						<button 
							onclick={() => nextTrack()}
							class="p-2 hover:bg-white/10 rounded-full transition-colors"
							title="Next track"
							disabled={$playlist.length <= 1}
						>
							<Icon icon="mdi:skip-next" width={24} height={24} class="text-white" />
						</button>
					</div>
					
					<!-- Right Controls -->
					<div class="flex items-center gap-2 ml-4">
						<!-- Volume Control -->
						<div class="hidden sm:flex items-center gap-2">
							<Icon icon="mdi:volume-high" width={20} height={20} class="text-gray-400" />
							<input 
								type="range" 
								min="0" 
								max="1" 
								step="0.05"
								value={$volume}
								oninput={handleVolumeChange}
								class="w-20 accent-blue-600"
							/>
						</div>
						
						<!-- Minimize/Maximize -->
						<button 
							onclick={toggleMinimize}
							class="p-2 hover:bg-white/10 rounded-full transition-colors"
							title="Minimize player"
						>
							<Icon icon="mdi:chevron-down" width={20} height={20} class="text-gray-400" />
						</button>
						
						<!-- Close -->
						<button 
							onclick={closePlayer}
							class="p-2 hover:bg-white/10 rounded-full transition-colors"
							title="Close player"
						>
							<Icon icon="mdi:close" width={20} height={20} class="text-gray-400" />
						</button>
					</div>
				</div>
				
				<!-- Waveform -->
				<div class="mb-2">
					<!-- Waveform Container with Skeleton Loader -->
					<div class="relative mb-2" style="height: 50px;">
						{#if !visualWavesurferReady && !$playerMinimized}
							<!-- Skeleton Loader -->
							<div class="skeleton-waveform"></div>
						{/if}
						<div
							bind:this={visualContainer}
							class="waveform-container"
							class:waveform-hidden={!visualWavesurferReady}
							style="height: 50px;"
						></div>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-400">{currentTime}</span>
						<span class="text-xs text-gray-400">{duration}</span>
					</div>
				</div>
				
				<!-- Playlist Info and Controls -->
				<div class="flex items-center justify-between">
					<div class="text-xs text-gray-500">
						{#if $playlist.length > 1}
							Track {$currentTrackIndex + 1} of {$playlist.length}
						{:else if $currentTrack}
							Now Playing
						{/if}
					</div>
					<div class="flex gap-2">
						{#if $playlist.length > 1}
							<button 
								onclick={() => showPlaylist = !showPlaylist}
								class="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-colors"
								title="Toggle playlist"
							>
								<Icon icon="mdi:playlist-music" width={16} height={16} class="inline mr-1" />
								Playlist
							</button>
						{/if}
						{#if $playlistSource === 'library'}
							<button
								onclick={() => showBrowser = !showBrowser}
								class="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-colors"
								title="Browse music library"
							>
								<Icon icon="mdi:folder-music" width={16} height={16} class="inline mr-1" />
								Library
							</button>
						{/if}
					</div>
				</div>
				
				<!-- Playlist Panel -->
				{#if showPlaylist && $playlist.length > 1}
					<div class="mt-4 max-h-60 overflow-y-auto bg-gray-800/50 rounded-lg p-2" transition:slide={{ duration: 300 }}>
						{#each $playlist as track, index}
							<button
								onclick={() => {
									currentTrackIndex.set(index);
									currentTrack.set(track);
								}}
								class="w-full text-left p-2 hover:bg-gray-700/50 rounded transition-colors flex items-center gap-2 {
									index === $currentTrackIndex ? 'bg-gray-700/70 text-blue-400' : 'text-gray-300'
								}"
							>
								<span class="text-xs text-gray-500 w-6">{index + 1}</span>
								<div class="flex-1 min-w-0">
									<div class="truncate text-sm">{track.title}</div>
									<div class="truncate text-xs text-gray-500">{track.artist}</div>
								</div>
								{#if index === $currentTrackIndex && $isPlaying}
									<Icon icon="mdi:equalizer" width={16} height={16} class="text-blue-400" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
				
				<!-- Library Browser Panel -->
				{#if showBrowser && $playlistSource === 'library'}
					<div class="mt-4" transition:slide={{ duration: 400 }}>
						<PlaylistBrowser />
					</div>
				{/if}
			</div>
		{:else}
			<!-- Minimized Player -->
			<div class="flex items-center justify-between p-2 px-4" transition:slide={{ duration: 200 }}>
				<div class="flex items-center gap-3 flex-1 min-w-0">
					<button
					onclick={togglePlayPause}
					disabled={isLoading || !$currentTrack}
					class="play-btn p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50"
					class:playing={$isPlaying && !isLoading}
				>
					{#if isLoading}
						<Icon icon="mdi:loading" width={16} height={16} class="text-white animate-spin" />
					{:else if $isPlaying}
						<Icon icon="mdi:pause" width={16} height={16} class="text-white" />
					{:else}
						<Icon icon="mdi:play" width={16} height={16} class="text-white" />
					{/if}
				</button>
					
					{#if $currentTrack}
						<div class="min-w-0 flex-1">
							<span class="text-white text-sm truncate block">{$currentTrack.title || 'Unknown Track'}</span>
							<!-- Mini progress bar -->
							<div class="w-full bg-gray-700 rounded-full h-1 mt-1">
								<div 
									class="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full transition-all duration-300"
									style="width: {$playerDuration > 0 ? ($playerPosition / $playerDuration) * 100 : 0}%"
								></div>
							</div>
						</div>
					{/if}
				</div>
				
				<div class="flex items-center gap-2">
					<button 
						onclick={toggleMinimize}
						class="p-2 hover:bg-white/10 rounded-full transition-colors"
						title="Expand player"
					>
						<Icon icon="mdi:chevron-up" width={16} height={16} class="text-gray-400" />
					</button>
					
					<button 
						onclick={closePlayer}
						class="p-2 hover:bg-white/10 rounded-full transition-colors"
						title="Close player"
					>
						<Icon icon="mdi:close" width={16} height={16} class="text-gray-400" />
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(.waveform-container wave) {
		overflow: hidden !important;
	}

	/* Pulse animation for play button when playing */
	.play-btn {
		position: relative;
	}

	.play-btn.playing {
		animation: pulse-ring 2s ease-out infinite;
	}

	.play-btn.playing::before {
		content: '';
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 2px solid rgba(59, 130, 246, 0.6);
		animation: pulse-expand 2s ease-out infinite;
	}

	@keyframes pulse-ring {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
		}
	}

	@keyframes pulse-expand {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	/* Waveform Skeleton Loader */
	.skeleton-waveform {
		position: absolute;
		inset: 0;
		height: 50px;
		background: linear-gradient(90deg,
			rgba(75, 0, 130, 0.1) 0%,
			rgba(138, 43, 226, 0.15) 50%,
			rgba(75, 0, 130, 0.1) 100%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 2s ease-in-out infinite;
		border-radius: 4px;
		overflow: hidden;
	}

	.skeleton-waveform::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			90deg,
			transparent 0px,
			transparent 2px,
			rgba(200, 0, 200, 0.15) 2px,
			rgba(200, 0, 200, 0.15) 4px
		);
		animation: skeleton-bars 0.8s ease-in-out infinite alternate;
	}

	@keyframes skeleton-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	@keyframes skeleton-bars {
		0% {
			opacity: 0.3;
		}
		100% {
			opacity: 0.6;
		}
	}

	/* Hide waveform until ready */
	.waveform-hidden {
		opacity: 0;
		pointer-events: none;
	}

	/* Smooth fade-in when waveform becomes visible */
	.waveform-container {
		transition: opacity 0.3s ease-in-out;
	}

	/* Mobile: Animate player sliding out when minimized (keeps DOM alive so music continues) */
	@media (max-width: 768px) {
		.music-player {
			transition: transform 0.3s ease, opacity 0.3s ease;
		}

		.music-player.minimized {
			transform: translateY(100%);
			opacity: 0;
			pointer-events: none;
		}
	}
</style>