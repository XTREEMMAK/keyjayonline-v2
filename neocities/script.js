/**
 * NeoCities Outpost — Content Fetcher
 * Fetches /now entries from KeyJayOnline.com JSON API and renders them.
 */

(function () {
  'use strict';

  var KJO_API = 'https://keyjayonline.com/api/now/feed.json';
  var NOW_CONTAINER_ID = 'now-entries';

  // ---------------------------------------------------------------------------
  // Relative date formatting — ported from src/lib/utils/relativeDate.js
  // ---------------------------------------------------------------------------
  function relativeDate(date) {
    if (!date) return '';

    var now = Date.now();
    var then = new Date(date).getTime();
    var diffMs = now - then;
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHr = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHr / 24);
    var diffWeek = Math.floor(diffDay / 7);
    var diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';
    if (diffWeek < 5) return diffWeek + 'w ago';
    if (diffMonth < 12) return diffMonth + 'mo ago';

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // ---------------------------------------------------------------------------
  // Format a full date for the title attribute
  // ---------------------------------------------------------------------------
  function formatFullDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // ---------------------------------------------------------------------------
  // Wrap <img> elements inside neumorphic inset wells
  // ---------------------------------------------------------------------------
  function wrapImages(container) {
    var images = container.querySelectorAll('img');
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      // Skip if already wrapped
      if (img.parentNode.classList && img.parentNode.classList.contains('image-well')) continue;
      var well = document.createElement('div');
      well.className = 'image-well';
      img.parentNode.insertBefore(well, img);
      well.appendChild(img);
    }
  }

  // ---------------------------------------------------------------------------
  // Render a single entry
  // ---------------------------------------------------------------------------
  function renderEntry(entry, site, isLatest) {
    var article = document.createElement('article');
    article.className = 'h-entry glass-card now-entry';
    if (isLatest) article.classList.add('entry-latest');

    // Header: date + via pill
    var header = document.createElement('div');
    header.className = 'now-entry-header';

    var dateSpan = document.createElement('span');
    dateSpan.className = 'now-entry-date';
    var timeEl = document.createElement('time');
    timeEl.className = 'dt-published';
    timeEl.setAttribute('datetime', entry.published_at);
    timeEl.textContent = relativeDate(entry.published_at);
    timeEl.title = formatFullDate(entry.published_at);
    dateSpan.appendChild(timeEl);

    var viaPill = document.createElement('a');
    viaPill.className = 'via-pill';
    viaPill.href = site.now_url;
    viaPill.textContent = 'via KJO';

    header.appendChild(dateSpan);
    header.appendChild(viaPill);

    // Content
    var content = document.createElement('div');
    content.className = 'e-content now-entry-content';
    content.innerHTML = entry.content;

    // Wrap images in inset wells
    wrapImages(content);

    article.appendChild(header);
    article.appendChild(content);

    return article;
  }

  // ---------------------------------------------------------------------------
  // Render fallback state
  // ---------------------------------------------------------------------------
  function renderFallback(container, message) {
    container.innerHTML = '';
    var fallback = document.createElement('div');
    fallback.className = 'now-fallback glass-card';

    var p = document.createElement('p');
    p.textContent = message || 'Content is being updated.';
    fallback.appendChild(p);

    var link = document.createElement('a');
    link.href = 'https://keyjayonline.com/now';
    link.className = 'neu-button neu-button-round';
    link.textContent = 'Visit KeyJayOnline.com/now \u2192';
    fallback.appendChild(link);

    container.appendChild(fallback);
  }

  // ---------------------------------------------------------------------------
  // Main fetch and render
  // ---------------------------------------------------------------------------
  function init() {
    var container = document.getElementById(NOW_CONTAINER_ID);
    if (!container) return;

    fetch(KJO_API)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.entries || data.entries.length === 0) {
          renderFallback(container, 'Nothing here yet \u2014 check back soon.');
          return;
        }

        // Clear placeholder
        container.innerHTML = '';

        // Render entries
        var site = data.site || {};
        for (var i = 0; i < data.entries.length; i++) {
          var el = renderEntry(data.entries[i], site, i === 0);
          container.appendChild(el);
        }
      })
      .catch(function () {
        renderFallback(container);
      });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
