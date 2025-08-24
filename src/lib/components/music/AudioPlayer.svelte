<script>
	import { onMount, onDestroy } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';
	import Icon from '@iconify/svelte';
	import { formatTime } from '$lib/utils/time.js';
	
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
		className = ''
	} = $props();
	
	let container = $state();
	let wavesurfer = $state(null);
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let currentTime = $state('0:00');
	let duration = $state('0:00');
	let volume = $state(0.8);
	
	
	onMount(() => {
		if (!container || !audioUrl) return;
		
		wavesurfer = WaveSurfer.create({
			container,
			waveColor,
			progressColor,
			height,
			barWidth: 2,
			barGap: 1,
			barRadius: 2,
			cursorWidth: 2,
			cursorColor: '#fff',
			mediaControls: false,
			normalize: true,
			responsive: true,
			url: audioUrl
		});
		
		wavesurfer.setVolume(volume);
		
		wavesurfer.on('ready', () => {
			isLoading = false;
			duration = formatTime(wavesurfer.getDuration());
		});
		
		wavesurfer.on('audioprocess', () => {
			currentTime = formatTime(wavesurfer.getCurrentTime());
		});
		
		wavesurfer.on('play', () => {
			isPlaying = true;
		});
		
		wavesurfer.on('pause', () => {
			isPlaying = false;
		});
		
		wavesurfer.on('finish', () => {
			isPlaying = false;
		});
	});
	
	onDestroy(() => {
		if (wavesurfer) {
			wavesurfer.destroy();
		}
	});
	
	function togglePlayPause() {
		if (wavesurfer) {
			wavesurfer.playPause();
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
</script>

<div class="audio-player bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 {className}">
	{#if trackTitle || artist}
		<div class="flex items-center justify-between mb-3">
			<div>
				{#if trackTitle}
					<h4 class="text-white font-medium">{trackTitle}</h4>
				{/if}
				{#if artist}
					<p class="text-gray-400 text-sm">{artist}</p>
				{/if}
			</div>
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
		
		<div class="flex items-center gap-2">
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