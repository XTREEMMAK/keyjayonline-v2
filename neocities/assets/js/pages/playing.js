/**
 * Playing Page — What I'm Playing
 * Game shelf with filter pills, IGDB-enriched data from KJO API.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  var STATUS_FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Playing', value: 'playing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Dropped', value: 'dropped' },
    { label: 'Backlog', value: 'backlog' }
  ];

  var FADE_DURATION = 300;   // ms — siblings opacity transition
  var WIDTH_DURATION = 350;  // ms — card width expand/shrink
  var PANEL_DURATION = 450;  // ms — notes panel slide transition
  var INFO_FADE = 200;       // ms — info section fade out/in during layout switch
  var COVER_RESIZE = 400;    // ms — matches cover well CSS transition duration

  /** Smooth-scroll element to top of viewport, accounting for sticky nav. */
  function scrollToEl(el) {
    var nav = document.querySelector('.spa-nav');
    var offset = nav ? nav.offsetHeight + 12 : 12;
    var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /**
   * Staged expand with FLIP position compensation:
   *  1. Mark card expanded + fade siblings out (CSS opacity)
   *  2. Hide siblings, lock card width + grid-column, compensate position with translateX
   *  3. Animate width + transform together (card slides to left edge while expanding)
   *  4. Open notes panel
   */
  function expandNotes(card) {
    var grid = card.closest('.shelf-grid');
    if (!grid) return;

    // Close any other expanded card immediately
    var existing = grid.querySelector('.shelf-card-expanded');
    if (existing && existing !== card) {
      existing.classList.remove('shelf-card-expanded', 'shelf-panel-open', 'shelf-cover-full', 'shelf-poster-layout');
      existing.style.cssText = '';
      var exHidden = grid.querySelectorAll('.shelf-card-hidden');
      for (var i = 0; i < exHidden.length; i++) exHidden[i].classList.remove('shelf-card-hidden');
      grid.classList.remove('shelf-notes-active');
    }

    // Capture card's natural width before any layout changes
    var startWidth = card.offsetWidth;

    // Step 1: mark card (excluded from fade CSS), fade siblings
    card.classList.add('shelf-card-expanded');
    grid.classList.add('shelf-notes-active');

    // Step 2: after fade completes, hide siblings and animate width + position
    setTimeout(function () {
      // Capture card's position BEFORE hiding siblings (still in original column)
      var firstRect = card.getBoundingClientRect();

      var siblings = grid.querySelectorAll('.shelf-card:not(.shelf-card-expanded)');
      for (var i = 0; i < siblings.length; i++) siblings[i].classList.add('shelf-card-hidden');

      // Kill base CSS transitions so setting initial FLIP state doesn't animate
      card.style.transition = 'none';

      // Lock card at pre-expansion width and span the full grid
      card.style.width = startWidth + 'px';
      card.style.gridColumn = '1 / -1';

      // Read new position (card moved to column 1 after siblings hidden)
      var lastRect = card.getBoundingClientRect();
      var deltaX = firstRect.left - lastRect.left;
      var deltaY = firstRect.top - lastRect.top;

      // Compensate: translate keeps card visually in its original position
      card.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';

      // Commit initial state (width + position locked, no transitions running)
      void card.offsetWidth;

      // Scroll viewport to grid top while card animates into place
      scrollToEl(grid);

      // Step 3: enable transitions and animate to expanded state
      var targetWidth = grid.clientWidth;
      card.style.transition = 'width ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1), transform ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.width = targetWidth + 'px';
      card.style.transform = 'translate(0, 0)';

      // Step 4: after width animation — phased cover expansion + poster layout
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

  /**
   * Staged collapse with FLIP position compensation:
   *  1. Close panel (CSS transition)
   *  2. FLIP-measure target position, animate width + transform (card slides + shrinks)
   *  3. Clean up grid state, show siblings, fade them in
   */
  function collapseNotes(card) {
    var grid = card.closest('.shelf-grid');
    if (!grid) return;

    // Step 1: fade info out, then revert poster layout + close panel
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

      // Step 2: after panel transition, animate width + position back
      setTimeout(function () {
        var expandedWidth = card.offsetWidth;
        var firstRect = card.getBoundingClientRect();

      // Kill base CSS transitions during FLIP measurement
      card.style.transition = 'none';

      // FLIP: temporarily snap to final layout to measure target position + width
      // (siblings are at opacity 0 from shelf-notes-active, so no visual flash)
      card.style.width = '';
      card.style.gridColumn = '';
      var hiddenSiblings = grid.querySelectorAll('.shelf-card-hidden');
      for (var i = 0; i < hiddenSiblings.length; i++) hiddenSiblings[i].classList.remove('shelf-card-hidden');

      var targetWidth = card.offsetWidth;
      var lastRect = card.getBoundingClientRect();
      var deltaX = lastRect.left - firstRect.left;
      var deltaY = lastRect.top - firstRect.top;

      // Revert to expanded state (no paint happened — all synchronous)
      for (var i = 0; i < hiddenSiblings.length; i++) hiddenSiblings[i].classList.add('shelf-card-hidden');
      card.style.gridColumn = '1 / -1';
      card.style.width = expandedWidth + 'px';

      // Commit starting state
      void card.offsetWidth;

      // Enable transitions and animate: shrink width + slide to target column
      card.style.transition = 'width ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1), transform ' + WIDTH_DURATION + 'ms cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.width = targetWidth + 'px';
      card.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';

      // Step 3: after animation, restore grid and fade siblings back in
      setTimeout(function () {
        card.style.cssText = '';
        card.style.animation = 'none'; // prevent entrance animation replay
        card.classList.remove('shelf-card-expanded');

        // Show siblings (they render at opacity 0 due to shelf-notes-active)
        var siblings = grid.querySelectorAll('.shelf-card-hidden');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('shelf-card-hidden');

        // Force reflow so siblings are painted at opacity 0 before fade-in
        void grid.offsetHeight;

        // Remove active state — siblings transition opacity 0 → 1 via base CSS
        grid.classList.remove('shelf-notes-active');
        scrollToEl(card);
      }, WIDTH_DURATION);
      }, PANEL_DURATION);
    }, INFO_FADE);
  }

  function renderGameCard(game, index) {
    var card = KJO.el('div', 'shelf-card glass-card');
    card.setAttribute('data-status', (game.game_status || '').toLowerCase());
    KJO.staggerDelay(card, index);

    // Blurred cover art background
    if (game.cover_url) {
      var bgDiv = KJO.el('div', 'shelf-card-bg');
      bgDiv.style.backgroundImage = 'url(' + game.cover_url + ')';
      card.appendChild(bgDiv);
    }

    var dateText = null;
    if (game.started_at) {
      dateText = game.finished_at
        ? 'Finished ' + KJO.relativeDate(game.finished_at)
        : 'Started ' + KJO.relativeDate(game.started_at);
    }

    var trailerBtn = null;
    if (game.video_id) {
      trailerBtn = KJO.el('button', 'shelf-trailer-btn', 'Trailer \u25b6');
      trailerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        KJO.videoModal.open(game.video_id, game.title + ' \u2014 Trailer');
      });
    }

    var info = KJO.tree('div', 'shelf-info', [
      KJO.el('h3', 'shelf-title', game.title),
      KJO.statusPill(game.game_status),
      game.platform ? KJO.el('span', 'shelf-meta', game.platform) : null,
      game.genres && game.genres.length ? KJO.el('div', 'shelf-genres', game.genres.slice(0, 3).join(' \u00b7 ')) : null,
      game.rating ? KJO.el('div', 'shelf-rating', '\u2605 ' + game.rating + '/10') : null,
      dateText ? KJO.el('div', 'shelf-date', dateText) : null,
      game.igdb_id ? KJO.el('a', 'shelf-external-link', 'IGDB \u2197', {
        href: 'https://www.igdb.com/games/' + game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        target: '_blank',
        rel: 'noopener'
      }) : null,
      trailerBtn
    ]);

    // Build notes panel (hidden until expanded)
    var notesPanel = null;
    if (game.notes) {
      var panelInner = KJO.el('div', 'shelf-notes-panel-inner');
      panelInner.innerHTML = game.notes;
      var panelClose = KJO.el('button', 'shelf-notes-panel-close', '\u00d7');
      notesPanel = KJO.tree('div', 'shelf-notes-panel', [panelClose, panelInner]);
    }

    // Card layout: main content + optional notes panel
    card.appendChild(KJO.tree('div', 'shelf-card-layout', [
      KJO.tree('div', 'shelf-card-main', [
        KJO.tree('div', 'shelf-card-inner', [
          KJO.coverWell(game.cover_url, game.title, KJO.icon('gamepad', 32, { strokeWidth: 1.5, opacity: 0.3 })),
          info
        ])
      ]),
      notesPanel
    ]));

    // Notes expand/collapse logic (staged animation)
    if (game.notes) {
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

    return card;
  }

  function render(container) {
    container.appendChild(KJO.sectionLabel(
      KJO.icon('gamepad', 28, { className: 'v2-section-icon' }),
      "What I'm Playing"
    ));

    var grid = KJO.el('div', 'shelf-grid');

    container.appendChild(KJO.filterPills(STATUS_FILTERS, 'all', function (value) {
      // Close any expanded notes before filtering
      var expanded = grid.querySelector('.shelf-card-expanded');
      if (expanded) collapseNotes(expanded);
      KJO.filterCards(grid, { status: value });
    }));

    grid.appendChild(KJO.loading());
    container.appendChild(grid);

    KJO.fetchGameShelf().then(function (data) {
      grid.innerHTML = '';

      if (!data || !data.games || data.games.length === 0) {
        grid.appendChild(KJO.empty('No games on the shelf yet.'));
        return;
      }

      for (var i = 0; i < data.games.length; i++) {
        grid.appendChild(renderGameCard(data.games[i], i));
      }
    }).catch(function () {
      grid.innerHTML = '';
      grid.appendChild(KJO.error('Game shelf is unavailable.', function () {
        render(container);
      }));
    });
  }

  KJO.router.register('playing', render);
})();
