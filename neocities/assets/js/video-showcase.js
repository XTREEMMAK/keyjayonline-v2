/**
 * Video Showcase
 *
 * Shows the Featured Video section with a randomly selected YouTube video.
 * Picks a random YouTube video (avoids repeating the last one).
 * Tracks lastVideo in a cookie so consecutive shows cycle through the list.
 *
 * Exposes KJO.videoShowcase.init(sectionEl) for SPA page rendering.
 */

(function () {
  'use strict';
  window.KJO = window.KJO || {};

  var COOKIE_NAME = 'kj_visit';
  var COOKIE_DAYS = 90;

  // ---- YOUR VIDEO IDS ----
  // Add/remove YouTube video IDs as needed
  var VIDEO_IDS = [
    'jz4GsXpVSJo',
    'ztV0ofqgo_s',
    'z5wnx5s3dSQ',
    'yk3EqzJzJ5o'
  ];

  // ---- Cookie helpers ----

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
  }

  function getVisitData() {
    var raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveVisitData(data) {
    setCookie(COOKIE_NAME, JSON.stringify(data), COOKIE_DAYS);
  }

  // ---- Pick next video (avoids repeating last shown) ----

  function pickVideo(lastIndex) {
    if (VIDEO_IDS.length === 0) return -1;
    if (VIDEO_IDS.length === 1) return 0;

    var next;
    do {
      next = Math.floor(Math.random() * VIDEO_IDS.length);
    } while (next === lastIndex);

    return next;
  }

  // ---- Init (callable from SPA page handler) ----

  function init(sectionEl) {
    if (!sectionEl) return;

    // Pick a video that differs from last time
    var data = getVisitData();
    var lastVideo = data && typeof data.lastVideo === 'number' ? data.lastVideo : -1;
    var nextVideo = pickVideo(lastVideo);

    saveVisitData({ lastVideo: nextVideo });

    sectionEl.style.display = '';
    sectionEl.removeAttribute('hidden');

    var iframe = sectionEl.querySelector('iframe[data-yt-embed]');
    if (iframe && nextVideo >= 0) {
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + VIDEO_IDS[nextVideo] + '?rel=0&modestbranding=1';
    }
  }

  // Expose for SPA usage
  window.KJO.videoShowcase = { init: init };
})();
