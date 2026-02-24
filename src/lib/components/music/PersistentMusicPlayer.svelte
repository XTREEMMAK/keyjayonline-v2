<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { fly, slide } from 'svelte/transition';
	import WaveSurfer from 'wavesurfer.js';
	import Icon from '@iconify/svelte';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { getPersistentPlayerConfig, pauseAllTrackPlayers } from '$lib/utils/wavesurfer-helpers.js';
	import { setupMediaSessionHandlers, setupMediaSessionForElement, updateMediaSessionMetadata, updateMediaSessionPlaybackState, updateMediaSessionPosition } from '$lib/utils/mediaSession.js';
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
		playlistSource,
		radioMode,
		dynamicPlaylist,
		clearDynamicPlaylist,
		playDynamicPlaylist,
		radioModalOpen,
		radioEnabled,
		restoredFromSession,
		savePlayerState
	} from '$lib/stores/musicPlayer.js';
	import { extractCoverArt } from '$lib/utils/coverArtExtractor.js';
	import { formatTime } from '$lib/utils/time.js';
	import PlaylistBrowser from '$lib/components/music/PlaylistBrowser.svelte';
	import { sectionModalOpen } from '$lib/stores/stickyNav.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { browser } from '$app/environment';

	let { maintenanceBypass = false } = $props();

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
	let isLoadingTrack = false; // Guard: ignore spurious ended events during load
	let needsWavesurferResync = false; // Flag: background track advancement bypassed WaveSurfer load
	let preloadedNext = null; // { httpUrl, blobUrl } — pre-fetched next track audio
	let preloadingInProgress = false;
	let loopPendingAdvance = false; // Loop Bridge: armed when near track end
	let lastSyncedTime = 0; // Loop Bridge: last known playhead position
	let showDebugLog = $state(false); // Toggle for debug log viewer
	let debugLogEntries = $state([]); // Reactive copy for UI
	let memoryFreed = false; // True after freeIdleMemory() releases audio buffers
	let bgCleanupTimer = null; // Delayed cleanup timer for background pause
	let webLockAbort = null; // AbortController for the Web Lock keepalive

	// ── Web Lock: Prevent Chrome from freezing/discarding the tab ──────────
	// Chromium opts pages holding a Web Lock out of its freeze mechanism,
	// which is the mandatory step before tab discard. Held whenever the
	// player has a loaded track; released when the player is closed.
	function acquireKeepAliveLock() {
		if (webLockAbort || typeof navigator === 'undefined' || !navigator.locks) return;
		webLockAbort = new AbortController();
		navigator.locks.request('kjo-player-keepalive', { signal: webLockAbort.signal }, () => {
			// Return a promise that never resolves — holds the lock until aborted
			return new Promise(() => {});
		}).catch(() => {}); // AbortError when released — expected
	}

	function releaseKeepAliveLock() {
		if (webLockAbort) {
			webLockAbort.abort();
			webLockAbort = null;
		}
	}

	// ── Dedicated Background Audio Element ──────────────────────────────────
	// Completely separate from WaveSurfer to avoid interference during
	// lock-screen track transitions. WaveSurfer's internal <audio> element
	// fires its own events when src changes, which can corrupt playback state.
	let bgAudioEl = null;
	let bgSyncInterval = null;
	let bgLoopArmed = false;
	let bgLastTime = 0;
	let bgActive = false; // True when bgAudioEl is handling playback

	// Debug log for background playback diagnostics (survives lock screen)
	function bgLog(msg) {
		console.log('[BG]', msg);
		try {
			const log = JSON.parse(sessionStorage.getItem('kjo_bg_log') || '[]');
			log.push(`${new Date().toISOString().slice(11,19)} ${msg}`);
			if (log.length > 50) log.shift();
			sessionStorage.setItem('kjo_bg_log', JSON.stringify(log));
		} catch {}
	}

	/**
	 * Create a FRESH background Audio element for each track transition.
	 * Each handler checks `el === bgAudioEl` so stale elements (from the
	 * previous track) don't corrupt state. The overlap between new element
	 * starting and old element stopping keeps Chrome's audio focus alive.
	 */
	function createBgAudio() {
		const el = document.createElement('audio');
		el.preload = 'auto';

		el.addEventListener('playing', () => {
			if (el !== bgAudioEl) return;
			if (el.paused) return;  // Spurious event guard (Bluetooth devices)
			bgLog('bgEl: playing event');
			cancelBgCleanup(); // Cancel any pending memory cleanup
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
				// Schedule memory cleanup if tab is in background
				if (document.visibilityState === 'hidden') {
					scheduleBgCleanup();
				}
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
			if (!Number.isFinite(dur) || bgLastTime < dur - 6) return;
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

	/** Release an old background audio element (stop playback, free resources). */
	function releaseBgElement(el) {
		if (!el) return;
		try {
			el.pause();
			el.removeAttribute('src');
			el.load();
		} catch {}
	}

	/** Stop and reset the active background audio element. */
	function cleanupBgAudio() {
		clearInterval(bgSyncInterval);
		bgSyncInterval = null;
		bgLoopArmed = false;
		bgLastTime = 0;
		bgActive = false;
		if (bgAudioEl) {
			releaseBgElement(bgAudioEl);
			bgAudioEl = null;
		}
	}

	/**
	 * Free memory when idle in background to prevent Chrome Android tab discard.
	 * Releases ~130MB+ of decoded audio buffers. State is preserved in stores
	 * and localStorage; WaveSurfer is reloaded when the tab returns.
	 */
	function freeIdleMemory() {
		if (memoryFreed) return;
		bgLog('freeIdleMemory: releasing audio buffers');
		memoryFreed = true;

		// 1. Destroy visual wavesurfer (~63MB AudioBuffer freed)
		// The reactive $effect will recreate it when the player becomes visible again
		if (visualWavesurfer) {
			visualWavesurfer.destroy();
			visualWavesurfer = null;
			visualWavesurferReady = false;
		}

		// 2. Revoke preloaded next-track blob (~5-10MB freed)
		if (preloadedNext) {
			URL.revokeObjectURL(preloadedNext.blobUrl);
			preloadedNext = null;
		}

		// 3. Empty main wavesurfer's decoded audio buffer (~63MB freed)
		// wavesurfer.empty() loads a tiny placeholder, releasing the AudioBuffer
		// but keeping the WaveSurfer instance alive for event handlers
		if (wavesurfer) {
			wavesurfer.empty();
		}

		// 4. Save state as safety net before potential discard
		savePlayerState();
	}

	function cancelBgCleanup() {
		if (bgCleanupTimer) {
			clearTimeout(bgCleanupTimer);
			bgCleanupTimer = null;
		}
	}

	function scheduleBgCleanup() {
		cancelBgCleanup();
		bgCleanupTimer = setTimeout(() => {
			bgCleanupTimer = null;
			if (document.visibilityState === 'hidden' && !get(isPlaying)) {
				freeIdleMemory();
			}
		}, 5 * 60 * 1000); // 5 min — Web Lock is primary protection; this is a belt-and-suspenders measure
	}

	/** Sync playhead + Loop Bridge for the background audio element. */
	function bgSyncPlayhead() {
		if (!bgAudioEl) return;
		const t = bgAudioEl.currentTime;
		const dur = bgAudioEl.duration;
		if (!Number.isFinite(dur) || dur <= 0) return;

		// Loop Bridge: detect backwards jump (loop → restart at 0)
		if (bgLoopArmed && t < 1 && bgLastTime > dur - 6) {
			bgLoopArmed = false;
			bgAudioEl.loop = false;
			clearInterval(bgSyncInterval);
			bgSyncInterval = null;
			bgLog('bgEl: loop→advance (sync)');
			nextTrack();
			return;
		}

		playerPosition.set(t);
		if (!bgAudioEl.paused) {
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

		// Loop Bridge: arm loop near track end
		bgLastTime = t;
		if ((dur - t) < 5 && !bgLoopArmed) {
			bgLoopArmed = true;
			bgAudioEl.loop = true;
			bgLog('bgEl: loop armed, remaining=' + (dur - t).toFixed(1) + 's');
		}
	}

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
			setupMediaSessionHandlers(wavesurfer);

			// Set initial volume
			wavesurfer.setVolume($volume);
			
			// Wavesurfer event listeners
			wavesurfer.on('ready', () => {
				console.log('Wavesurfer ready event fired');
				isLoading = false;
				// Guard: empty() fires 'ready' with tiny duration — don't corrupt saved state
				if (memoryFreed) return;
				const dur = wavesurfer.getDuration();
				duration = formatTime(dur);
				playerDuration.set(dur);
			});
			
			// Use native media element timeupdate + setInterval for reliable Android playback.
			// WaveSurfer's rAF-based timeupdate stalls on Android when throttled.
			const mediaEl = wavesurfer.getMediaElement();
			let playbackInterval = null;

			function syncPlayhead() {
				if (bgActive) return; // Background element is handling playback
				const t = mediaEl.currentTime;
				const dur = mediaEl.duration;
				// Skip during track transition when duration is NaN or invalid
				if (!Number.isFinite(dur) || dur <= 0) return;

				// Loop Bridge: detect backwards jump (loop triggered, track restarted at 0).
				// Must check BEFORE updating lastSyncedTime.
				if (loopPendingAdvance && t < 1 && lastSyncedTime > dur - 6) {
					loopPendingAdvance = false;
					mediaEl.loop = false;
					clearInterval(playbackInterval);
					bgLog('loop→advance (sync), vis=' + document.visibilityState);
					nextTrack();
					return;
				}

				currentTime = formatTime(t);
				playerPosition.set(t);
				// Only update visual waveform and media session when actively playing.
				// Stray timeupdate events on paused elements must not fight with
				// another active player's media session position updates.
				if (!mediaEl.paused) {
					if (visualWavesurfer && visualWavesurfer.getDuration() > 0) {
						visualWavesurfer.seekTo(t / dur);
					}
					updateMediaSessionPosition(dur, t);
				}

				// Preload next track when ~80% done (while page is still active).
				// Fetches as blob so background advancement can use blob URL
				// (no network needed when track ends on locked screen).
				if (t / dur > 0.8 && !preloadedNext && !preloadingInProgress) {
					preloadingInProgress = true;
					let tracks, idx;
					playlist.subscribe(v => tracks = v)();
					currentTrackIndex.subscribe(v => idx = v)();
					if (tracks && tracks.length > 1) {
						const nextIdx = (idx + 1) % tracks.length;
						const nextUrl = getAudioUrl(tracks[nextIdx].audioUrl);
						bgLog(`preloading idx=${nextIdx} ${tracks[nextIdx].title}`);
						fetch(nextUrl)
							.then(r => r.blob())
							.then(blob => {
								preloadedNext = {
									httpUrl: nextUrl,
									blobUrl: URL.createObjectURL(blob)
								};
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

				// Loop Bridge: arm loop when within 5s of track end.
				// When the track reaches the end with loop=true, the browser
				// fires 'seeked' (NOT 'ended'), keeping the audio element in
				// a playing state. Chrome Android never sees "audio stopped"
				// so the media notification persists across track transitions.
				lastSyncedTime = t;
				if ((dur - t) < 5 && !loopPendingAdvance) {
					loopPendingAdvance = true;
					mediaEl.loop = true;
					bgLog('loop armed, remaining=' + (dur - t).toFixed(1) + 's');
				}
			}

			mediaEl.addEventListener('timeupdate', syncPlayhead);

			wavesurfer.on('play', () => {
				console.log('Wavesurfer play event');
				isPlaying.set(true);
				// Poll at 10Hz as fallback for smooth updates on Android
				clearInterval(playbackInterval);
				playbackInterval = setInterval(syncPlayhead, 100);
				// Re-register handlers so Android/Bluetooth controls point to this player
				// (a track player may have overwritten them via setupMediaSessionForElement)
				setupMediaSessionHandlers(wavesurfer);
				updateMediaSessionMetadata($currentTrack, $currentTrackArtwork);
				updateMediaSessionPlaybackState('playing');
			});

			// Native 'playing' event: safety net for background track transitions.
			// When mediaEl.src is changed directly (bypassing WaveSurfer.load()),
			// WaveSurfer may not emit its own 'play' event. The native 'playing'
			// event fires reliably and ensures the sync interval is running.
			mediaEl.addEventListener('playing', () => {
				// Guard: on some Bluetooth devices (Tesla), a spurious 'playing' event
				// fires after pause. Check mediaEl.paused to avoid flipping state back.
				if (mediaEl.paused) return;
				if (!playbackInterval) {
					bgLog('native playing event → starting sync interval');
					playbackInterval = setInterval(syncPlayhead, 100);
				}
				isPlaying.set(true);
				updateMediaSessionPlaybackState('playing');
			});

			wavesurfer.on('pause', () => {
				console.log('Wavesurfer pause event');
				// Don't update state when a track ends naturally or during loading
				// (src change fires pause before ended, and during load transitions)
				if (!mediaEl.ended && !isLoadingTrack) {
					isPlaying.set(false);
					clearInterval(playbackInterval);
					playbackInterval = null;
					syncPlayhead();
					updateMediaSessionPlaybackState('paused');
				}
			});

			// Loop Bridge: catch the loop-back seeked event and advance track.
			// When loop is armed and track reaches the end, the browser loops
			// to position 0 and fires 'seeked'. We detect this and call nextTrack().
			mediaEl.addEventListener('seeked', () => {
				if (!loopPendingAdvance || mediaEl.currentTime > 1) return;
				const dur = mediaEl.duration;
				// Guard against false positives (user seeking to start manually)
				if (!Number.isFinite(dur) || lastSyncedTime < dur - 6) return;
				loopPendingAdvance = false;
				mediaEl.loop = false;
				clearInterval(playbackInterval);
				playbackInterval = null;
				bgLog('loop→advance, vis=' + document.visibilityState);
				nextTrack();
			});

			// Fallback: 'ended' fires only if loop bridge didn't catch it.
			mediaEl.addEventListener('ended', () => {
				if (isLoadingTrack) {
					bgLog('ended ignored (loading)');
					return;
				}
				loopPendingAdvance = false;
				mediaEl.loop = false;
				clearInterval(playbackInterval);
				playbackInterval = null;
				bgLog('ended→advance (fallback), vis=' + document.visibilityState);
				nextTrack();
			});
			
			wavesurfer.on('error', (error) => {
				console.error('Wavesurfer error:', error);
				isLoading = false;
			});

			// Handle background memory cleanup and foreground restoration
			function handleVisibilityChange() {
				// ── Tab going to background ──────────────────────────────
				if (document.visibilityState === 'hidden') {
					const audioPlaying = !mediaEl.paused || (bgAudioEl && !bgAudioEl.paused);
					if (!audioPlaying) {
						// No audio playing — free memory immediately to reduce discard risk
						freeIdleMemory();
					}
					return;
				}

				// ── Tab returning to foreground ──────────────────────────
				cancelBgCleanup(); // Cancel any pending delayed cleanup
				mediaEl.autoplay = false;

				// If memory was freed while in background, reload the track
				if (memoryFreed && wavesurfer) {
					memoryFreed = false;
					let track;
					currentTrack.subscribe(t => track = t)();
					if (track?.audioUrl) {
						bgLog('restoring emptied ws: ' + track.title);
						const url = getAudioUrl(track.audioUrl);
						const savedPos = get(playerPosition);
						setupMediaSessionHandlers(wavesurfer);
						isLoadingTrack = true;
						wavesurfer.load(url).then(() => {
							if (savedPos > 0) {
								const dur = wavesurfer.getDuration();
								if (dur > 0) wavesurfer.seekTo(savedPos / dur);
							}
							isLoadingTrack = false;
							const dur = wavesurfer.getDuration();
							duration = formatTime(dur);
							playerDuration.set(dur);
						}).catch(err => {
							console.error('Restore load error:', err);
							isLoadingTrack = false;
						});
					}
					return;
				}

				// If bgAudioEl was handling playback, transfer back to WaveSurfer
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
							duration = formatTime(dur);
							playerDuration.set(dur);
						}).catch(err => {
							console.error('Transfer load error:', err);
							isLoadingTrack = false;
						});
					}
					return;
				}

				// Fallback: resync WaveSurfer's own element (if bg path used mediaEl directly)
				if (!needsWavesurferResync || !wavesurfer) return;
				needsWavesurferResync = false;

				let track;
				currentTrack.subscribe(t => track = t)();
				if (track?.audioUrl) {
					bgLog('resync WaveSurfer: ' + track.title);
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
						duration = formatTime(dur);
						playerDuration.set(dur);
					}).catch(err => {
						console.error('Resync load error:', err);
						isLoadingTrack = false;
					});
				}
			}
			document.addEventListener('visibilitychange', handleVisibilityChange);

			// Last-chance save before Chrome discards the tab
			window.addEventListener('pagehide', savePlayerState);

			// Page Lifecycle: freeze fires right before Chrome freezes the tab
			// (mandatory step before discard). Save state as last resort.
			document.addEventListener('freeze', () => {
				bgLog('freeze event');
				savePlayerState();
			});

			// Page Lifecycle: resume fires if the tab is unfrozen without discard.
			// Re-acquire the keep-alive lock if the player still has state.
			document.addEventListener('resume', () => {
				bgLog('resume event');
				if (get(playerVisible) && get(currentTrack)) {
					acquireKeepAliveLock();
				}
			});

			bgLog('init OK, ws=' + !!wavesurfer);

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
		if (bgAudioEl) {
			bgAudioEl.volume = $volume;
		}
	});
	
	// Web Lock: acquire when player has a loaded track, release when closed
	$effect(() => {
		if ($playerVisible && $currentTrack?.audioUrl) {
			acquireKeepAliveLock();
		} else {
			releaseKeepAliveLock();
		}
	});

	// Load track when wavesurfer becomes ready if track was set before
	$effect(() => {
		if (wavesurferReady && wavesurfer && wavesurfer.getDuration() === 0) {
			// Read store directly to avoid stale $currentTrack
			let track;
			currentTrack.subscribe(t => track = t)();
			if (track?.audioUrl) {
				const isRestore = get(restoredFromSession);
				console.log('Wavesurfer became ready, loading pending track:', track.title, isRestore ? '(restored)' : '');
				if (isRestore) {
					// Session restore: load track without autoPlay, seek to saved position
					const savedPos = get(playerPosition);
					restoredFromSession.set(false);
					loadTrack(track, false).then(() => {
						if (wavesurfer && savedPos > 0) {
							const dur = wavesurfer.getDuration();
							if (dur > 0) wavesurfer.seekTo(savedPos / dur);
						}
						// Re-extract artwork (not persisted across discard)
						extractCoverArt(track.audioUrl).then(art => {
							currentTrackArtwork.set(art);
						}).catch(() => {});
					});
				} else {
					loadTrack(track, true);
				}
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
				const isRestore = get(restoredFromSession);
				console.log('Player reopened, reloading track:', $currentTrack.title, isRestore ? '(restored)' : '');
				// Use setTimeout to ensure wavesurfer is fully initialized
				setTimeout(() => {
					if (wavesurfer && wavesurfer.getDuration() === 0) {
						loadTrack($currentTrack, !isRestore);
						if (isRestore) restoredFromSession.set(false);
					}
				}, 100);
			}
		}

		wasVisible = isNowVisible;
	});

	// Update Media Session metadata when track or artwork changes
	$effect(() => {
		if ($currentTrack) {
			updateMediaSessionMetadata($currentTrack, $currentTrackArtwork);
		}
	});

	// Scroll lock: prevent body scrolling when library browser or playlist panel is open
	// Release when player is closed, minimized, or panels are collapsed
	// Guard: don't reset overflow when gallery viewer (ContentViewerModal) has its own scroll lock
	$effect(() => {
		if (!browser) return;
		if ($playerVisible && !$playerMinimized && (showBrowser || showPlaylist)) {
			document.body.style.overflow = 'hidden';
		} else if (!$contentViewerOpen) {
			document.body.style.overflow = '';
		}
		return () => {
			if (!$contentViewerOpen) {
				document.body.style.overflow = '';
			}
		};
	});

	async function loadTrack(track, autoPlay = false) {
		if (!wavesurfer || !track.audioUrl) {
			console.log('Cannot load track:', { wavesurfer: !!wavesurfer, audioUrl: track?.audioUrl });
			return;
		}

		isLoading = true;
		isLoadingTrack = true; // Block spurious ended events during load
		loopPendingAdvance = false; // Reset loop bridge state for new track
		const url = getAudioUrl(track.audioUrl);
		const isBackground = document.visibilityState === 'hidden';
		bgLog(`loadTrack "${track.title}" auto=${autoPlay} bg=${isBackground}`);

		// Clean up any stale preloaded data for a different URL
		if (preloadedNext && preloadedNext.httpUrl !== url) {
			URL.revokeObjectURL(preloadedNext.blobUrl);
			preloadedNext = null;
		}

		try {
			if (isBackground) {
				// ── Background: create a FRESH Audio element for each transition ──
				// Changing src on an existing playing element causes a playback gap
				// that Chrome sees as "audio stopped" → drops media notification.
				// By creating a new element, we start it BEFORE stopping the old one
				// (overlap), so Chrome never sees a gap in audio output.
				const oldBg = bgAudioEl;
				bgActive = true; // WaveSurfer's syncPlayhead should stop updating

				const bg = createBgAudio();
				const effectiveUrl = preloadedNext?.blobUrl || url;
				bgLog(`loadTrack→bgEl "${track.title}" src=${preloadedNext ? 'blob' : 'http'} newEl=true`);

				// Reset loop bridge state for new track
				bgLoopArmed = false;
				bgLastTime = 0;
				clearInterval(bgSyncInterval);
				bgSyncInterval = null;

				// Set bgAudioEl to new element BEFORE play so handlers identify correctly
				bgAudioEl = bg;

				// Register media session handlers for the new background element
				updateMediaSessionMetadata(track, null);
				setupMediaSessionForElement(bg);

				// Load and play new element
				bg.src = effectiveUrl;
				bg.volume = $volume;

				if (autoPlay) {
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
				}

				// Stop OLD element AFTER new one is playing (overlap preserves audio focus)
				if (oldBg) {
					releaseBgElement(oldBg);
					bgLog('released old bgEl');
				}

				// Pause WaveSurfer's element (bgAudioEl is now the audio source)
				try {
					const wsEl = wavesurfer.getMediaElement();
					if (wsEl && !wsEl.paused) {
						wsEl.pause();
						wsEl.loop = false;
					}
				} catch {}

				// Start sync interval on new bgAudioEl
				// Clear first: the 'playing' event handler may have already started one
				clearInterval(bgSyncInterval);
				bgSyncInterval = setInterval(bgSyncPlayhead, 100);

				needsWavesurferResync = true;

				// Extract artwork in background (non-blocking)
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

				const mediaEl = wavesurfer.getMediaElement();
				mediaEl.loop = false;
				// Foreground: full WaveSurfer load (blob fetch + decode + waveform)
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
					pauseAllTrackPlayers();
					await wavesurfer.play();
				}

				// Clear preload state for next cycle
				preloadedNext = null;
				preloadingInProgress = false;
			}
		} catch (error) {
			bgLog(`loadTrack error: ${error.message}`);
			console.error('loadTrack error:', error, track.audioUrl);
			isLoading = false;
		} finally {
			isLoadingTrack = false; // Re-enable ended event handling
		}
	}
	
	async function togglePlayPause() {
		if (!wavesurfer || !wavesurferReady) {
			console.log('No wavesurfer instance available or not ready:', { wavesurfer: !!wavesurfer, ready: wavesurferReady });
			return;
		}
		
		if (!$currentTrack || !$currentTrack.audioUrl) {
			// No track loaded — try dynamic playlist if one exists
			if ($dynamicPlaylist.length > 0) {
				playDynamicPlaylist(0);
				return;
			}
			console.log('No current track or audio URL');
			return;
		}
		
		console.log('Toggle play/pause. Current state - playing:', wavesurfer.isPlaying(), 'loaded:', wavesurfer.getDuration() > 0);
		
		try {
			// If bgAudioEl still exists (e.g. user dismissed Android lock screen controls
			// which paused it, then tapped play in the app), clean it up and let WaveSurfer
			// take over to avoid two audio elements conflicting.
			if (bgAudioEl) {
				bgLog('togglePlayPause: cleaning up stale bgAudioEl');
				const bgPos = bgAudioEl.currentTime;
				const bgDur = bgAudioEl.duration;
				cleanupBgAudio();
				needsWavesurferResync = false;
				// Reload WaveSurfer with the current track at bgAudioEl's position
				if ($currentTrack?.audioUrl) {
					const url = getAudioUrl($currentTrack.audioUrl);
					setupMediaSessionHandlers(wavesurfer);
					isLoadingTrack = true;
					await wavesurfer.load(url);
					if (Number.isFinite(bgDur) && bgDur > 0) wavesurfer.seekTo(bgPos / bgDur);
					isLoadingTrack = false;
					duration = formatTime(bgDur);
					playerDuration.set(bgDur);
					pauseAllTrackPlayers();
					await wavesurfer.play();
					return;
				}
			}

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
				pauseAllTrackPlayers();
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

		// Close panels when minimizing so scroll lock releases
		if (wasMinimized === false) {
			showBrowser = false;
			showPlaylist = false;
		}

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
		showBrowser = false;
		showPlaylist = false;
		if (wavesurfer) {
			wavesurfer.pause();
		}
		// Clear all track state so next open loads a fresh track
		closePlayerCompletely();
	}
	
	onDestroy(() => {
		releaseKeepAliveLock();
		cancelBgCleanup();
		cleanupBgAudio();
		if (bgAudioEl) {
			bgAudioEl.src = '';
			bgAudioEl = null;
		}
		if (wavesurfer) {
			wavesurfer.destroy();
		}
		if (visualWavesurfer) {
			visualWavesurfer.destroy();
		}
	});

	function refreshDebugLog() {
		try {
			const log = JSON.parse(sessionStorage.getItem('kjo_bg_log') || '[]');
			debugLogEntries = log;
		} catch { debugLogEntries = []; }
		showDebugLog = !showDebugLog;
	}
</script>

{#if !$radioMode}
	<div
		class="music-player fixed bottom-0 left-0 right-0 {$sectionModalOpen ? 'z-[60]' : 'z-50'} bg-gray-900/95 backdrop-blur-md border-t border-white/10 shadow-2xl"
		class:minimized={$playerMinimized}
		class:modal-visible={$playerMinimized && $sectionModalOpen && $playerVisible}
		class:player-hidden={!$playerVisible}>
		
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
						<!-- Radio Mode Button -->
						{#if $radioEnabled}
							<button
								onclick={() => radioModalOpen.set(true)}
								class="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1.5"
								title="Key Jay Radio"
							>
								<Icon icon="mdi:radio-tower" width={20} height={20} class="text-orange-400" />
								{#if $activeSection === 'music'}
									<span class="text-xs text-orange-400 font-medium hidden sm:inline">Radio</span>
								{/if}
							</button>
						{/if}
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
						{#if $playlistSource === 'dynamic'}
							<span class="text-green-400">Dynamic Playlist</span>
							{#if $playlist.length > 1} — Track {$currentTrackIndex + 1} of {$playlist.length}{/if}
						{:else if $playlist.length > 1}
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
						{#if $playlistSource === 'dynamic'}
							<button
								onclick={() => { clearDynamicPlaylist(); closePlayer(); }}
								class="px-3 py-1 text-xs bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-full transition-colors"
								title="Clear dynamic playlist"
							>
								<Icon icon="mdi:playlist-remove" width={16} height={16} class="inline mr-1" />
								Clear All
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
						{#if maintenanceBypass}
						<button
							onclick={refreshDebugLog}
							class="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-500 rounded-full transition-colors"
							title="Toggle background playback debug log"
						>
							<Icon icon="mdi:bug" width={14} height={14} class="inline" />
						</button>
						{/if}
					</div>
				</div>

				<!-- Debug Log Panel -->
				{#if showDebugLog && maintenanceBypass}
					<div class="mt-2 max-h-40 overflow-y-auto bg-black/60 rounded-lg p-2 font-mono text-[10px] text-green-400 leading-tight" transition:slide={{ duration: 200 }}>
						{#if debugLogEntries.length === 0}
							<div class="text-gray-500">No log entries yet. Play a track and let it run.</div>
						{:else}
							{#each debugLogEntries as entry}
								<div>{entry}</div>
							{/each}
						{/if}
					</div>
				{/if}

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
					{#if $radioEnabled}
						<button
							onclick={() => radioModalOpen.set(true)}
							class="p-2 hover:bg-white/10 rounded-full transition-colors"
							title="Key Jay Radio"
						>
							<Icon icon="mdi:radio-tower" width={16} height={16} class="text-orange-400" />
						</button>
					{/if}
					<button
						onclick={toggleMinimize}
						class="p-2 hover:bg-white/10 rounded-full transition-colors"
						title="Expand player"
					>
						<Icon icon="mdi:chevron-up" width={16} height={16} class="text-gray-400" />
					</button>

					<button
						onclick={() => hidePlayer()}
						class="p-2 hover:bg-white/10 rounded-full transition-colors"
						title="Hide player"
					>
						<Icon icon="mdi:chevron-down" width={16} height={16} class="text-gray-400" />
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

	/* Animate player sliding in/out */
	.music-player {
		transition: transform 0.3s ease, opacity 0.3s ease;
	}

	/* Hidden state: player slides off-screen but stays in DOM so audio continues */
	.music-player.player-hidden {
		transform: translateY(100%);
		opacity: 0;
		pointer-events: none;
	}

	/* Mobile: slide out when minimized (keeps DOM alive so music continues) */
	@media (max-width: 768px) {
		.music-player.minimized {
			transform: translateY(100%);
			opacity: 0;
			pointer-events: none;
		}

		.music-player.minimized.modal-visible {
			transform: translateY(0);
			opacity: 1;
			pointer-events: auto;
		}
	}
</style>