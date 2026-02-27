/**
 * Watching Page — What I'm Watching
 * Movie/TV shelf with filter pills, progressive OMDb poster loading.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  var STATUS_FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Watching', value: 'watching' },
    { label: 'Completed', value: 'completed' },
    { label: 'Shelved', value: 'shelved' },
    { label: 'Backlog', value: 'backlog' }
  ];

  var TYPE_FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Movies', value: 'movie' },
    { label: 'Series', value: 'series' }
  ];

  // Active filter state
  var activeStatus = 'all';
  var activeType = 'all';

  /**
   * Enrich a card with OMDb data (poster + IMDb rating).
   * Called asynchronously per item — progressive rendering.
   */
  function enrichWithOMDb(card, imdbId) {
    KJO.omdbLookup(imdbId).then(function (omdb) {
      if (!omdb || omdb.Response === 'False') return;

      // Update poster if no manual cover
      var coverWell = card.querySelector('.shelf-cover-well');
      if (coverWell && coverWell.classList.contains('shelf-cover-placeholder') && omdb.Poster && omdb.Poster !== 'N/A') {
        coverWell.innerHTML = '';
        coverWell.classList.remove('shelf-cover-placeholder');
        var img = KJO.el('img', 'shelf-cover-img', null, {
          src: omdb.Poster,
          alt: omdb.Title || '',
          loading: 'lazy'
        });
        img.onload = function () { img.classList.add('loaded'); };
        coverWell.appendChild(img);
      }

      // Add IMDb rating
      if (omdb.imdbRating && omdb.imdbRating !== 'N/A') {
        var info = card.querySelector('.shelf-info');
        if (info) {
          info.appendChild(KJO.el('div', 'shelf-imdb-rating', 'IMDb: ' + omdb.imdbRating));
        }
      }
    });
  }

  function renderMediaCard(item, index) {
    var card = KJO.el('div', 'shelf-card glass-card');
    card.setAttribute('data-status', (item.watch_status || '').toLowerCase());
    card.setAttribute('data-type', (item.media_type || '').toLowerCase());
    KJO.staggerDelay(card, index);

    var badges = KJO.tree('div', 'shelf-badges', [
      item.media_type ? KJO.el('span', 'media-badge', KJO.capitalize(item.media_type)) : null,
      KJO.statusPill(item.watch_status)
    ]);

    var info = KJO.tree('div', 'shelf-info', [
      KJO.el('h3', 'shelf-title', item.title),
      badges,
      item.rating ? KJO.el('div', 'shelf-rating', '\u2605 ' + item.rating + '/10') : null,
      item.imdb_id ? KJO.el('a', 'shelf-external-link', 'IMDb \u2197', {
        href: 'https://www.imdb.com/title/' + item.imdb_id + '/',
        target: '_blank',
        rel: 'noopener'
      }) : null
    ]);

    card.appendChild(KJO.tree('div', 'shelf-card-inner', [
      KJO.coverWell(item.cover_url, item.title, KJO.icon('tv', 32, { strokeWidth: 1.5, opacity: 0.3 })),
      info
    ]));

    if (item.notes) {
      card.appendChild(KJO.el('div', 'shelf-notes', item.notes));
    }

    if (item.imdb_id && !item.cover_url) {
      enrichWithOMDb(card, item.imdb_id);
    }

    return card;
  }

  function render(container) {
    // Reset filter state
    activeStatus = 'all';
    activeType = 'all';

    container.appendChild(KJO.sectionLabel(
      KJO.icon('tv', 28, { className: 'v2-section-icon' }),
      "What I'm Watching"
    ));

    var grid = KJO.el('div', 'shelf-grid');

    // Status filter pills
    container.appendChild(KJO.filterPills(STATUS_FILTERS, 'all', function (value) {
      activeStatus = value;
      KJO.filterCards(grid, { status: activeStatus, type: activeType });
    }));

    // Type filter pills
    container.appendChild(KJO.filterPills(TYPE_FILTERS, 'all', function (value) {
      activeType = value;
      KJO.filterCards(grid, { status: activeStatus, type: activeType });
    }));

    grid.appendChild(KJO.loading());
    container.appendChild(grid);

    KJO.fetchWatchShelf().then(function (data) {
      grid.innerHTML = '';

      if (!data || !data.media || data.media.length === 0) {
        grid.appendChild(KJO.empty('Nothing on the watchlist yet.'));
        return;
      }

      for (var i = 0; i < data.media.length; i++) {
        grid.appendChild(renderMediaCard(data.media[i], i));
      }
    }).catch(function () {
      grid.innerHTML = '';
      grid.appendChild(KJO.error('Watch shelf is unavailable.', function () {
        render(container);
      }));
    });
  }

  KJO.router.register('watching', render);
})();
