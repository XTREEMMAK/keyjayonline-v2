/**
 * Visit-Aware Video Embed
 *
 * First visit:  Video section stays hidden
 * Second visit+: Video section expands, loads a random YouTube video
 *                Cycles through the array so you don't get the same one twice in a row
 *
 * Cookie expires after 90 days of inactivity (refreshes on each visit)
 */

(function () {
  const COOKIE_NAME = 'kj_visit';
  const COOKIE_DAYS = 90;
  const VIDEO_SECTION_ID = 'video-showcase';

  // ---- YOUR VIDEO IDS ----
  // Add/remove YouTube video IDs as needed
  const VIDEO_IDS = [
    'REPLACE_ID_1',
    'REPLACE_ID_2',
    'REPLACE_ID_3',
    'REPLACE_ID_4',
    'REPLACE_ID_5'
  ];

  // ---- Cookie helpers ----

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  // ---- Visit tracking ----

  function getVisitData() {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveVisitData(data) {
    setCookie(COOKIE_NAME, JSON.stringify(data), COOKIE_DAYS);
  }

  // ---- Pick next video (avoids repeating last shown) ----

  function pickVideo(lastIndex) {
    if (VIDEO_IDS.length === 0) return -1;
    if (VIDEO_IDS.length === 1) return 0;

    let next;
    do {
      next = Math.floor(Math.random() * VIDEO_IDS.length);
    } while (next === lastIndex);

    return next;
  }

  // ---- Init ----

  function init() {
    const section = document.getElementById(VIDEO_SECTION_ID);
    if (!section) return;

    const data = getVisitData();

    if (!data) {
      // First visit — hide video section, set initial cookie
      section.style.display = 'none';
      saveVisitData({ count: 1, lastVideo: -1 });
      return;
    }

    // Returning visitor
    const count = (data.count || 1) + 1;
    const lastVideo = typeof data.lastVideo === 'number' ? data.lastVideo : -1;
    const nextVideo = pickVideo(lastVideo);

    // Update cookie (refreshes expiration on every visit)
    saveVisitData({ count: count, lastVideo: nextVideo });

    // Show section and load the embed
    section.style.display = '';
    section.removeAttribute('hidden');

    const iframe = section.querySelector('iframe[data-yt-embed]');
    if (iframe && nextVideo >= 0) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${VIDEO_IDS[nextVideo]}?rel=0&modestbranding=1`;
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
