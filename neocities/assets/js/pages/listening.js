/**
 * Listening Page — What I'm Listening To
 * Recent Last.fm scrobbles with album art, now-playing banner.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  function renderTrackCard(track, index) {
    var card = KJO.el('div', 'listening-card glass-card');
    KJO.staggerDelay(card, index);

    // Blurred album art background
    if (track.image) {
      var bgDiv = KJO.el('div', 'shelf-card-bg');
      bgDiv.style.backgroundImage = 'url(' + track.image + ')';
      card.appendChild(bgDiv);
    }

    var info = KJO.tree('div', 'listening-card-info', [
      KJO.el('div', 'shelf-title', track.name),
      KJO.el('div', 'listening-artist', track.artist),
      track.album ? KJO.el('div', 'listening-album', track.album) : null,
      track.played_at ? KJO.el('div', 'shelf-date', KJO.relativeDate(track.played_at)) : null,
      track.url ? KJO.el('a', 'shelf-external-link', 'Last.fm \u2197', {
        href: track.url,
        target: '_blank',
        rel: 'noopener'
      }) : null
    ]);

    card.appendChild(KJO.tree('div', 'listening-card-inner', [
      KJO.coverWell(track.image, track.name + ' — ' + track.artist, KJO.icon('headphones', 32, { strokeWidth: 1.5, opacity: 0.3 })),
      info
    ]));

    return card;
  }

  function renderNowPlaying(track) {
    var banner = KJO.el('div', 'listening-now-playing glass-card');

    // Blurred album art background
    if (track.image) {
      var bgDiv = KJO.el('div', 'shelf-card-bg');
      bgDiv.style.backgroundImage = 'url(' + track.image + ')';
      banner.appendChild(bgDiv);
    }

    var pulse = KJO.el('span', 'listening-pulse');
    var label = KJO.tree('div', 'listening-now-header', [
      pulse,
      KJO.el('span', 'listening-now-label', 'Now Playing')
    ]);

    var coverWell = KJO.coverWell(track.image, track.name, KJO.icon('headphones', 40, { strokeWidth: 1.5, opacity: 0.3 }));

    var trackInfo = KJO.tree('div', 'listening-now-info', [
      KJO.el('div', 'listening-now-track', track.name),
      KJO.el('div', 'listening-now-artist', track.artist),
      track.album ? KJO.el('div', 'listening-now-album', track.album) : null,
      track.url ? KJO.el('a', 'shelf-external-link', 'Last.fm \u2197', {
        href: track.url,
        target: '_blank',
        rel: 'noopener'
      }) : null
    ]);

    var content = KJO.tree('div', 'listening-now-content', [coverWell, trackInfo]);

    KJO.appendAll(banner, [label, content]);
    return banner;
  }

  function render(container) {
    container.appendChild(KJO.sectionLabel(
      KJO.icon('headphones', 28, { className: 'v2-section-icon' }),
      "What I'm Listening To"
    ));

    var grid = KJO.el('div', 'shelf-grid');
    grid.appendChild(KJO.loading());
    container.appendChild(grid);

    KJO.fetchListening().then(function (data) {
      grid.innerHTML = '';

      if (!data || !data.tracks || data.tracks.length === 0) {
        grid.appendChild(KJO.empty('No recent scrobbles.'));
        return;
      }

      var nowPlaying = null;
      var history = [];

      for (var i = 0; i < data.tracks.length; i++) {
        if (data.tracks[i].now_playing && !nowPlaying) {
          nowPlaying = data.tracks[i];
        } else {
          history.push(data.tracks[i]);
        }
      }

      // Now Playing banner above the grid
      if (nowPlaying) {
        container.insertBefore(renderNowPlaying(nowPlaying), grid);
      }

      if (history.length === 0) {
        grid.appendChild(KJO.empty('No recent scrobbles.'));
        return;
      }

      for (var j = 0; j < history.length; j++) {
        grid.appendChild(renderTrackCard(history[j], j));
      }

      // Profile link at bottom
      if (data.profile_url) {
        var profileWrap = KJO.el('div', 'listening-profile-wrap');
        profileWrap.appendChild(KJO.el('a', 'neu-button neu-button-round listening-profile-btn', 'View Last.fm Profile', {
          href: data.profile_url,
          target: '_blank',
          rel: 'noopener'
        }));
        container.appendChild(profileWrap);
      }
    }).catch(function () {
      grid.innerHTML = '';
      grid.appendChild(KJO.error('Scrobble feed is unavailable.', function () {
        render(container);
      }));
    });
  }

  KJO.router.register('listening', render);
})();
