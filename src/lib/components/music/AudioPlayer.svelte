<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';
	import Icon from '@iconify/svelte';
	import { formatTime } from '$lib/utils/time.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { getAudioPlayerConfig, pauseOthersAndToggle, cleanupTrackPlayer, registerTrackPlayer } from '$lib/utils/wavesurfer-helpers.js';
	import { addToDynamicPlaylist, removeFromDynamicPlaylist, playDynamicPlaylist, dynamicPlaylist, playlistSource, radioModalOpen, radioEnabled } from '$lib/stores/musicPlayer.js';

	let {
		audioUrl,
		trackTitle = '',
		artist = '',
		waveColor = '#3B82F6',
		progressColor = '#1E40AF',
		height = 60,
		canDownload = false,
		downloadUrl = '',
		onDownloadClick = null,
		className = '',
		trackData = null
	} = $props();

	let inPlaylist = $derived(
		trackData ? $dynamicPlaylist.some(t => t.id === trackData.id) : false
	);
	
	let container = $state();
	let wavesurfer = $state(null);
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let currentTime = $state('0:00');
	let duration = $state('0:00');
	let volume = $state(0.8);

	// Unique ID for cross-player management registry
	const playerId = `audio-player-${Math.random().toString(36).slice(2, 9)}`;

	onMount(() => {
		if (!container || !audioUrl) return;

		// Transform audio URL for CORS bypass in development
		const transformedAudioUrl = getAudioUrl(audioUrl);

		wavesurfer = WaveSurfer.create({
			container,
			...getAudioPlayerConfig({ waveColor, progressColor, height }),
			url: transformedAudioUrl
		});

		wavesurfer.setVolume(volume);

		// Register in cross-player registry for exclusive playback
		registerTrackPlayer(playerId, wavesurfer);

		wavesurfer.on('ready', () => {
			isLoading = false;
			duration = formatTime(wavesurfer.getDuration());
		});

		// Use native media element events for reliable Android playback
		const mediaEl = wavesurfer.getMediaElement();
		let playbackInterval = null;

		function syncTime() {
			currentTime = formatTime(mediaEl.currentTime);
		}

		mediaEl.addEventListener('timeupdate', syncTime);

		wavesurfer.on('play', () => {
			isPlaying = true;
			playbackInterval = setInterval(syncTime, 100);
		});

		wavesurfer.on('pause', () => {
			isPlaying = false;
			clearInterval(playbackInterval);
			syncTime();
		});

		wavesurfer.on('finish', () => {
			isPlaying = false;
			clearInterval(playbackInterval);
		});
	});

	onDestroy(() => {
		cleanupTrackPlayer(playerId, ['']);
	});

	function togglePlayPause() {
		if (wavesurfer) {
			pauseOthersAndToggle(wavesurfer, playerId);
		}
	}
	
	function handleVolumeChange(e) {
		volume = parseFloat(e.target.value);
		if (wavesurfer) {
			wavesurfer.setVolume(volume);
		}
	}
	
	function handleDownload() {
		if (onDownloadClick) {
			onDownloadClick();
		} else if (downloadUrl) {
			window.open(downloadUrl, '_blank');
		}
	}

	function handleTogglePlaylist() {
		if (!trackData) return;
		if (inPlaylist) {
			removeFromDynamicPlaylist(trackData.id);
		} else {
			addToDynamicPlaylist(trackData);
			// If the persistent player isn't already playing the dynamic playlist,
			// start it from the newly added track (last item)
			if ($playlistSource !== 'dynamic') {
				tick().then(() => {
					playDynamicPlaylist($dynamicPlaylist.length - 1);
				});
			}
		}
	}
</script>

<div class="audio-player bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 {className}">
	{#if trackTitle || artist || trackData}
		<div class="flex items-center justify-between mb-3">
			<div class="min-w-0 flex-1">
				{#if trackTitle}
					<h4 class="text-white font-medium truncate">{trackTitle}</h4>
				{/if}
				{#if artist}
					<p class="text-gray-400 text-sm truncate">{artist}</p>
				{/if}
			</div>
			<div class="flex items-center gap-1 flex-shrink-0">
				{#if $radioEnabled}
					<button
						onclick={() => radioModalOpen.set(true)}
						class="p-2 rounded-full transition-colors bg-orange-600/20 hover:bg-orange-600/30"
						title="Key Jay Radio"
					>
						<Icon
							icon="mdi:radio-tower"
							width={20} height={20}
							class="text-orange-400"
						/>
					</button>
				{/if}
				{#if trackData}
					<button
						onclick={handleTogglePlaylist}
						class="p-2 rounded-full transition-colors {inPlaylist ? 'bg-green-600/20 hover:bg-red-600/20' : 'bg-blue-600/20 hover:bg-blue-600/30'}"
						title={inPlaylist ? 'Remove from playlist' : 'Add to playlist'}
					>
						<Icon
							icon={inPlaylist ? 'mdi:playlist-check' : 'mdi:playlist-plus'}
							width={20} height={20}
							class={inPlaylist ? 'text-green-400' : 'text-blue-400'}
						/>
					</button>
				{/if}
				{#if canDownload}
					<button
						onclick={handleDownload}
						class="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-full transition-colors"
						title="Download track"
					>
						<Icon icon="mdi:download" width={20} height={20} class="text-blue-400" />
					</button>
				{/if}
			</div>
		</div>
	{/if}
	
	<div class="flex items-center gap-3">
		<button 
			onclick={togglePlayPause}
			disabled={isLoading}
			class="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
		>
			{#if isLoading}
				<Icon icon="mdi:loading" width={24} height={24} class="text-white animate-spin" />
			{:else if isPlaying}
				<Icon icon="mdi:pause" width={24} height={24} class="text-white" />
			{:else}
				<Icon icon="mdi:play" width={24} height={24} class="text-white" />
			{/if}
		</button>
		
		<div class="flex-1">
			<div bind:this={container} class="waveform-container"></div>
			<div class="flex items-center justify-between mt-1">
				<span class="text-xs text-gray-400">{currentTime}</span>
				<span class="text-xs text-gray-400">{duration}</span>
			</div>
		</div>
		
		<div class="hidden sm:flex items-center gap-2">
			<Icon icon="mdi:volume-high" width={20} height={20} class="text-gray-400" />
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={volume}
				oninput={handleVolumeChange}
				class="w-20 accent-blue-600"
			/>
		</div>
	</div>
</div>

<style>
	:global(.waveform-container wave) {
		overflow: hidden !important;
	}
</style>