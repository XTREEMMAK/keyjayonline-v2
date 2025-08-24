import { loadPlaylist, showPlayer, playTrack } from '$lib/stores/musicPlayer.js';

/**
 * Convert album tracks to music player playlist format
 * @param {Object} album - Album object
 * @returns {Array} - Array of tracks formatted for music player
 */
export function albumToPlaylist(album) {
	if (!album.tracks || !Array.isArray(album.tracks)) {
		return [];
	}
	
	return album.tracks
		.filter(track => track.audio_file_url) // Only tracks with audio
		.map(track => ({
			id: track.id,
			title: track.title,
			artist: album.artist || 'Unknown Artist',
			audioUrl: track.audio_file_url,
			duration: track.duration,
			album: album.title,
			coverArt: album.cover_art
		}));
}

/**
 * Play an album in the persistent music player
 * @param {Object} album - Album object
 * @param {number} startTrackIndex - Index of track to start playing (default: 0)
 */
export function playAlbum(album, startTrackIndex = 0) {
	const playlist = albumToPlaylist(album);
	
	if (playlist.length === 0) {
		console.warn('No playable tracks found in album:', album.title);
		return;
	}
	
	loadPlaylist(playlist, startTrackIndex);
	showPlayer();
}

/**
 * Play a specific track from an album
 * @param {Object} album - Album object
 * @param {Object} track - Track object
 */
export function playTrackFromAlbum(album, track) {
	const playlist = albumToPlaylist(album);
	const trackIndex = playlist.findIndex(t => t.id === track.id);
	
	if (trackIndex === -1) {
		console.warn('Track not found in playlist:', track.title);
		return;
	}
	
	playAlbum(album, trackIndex);
}

/**
 * Add a "Play" button to existing album cards
 * @param {Object} album - Album object
 * @param {Function} callback - Optional callback after play starts
 */
export function createPlayButton(album, callback = null) {
	return (event) => {
		event.stopPropagation(); // Prevent album modal from opening
		playAlbum(album);
		if (callback) callback();
	};
}