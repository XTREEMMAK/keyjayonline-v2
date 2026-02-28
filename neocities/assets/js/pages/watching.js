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
    { label: 'Movies', value: 'movies' },
    { label: 'Shows', value: 'shows' }
  ];

  // Active filter state
  var activeStatus = 'all';
  var activeType = 'all';

  // Store enriched cover URLs by imdb_id for use in detail sheet
  var enrichedCovers = {};

  /**
   * Enrich a card with OMDb data (poster + IMDb rating).
   * Called asynchronously per item — progressive rendering.
   */
  function enrichWithOMDb(card, item) {
    KJO.omdbLookup(item.imdb_id).then(function (omdb) {
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
        // Store for detail sheet
        enrichedCovers[item.imdb_id] = omdb.Poster;
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

  function openMediaDetail(item) {
    var coverUrl = item.cover_url || enrichedCovers[item.imdb_id] || null;
    var links = [];
    if (item.imdb_id) {
      links.push({
        label: 'IMDb \u2197',
        href: 'https://www.imdb.com/title/' + item.imdb_id + '/'
      });
    }

    var meta = [];
    if (item.media_type) meta.push(KJO.capitalize(item.media_type));
    var metaText = meta.length ? meta.join(' \u00b7 ') : null;

    KJO.detailSheet.open({
      coverUrl: coverUrl,
      title: item.title,
      status: item.watch_status,
      meta: metaText,
      rating: item.rating ? '\u2605 ' + item.rating + '/10' : null,
      notes: item.notes,
      icon: 'tv',
      links: links
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
      var noteBtn = KJO.el('button', 'shelf-notes-btn', 'Notes');
      noteBtn.addEventListener('click', function () {
        openMediaDetail(item);
      });
      card.appendChild(noteBtn);
    }

    if (item.imdb_id && !item.cover_url) {
      enrichWithOMDb(card, item);
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
