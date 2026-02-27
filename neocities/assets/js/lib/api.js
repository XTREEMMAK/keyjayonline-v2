/**
 * API Helpers
 * JSONP-based data loading to bypass NeoCities CSP (connect-src 'self').
 * Falls back to fetch for same-origin requests.
 */

(function () {
  'use strict';
  window.KJO = window.KJO || {};

  var KJO_BASE = 'https://keyjayonline.com/api';
  var OMDB_KEY = 'b9fb0529';

  // Simple in-memory cache
  var cache = {};
  var CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  var cbCounter = 0;

  /**
   * Load JSON via JSONP (script-tag injection).
   * Bypasses CSP connect-src by using script-src which allows *.
   */
  function jsonp(url, cacheKey) {
    if (cacheKey && cache[cacheKey] && Date.now() - cache[cacheKey].time < CACHE_TTL) {
      return Promise.resolve(cache[cacheKey].data);
    }

    return new Promise(function (resolve) {
      var cbName = '__kjo_cb_' + (++cbCounter);
      var script = document.createElement('script');

      function cleanup() {
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        cleanup();
        if (cacheKey) cache[cacheKey] = { data: data, time: Date.now() };
        resolve(data);
      };

      script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cbName;
      script.onerror = function () {
        cleanup();
        console.error('JSONP failed: ' + url);
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  window.KJO.fetchNowFeed = function () {
    return jsonp(KJO_BASE + '/now/feed.json', 'now');
  };

  window.KJO.fetchGameShelf = function () {
    return jsonp(KJO_BASE + '/games/shelf.json', 'games');
  };

  window.KJO.fetchWatchShelf = function () {
    return jsonp(KJO_BASE + '/watching/shelf.json', 'watch');
  };

  window.KJO.fetchRadioSample = function () {
    return jsonp(KJO_BASE + '/radio/sample.json');
  };

  window.KJO.omdbLookup = function (imdbId) {
    if (!OMDB_KEY) return Promise.resolve(null);
    return jsonp(
      'https://www.omdbapi.com/?i=' + encodeURIComponent(imdbId) + '&apikey=' + OMDB_KEY,
      'omdb-' + imdbId
    );
  };

  window.KJO.OMDB_KEY = OMDB_KEY;
})();
