/**
 * The Horde Page — Webrings, Stamps, Cool Links
 * A collection of IndieWeb culture artifacts.
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  // 88x31 stamp buttons — add stamps here as you collect them
  var STAMPS = [
    // { src: 'assets/img/stamps/example.gif', alt: 'Example', href: 'https://example.com' }
  ];

  // Cool links / resources
  var LINKS = [
    // {
    //   title: 'Site Name',
    //   href: 'https://example.com',
    //   desc: 'Description of the site',
    //   icon: 'globe',
    //   color: '#3b82f6'
    // }
  ];

  // Webring HTML templates (injected into cards)
  var WEBRINGS = [
    {
      name: 'Musicians Ring',
      id: 'musicians-ring',
      html: '<script type="text/javascript" src="https://lydels.neocities.org/musicianswebring/onionring-variables.js"><\/script>' +
            '<script type="text/javascript" src="https://lydels.neocities.org/musicianswebring/onionring-widget.js"><\/script>'
    },
    {
      name: 'Webmaster Ring',
      id: 'webmaster-ring',
      html: '<a target="_blank" href="https://webmasterwebring.netlify.app"><img src="https://file.garden/ZrZSgsrYfQXsO7QH/ww/btn.png" width="88" height="31"></a>'
    }
  ];

  function renderSubsectionLabel(iconName, text) {
    var label = KJO.el('div', 'horde-section-label');
    label.innerHTML = KJO.icon(iconName, 20);
    label.appendChild(document.createTextNode(' ' + text));
    return label;
  }

  function renderWebrings() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('globe', 'Webrings'));

    var grid = KJO.el('div', 'horde-rings-grid');

    for (var i = 0; i < WEBRINGS.length; i++) {
      var ring = WEBRINGS[i];
      var card = KJO.el('div', 'horde-ring-card glass-card');
      card.appendChild(KJO.el('div', 'horde-ring-name', ring.name));
      var content = KJO.el('div', 'horde-ring-content');
      content.setAttribute('id', 'horde-' + ring.id);
      content.innerHTML = ring.html;
      card.appendChild(content);
      grid.appendChild(card);
    }

    section.appendChild(grid);
    return section;
  }

  function renderStamps() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('code', 'Stamps'));

    if (STAMPS.length === 0) {
      section.appendChild(KJO.el('div', 'horde-stamps-empty glass-card', 'No stamps yet \u2014 want to trade? Hit me up!'));
      return section;
    }

    var grid = KJO.el('div', 'horde-stamps-grid');

    for (var i = 0; i < STAMPS.length; i++) {
      var stamp = STAMPS[i];
      var wrapper = stamp.href
        ? KJO.el('a', 'horde-stamp-link', null, { href: stamp.href, target: '_blank', rel: 'noopener' })
        : KJO.el('span', 'horde-stamp-link');
      var img = KJO.el('img', 'horde-stamp', null, {
        src: stamp.src,
        alt: stamp.alt || '',
        width: '88',
        height: '31',
        loading: 'lazy'
      });
      wrapper.appendChild(img);
      grid.appendChild(wrapper);
    }

    section.appendChild(grid);
    return section;
  }

  function renderCoolLinks() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('compass', 'Cool Links'));

    if (LINKS.length === 0) {
      section.appendChild(KJO.el('div', 'horde-links-empty glass-card', 'Cool links coming soon.'));
      return section;
    }

    var grid = KJO.el('div', 'horde-links-grid');

    for (var i = 0; i < LINKS.length; i++) {
      var link = LINKS[i];
      var card = KJO.el('a', 'horde-link-card glass-card', null, {
        href: link.href,
        target: '_blank',
        rel: 'noopener'
      });
      card.style.animationDelay = (i * 0.06) + 's';

      var iconWrap = KJO.el('div', 'explore-card-icon');
      iconWrap.innerHTML = KJO.icon(link.icon || 'globe', 22);
      iconWrap.style.color = link.color || '#818cf8';

      KJO.appendAll(card, [
        iconWrap,
        KJO.tree('div', 'explore-card-text', [
          KJO.el('div', 'explore-card-title', link.title),
          KJO.el('div', 'explore-card-desc', link.desc)
        ])
      ]);

      grid.appendChild(card);
    }

    section.appendChild(grid);
    return section;
  }

  function render(container) {
    container.appendChild(KJO.sectionLabel(
      KJO.icon('chest', 28, { className: 'v2-section-icon' }),
      'The Horde'
    ));

    container.appendChild(renderWebrings());
    container.appendChild(renderStamps());
    container.appendChild(renderCoolLinks());
  }

  KJO.router.register('the-horde', render);
})();
