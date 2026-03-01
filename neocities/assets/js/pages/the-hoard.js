/**
 * The Hoard Page — Stamps & Cool Links
 * A collection of IndieWeb culture artifacts.
 * (Webrings live in the persistent carousel at the bottom of every page.)
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  // 88x31 stamp buttons — add stamps here as you collect them
  var STAMPS = [
    { src: 'assets/images/stamps/mah-boi.png', alt: 'Mah Boi' }
  ];

  // Site buttons — hotlinkable
  var BUTTONS = [
    { src: 'assets/images/kjo_button.gif', alt: 'Key Jay Online Button 1' },
    { src: 'assets/images/kjo_button2.gif', alt: 'Key Jay Online Button 2' },
    { src: 'assets/images/kjo_button3.gif', alt: 'Key Jay Online Button 3' }
  ];

  // Collected buttons from around the web
  var COLLECTION = [
    { src: 'assets/images/buttons/button_bandcamp.png', alt: 'Bandcamp' },
    { src: 'assets/images/buttons/ngbanner2.gif', alt: 'NG Banner' },
    { src: 'assets/images/buttons/firefox.gif', alt: 'Firefox' }
  ];

  // Sites I Enjoy — linked buttons
  var SITES_I_ENJOY = [
    { src: 'assets/images/buttons/hotlinecafebutton3.gif', alt: 'Hotline Cafe', href: 'https://hotlinecafe.com/' },
    { src: 'assets/images/buttons/site_button.gif', alt: 'Nom Nom Nami', href: 'https://nomnomnami.com/' }
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

  function renderSubsectionLabel(iconName, text) {
    var label = KJO.el('div', 'horde-section-label');
    label.innerHTML = KJO.icon(iconName, 20);
    label.appendChild(document.createTextNode(' ' + text));
    return label;
  }

  function renderStamps() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('code', 'Stamps'));

    if (STAMPS.length === 0) {
      section.appendChild(KJO.el('div', 'horde-stamps-empty glass-card', 'No stamps yet \u2014 want to trade? Hit me up!'));
      return section;
    }

    var card = KJO.el('div', 'horde-buttons-card glass-card');
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

    card.appendChild(grid);
    section.appendChild(card);
    return section;
  }

  function renderButtons() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('link', 'Link Me'));

    var card = KJO.el('div', 'horde-buttons-card glass-card');

    var hint = KJO.el('p', 'horde-buttons-hint', 'Click a button for hotlink code \u2022 Right-click to save');

    var row = KJO.el('div', 'horde-buttons-row');
    var codeBox = null;
    var codeInput = null;
    var activeBtn = null;

    function showCode(btn, imgSrc) {
      var fullUrl = 'https://keyjay.neocities.org/' + imgSrc;
      var hotlink = '<a href="https://keyjay.neocities.org"><img src="' + fullUrl + '" alt="Key Jay Online"></a>';

      if (!codeBox) {
        codeBox = KJO.el('div', 'horde-hotlink-box');
        codeInput = KJO.el('textarea', 'horde-hotlink-code', null, {
          readonly: '',
          rows: '2',
          spellcheck: 'false'
        });
        codeInput.addEventListener('click', function () { codeInput.select(); });
        codeBox.appendChild(codeInput);
        card.appendChild(codeBox);
        // Force reflow so the initial max-height:0 state registers before transition
        codeBox.offsetHeight;
      }

      if (activeBtn === btn) {
        // Same button clicked — toggle off
        codeBox.classList.remove('hotlink-box-open');
        activeBtn = null;
        return;
      }

      activeBtn = btn;
      codeInput.value = hotlink;

      // Slide up then back down if already open
      if (codeBox.classList.contains('hotlink-box-open')) {
        codeBox.classList.remove('hotlink-box-open');
        setTimeout(function () {
          codeBox.classList.add('hotlink-box-open');
        }, 200);
      } else {
        codeBox.classList.add('hotlink-box-open');
      }
    }

    for (var i = 0; i < BUTTONS.length; i++) {
      (function (button) {
        var btn = KJO.el('button', 'horde-button-item');
        var img = KJO.el('img', '', null, {
          src: button.src,
          alt: button.alt,
          loading: 'lazy'
        });
        btn.appendChild(img);
        btn.addEventListener('click', function () { showCode(btn, button.src); });
        row.appendChild(btn);
      })(BUTTONS[i]);
    }

    card.appendChild(hint);
    card.appendChild(row);
    section.appendChild(card);
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

  function renderCollection() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('code', 'Buttons'));

    var card = KJO.el('div', 'horde-buttons-card glass-card');
    var grid = KJO.el('div', 'horde-stamps-grid');

    for (var i = 0; i < COLLECTION.length; i++) {
      var button = COLLECTION[i];
      var wrapper = KJO.el('span', 'horde-stamp-link');
      var img = KJO.el('img', 'horde-stamp', null, {
        src: button.src,
        alt: button.alt || '',
        width: '88',
        height: '31',
        loading: 'lazy'
      });
      wrapper.appendChild(img);
      grid.appendChild(wrapper);
    }

    card.appendChild(grid);
    section.appendChild(card);
    return section;
  }

  function renderSitesIEnjoy() {
    var section = KJO.el('div', 'horde-section');
    section.appendChild(renderSubsectionLabel('smile', 'Sites I Enjoy'));

    var card = KJO.el('div', 'horde-buttons-card glass-card');
    var grid = KJO.el('div', 'horde-stamps-grid');

    for (var i = 0; i < SITES_I_ENJOY.length; i++) {
      var site = SITES_I_ENJOY[i];
      var link = KJO.el('a', 'horde-stamp-link', null, {
        href: site.href,
        target: '_blank',
        rel: 'noopener'
      });
      var img = KJO.el('img', 'horde-stamp', null, {
        src: site.src,
        alt: site.alt || '',
        width: '88',
        height: '31',
        loading: 'lazy'
      });
      link.appendChild(img);
      grid.appendChild(link);
    }

    card.appendChild(grid);
    section.appendChild(card);
    return section;
  }

  function render(container) {
    container.appendChild(KJO.sectionLabel(
      KJO.icon('chest', 28, { className: 'v2-section-icon' }),
      'The Hoard'
    ));

    container.appendChild(renderButtons());
    container.appendChild(renderCollection());
    container.appendChild(renderStamps());
    container.appendChild(renderCoolLinks());
    container.appendChild(renderSitesIEnjoy());
  }

  KJO.router.register('the-hoard', render);
})();
