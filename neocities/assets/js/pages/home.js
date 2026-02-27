/**
 * Home Page
 * Renders intro, video showcase, NOW entries, and CTA.
 * Migrated from script.js.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  // ---------------------------------------------------------------------------
  // Wrap <img> elements inside neumorphic inset wells
  // ---------------------------------------------------------------------------
  function wrapImages(container) {
    var images = container.querySelectorAll('img');
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      if (img.parentNode.classList && img.parentNode.classList.contains('image-well')) continue;
      var well = document.createElement('div');
      well.className = 'image-well';
      img.parentNode.insertBefore(well, img);
      well.appendChild(img);
    }
  }

  // ---------------------------------------------------------------------------
  // Build intro section
  // ---------------------------------------------------------------------------
  function buildIntro() {
    var iconOverlap = KJO.el('div', 'v2-intro-icon-overlap');
    iconOverlap.innerHTML = KJO.icon('user', 36, { className: 'v2-section-icon' });

    var p = KJO.el('p', 'v2-intro-text');
    p.innerHTML = KJO.copy.intro;

    return KJO.tree('section', 'v2-intro-wrap', [
      iconOverlap,
      KJO.tree('div', 'v2-intro glass-card', [p])
    ]);
  }

  // ---------------------------------------------------------------------------
  // Build video showcase section
  // ---------------------------------------------------------------------------
  function buildVideoShowcase() {
    var section = KJO.el('section', 'v2-video-section');
    section.id = 'video-showcase';
    section.setAttribute('hidden', '');

    var iframe = document.createElement('iframe');
    iframe.setAttribute('data-yt-embed', '');
    iframe.src = '';
    iframe.title = 'Featured video';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');

    KJO.appendAll(section, [
      KJO.sectionLabel(KJO.icon('video', 28, { className: 'v2-section-icon' }), 'Featured'),
      KJO.tree('div', 'v2-video-card glass-card', [
        KJO.tree('div', 'v2-video-embed', [iframe])
      ])
    ]);

    return section;
  }

  // ---------------------------------------------------------------------------
  // Build NOW entries section
  // ---------------------------------------------------------------------------
  function buildNowSection() {
    var feed = KJO.el('div', 'h-feed');
    feed.id = 'now-entries';
    feed.appendChild(KJO.tree('div', 'now-placeholder glass-card', [
      KJO.el('p', '', 'Loading updates...')
    ]));

    var cta = KJO.el('a', 'neu-button neu-button-round now-cta-link', 'See all updates on KeyJayOnline \u2192');
    cta.href = 'https://keyjayonline.com/now';

    return KJO.tree('section', 'now-section', [
      KJO.sectionLabel(KJO.icon('clock', 28, { className: 'v2-section-icon' }), 'What I\'m up to'),
      feed,
      KJO.tree('div', 'now-cta-container', [cta])
    ]);
  }

  // ---------------------------------------------------------------------------
  // Render a single NOW entry
  // ---------------------------------------------------------------------------
  function renderEntry(entry, site, isLatest) {
    var article = KJO.el('article', 'h-entry glass-card now-entry');
    if (isLatest) article.classList.add('entry-latest');

    var timeEl = document.createElement('time');
    timeEl.className = 'dt-published';
    timeEl.setAttribute('datetime', entry.published_at);
    timeEl.textContent = KJO.relativeDate(entry.published_at);
    timeEl.title = KJO.formatFullDate(entry.published_at);

    var viaPill = KJO.el('a', 'via-pill', 'via KJO');
    viaPill.href = site.now_url;

    var content = KJO.el('div', 'e-content now-entry-content');
    content.innerHTML = entry.content;
    wrapImages(content);

    KJO.appendAll(article, [
      KJO.tree('div', 'now-entry-header', [
        KJO.tree('span', 'now-entry-date', [timeEl]),
        viaPill
      ]),
      content
    ]);

    return article;
  }

  // ---------------------------------------------------------------------------
  // Render fallback state
  // ---------------------------------------------------------------------------
  function renderFallback(container, message) {
    container.innerHTML = '';
    var link = KJO.el('a', 'neu-button neu-button-round', 'Visit KeyJayOnline.com/now \u2192');
    link.href = 'https://keyjayonline.com/now';
    container.appendChild(KJO.tree('div', 'now-fallback glass-card', [
      KJO.el('p', '', message || 'Content is being updated.'),
      link
    ]));
  }

  // ---------------------------------------------------------------------------
  // Fetch and render NOW entries
  // ---------------------------------------------------------------------------
  function fetchNowEntries(feedContainer) {
    KJO.fetchNowFeed().then(function (data) {
      if (!data || !data.entries || data.entries.length === 0) {
        renderFallback(feedContainer, 'Nothing here yet \u2014 check back soon.');
        return;
      }

      feedContainer.innerHTML = '';
      var site = data.site || {};
      for (var i = 0; i < data.entries.length; i++) {
        var el = renderEntry(data.entries[i], site, i === 0);
        feedContainer.appendChild(el);
      }
    }).catch(function () {
      renderFallback(feedContainer);
    });
  }

  // ---------------------------------------------------------------------------
  // Page render function
  // ---------------------------------------------------------------------------
  function render(container) {
    // 1. Intro
    container.appendChild(buildIntro());

    // 2. Video showcase
    var videoSection = buildVideoShowcase();
    container.appendChild(videoSection);
    KJO.videoShowcase.init(videoSection);

    // 3. NOW entries
    var nowSection = buildNowSection();
    container.appendChild(nowSection);
    fetchNowEntries(nowSection.querySelector('#now-entries'));
  }

  KJO.router.register('home', render);
})();
