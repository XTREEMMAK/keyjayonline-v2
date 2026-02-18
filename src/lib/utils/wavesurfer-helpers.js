/**
 * WaveSurfer Helper Utilities
 * 
 * Synchronous utilities for WaveSurfer configuration and event handling.
 * These helpers reduce code duplication without introducing async complexity.
 */

import { formatTime } from './time.js';
import { pauseMusic } from '$lib/stores/musicPlayer.js';

/** @type {Map<string, WaveSurfer>} Registry of active track player instances */
const trackPlayerRegistry = new Map();

/**
 * Base WaveSurfer configuration shared across all components
 * @returns {Object} Base configuration object
 */
export function getBaseWaveSurferConfig() {
  return {
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    cursorWidth: 2,
    cursorColor: '#fff',
    mediaControls: false,
    normalize: true,
    responsive: true
  };
}

/**
 * Configuration for track players in modals
 * @returns {Object} Track player configuration
 */
export function getTrackPlayerConfig() {
  return {
    ...getBaseWaveSurferConfig(),
    height: 40,
    waveColor: '#60a5fa',
    progressColor: '#3b82f6',
    cursorColor: '#ffffff'
  };
}

/**
 * Configuration for the persistent music player
 * @returns {Object} Persistent player configuration
 */
export function getPersistentPlayerConfig() {
  return {
    ...getBaseWaveSurferConfig(),
    height: 50,
    waveColor: 'rgb(200, 0, 200)',
    progressColor: 'rgb(100, 0, 100)',
    interact: true
  };
}

/**
 * Configuration for standalone audio players
 * @param {Object} options - Custom options to override defaults
 * @param {string} [options.waveColor='#3B82F6'] - Wave color
 * @param {string} [options.progressColor='#1E40AF'] - Progress color  
 * @param {number} [options.height=60] - Player height
 * @returns {Object} Audio player configuration
 */
export function getAudioPlayerConfig(options = {}) {
  const {
    waveColor = '#3B82F6',
    progressColor = '#1E40AF', 
    height = 60
  } = options;

  return {
    ...getBaseWaveSurferConfig(),
    waveColor,
    progressColor,
    height
  };
}

/**
 * Configuration for the radio player
 * @returns {Object} Radio player configuration
 */
export function getRadioPlayerConfig() {
  return {
    ...getBaseWaveSurferConfig(),
    height: 48,
    waveColor: 'rgba(102, 126, 234, 0.6)',
    progressColor: 'rgba(118, 75, 162, 0.8)',
    cursorColor: '#ffffff',
    interact: true,
    barWidth: 3,
    barGap: 1,
    barRadius: 3
  };
}

/**
 * SVG icons for play/pause buttons
 */
export const PLAYER_ICONS = {
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`
};

/**
 * Setup standard event listeners for track players
 * @param {WaveSurfer} wavesurfer - WaveSurfer instance
 * @param {Object} elements - UI elements
 * @param {HTMLElement} [elements.playBtn] - Play/pause button
 * @param {HTMLElement} [elements.currentTime] - Current time display
 * @param {HTMLElement} [elements.duration] - Duration display
 * @param {string} trackId - Track identifier for global management
 */
export function setupTrackPlayerEvents(wavesurfer, elements, trackId) {
  const { playBtn, currentTime, duration } = elements;
  
  // Standard event listeners
  wavesurfer.on('ready', () => {
    if (duration) duration.textContent = formatTime(wavesurfer.getDuration());
  });
  
  // Use native media element events for reliable Android playback
  const mediaEl = wavesurfer.getMediaElement();
  let playbackInterval = null;

  function syncTime() {
    if (currentTime) currentTime.textContent = formatTime(mediaEl.currentTime);
  }

  mediaEl.addEventListener('timeupdate', syncTime);

  wavesurfer.on('play', () => {
    if (playBtn) playBtn.innerHTML = PLAYER_ICONS.pause;
    playbackInterval = setInterval(syncTime, 100);
  });

  wavesurfer.on('pause', () => {
    if (playBtn) playBtn.innerHTML = PLAYER_ICONS.play;
    clearInterval(playbackInterval);
    syncTime();
  });

  wavesurfer.on('finish', () => {
    if (playBtn) playBtn.innerHTML = PLAYER_ICONS.play;
    clearInterval(playbackInterval);
  });
  
  // Register instance for cross-player management
  trackPlayerRegistry.set(trackId, wavesurfer);
  
  // Setup play button with global player management
  if (playBtn) {
    playBtn.onclick = () => pauseOthersAndToggle(wavesurfer, trackId);
  }
}

/**
 * Pause all other WaveSurfer instances and toggle the current one
 * @param {WaveSurfer} currentWavesurfer - Current WaveSurfer instance
 * @param {string} currentTrackId - Current track ID
 */
export function pauseOthersAndToggle(currentWavesurfer, currentTrackId) {
  // Pause all other registered track players
  for (const [id, ws] of trackPlayerRegistry) {
    if (id !== currentTrackId && typeof ws.isPlaying === 'function' && ws.isPlaying()) {
      ws.pause();
    }
  }

  // Pause the persistent music player too
  pauseMusic();

  // Toggle current wavesurfer
  currentWavesurfer.playPause();
}

/**
 * Register a WaveSurfer instance in the cross-player registry.
 * @param {string} id - Unique player identifier
 * @param {WaveSurfer} wavesurfer - WaveSurfer instance
 */
export function registerTrackPlayer(id, wavesurfer) {
  trackPlayerRegistry.set(id, wavesurfer);
}

/**
 * Pause all registered track players (modal + voice).
 * Called by the persistent player when it starts playing.
 */
export function pauseAllTrackPlayers() {
  for (const [, ws] of trackPlayerRegistry) {
    if (typeof ws.isPlaying === 'function' && ws.isPlaying()) {
      ws.pause();
    }
  }
}

/**
 * Clean up WaveSurfer instance and remove global references
 * @param {string} trackId - Track identifier
 * @param {string[]} [prefixes] - Prefixes to clean up (e.g., ['', 'mobile-'])
 */
export function cleanupTrackPlayer(trackId, prefixes = ['', 'mobile-']) {
  prefixes.forEach(prefix => {
    const key = `${prefix}${trackId}`;
    const wavesurfer = trackPlayerRegistry.get(key);

    if (wavesurfer && typeof wavesurfer.destroy === 'function') {
      wavesurfer.destroy();
      trackPlayerRegistry.delete(key);
    }
  });
}

/**
 * Create a standard track player configuration with container and URL
 * @param {string} containerId - Container element ID (with #)
 * @param {string} audioUrl - Audio file URL
 * @returns {Object} Complete WaveSurfer configuration
 */
export function createTrackPlayerConfig(containerId, audioUrl) {
  return {
    container: containerId,
    ...getTrackPlayerConfig(),
    url: audioUrl
  };
}