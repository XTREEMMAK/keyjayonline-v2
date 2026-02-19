import { writable, get } from 'svelte/store';
import { extractCoverArt, preloadCoverArt } from '$lib/utils/coverArtExtractor.js';
import { getAudioUrl } from '$lib/utils/environment.js';

// Transform track URLs from Directus to proxy URLs for CORS handling
function transformTrackUrls(track) {
	return {
		...track,
		audioUrl: track.audioUrl ? getAudioUrl(track.audioUrl) : null,
		thumbnail: track.thumbnail ? getAudioUrl(track.thumbnail) : null
	};
}

// Player state
export const playerVisible = writable(false);
export const playerMinimized = writable(false); // Track minimized state
export const isPlaying = writable(false);
export const currentTrack = writable(null);
export const currentTrackArtwork = writable(null); // Extracted cover art
export const artworkLoading = writable(false); // Loading state for artwork extraction
export const playlist = writable([]);
export const currentTrackIndex = writable(0);
export const playerPosition = writable(0);
export const playerDuration = writable(0);
export const volume = writable(0.6);
export const playlistSource = writable('library'); // 'library' | 'production' | 'radio' | 'dynamic'

// Radio-specific state
export const radioMode = writable(false);
export const radioModalOpen = writable(false);
export const radioEnabled = writable(false);
export const shuffleMode = writable(false);
export const shuffleHistory = writable([]); // Last N played track indices (no repeats)

// Player instance (for sharing across components)
export const wavesurferInstance = writable(null);

// Player functions
export function showPlayer() {
	playerVisible.set(true);
}

export function hidePlayer() {
	playerVisible.set(false);
}

/**
 * Close the player completely and clear track state.
 * Used when user explicitly closes the player (not just minimize).
 * Next time player opens, it will load a fresh track.
 */
export function closePlayerCompletely() {
	playerVisible.set(false);
	currentTrack.set(null);
	currentTrackArtwork.set(null);
	playlist.set([]);
	currentTrackIndex.set(0);
	playerPosition.set(0);
	playerDuration.set(0);
	playlistSource.set('library');
}

export function togglePlayer() {
	playerVisible.update(visible => !visible);
}

/**
 * Pause the global music player.
 * Used to stop music when other audio (voice samples) starts playing.
 */
export function pauseMusic() {
	const instance = get(wavesurferInstance);
	if (instance?.isPlaying()) {
		instance.pause();
		isPlaying.set(false);
	}
}

/**
 * Expand the music player (set minimized to false)
 */
export function expandPlayer() {
	playerMinimized.set(false);
}

/**
 * Minimize the music player (set minimized to true)
 */
export function minimizePlayer() {
	playerMinimized.set(true);
}

/**
 * Check if a track is currently loaded
 */
export function hasTrackLoaded() {
	return get(currentTrack) !== null;
}

export function loadPlaylist(tracks, startIndex = 0, source = 'library') {
	playlistSource.set(source);
	// Transform URLs from Directus to proxy URLs
	const transformedTracks = tracks.map(transformTrackUrls);

	playlist.set(transformedTracks);
	currentTrackIndex.set(startIndex);
	if (transformedTracks[startIndex]) {
		currentTrack.set(transformedTracks[startIndex]);
		// Extract artwork for the current track
		extractTrackArtwork(transformedTracks[startIndex]);

		// Preload artwork for other tracks in background
		preloadPlaylistArtwork(transformedTracks);
	}
}

export async function loadRandomTrack() {
	try {
		// Try to fetch from Directus API
		const response = await fetch('/api/music-samples?shuffle=true');

		if (response.ok) {
			const tracks = await response.json();

			if (tracks && tracks.length > 0) {
				// Transform URLs from Directus to proxy URLs
				const transformedTracks = tracks.map(transformTrackUrls);

				// Load the shuffled playlist from Directus
				playlist.set(transformedTracks);
				currentTrackIndex.set(0);
				currentTrack.set(transformedTracks[0]);

				// Extract artwork for the current track
				extractTrackArtwork(transformedTracks[0]);

				// Preload artwork for other tracks in background
				preloadPlaylistArtwork(transformedTracks);
				return;
			}
		}

		// If API fails or returns no tracks, fall back to static files
		throw new Error('API returned no tracks or failed');

	} catch (error) {
		console.log('Loading from static audioPlaylists (Directus unavailable):', error.message);

		// Fallback: Import audioPlaylists and create a shuffled playlist
		import('../data/audioPlaylists.js').then(module => {
			const { getAllTracks } = module;
			const allTracks = getAllTracks();
			if (allTracks.length > 0) {
				// Shuffle all tracks
				const shuffledTracks = [...allTracks].sort(() => Math.random() - 0.5);

				// Transform URLs (static tracks may also need transformation)
				const transformedTracks = shuffledTracks.map(transformTrackUrls);

				// Load the shuffled playlist
				playlist.set(transformedTracks);
				currentTrackIndex.set(0);
				currentTrack.set(transformedTracks[0]);

				// Extract artwork for the current track
				extractTrackArtwork(transformedTracks[0]);

				// Preload artwork for other tracks in background
				preloadPlaylistArtwork(transformedTracks);
			}
		});
	}
}

export async function loadLibraryPlaylist(libraryKey) {
	try {
		// Fetch library-specific tracks from Directus API
		const response = await fetch(`/api/music-samples?library=${libraryKey}`);

		if (response.ok) {
			const tracks = await response.json();

			if (tracks && tracks.length > 0) {
				// Transform URLs from Directus to proxy URLs
				const transformedTracks = tracks.map(transformTrackUrls);

				// Load the library playlist
				playlist.set(transformedTracks);
				currentTrackIndex.set(0);
				currentTrack.set(transformedTracks[0]);

				// Extract artwork for the current track
				extractTrackArtwork(transformedTracks[0]);

				// Preload artwork for other tracks in background
				preloadPlaylistArtwork(transformedTracks);
				return;
			}
		}

		// If API fails, fall back to static files
		throw new Error('API returned no tracks or failed');

	} catch (error) {
		console.log(`Loading ${libraryKey} from static audioPlaylists (Directus unavailable):`, error.message);

		// Fallback: Import audioPlaylists and get tracks by genre
		import('../data/audioPlaylists.js').then(module => {
			const { getTracksByGenre } = module;
			const libraryTracks = getTracksByGenre(libraryKey);

			if (libraryTracks && libraryTracks.length > 0) {
				// Transform URLs (static tracks may also need transformation)
				const transformedTracks = libraryTracks.map(transformTrackUrls);

				// Load the library playlist
				playlist.set(transformedTracks);
				currentTrackIndex.set(0);
				currentTrack.set(transformedTracks[0]);

				// Extract artwork for the current track
				extractTrackArtwork(transformedTracks[0]);

				// Preload artwork for other tracks in background
				preloadPlaylistArtwork(transformedTracks);
			}
		});
	}
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

/**
 * Load a radio playlist and enter radio mode.
 * Sets radioMode, transforms URLs, extracts artwork.
 * @param {Array} tracks - Array of track objects from the radio API
 */
export function loadRadioPlaylist(tracks) {
	radioMode.set(true);
	playlistSource.set('radio');
	const transformedTracks = tracks.map(transformTrackUrls);
	playlist.set(transformedTracks);
	currentTrackIndex.set(0);
	if (transformedTracks[0]) {
		currentTrack.set(transformedTracks[0]);
		extractTrackArtwork(transformedTracks[0]);
		preloadPlaylistArtwork(transformedTracks);
	}
}

/**
 * Exit radio mode and reset all radio-specific state.
 */
export function exitRadioMode() {
	radioMode.set(false);
	shuffleMode.set(false);
	shuffleHistory.set([]);
	closePlayerCompletely();
}

// ─── Dynamic Session Playlist ───────────────────────────────────────────────

export const dynamicPlaylist = writable([]);

// Hydrate from sessionStorage on module load (browser only)
if (typeof sessionStorage !== 'undefined') {
	try {
		const saved = sessionStorage.getItem('kjo_dynamic_playlist');
		if (saved) dynamicPlaylist.set(JSON.parse(saved));
	} catch { /* ignore corrupt data */ }
}

// Auto-sync to sessionStorage on changes
dynamicPlaylist.subscribe(tracks => {
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.setItem('kjo_dynamic_playlist', JSON.stringify(tracks));
	}
});

/**
 * Add a track to the dynamic session playlist.
 * Prevents duplicates by id. Transforms URLs for CORS.
 */
export function addToDynamicPlaylist(track) {
	const transformed = transformTrackUrls(track);
	dynamicPlaylist.update(tracks => {
		if (tracks.some(t => t.id === transformed.id)) return tracks;
		return [...tracks, transformed];
	});
	// Sync the active playlist if currently in dynamic mode
	if (get(playlistSource) === 'dynamic') {
		playlist.set(get(dynamicPlaylist));
	}
}

/**
 * Remove a track from the dynamic playlist by id.
 */
export function removeFromDynamicPlaylist(trackId) {
	dynamicPlaylist.update(tracks => tracks.filter(t => t.id !== trackId));
	// Sync the active playlist if currently in dynamic mode
	if (get(playlistSource) === 'dynamic') {
		const tracks = get(dynamicPlaylist);
		if (tracks.length === 0) {
			closePlayerCompletely();
		} else {
			playlist.set(tracks);
			// Adjust current index if it's now out of bounds
			const currentIdx = get(currentTrackIndex);
			if (currentIdx >= tracks.length) {
				currentTrackIndex.set(tracks.length - 1);
				currentTrack.set(tracks[tracks.length - 1]);
			}
		}
	}
}

/**
 * Clear the entire dynamic playlist.
 */
export function clearDynamicPlaylist() {
	dynamicPlaylist.set([]);
}

/**
 * Start playing the dynamic playlist from a given index.
 */
export function playDynamicPlaylist(startIndex = 0) {
	const tracks = get(dynamicPlaylist);
	if (tracks.length === 0) return;
	playlistSource.set('dynamic');
	playlist.set(tracks);
	currentTrackIndex.set(startIndex);
	currentTrack.set(tracks[startIndex]);
	extractTrackArtwork(tracks[startIndex]);
	preloadPlaylistArtwork(tracks);
	playerVisible.set(true);
}

/**
 * Check if a track is already in the dynamic playlist.
 */
export function isInDynamicPlaylist(trackId) {
	return get(dynamicPlaylist).some(t => t.id === trackId);
}

/**
 * Get upcoming tracks from the current position.
 * @param {number} count - Number of upcoming tracks to return
 * @returns {Array} Array of upcoming track objects with queueIndex
 */
export function getUpcomingQueue(count = 10) {
	const tracks = get(playlist);
	const currentIndex = get(currentTrackIndex);

	if (!tracks || tracks.length === 0) return [];

	const upcoming = [];
	for (let i = 1; i <= tracks.length && upcoming.length < count; i++) {
		const idx = (currentIndex + i) % tracks.length;
		if (idx === currentIndex) break; // Full loop
		upcoming.push({ ...tracks[idx], queueIndex: idx });
	}
	return upcoming;
}

export function nextTrack() {
	let tracks, currentIndex;
	playlist.subscribe(val => tracks = val)();
	currentTrackIndex.subscribe(val => currentIndex = val)();

	if (tracks && tracks.length > 0) {
		let nextIndex;
		const isShuffle = get(shuffleMode);

		if (isShuffle) {
			const history = get(shuffleHistory);
			const maxHistory = Math.min(10, tracks.length - 1);
			const recentIndices = new Set(history.slice(-maxHistory));
			const candidates = [];
			for (let i = 0; i < tracks.length; i++) {
				if (!recentIndices.has(i)) candidates.push(i);
			}
			nextIndex = candidates.length > 0
				? candidates[Math.floor(Math.random() * candidates.length)]
				: Math.floor(Math.random() * tracks.length);
			shuffleHistory.update(h => [...h.slice(-(maxHistory - 1)), nextIndex]);
		} else {
			nextIndex = (currentIndex + 1) % tracks.length;
		}

		playTrack(nextIndex);
		return tracks[nextIndex];
	}
	return null;
}

export function previousTrack() {
	let tracks, currentIndex;
	playlist.subscribe(val => tracks = val)();
	currentTrackIndex.subscribe(val => currentIndex = val)();

	if (tracks && tracks.length > 0) {
		const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
		playTrack(prevIndex);
		return tracks[prevIndex];
	}
	return null;
}

// Utility to get current store values (for use in components)
function getStoreValue(store) {
	let value;
	store.subscribe(val => value = val)();
	return value;
}

export { getStoreValue };