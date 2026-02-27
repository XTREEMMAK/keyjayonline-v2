/**
 * NeoCities Outpost — Mini Audio Player
 * Pure HTML5 <audio> + vanilla JS. No dependencies.
 * Fetches a random sample of tracks from KeyJayOnline.com and renders
 * a neumorphic mini player as a teaser for Key Jay Radio.
 */

(function () {
  'use strict';

  var PLAYER_CONTAINER_ID = 'audio-player';

  // State
  var tracks = [];
  var currentIndex = 0;
  var audio = null;
  var isPlaying = false;
  var volume = 0.8;
  var isMuted = false;

  // DOM refs (set during render)
  var els = {};

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  function formatTime(sec) {
    if (!sec || !isFinite(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---------------------------------------------------------------------------
  // Media Session API
  // ---------------------------------------------------------------------------

  function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    var artwork = [];
    if (track.thumbnail) {
      artwork.push({ src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' });
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'Key Jay Radio',
      artwork: artwork
    });
  }

  function setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', function () { play(); });
    navigator.mediaSession.setActionHandler('pause', function () { pause(); });
    navigator.mediaSession.setActionHandler('previoustrack', function () { prevTrack(); });
    navigator.mediaSession.setActionHandler('nexttrack', function () { nextTrack(); });
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  function loadTrack(index) {
    if (!tracks[index]) return;
    currentIndex = index;
    var track = tracks[currentIndex];

    audio.src = track.audioUrl;
    audio.load();

    // Update UI
    if (els.title) els.title.textContent = track.title;
    if (els.artist) els.artist.textContent = track.artist;
    if (els.trackNum) els.trackNum.textContent = (currentIndex + 1) + ' / ' + tracks.length;
    if (els.currentTime) els.currentTime.textContent = '0:00';
    if (els.duration) els.duration.textContent = '0:00';
    if (els.progressFill) els.progressFill.style.width = '0%';

    // Thumbnail
    if (els.thumbnail) {
      if (track.thumbnail) {
        els.thumbnail.style.backgroundImage = 'url(' + track.thumbnail + ')';
        els.thumbnail.classList.remove('no-art');
      } else {
        els.thumbnail.style.backgroundImage = '';
        els.thumbnail.classList.add('no-art');
      }
    }

    updateMediaSession(track);
  }

  function play() {
    if (!audio.src) return;
    audio.play().catch(function () { /* blocked by browser */ });
  }

  function pause() {
    audio.pause();
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function nextTrack() {
    var next = (currentIndex + 1) % tracks.length;
    loadTrack(next);
    if (isPlaying) play();
  }

  function prevTrack() {
    // If more than 3 seconds in, restart current track
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    var prev = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(prev);
    if (isPlaying) play();
  }

  // ---------------------------------------------------------------------------
  // Audio event handlers
  // ---------------------------------------------------------------------------

  function onTimeUpdate() {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    if (els.progressFill) els.progressFill.style.width = pct + '%';
    if (els.currentTime) els.currentTime.textContent = formatTime(audio.currentTime);
  }

  function onLoadedMetadata() {
    if (els.duration) els.duration.textContent = formatTime(audio.duration);
  }

  function onPlay() {
    isPlaying = true;
    if (els.playBtn) els.playBtn.classList.add('playing');
    if (els.playIcon) els.playIcon.innerHTML = pauseIcon();
  }

  function onPause() {
    isPlaying = false;
    if (els.playBtn) els.playBtn.classList.remove('playing');
    if (els.playIcon) els.playIcon.innerHTML = playIcon();
  }

  function onEnded() {
    // Always auto-play next track (onPause fires before onEnded, resetting isPlaying)
    var next = (currentIndex + 1) % tracks.length;
    loadTrack(next);
    play();
  }

  // ---------------------------------------------------------------------------
  // SVG Icons
  // ---------------------------------------------------------------------------

  function playIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  function pauseIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  function prevIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><rect x="5" y="4" width="2" height="16"/></svg>';
  }

  function nextIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="2" height="16"/></svg>';
  }

  function musicNoteIcon() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  }

  function volumeIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  }

  function volumeMutedIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  function render(container) {
    container.innerHTML = '';

    // Track info row
    var trackInfo = document.createElement('div');
    trackInfo.className = 'player-track-info';

    var thumb = document.createElement('div');
    thumb.className = 'player-thumbnail no-art';
    thumb.innerHTML = musicNoteIcon();
    els.thumbnail = thumb;

    var meta = document.createElement('div');
    meta.className = 'player-meta';

    var title = document.createElement('div');
    title.className = 'player-title';
    title.textContent = tracks[0] ? tracks[0].title : '';
    els.title = title;

    var artist = document.createElement('div');
    artist.className = 'player-artist';
    artist.textContent = tracks[0] ? tracks[0].artist : '';
    els.artist = artist;

    meta.appendChild(title);
    meta.appendChild(artist);

    trackInfo.appendChild(thumb);
    trackInfo.appendChild(meta);

    // Controls
    var controls = document.createElement('div');
    controls.className = 'player-controls';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'player-btn player-btn-prev';
    prevBtn.innerHTML = prevIcon();
    prevBtn.setAttribute('aria-label', 'Previous track');
    prevBtn.addEventListener('click', prevTrack);

    var playBtn = document.createElement('button');
    playBtn.className = 'player-btn player-btn-play';
    var playIconSpan = document.createElement('span');
    playIconSpan.innerHTML = playIcon();
    els.playIcon = playIconSpan;
    playBtn.appendChild(playIconSpan);
    playBtn.setAttribute('aria-label', 'Play/Pause');
    playBtn.addEventListener('click', togglePlay);
    els.playBtn = playBtn;

    var nextBtn = document.createElement('button');
    nextBtn.className = 'player-btn player-btn-next';
    nextBtn.innerHTML = nextIcon();
    nextBtn.setAttribute('aria-label', 'Next track');
    nextBtn.addEventListener('click', nextTrack);

    controls.appendChild(prevBtn);
    controls.appendChild(playBtn);
    controls.appendChild(nextBtn);

    // Progress
    var progressWrap = document.createElement('div');
    progressWrap.className = 'player-progress-wrap';

    var timeRow = document.createElement('div');
    timeRow.className = 'player-time-row';

    var currentTime = document.createElement('span');
    currentTime.className = 'player-time';
    currentTime.textContent = '0:00';
    els.currentTime = currentTime;

    var trackNum = document.createElement('span');
    trackNum.className = 'player-track-num';
    trackNum.textContent = '1 / ' + tracks.length;
    els.trackNum = trackNum;

    var duration = document.createElement('span');
    duration.className = 'player-time';
    duration.textContent = '0:00';
    els.duration = duration;

    timeRow.appendChild(currentTime);
    timeRow.appendChild(trackNum);
    timeRow.appendChild(duration);

    var progressBar = document.createElement('div');
    progressBar.className = 'player-progress';
    progressBar.addEventListener('click', function (e) {
      if (!audio.duration) return;
      var rect = progressBar.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
    });

    var progressFill = document.createElement('div');
    progressFill.className = 'player-progress-fill';
    els.progressFill = progressFill;

    progressBar.appendChild(progressFill);

    progressWrap.appendChild(timeRow);
    progressWrap.appendChild(progressBar);

    // Volume
    var volumeWrap = document.createElement('div');
    volumeWrap.className = 'player-volume-wrap';

    var muteBtn = document.createElement('button');
    muteBtn.className = 'player-volume-btn';
    muteBtn.setAttribute('aria-label', 'Mute/Unmute');
    muteBtn.innerHTML = isMuted ? volumeMutedIcon() : volumeIcon();
    els.muteBtn = muteBtn;

    muteBtn.addEventListener('click', function () {
      isMuted = !isMuted;
      audio.volume = isMuted ? 0 : volume;
      muteBtn.innerHTML = isMuted ? volumeMutedIcon() : volumeIcon();
      localStorage.setItem('kjo_player_muted', String(isMuted));
    });

    var volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'player-volume-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = String(volume);
    els.volumeSlider = volumeSlider;

    volumeSlider.addEventListener('input', function () {
      volume = parseFloat(volumeSlider.value);
      audio.volume = volume;
      if (volume > 0 && isMuted) {
        isMuted = false;
        muteBtn.innerHTML = volumeIcon();
        localStorage.setItem('kjo_player_muted', 'false');
      } else if (volume === 0 && !isMuted) {
        isMuted = true;
        muteBtn.innerHTML = volumeMutedIcon();
      }
      localStorage.setItem('kjo_player_volume', String(volume));
    });

    volumeWrap.appendChild(muteBtn);
    volumeWrap.appendChild(volumeSlider);

    // Assemble
    container.appendChild(trackInfo);
    container.appendChild(controls);
    container.appendChild(progressWrap);
    container.appendChild(volumeWrap);
  }

  // ---------------------------------------------------------------------------
  // Fallback
  // ---------------------------------------------------------------------------

  function renderFallback(container) {
    container.innerHTML = '';

    var fallback = document.createElement('div');
    fallback.className = 'player-fallback';

    var p = document.createElement('p');
    p.textContent = 'Music player is loading\u2026';
    fallback.appendChild(p);

    var link = document.createElement('a');
    link.href = 'https://keyjayonline.com/radio';
    link.className = 'neu-button neu-button-round';
    link.textContent = 'Listen on Key Jay Radio \u2192';
    fallback.appendChild(link);

    container.appendChild(fallback);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    var container = document.getElementById(PLAYER_CONTAINER_ID);
    if (!container) return;

    // Create shared audio element
    audio = document.createElement('audio');
    audio.preload = 'metadata';

    // Restore volume from localStorage
    var savedVol = localStorage.getItem('kjo_player_volume');
    if (savedVol !== null) volume = parseFloat(savedVol);
    var savedMute = localStorage.getItem('kjo_player_muted');
    if (savedMute === 'true') isMuted = true;
    audio.volume = isMuted ? 0 : volume;

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    window.KJO.fetchRadioSample().then(function (data) {
      if (!data || !data.tracks || data.tracks.length === 0) {
        renderFallback(container);
        return;
      }

      // Filter out tracks with no audio URL
      tracks = data.tracks.filter(function (t) { return t.audioUrl; });
      if (tracks.length === 0) {
        renderFallback(container);
        return;
      }

      render(container);
      setupMediaSessionHandlers();
      loadTrack(0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
