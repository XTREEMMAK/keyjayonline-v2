<script>
	import { onDestroy } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';
	import { getRadioPlayerConfig, registerTrackPlayer, pauseAllTrackPlayers } from '$lib/utils/wavesurfer-helpers.js';
	import { setupMediaSessionHandlers, updateMediaSessionMetadata, updateMediaSessionPlaybackState, updateMediaSessionPosition } from '$lib/utils/mediaSession.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import {
		isPlaying,
		currentTrack,
		currentTrackArtwork,
		playerPosition,
		playerDuration,
		volume,
		nextTrack
	} from '$lib/stores/musicPlayer.js';

	let {
		onTimeUpdate = () => {},
		onReady = () => {},
		onPlay = () => {},
		onPause = () => {}
	} = $props();

	let container = $state();
	let wavesurfer = $state(null);
	let isLoadingTrack = false;

	// Initialize WaveSurfer when container is available
	$effect(() => {
		if (!container || wavesurfer) return;

		try {
			wavesurfer = WaveSurfer.create({
				container,
				...getRadioPlayerConfig()
			});

			registerTrackPlayer('radio', wavesurfer);
			setupMediaSessionHandlers(wavesurfer);
			wavesurfer.setVolume($volume);

			wavesurfer.on('ready', () => {
				const dur = wavesurfer.getDuration();
				playerDuration.set(dur);
				onReady();
			});

			// Native media element events for Android reliability
			const mediaEl = wavesurfer.getMediaElement();
			let playbackInterval = null;

			function syncPlayhead() {
				const t = mediaEl.currentTime;
				playerPosition.set(t);
				onTimeUpdate(t, mediaEl.duration);
				// Update car display seek bar
				updateMediaSessionPosition(mediaEl.duration, t);
			}

			mediaEl.addEventListener('timeupdate', syncPlayhead);

			wavesurfer.on('play', () => {
				isPlaying.set(true);
				playbackInterval = setInterval(syncPlayhead, 100);
				updateMediaSessionPlaybackState('playing');
				onPlay();
			});

			wavesurfer.on('pause', () => {
				isPlaying.set(false);
				clearInterval(playbackInterval);
				syncPlayhead();
				updateMediaSessionPlaybackState('paused');
				onPause();
			});

			wavesurfer.on('finish', () => {
				if (isLoadingTrack) return;
				isPlaying.set(false);
				nextTrack();
			});

			wavesurfer.on('error', (error) => {
				console.error('Radio WaveSurfer error:', error);
			});
		} catch (error) {
			console.error('Failed to create radio WaveSurfer:', error);
		}
	});

	// Load track when currentTrack changes
	$effect(() => {
		const track = $currentTrack;
		if (!wavesurfer || !track?.audioUrl) return;

		loadTrack(track);
	});

	// Update media session metadata when track or artwork changes
	$effect(() => {
		if ($currentTrack) {
			updateMediaSessionMetadata($currentTrack, $currentTrackArtwork);
		}
	});

	// Sync volume changes
	$effect(() => {
		if (wavesurfer) {
			wavesurfer.setVolume($volume);
		}
	});

	async function loadTrack(track) {
		isLoadingTrack = true;
		try {
			if (wavesurfer.isPlaying()) {
				wavesurfer.pause();
			}

			const transformedUrl = getAudioUrl(track.audioUrl);
			wavesurfer.load(transformedUrl);

			await new Promise((resolve) => {
				wavesurfer.once('ready', resolve);
			});

			isLoadingTrack = false;
			pauseAllTrackPlayers();
			wavesurfer.play();
		} catch (error) {
			console.error('Error loading radio track:', error);
			isLoadingTrack = false;
		}
	}

	export function play() {
		if (wavesurfer) {
			pauseAllTrackPlayers();
			wavesurfer.play();
		}
	}

	export function pause() {
		if (wavesurfer) wavesurfer.pause();
	}

	export function togglePlayPause() {
		if (!wavesurfer) return;
		if (wavesurfer.isPlaying()) {
			wavesurfer.pause();
		} else {
			pauseAllTrackPlayers();
			wavesurfer.play();
		}
	}

	export function seekTo(fraction) {
		if (wavesurfer) {
			// Update store immediately to prevent slider snap-back
			const dur = wavesurfer.getDuration();
			if (dur > 0) playerPosition.set(fraction * dur);
			wavesurfer.seekTo(fraction);
		}
	}

	export function getCurrentTime() {
		return wavesurfer ? wavesurfer.getCurrentTime() : 0;
	}

	export function getDuration() {
		return wavesurfer ? wavesurfer.getDuration() : 0;
	}

	onDestroy(() => {
		if (wavesurfer) {
			wavesurfer.destroy();
			wavesurfer = null;
		}
	});
</script>

<!-- Hidden WaveSurfer container — waveform displayed in RadioControls via progress bar -->
<div bind:this={container} class="radio-wavesurfer w-full" style="position: absolute; top: -9999px; left: -9999px;"></div>
