/**
 * WaveSurfer Helper Utilities
 * 
 * Synchronous utilities for WaveSurfer configuration and event handling.
 * These helpers reduce code duplication without introducing async complexity.
 */

import { formatTime } from './time.js';

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
  
  wavesurfer.on('audioprocess', () => {
    if (currentTime) currentTime.textContent = formatTime(wavesurfer.getCurrentTime());
  });
  
  wavesurfer.on('play', () => {
    if (playBtn) playBtn.innerHTML = PLAYER_ICONS.pause;
  });
  
  wavesurfer.on('pause', () => {
    if (playBtn) playBtn.innerHTML = PLAYER_ICONS.play;
  });
  
  wavesurfer.on('finish', () => {
    if (playBtn) playBtn.innerHTML = PLAYER_ICONS.play;
  });
  
  // Store wavesurfer instance globally for cross-player management
  window[`wavesurfer-${trackId}`] = wavesurfer;
  
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
  // Pause all other wavesurfer instances
  Object.keys(window).forEach(key => {
    if ((key.startsWith('wavesurfer-') || key.startsWith('wavesurfer-mobile-')) && 
        key !== `wavesurfer-${currentTrackId}`) {
      const otherWavesurfer = window[key];
      if (otherWavesurfer && typeof otherWavesurfer.isPlaying === 'function' && otherWavesurfer.isPlaying()) {
        otherWavesurfer.pause();
      }
    }
  });
  
  // Toggle current wavesurfer
  currentWavesurfer.playPause();
}

/**
 * Clean up WaveSurfer instance and remove global references
 * @param {string} trackId - Track identifier
 * @param {string[]} [prefixes] - Prefixes to clean up (e.g., ['', 'mobile-'])
 */
export function cleanupTrackPlayer(trackId, prefixes = ['', 'mobile-']) {
  prefixes.forEach(prefix => {
    const globalKey = `wavesurfer-${prefix}${trackId}`;
    const wavesurfer = window[globalKey];
    
    if (wavesurfer && typeof wavesurfer.destroy === 'function') {
      wavesurfer.destroy();
      delete window[globalKey];
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