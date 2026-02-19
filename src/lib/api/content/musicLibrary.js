/**
 * Music Library API Helper
 *
 * Provides metadata and fetch functions for music libraries
 */

/**
 * Library metadata with names and icons
 * Matches the library keys used in the database
 */
const LIBRARY_METADATA = {
  edm: {
    name: 'EDM',
    icon: 'mdi:music-box-multiple',
    description: 'Electronic Dance Music'
  },
  hiphop: {
    name: 'Hip Hop',
    icon: 'mdi:microphone',
    description: 'Hip Hop & Rap'
  },
  orchestral: {
    name: 'Orchestral',
    icon: 'mdi:violin',
    description: 'Orchestral & Classical'
  },
  pop: {
    name: 'Pop',
    icon: 'mdi:star',
    description: 'Pop Music'
  },
  rock: {
    name: 'Rock',
    icon: 'mdi:guitar-electric',
    description: 'Rock & Alternative'
  },
  vgm: {
    name: 'Video Game Music',
    icon: 'mdi:gamepad-variant',
    description: 'Video Game Soundtracks'
  },
  atmosphere: {
    name: 'Atmosphere',
    icon: 'mdi:weather-cloudy',
    description: 'Atmospheric & Ambient'
  }
};

/**
 * Get metadata for a specific library
 * @param {string} libraryKey - The library key (edm, hiphop, etc.)
 * @returns {Object} Library metadata with name, icon, and description
 */
export function getLibraryMetadata(libraryKey) {
  return LIBRARY_METADATA[libraryKey] || {
    name: libraryKey,
    icon: 'mdi:music-note',
    description: 'Music Library'
  };
}

/**
 * Get all library keys
 * @returns {Array<string>} Array of library keys
 */
export function getLibraryKeys() {
  return Object.keys(LIBRARY_METADATA);
}

/**
 * Get all libraries with metadata
 * @returns {Array<Object>} Array of libraries with key and metadata
 */
export function getAllLibraries() {
  return Object.entries(LIBRARY_METADATA).map(([key, metadata]) => ({
    key,
    ...metadata
  }));
}

/**
 * Fetch all standalone music samples from the API
 * @returns {Promise<Array>} Array of music samples
 */
export async function fetchAllSamples() {
  const response = await fetch('/api/music-samples');
  if (!response.ok) {
    throw new Error(`Failed to fetch samples: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch samples for a specific library
 * @param {string} libraryKey - The library key to fetch
 * @returns {Promise<Array>} Array of music samples for the library
 */
export async function fetchLibrarySamples(libraryKey) {
  const response = await fetch(`/api/music-samples?library=${libraryKey}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${libraryKey} library: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch all samples in shuffled order
 * @returns {Promise<Array>} Array of shuffled music samples
 */
export async function fetchShuffledSamples() {
  const response = await fetch('/api/music-samples?shuffle=true');
  if (!response.ok) {
    throw new Error(`Failed to fetch shuffled samples: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Group samples by library
 * @param {Array} samples - Array of music samples
 * @returns {Object} Samples grouped by library key
 */
export function groupSamplesByLibrary(samples) {
  return samples.reduce((acc, sample) => {
    const library = sample.genre;
    // Skip samples without a library assignment
    if (!library) return acc;
    if (!acc[library]) {
      acc[library] = {
        ...getLibraryMetadata(library),
        key: library,
        tracks: []
      };
    }
    acc[library].tracks.push(sample);
    return acc;
  }, {});
}
