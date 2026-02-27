/**
 * Explore Page — Hub Links Grid
 * Static page with links to KJO sections. No API calls.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  var LINKS = [
    {
      title: 'Music',
      href: 'https://keyjayonline.com/#music',
      desc: 'Original compositions for games, film, and media',
      icon: 'music',
      color: '#3b82f6'
    },
    {
      title: 'Voice',
      href: 'https://keyjayonline.com/#voice',
      desc: 'Character voices, narration, and IVR systems',
      icon: 'mic',
      color: '#764ba2'
    },
    {
      title: 'Productions',
      href: 'https://keyjayonline.com/#productions',
      desc: 'Comics, games, video, and creative projects',
      icon: 'video',
      color: '#f97316'
    },
    {
      title: 'Tech',
      href: 'https://keyjayonline.com/#tech',
      desc: 'Full-stack development and open-source tools',
      icon: 'code',
      color: '#667eea'
    },
    // {
    //   title: 'Games Library',
    //   href: 'https://keyjayonline.com/games',
    //   desc: 'Browse the full collection',
    //   icon: 'gamepad',
    //   color: '#10b981'
    // },
    // {
    //   title: 'Key Jay Radio',
    //   href: 'https://keyjayonline.com/radio',
    //   desc: 'Stream original music',
    //   icon: 'rss',
    //   color: '#3b82f6'
    // },
    {
      title: '/now Updates',
      href: 'https://keyjayonline.com/now',
      desc: 'What I\'m currently up to',
      icon: 'clock',
      color: '#CEE51F'
    },
    {
      title: 'RSS Feed',
      href: 'https://keyjayonline.com/feed.xml',
      desc: 'Subscribe to all updates',
      icon: 'rss',
      color: '#f97316'
    }
  ];

  function render(container) {
    container.appendChild(KJO.sectionLabel(
      KJO.icon('compass', 28, { className: 'v2-section-icon' }),
      'Explore'
    ));

    var grid = KJO.el('div', 'explore-grid');

    for (var i = 0; i < LINKS.length; i++) {
      var link = LINKS[i];
      var card = KJO.el('a', 'explore-card glass-card', null, {
        href: link.href,
        target: '_blank',
        rel: 'noopener'
      });
      card.style.animationDelay = (i * 0.06) + 's';

      var iconWrap = KJO.el('div', 'explore-card-icon');
      iconWrap.innerHTML = KJO.icon(link.icon, 22);
      iconWrap.style.color = link.color;

      KJO.appendAll(card, [
        iconWrap,
        KJO.tree('div', 'explore-card-text', [
          KJO.el('div', 'explore-card-title', link.title),
          KJO.el('div', 'explore-card-desc', link.desc)
        ])
      ]);

      grid.appendChild(card);
    }

    container.appendChild(grid);
  }

  KJO.router.register('explore', render);
})();
