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

  var FADE_DURATION = 300;   // ms — siblings opacity transition
  var WIDTH_DURATION = 350;  // ms — card width expand/shrink
  var PANEL_DURATION = 450;  // ms — notes panel slide transition
  var INFO_FADE = 200;       // ms — info section fade out/in during layout switch
  var COVER_RESIZE = 400;    // ms — matches cover well CSS transition duration

  function expandNotes(card) {
    var grid = card.closest('.shelf-grid');
    if (!grid) return;

    var existing = grid.querySelector('.shelf-card-expanded');
    if (existing && existing !== card) {
      existing.classList.remove('shelf-card-expanded', 'shelf-panel-open', 'shelf-cover-full', 'shelf-poster-layout');
      existing.style.cssText = '';
      var exHidden = grid.querySelectorAll('.shelf-card-hidden');
      for (var i = 0; i < exHidden.length; i++) exHidden[i].classList.remove('shelf-card-hidden');
      grid.classList.remove('shelf-notes-active');
    }

    var startWidth = card.offsetWidth;

    card.classList.add('shelf-card-expanded');
    grid.classList.add('shelf-notes-active');

    setTimeout(function () {
      // Capture position before hiding siblings (card still in original column)
      var firstLeft = card.getBoundingClientRect().left;

      var siblings = grid.querySelectorAll('.shelf-card:not(.shelf-card-expanded)');
      for (var i = 0; i < siblings.length; i++) siblings[i].classList.add('shelf-card-hidden');

      // Kill base CSS transitions so setting initial FLIP state doesn't animate
      card.style.transition = 'none';
      card.style.width = startWidth + 'px';
      card.style.gridColumn = '1 / -1';

      // Read new position and compensate with translateX
      var lastLeft = card.getBoundingClientRect().left;
      var deltaX = firstLeft - lastLeft;
      card.style.transform = 'translateX(' + deltaX + 'px)';

      // Commit initial state
      void card.offsetWidth;

      // Enable transitions and animate to expanded state
      var targetWidth = grid.clientWidth;
      card.style.transition = 'width ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1), transform ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.width = targetWidth + 'px';
      card.style.transform = 'translateX(0)';

      // After width animation — phased cover expansion + poster layout
      setTimeout(function () {
        card.style.width = '';
        card.style.transition = '';
        card.style.transform = '';

        var info = card.querySelector('.shelf-info');
        if (info) info.classList.add('shelf-info-hidden');

        setTimeout(function () {
          // All at once: panel opens + cover grows + slides to center (all CSS-transitioned)
          card.classList.add('shelf-panel-open');
          card.classList.add('shelf-cover-full');
          card.classList.add('shelf-poster-layout');
          var noteBtn = card.querySelector('.shelf-notes-btn');
          if (noteBtn) noteBtn.textContent = 'Close Notes';

          // After cover finishes growing + centering, fade info back in
          setTimeout(function () {
            if (info) info.classList.remove('shelf-info-hidden');
          }, COVER_RESIZE);
        }, INFO_FADE);
      }, WIDTH_DURATION);
    }, FADE_DURATION);
  }

  function collapseNotes(card) {
    var grid = card.closest('.shelf-grid');
    if (!grid) return;

    var info = card.querySelector('.shelf-info');
    if (info) info.classList.add('shelf-info-hidden');

    var noteBtn = card.querySelector('.shelf-notes-btn');
    if (noteBtn) noteBtn.textContent = 'Notes';

    setTimeout(function () {
      // All at once: revert poster + shrink cover + close panel (all CSS-transitioned)
      card.classList.remove('shelf-poster-layout');
      card.classList.remove('shelf-cover-full');
      card.classList.remove('shelf-panel-open');

      // After cover finishes shrinking + sliding back, fade info in
      setTimeout(function () {
        if (info) info.classList.remove('shelf-info-hidden');
      }, COVER_RESIZE);

      setTimeout(function () {
        var expandedWidth = card.offsetWidth;
        var firstLeft = card.getBoundingClientRect().left;

      // Kill base CSS transitions during FLIP measurement
      card.style.transition = 'none';

      // FLIP: snap to final layout to measure target position + width
      card.style.width = '';
      card.style.gridColumn = '';
      var hiddenSiblings = grid.querySelectorAll('.shelf-card-hidden');
      for (var i = 0; i < hiddenSiblings.length; i++) hiddenSiblings[i].classList.remove('shelf-card-hidden');

      var targetWidth = card.offsetWidth;
      var lastLeft = card.getBoundingClientRect().left;
      var deltaX = lastLeft - firstLeft;

      // Revert to expanded state (synchronous — no paint)
      for (var i = 0; i < hiddenSiblings.length; i++) hiddenSiblings[i].classList.add('shelf-card-hidden');
      card.style.gridColumn = '1 / -1';
      card.style.width = expandedWidth + 'px';

      // Commit starting state
      void card.offsetWidth;

      // Enable transitions and animate shrink + slide
      card.style.transition = 'width ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1), transform ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.width = targetWidth + 'px';
      card.style.transform = 'translateX(' + deltaX + 'px)';

      setTimeout(function () {
        card.style.cssText = '';
        card.classList.remove('shelf-card-expanded');

        var siblings = grid.querySelectorAll('.shelf-card-hidden');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('shelf-card-hidden');

        void grid.offsetHeight;
        grid.classList.remove('shelf-notes-active');
      }, WIDTH_DURATION);
      }, PANEL_DURATION);
    }, INFO_FADE);
  }

  function renderMediaCard(item, index) {
    var card = KJO.el('div', 'shelf-card glass-card');
    card.setAttribute('data-status', (item.watch_status || '').toLowerCase());
    card.setAttribute('data-type', (item.media_type || '').toLowerCase());
    KJO.staggerDelay(card, index);

    // Blurred cover art background
    if (item.cover_url) {
      var bgDiv = KJO.el('div', 'shelf-card-bg');
      bgDiv.style.backgroundImage = 'url(' + item.cover_url + ')';
      card.appendChild(bgDiv);
    }

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

    // Build notes panel (hidden until expanded)
    var notesPanel = null;
    if (item.notes) {
      var panelInner = KJO.el('div', 'shelf-notes-panel-inner');
      panelInner.innerHTML = item.notes;
      var panelClose = KJO.el('button', 'shelf-notes-panel-close', '\u00d7');
      notesPanel = KJO.tree('div', 'shelf-notes-panel', [panelClose, panelInner]);
    }

    // Card layout: main content + optional notes panel
    card.appendChild(KJO.tree('div', 'shelf-card-layout', [
      KJO.tree('div', 'shelf-card-main', [
        KJO.tree('div', 'shelf-card-inner', [
          KJO.coverWell(item.cover_url, item.title, KJO.icon('tv', 32, { strokeWidth: 1.5, opacity: 0.3 })),
          info
        ])
      ]),
      notesPanel
    ]));

    // Notes expand/collapse logic (staged animation)
    if (item.notes) {
      var noteBtn = KJO.el('button', 'shelf-notes-btn', 'Notes');

      notesPanel.querySelector('.shelf-notes-panel-close').addEventListener('click', function (e) {
        e.stopPropagation();
        collapseNotes(card);
      });

      noteBtn.addEventListener('click', function () {
        if (card.classList.contains('shelf-card-expanded')) {
          collapseNotes(card);
        } else {
          expandNotes(card);
        }
      });

      card.appendChild(noteBtn);
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
      var expanded = grid.querySelector('.shelf-card-expanded');
      if (expanded) collapseNotes(expanded);
      KJO.filterCards(grid, { status: activeStatus, type: activeType });
    }));

    // Type filter pills
    container.appendChild(KJO.filterPills(TYPE_FILTERS, 'all', function (value) {
      activeType = value;
      var expanded = grid.querySelector('.shelf-card-expanded');
      if (expanded) collapseNotes(expanded);
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
