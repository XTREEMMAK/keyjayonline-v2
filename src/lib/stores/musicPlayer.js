import { writable } from 'svelte/store';
import { extractCoverArt, preloadCoverArt } from '$lib/utils/coverArtExtractor.js';

// Player state
export const playerVisible = writable(false);
export const isPlaying = writable(false);
export const currentTrack = writable(null);
export const currentTrackArtwork = writable(null); // Extracted cover art
export const artworkLoading = writable(false); // Loading state for artwork extraction
export const playlist = writable([]);
export const currentTrackIndex = writable(0);
export const playerPosition = writable(0);
export const playerDuration = writable(0);
export const volume = writable(0.6);

// Player instance (for sharing across components)
export const wavesurferInstance = writable(null);

// Player functions
export function showPlayer() {
	playerVisible.set(true);
}

export function hidePlayer() {
	playerVisible.set(false);
}

export function togglePlayer() {
	playerVisible.update(visible => !visible);
}

export function loadPlaylist(tracks, startIndex = 0) {
	playlist.set(tracks);
	currentTrackIndex.set(startIndex);
	if (tracks[startIndex]) {
		currentTrack.set(tracks[startIndex]);
		// Extract artwork for the current track
		extractTrackArtwork(tracks[startIndex]);
		
		// Preload artwork for other tracks in background
		preloadPlaylistArtwork(tracks);
	}
}

export function loadRandomTrack() {
	// Import audioPlaylists and create a shuffled playlist starting with a random track
	import('../data/audioPlaylists.js').then(module => {
		const { getAllTracks } = module;
		const allTracks = getAllTracks();
		if (allTracks.length > 0) {
			// Shuffle all tracks
			const shuffledTracks = [...allTracks].sort(() => Math.random() - 0.5);
			
			// Load the shuffled playlist
			playlist.set(shuffledTracks);
			currentTrackIndex.set(0);
			currentTrack.set(shuffledTracks[0]);
		}
	});
}

export function playTrack(trackIndex) {
	let tracks;
	playlist.subscribe(val => tracks = val)();
	if (tracks && tracks[trackIndex]) {
		currentTrackIndex.set(trackIndex);
		currentTrack.set(tracks[trackIndex]);
		// Extract artwork for the new track
		extractTrackArtwork(tracks[trackIndex]);
	}
}

// Extract artwork for a track
async function extractTrackArtwork(track) {
	if (!track || !track.audioUrl) {
		currentTrackArtwork.set(null);
		artworkLoading.set(false);
		return;
	}

	artworkLoading.set(true);
	try {
		const artwork = await extractCoverArt(track.audioUrl);
		currentTrackArtwork.set(artwork);
		
		if (!artwork) {
			console.log('No embedded artwork found for:', track.title, '- will use fallback');
		}
	} catch (error) {
		console.warn('Could not extract artwork for track:', track.title, '- will use fallback');
		currentTrackArtwork.set(null);
	} finally {
		artworkLoading.set(false);
	}
}

// Preload artwork for playlist tracks in background
async function preloadPlaylistArtwork(tracks) {
	// Don't block the main thread, run in background
	setTimeout(async () => {
		try {
			await preloadCoverArt(tracks);
			console.log('Playlist artwork preloading completed');
		} catch (error) {
			console.error('Error preloading playlist artwork:', error);
		}
	}, 100); // Small delay to not interfere with current track loading
}

export function nextTrack() {
	let tracks, currentIndex;
	playlist.subscribe(val => tracks = val)();
	currentTrackIndex.subscribe(val => currentIndex = val)();
	
	if (tracks && tracks.length > 0) {
		const nextIndex = (currentIndex + 1) % tracks.length;
		playTrack(nextIndex);
	}
}

export function previousTrack() {
	let tracks, currentIndex;
	playlist.subscribe(val => tracks = val)();
	currentTrackIndex.subscribe(val => currentIndex = val)();
	
	if (tracks && tracks.length > 0) {
		const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
		playTrack(prevIndex);
	}
}

// Utility to get current store values (for use in components)
function getStoreValue(store) {
	let value;
	store.subscribe(val => value = val)();
	return value;
}

export { getStoreValue };