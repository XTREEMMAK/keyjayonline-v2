<script>
	import { onDestroy } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';
	import { getRadioPlayerConfig, registerTrackPlayer, pauseAllTrackPlayers } from '$lib/utils/wavesurfer-helpers.js';
	import { setupMediaSessionHandlers, setupMediaSessionForElement, updateMediaSessionMetadata, updateMediaSessionPlaybackState, updateMediaSessionPosition } from '$lib/utils/mediaSession.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { extractCoverArt } from '$lib/utils/coverArtExtractor.js';
	import {
		isPlaying,
		currentTrack,
		currentTrackArtwork,
		playlist,
		currentTrackIndex,
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
	let needsWavesurferResync = false;
	let preloadedNext = null;
	let preloadingInProgress = false;
	let loopPendingAdvance = false;
	let lastSyncedTime = 0;

	// ── Dedicated Background Audio Element ──────────────────────────────────
	let bgAudioEl = null;
	let bgSyncInterval = null;
	let bgLoopArmed = false;
	let bgLastTime = 0;

	function bgLog(msg) {
		console.log('[BG-Radio]', msg);
		try {
			const log = JSON.parse(sessionStorage.getItem('kjo_bg_log') || '[]');
			log.push(`${new Date().toISOString().slice(11,19)} [R] ${msg}`);
			if (log.length > 50) log.shift();
			sessionStorage.setItem('kjo_bg_log', JSON.stringify(log));
		} catch {}
	}

	/** Create a FRESH background Audio element for each track transition. */
	function createBgAudio() {
		const el = document.createElement('audio');
		el.preload = 'auto';

		el.addEventListener('playing', () => {
			if (el !== bgAudioEl) return;
			if (el.paused) return;  // Spurious event guard (Bluetooth devices)
			bgLog('bgEl: playing event');
			isPlaying.set(true);
			updateMediaSessionPlaybackState('playing');
			if (!bgSyncInterval) {
				bgSyncInterval = setInterval(bgSyncPlayhead, 100);
			}
		});

		el.addEventListener('pause', () => {
			if (el !== bgAudioEl) return;
			if (!isLoadingTrack && !el.ended) {
				bgLog('bgEl: pause event');
				isPlaying.set(false);
				clearInterval(bgSyncInterval);
				bgSyncInterval = null;
				bgSyncPlayhead();
				updateMediaSessionPlaybackState('paused');
				onPause();
			}
		});

		el.addEventListener('ended', () => {
			if (el !== bgAudioEl) return;
			if (isLoadingTrack) return;
			bgLoopArmed = false;
			el.loop = false;
			clearInterval(bgSyncInterval);
			bgSyncInterval = null;
			bgLog('bgEl: ended→advance');
			nextTrack();
		});

		el.addEventListener('seeked', () => {
			if (el !== bgAudioEl) return;
			if (!bgLoopArmed || el.currentTime > 1) return;
			const dur = el.duration;
			if (!Number.isFinite(dur) || bgLastTime < dur - 2) return;
			bgLoopArmed = false;
			el.loop = false;
			clearInterval(bgSyncInterval);
			bgSyncInterval = null;
			bgLog('bgEl: loop→advance');
			nextTrack();
		});

		el.addEventListener('error', () => {
			if (el !== bgAudioEl) return;
			bgLog('bgEl: error ' + (el.error?.message || el.error?.code || 'unknown'));
		});

		return el;
	}

	function releaseBgElement(el) {
		if (!el) return;
		try {
			el.pause();
			el.removeAttribute('src');
			el.load();
		} catch {}
	}

	function cleanupBgAudio() {
		clearInterval(bgSyncInterval);
		bgSyncInterval = null;
		bgLoopArmed = false;
		bgLastTime = 0;
		if (bgAudioEl) {
			releaseBgElement(bgAudioEl);
			bgAudioEl = null;
		}
	}

	function bgSyncPlayhead() {
		if (!bgAudioEl) return;
		const t = bgAudioEl.currentTime;
		const dur = bgAudioEl.duration;
		if (!Number.isFinite(dur) || dur <= 0) return;

		if (bgLoopArmed && t < 1 && bgLastTime > dur - 2) {
			bgLoopArmed = false;
			bgAudioEl.loop = false;
			clearInterval(bgSyncInterval);
			bgSyncInterval = null;
			bgLog('bgEl: loop→advance (sync)');
			nextTrack();
			return;
		}

		playerPosition.set(t);
		onTimeUpdate(t, dur);
		if (!bgAudioEl.paused) {
			updateMediaSessionPosition(dur, t);
		}

		if (t / dur > 0.8 && !preloadedNext && !preloadingInProgress) {
			preloadingInProgress = true;
			let tracks, idx;
			playlist.subscribe(v => tracks = v)();
			currentTrackIndex.subscribe(v => idx = v)();
			if (tracks && tracks.length > 1) {
				const nextIdx = (idx + 1) % tracks.length;
				const nextUrl = getAudioUrl(tracks[nextIdx].audioUrl);
				bgLog(`preloading idx=${nextIdx}`);
				fetch(nextUrl)
					.then(r => r.blob())
					.then(blob => {
						preloadedNext = { httpUrl: nextUrl, blobUrl: URL.createObjectURL(blob) };
						bgLog('preload OK');
					})
					.catch(err => {
						bgLog('preload FAIL ' + err.message);
						preloadedNext = null;
					})
					.finally(() => { preloadingInProgress = false; });
			} else {
				preloadingInProgress = false;
			}
		}

		bgLastTime = t;
		if ((dur - t) < 5 && !bgLoopArmed) {
			bgLoopArmed = true;
			bgAudioEl.loop = true;
			bgLog('bgEl: loop armed, remaining=' + (dur - t).toFixed(1) + 's');
		}
	}

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

			// Native media element events for foreground WaveSurfer playback
			const mediaEl = wavesurfer.getMediaElement();
			let playbackInterval = null;

			function syncPlayhead() {
				const t = mediaEl.currentTime;
				const dur = mediaEl.duration;
				if (!Number.isFinite(dur) || dur <= 0) return;

				if (loopPendingAdvance && t < 1 && lastSyncedTime > dur - 2) {
					loopPendingAdvance = false;
					mediaEl.loop = false;
					clearInterval(playbackInterval);
					bgLog('loop→advance (sync), vis=' + document.visibilityState);
					nextTrack();
					return;
				}

				playerPosition.set(t);
				onTimeUpdate(t, dur);
				// Only update media session when actively playing
				if (!mediaEl.paused) {
					updateMediaSessionPosition(dur, t);
				}

				// Preload next track when ~80% done
				if (t / dur > 0.8 && !preloadedNext && !preloadingInProgress) {
					preloadingInProgress = true;
					let tracks, idx;
					playlist.subscribe(v => tracks = v)();
					currentTrackIndex.subscribe(v => idx = v)();
					if (tracks && tracks.length > 1) {
						const nextIdx = (idx + 1) % tracks.length;
						const nextUrl = getAudioUrl(tracks[nextIdx].audioUrl);
						bgLog(`preloading idx=${nextIdx}`);
						fetch(nextUrl)
							.then(r => r.blob())
							.then(blob => {
								preloadedNext = { httpUrl: nextUrl, blobUrl: URL.createObjectURL(blob) };
								bgLog('preload OK');
							})
							.catch(err => {
								bgLog('preload FAIL ' + err.message);
								preloadedNext = null;
							})
							.finally(() => { preloadingInProgress = false; });
					} else {
						preloadingInProgress = false;
					}
				}

				lastSyncedTime = t;
				if ((dur - t) < 5 && !loopPendingAdvance) {
					loopPendingAdvance = true;
					mediaEl.loop = true;
					bgLog('loop armed, remaining=' + (dur - t).toFixed(1) + 's');
				}
			}

			mediaEl.addEventListener('timeupdate', syncPlayhead);

			wavesurfer.on('play', () => {
				isPlaying.set(true);
				clearInterval(playbackInterval);
				playbackInterval = setInterval(syncPlayhead, 100);
				// Re-register handlers so Android/Bluetooth controls point to this player
				setupMediaSessionHandlers(wavesurfer);
				updateMediaSessionMetadata($currentTrack, $currentTrackArtwork);
				updateMediaSessionPlaybackState('playing');
				onPlay();
			});

			wavesurfer.on('pause', () => {
				if (!mediaEl.ended && !isLoadingTrack) {
					isPlaying.set(false);
					clearInterval(playbackInterval);
					playbackInterval = null;
					syncPlayhead();
					updateMediaSessionPlaybackState('paused');
					onPause();
				}
			});

			// Loop Bridge on WaveSurfer's element (foreground only)
			mediaEl.addEventListener('seeked', () => {
				if (!loopPendingAdvance || mediaEl.currentTime > 1) return;
				const dur = mediaEl.duration;
				if (!Number.isFinite(dur) || lastSyncedTime < dur - 2) return;
				loopPendingAdvance = false;
				mediaEl.loop = false;
				clearInterval(playbackInterval);
				playbackInterval = null;
				bgLog('loop→advance, vis=' + document.visibilityState);
				nextTrack();
			});

			mediaEl.addEventListener('ended', () => {
				if (isLoadingTrack) return;
				loopPendingAdvance = false;
				mediaEl.loop = false;
				clearInterval(playbackInterval);
				playbackInterval = null;
				bgLog('ended→advance (fallback), vis=' + document.visibilityState);
				nextTrack();
			});

			wavesurfer.on('error', (error) => {
				console.error('Radio WaveSurfer error:', error);
			});

			// Transfer from bgAudioEl → WaveSurfer when returning from background
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState !== 'visible') return;
				mediaEl.autoplay = false;

				// If bgAudioEl was handling playback, transfer back
				if (bgAudioEl && bgAudioEl.src) {
					const wasPlaying = !bgAudioEl.paused;
					const pos = bgAudioEl.currentTime;
					const dur = bgAudioEl.duration;
					bgLog(`transfer bgEl→ws pos=${pos.toFixed(1)} dur=${Number.isFinite(dur) ? dur.toFixed(1) : 'NaN'}`);

					cleanupBgAudio();

					let track;
					currentTrack.subscribe(t => track = t)();
					if (track?.audioUrl && wavesurfer) {
						const url = getAudioUrl(track.audioUrl);
						setupMediaSessionHandlers(wavesurfer);

						isLoadingTrack = true;
						wavesurfer.load(url).then(() => {
							if (Number.isFinite(dur) && dur > 0) wavesurfer.seekTo(pos / dur);
							if (wasPlaying) {
								pauseAllTrackPlayers();
								wavesurfer.play();
							}
							isLoadingTrack = false;
							playerDuration.set(dur);
						}).catch(err => {
							console.error('Radio transfer error:', err);
							isLoadingTrack = false;
						});
					}
					return;
				}

				// Fallback: resync WaveSurfer's own element
				if (!needsWavesurferResync || !wavesurfer) return;
				needsWavesurferResync = false;

				let track;
				currentTrack.subscribe(t => track = t)();
				if (track?.audioUrl) {
					bgLog('resync radio WaveSurfer: ' + track.title);
					const url = getAudioUrl(track.audioUrl);
					const pos = mediaEl.currentTime;
					const dur = mediaEl.duration;
					const wasPlaying = !mediaEl.paused;

					setupMediaSessionHandlers(wavesurfer);

					isLoadingTrack = true;
					wavesurfer.load(url).then(() => {
						if (Number.isFinite(dur) && dur > 0) wavesurfer.seekTo(pos / dur);
						if (wasPlaying) {
							pauseAllTrackPlayers();
							wavesurfer.play();
						}
						isLoadingTrack = false;
						playerDuration.set(dur);
					}).catch(err => {
						console.error('Radio resync error:', err);
						isLoadingTrack = false;
					});
				}
			});

			bgLog('radio init OK');

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
		if (bgAudioEl) {
			bgAudioEl.volume = $volume;
		}
	});

	async function loadTrack(track) {
		isLoadingTrack = true;
		loopPendingAdvance = false;
		const transformedUrl = getAudioUrl(track.audioUrl);
		const isBackground = document.visibilityState === 'hidden';
		bgLog(`loadTrack "${track.title}" bg=${isBackground}`);

		if (preloadedNext && preloadedNext.httpUrl !== transformedUrl) {
			URL.revokeObjectURL(preloadedNext.blobUrl);
			preloadedNext = null;
		}

		try {
			if (isBackground) {
				// ── Background: create a FRESH Audio element for each transition ──
				// Overlap: new element starts BEFORE old one stops → no audio gap.
				const oldBg = bgAudioEl;
				const bg = createBgAudio();
				const effectiveUrl = preloadedNext?.blobUrl || transformedUrl;
				bgLog(`loadTrack→bgEl "${track.title}" src=${preloadedNext ? 'blob' : 'http'} newEl=true`);

				bgLoopArmed = false;
				bgLastTime = 0;
				clearInterval(bgSyncInterval);
				bgSyncInterval = null;

				// Set bgAudioEl to new element BEFORE play so handlers identify correctly
				bgAudioEl = bg;

				updateMediaSessionMetadata(track, null);
				setupMediaSessionForElement(bg);

				bg.src = effectiveUrl;
				bg.volume = $volume;

				try {
					await bg.play();
					bgLog('bgEl play() OK');
					isPlaying.set(true);
					updateMediaSessionPlaybackState('playing');
				} catch (err) {
					bgLog(`bgEl play() fail: ${err.name}`);
					await new Promise(r => setTimeout(r, 100));
					try {
						await bg.play();
						bgLog('bgEl play() retry OK');
						isPlaying.set(true);
						updateMediaSessionPlaybackState('playing');
					} catch {
						bg.autoplay = true;
						bg.load();
						bgLog('bgEl autoplay+load fallback');
					}
				}

				// Stop OLD element AFTER new one is playing (overlap)
				if (oldBg) {
					releaseBgElement(oldBg);
					bgLog('released old bgEl');
				}

				// Pause WaveSurfer's element
				try {
					const wsEl = wavesurfer.getMediaElement();
					if (wsEl && !wsEl.paused) {
						wsEl.pause();
						wsEl.loop = false;
					}
				} catch {}

				bgSyncInterval = setInterval(bgSyncPlayhead, 100);

				needsWavesurferResync = true;

				extractCoverArt(track.audioUrl).then(art => {
					currentTrackArtwork.set(art);
					updateMediaSessionMetadata(track, art);
				}).catch(() => {});

				preloadedNext = null;
				preloadingInProgress = false;
			} else {
				// If returning from background playback, stop bgAudioEl
				if (bgAudioEl) {
					cleanupBgAudio();
				}

				if (wavesurfer.isPlaying()) {
					wavesurfer.pause();
				}

				wavesurfer.load(transformedUrl);

				await new Promise((resolve) => {
					wavesurfer.once('ready', resolve);
				});

				pauseAllTrackPlayers();
				wavesurfer.play();
				preloadedNext = null;
				preloadingInProgress = false;
			}
		} catch (error) {
			bgLog(`loadTrack error: ${error.message}`);
			console.error('Error loading radio track:', error);
		} finally {
			isLoadingTrack = false;
		}
	}

	export function play() {
		if (!wavesurfer) return;
		// Clean up stale bgAudioEl before starting WaveSurfer playback
		if (bgAudioEl) {
			bgLog('play(): cleaning up stale bgAudioEl');
			cleanupBgAudio();
			needsWavesurferResync = false;
		}
		pauseAllTrackPlayers();
		wavesurfer.play();
	}

	export function pause() {
		if (wavesurfer) wavesurfer.pause();
	}

	export function togglePlayPause() {
		if (!wavesurfer) return;
		// Clean up stale bgAudioEl before interacting with WaveSurfer
		if (bgAudioEl) {
			bgLog('togglePlayPause: cleaning up stale bgAudioEl');
			const bgPos = bgAudioEl.currentTime;
			const bgDur = bgAudioEl.duration;
			cleanupBgAudio();
			needsWavesurferResync = false;
			// Reload WaveSurfer at bgAudioEl's position and resume
			let track;
			currentTrack.subscribe(t => { track = t; })();
			if (track?.audioUrl) {
				const url = getAudioUrl(track.audioUrl);
				setupMediaSessionHandlers(wavesurfer);
				isLoadingTrack = true;
				wavesurfer.load(url).then(() => {
					if (Number.isFinite(bgDur) && bgDur > 0) wavesurfer.seekTo(bgPos / bgDur);
					isLoadingTrack = false;
					playerDuration.set(bgDur);
					pauseAllTrackPlayers();
					wavesurfer.play();
				}).catch(err => {
					console.error('Radio toggle transfer error:', err);
					isLoadingTrack = false;
				});
			}
			return;
		}
		if (wavesurfer.isPlaying()) {
			wavesurfer.pause();
		} else {
			pauseAllTrackPlayers();
			wavesurfer.play();
		}
	}

	export function seekTo(fraction) {
		if (wavesurfer) {
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
		cleanupBgAudio();
		if (bgAudioEl) {
			bgAudioEl.src = '';
			bgAudioEl = null;
		}
		if (wavesurfer) {
			wavesurfer.destroy();
			wavesurfer = null;
		}
	});
</script>

<!-- Hidden WaveSurfer container — waveform displayed in RadioControls via progress bar -->
<div bind:this={container} class="radio-wavesurfer w-full" style="position: absolute; top: -9999px; left: -9999px;"></div>
