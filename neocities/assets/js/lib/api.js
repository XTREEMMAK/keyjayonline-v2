/**
 * API Fetch Helpers
 * Centralized fetch with in-memory caching for all KJO API calls.
 */

(function () {
  'use strict';
  window.KJO = window.KJO || {};

  var KJO_BASE = 'https://keyjayonline.com/api';
  var OMDB_KEY = 'b9fb0529';

  // Simple in-memory cache
  var cache = {};
  var CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Fetch JSON from a URL with optional caching.
   * @param {string} url - Full URL to fetch
   * @param {string} [cacheKey] - Cache key (if omitted, no caching)
   * @returns {Promise<Object|null>} Parsed JSON or null on error
   */
  function fetchJSON(url, cacheKey) {
    if (cacheKey && cache[cacheKey] && Date.now() - cache[cacheKey].time < CACHE_TTL) {
      return Promise.resolve(cache[cacheKey].data);
    }

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (cacheKey) cache[cacheKey] = { data: data, time: Date.now() };
        return data;
      })
      .catch(function (err) {
        console.error('Fetch failed: ' + url, err);
        return null;
      });
  }

  window.KJO.fetchJSON = fetchJSON;

  window.KJO.fetchNowFeed = function () {
    return fetchJSON(KJO_BASE + '/now/feed.json', 'now');
  };

  window.KJO.fetchGameShelf = function () {
    return fetchJSON(KJO_BASE + '/games/shelf.json', 'games');
  };

  window.KJO.fetchWatchShelf = function () {
    return fetchJSON(KJO_BASE + '/watching/shelf.json', 'watch');
  };

  window.KJO.omdbLookup = function (imdbId) {
    if (!OMDB_KEY) return Promise.resolve(null);
    return fetchJSON(
      'https://www.omdbapi.com/?i=' + encodeURIComponent(imdbId) + '&apikey=' + OMDB_KEY,
      'omdb-' + imdbId
    );
  };

  window.KJO.OMDB_KEY = OMDB_KEY;
})();
