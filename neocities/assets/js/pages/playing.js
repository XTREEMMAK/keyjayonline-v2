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

  function renderGameCard(game, index) {
    var card = KJO.el('div', 'shelf-card glass-card');
    card.setAttribute('data-status', game.game_status || '');
    KJO.staggerDelay(card, index);

    var dateText = null;
    if (game.started_at) {
      dateText = game.finished_at
        ? 'Finished ' + KJO.relativeDate(game.finished_at)
        : 'Started ' + KJO.relativeDate(game.started_at);
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
      }) : null
    ]);

    card.appendChild(KJO.tree('div', 'shelf-card-inner', [
      KJO.coverWell(game.cover_url, game.title, KJO.icon('gamepad', 32, { strokeWidth: 1.5, opacity: 0.3 })),
      info
    ]));

    if (game.notes) {
      var notes = KJO.el('div', 'shelf-notes');
      notes.innerHTML = game.notes;
      card.appendChild(notes);
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
