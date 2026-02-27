/**
 * About Page — "If you're new here"
 * Static intro card with h-card microformat and routing suggestions.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  function render(container) {
    container.appendChild(KJO.sectionLabel(KJO.icon('user', 28, { className: 'v2-section-icon' }), 'About'));

    var bio = KJO.el('div', 'about-bio');
    bio.innerHTML = KJO.copy.aboutBio;

    var quickLinks = [
      { text: 'Listen to music', href: '#explore' },
      { text: 'See what I\'m playing', href: '#playing' },
      { text: 'See what I\'m watching', href: '#watching' },
      { text: 'Latest updates', href: '#home' }
    ];
    var links = KJO.el('div', 'about-links');
    for (var i = 0; i < quickLinks.length; i++) {
      var a = KJO.el('a', 'about-quick-link neu-button neu-button-round', quickLinks[i].text + ' \u2192');
      a.href = quickLinks[i].href;
      links.appendChild(a);
    }

    container.appendChild(KJO.tree('div', 'about-card glass-card h-card', [
      KJO.tree('div', 'about-avatar', [
        KJO.el('img', 'u-photo about-avatar-img', null, {
          src: 'assets/images/KJ_Logo_Medium_W.svg',
          alt: 'Key Jay'
        })
      ]),
      KJO.el('h2', 'about-name p-name', 'Key Jay'),
      bio,
      KJO.el('h3', 'about-links-label', 'Quick links'),
      links
    ]));

    var indieweb = KJO.el('div', 'about-indieweb glass-card');
    indieweb.innerHTML = KJO.copy.aboutIndieWeb;
    container.appendChild(indieweb);
  }

  KJO.router.register('about', render);
})();
