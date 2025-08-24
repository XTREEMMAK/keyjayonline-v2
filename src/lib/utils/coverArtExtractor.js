import { parseBlob } from 'music-metadata';

// Cache for storing extracted cover art to avoid re-processing
const coverArtCache = new Map();

/**
 * Extracts cover art from an audio file
 * @param {string} audioUrl - URL of the audio file
 * @returns {Promise<string|null>} - Base64 data URL of the cover art or null if not found
 */
export async function extractCoverArt(audioUrl) {
	// Check cache first
	if (coverArtCache.has(audioUrl)) {
		return coverArtCache.get(audioUrl);
	}

	try {
		console.log('Extracting cover art from:', audioUrl);
		
		// Fetch the audio file as a blob with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
		
		const response = await fetch(audioUrl, { 
			signal: controller.signal,
			headers: {
				'Range': 'bytes=0-1024000' // Only fetch first ~1MB for metadata
			}
		});
		
		clearTimeout(timeoutId);
		
		if (!response.ok) {
			if (response.status === 404) {
				console.warn('Audio file not found (404):', audioUrl);
				coverArtCache.set(audioUrl, null);
				return null;
			}
			throw new Error(`Failed to fetch audio file: ${response.status}`);
		}
		
		const blob = await response.blob();
		
		// Parse the blob to extract metadata
		const metadata = await parseBlob(blob, { skipCovers: false });
		
		// Check if there are any pictures (cover art)
		if (metadata.common.picture && metadata.common.picture.length > 0) {
			// Get the first picture (usually the cover art)
			const picture = metadata.common.picture[0];
			
			// Validate picture data
			if (picture.data && picture.data.length > 0) {
				// Convert picture data to base64
				const base64String = btoa(
					String.fromCharCode(...new Uint8Array(picture.data))
				);
				
				// Create data URL
				const dataUrl = `data:${picture.format};base64,${base64String}`;
				
				// Cache the result
				coverArtCache.set(audioUrl, dataUrl);
				
				console.log('Cover art extracted successfully for:', audioUrl);
				return dataUrl;
			}
		}
		
		console.log('No valid cover art found in:', audioUrl);
		// Cache null result to avoid re-processing files without artwork
		coverArtCache.set(audioUrl, null);
		return null;
	} catch (error) {
		if (error.name === 'AbortError') {
			console.warn('Cover art extraction timed out for:', audioUrl);
		} else if (error.message.includes('404')) {
			console.warn('Audio file not found for cover art extraction:', audioUrl);
		} else {
			console.warn('Could not extract cover art from', audioUrl, '- will use fallback. Error:', error.message);
		}
		
		// Cache null result to avoid re-processing failed files
		coverArtCache.set(audioUrl, null);
		return null;
	}
}

/**
 * Preloads cover art for multiple tracks
 * @param {Array} tracks - Array of track objects with audioUrl property
 * @returns {Promise<void>}
 */
export async function preloadCoverArt(tracks) {
	const promises = tracks.map(async (track) => {
		if (track.audioUrl && !coverArtCache.has(track.audioUrl)) {
			try {
				await extractCoverArt(track.audioUrl);
			} catch (error) {
				// Ignore individual failures during batch processing
				console.warn('Failed to preload cover art for:', track.audioUrl);
			}
		}
	});
	
	await Promise.allSettled(promises);
	console.log('Cover art preloading completed');
}

/**
 * Clears the cover art cache
 */
export function clearCoverArtCache() {
	coverArtCache.clear();
	console.log('Cover art cache cleared');
}

/**
 * Gets cached cover art without extraction
 * @param {string} audioUrl - URL of the audio file
 * @returns {string|null|undefined} - Cached cover art or undefined if not cached
 */
export function getCachedCoverArt(audioUrl) {
	return coverArtCache.get(audioUrl);
}