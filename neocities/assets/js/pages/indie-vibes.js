/**
 * Indie Vibes Page — Indie Vibes I'm Listening To
 * Curated showcase of indie, obscure, and underrated music picks.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  var PICKS = [
    // Add curated picks here:
    // {
    //   artist: 'Artist Name',
    //   track: 'Track / Album Title',
    //   note: 'Why this is worth checking out',
    //   cover_url: 'https://example.com/cover.jpg',
    //   link: 'https://bandcamp.com/...',
    //   platform: 'bandcamp',   // bandcamp|soundcloud|spotify|youtube
    //   genre: 'Lo-fi / Shoegaze',
    //   sample_url: 'https://example.com/sample.mp3'  // optional audio sample
    // }
     {
       artist: 'Ashzone Music',
       track: 'XENO',
       note: 'A short EP, but plenty of great moments, packed with crazy cuts and vocal chops.',
       cover_url: 'https://f4.bcbits.com/img/a2112082425_16.jpg',
       link: 'https://ashzonemusic.bandcamp.com/album/xeno',
       platform: 'bandcamp',
       genre: 'EDM',
       sample_url: 'https://t4.bcbits.com/stream/23f2543071bbd3438d3ba9f84e582e27/mp3-128/4120438229?p=0&ts=1772312682&t=2042d9792956e550eec3eb18e06933d2abda84a6&token=1772312682_42d8b6be5cae7f5c756348c20709574c7a0a42ea'
     }
  ];

  // Shared audio instance so only one sample plays at a time
  var currentAudio = null;
  var currentBtn = null;

  function stopCurrent() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (currentBtn) {
      currentBtn.textContent = '\u25b6 Sample';
      currentBtn.classList.remove('indie-sample-playing');
      currentBtn = null;
    }
  }

  // Platform display names + colors
  var PLATFORM_META = {
    bandcamp:   { label: 'Bandcamp',   color: '#1da0c3' },
    soundcloud: { label: 'SoundCloud', color: '#ff5500' },
    spotify:    { label: 'Spotify',    color: '#1db954' },
    youtube:    { label: 'YouTube',    color: '#ff0000' },
    lastfm:     { label: 'Last.fm',    color: '#d51007' }
  };

  function renderPickCard(pick, index) {
    var card = KJO.el('div', 'indie-card glass-card');
    KJO.staggerDelay(card, index);

    // Blurred cover art background
    if (pick.cover_url) {
      var bgDiv = KJO.el('div', 'shelf-card-bg');
      bgDiv.style.backgroundImage = 'url(' + pick.cover_url + ')';
      card.appendChild(bgDiv);
    }

    // Platform link
    var platformLink = null;
    if (pick.link) {
      var meta = PLATFORM_META[pick.platform] || { label: 'Listen', color: '#818cf8' };
      platformLink = KJO.el('a', 'indie-platform-link', null, {
        href: pick.link,
        target: '_blank',
        rel: 'noopener'
      });
      platformLink.style.color = meta.color;
      var iconWrap = KJO.el('span', '');
      iconWrap.innerHTML = pick.platform && KJO.socialIcons[pick.platform]
        ? KJO.socialIcon(pick.platform, 14, { color: meta.color })
        : '';
      platformLink.appendChild(iconWrap);
      platformLink.appendChild(document.createTextNode(' ' + meta.label + ' \u2197'));
    }

    // Sample play button
    var sampleBtn = null;
    if (pick.sample_url) {
      sampleBtn = KJO.el('button', 'indie-sample-btn', '\u25b6 Sample');
      (function (btn, url) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (currentAudio && currentBtn === btn) {
            // Toggle off
            stopCurrent();
            return;
          }
          stopCurrent();
          currentBtn = btn;
          currentAudio = new Audio(url);
          btn.textContent = '\u275a\u275a Pause';
          btn.classList.add('indie-sample-playing');
          currentAudio.play();
          currentAudio.addEventListener('ended', function () {
            stopCurrent();
          });
        });
      })(sampleBtn, pick.sample_url);
    }

    var info = KJO.tree('div', 'indie-card-info', [
      KJO.el('div', 'shelf-title', pick.track),
      KJO.el('div', 'indie-artist', pick.artist),
      pick.genre ? KJO.el('div', 'indie-genre', pick.genre) : null,
      pick.note ? KJO.el('div', 'indie-note', pick.note) : null,
      KJO.tree('div', 'indie-card-actions', [sampleBtn, platformLink])
    ]);

    card.appendChild(KJO.tree('div', 'indie-card-inner', [
      KJO.coverWell(pick.cover_url, pick.artist + ' — ' + pick.track, KJO.icon('music', 32, { strokeWidth: 1.5, opacity: 0.3 })),
      info
    ]));

    return card;
  }

  function render(container) {
    container.appendChild(KJO.sectionLabel(
      KJO.icon('music', 28, { className: 'v2-section-icon' }),
      "Indie Vibes I'm Listening To"
    ));

    var grid = KJO.el('div', 'shelf-grid indie-grid');

    if (PICKS.length === 0) {
      grid.appendChild(KJO.empty('No indie picks yet \u2014 check back soon.'));
    } else {
      for (var i = 0; i < PICKS.length; i++) {
        grid.appendChild(renderPickCard(PICKS[i], i));
      }
    }

    container.appendChild(grid);
  }

  // Exposed as a shared render helper — rendered inside the Listening page
  KJO.renderIndieVibes = render;
})();
