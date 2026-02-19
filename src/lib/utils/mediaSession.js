/**
 * Shared Media Session API Utilities
 *
 * Provides a unified interface for the Media Session API used by both
 * the PersistentMusicPlayer and the Radio Player. Enables car/Bluetooth
 * display metadata, hardware controls, and seek bar synchronization.
 */

import { nextTrack, previousTrack } from '$lib/stores/musicPlayer.js';
import { pauseAllTrackPlayers } from './wavesurfer-helpers.js';

const FALLBACK_ARTWORK = '/img/og-social.webp';

/**
 * Setup Media Session action handlers for a WaveSurfer instance.
 * Call once when the WaveSurfer instance is created.
 * @param {WaveSurfer} wavesurfer - The WaveSurfer instance to control
 */
export function setupMediaSessionHandlers(wavesurfer) {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

	navigator.mediaSession.setActionHandler('play', () => {
		pauseAllTrackPlayers();
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

/**
 * Update Media Session metadata for the current track.
 * Call whenever the track changes.
 * @param {Object} track - Track object with title, artist
 * @param {string|null} artworkUrl - Cover art URL (data URL or image URL)
 */
export function updateMediaSessionMetadata(track, artworkUrl) {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !track) return;

	const effectiveArtwork = artworkUrl || FALLBACK_ARTWORK;
	const artworkArray = [
		{ src: effectiveArtwork, sizes: '96x96', type: 'image/png' },
		{ src: effectiveArtwork, sizes: '128x128', type: 'image/png' },
		{ src: effectiveArtwork, sizes: '256x256', type: 'image/png' },
		{ src: effectiveArtwork, sizes: '512x512', type: 'image/png' }
	];

	navigator.mediaSession.metadata = new MediaMetadata({
		title: track.title || 'Unknown Track',
		artist: track.artist || 'Key Jay',
		album: 'Key Jay Radio',
		artwork: artworkArray
	});
}

/**
 * Update Media Session playback state.
 * Call on play/pause events.
 * @param {'playing'|'paused'|'none'} state
 */
export function updateMediaSessionPlaybackState(state) {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
	navigator.mediaSession.playbackState = state;
}

/**
 * Update Media Session position state for car/device seek bars.
 * Call periodically during playback (e.g., on timeupdate events).
 * @param {number} duration - Total duration in seconds
 * @param {number} position - Current position in seconds
 */
export function updateMediaSessionPosition(duration, position) {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
	if (!navigator.mediaSession.setPositionState || duration <= 0) return;

	try {
		navigator.mediaSession.setPositionState({
			duration,
			playbackRate: 1,
			position: Math.min(position, duration)
		});
	} catch {
		// Some browsers throw if position > duration due to timing
	}
}
