/**
 * DOM Builder Helpers
 * Reusable functions for creating UI elements across page modules.
 */

(function () {
  'use strict';
  window.KJO = window.KJO || {};

  /**
   * Create a DOM element with class, text, and optional attributes.
   */
  window.KJO.el = function (tag, className, textContent, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent) node.textContent = textContent;
    if (attrs) {
      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          node.setAttribute(key, attrs[key]);
        }
      }
    }
    return node;
  };

  /**
   * Append an array of child elements to a parent.
   */
  window.KJO.appendAll = function (parent, children) {
    for (var i = 0; i < children.length; i++) {
      if (children[i]) parent.appendChild(children[i]);
    }
    return parent;
  };

  /**
   * Build a nested DOM tree in one call.
   * @param {string} tag - Element tag name
   * @param {string} className - CSS class(es)
   * @param {Array} children - Child elements (nulls filtered out)
   * @param {Object} [attrs] - Optional HTML attributes
   */
  window.KJO.tree = function (tag, className, children, attrs) {
    var node = KJO.el(tag, className, null, attrs);
    if (children) KJO.appendAll(node, children);
    return node;
  };

  /**
   * Swap page content with exit/enter transitions.
   */
  window.KJO.renderPage = function (containerId, renderFn) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.classList.add('page-exit');

    setTimeout(function () {
      container.innerHTML = '';
      renderFn(container);
      container.classList.remove('page-exit');
      container.classList.add('page-enter');

      setTimeout(function () {
        container.classList.remove('page-enter');
      }, 350);
    }, 200);
  };

  /**
   * Build a section label with icon SVG and text.
   */
  window.KJO.sectionLabel = function (iconSvg, text) {
    var label = KJO.el('div', 'section-label');
    label.innerHTML = iconSvg;
    var h2 = KJO.el('h2', '', text);
    label.appendChild(h2);
    var line = KJO.el('div', 'label-line');
    label.appendChild(line);
    return label;
  };

  /**
   * Build a row of filter pills.
   * @param {Array<{label:string, value:string}>} options
   * @param {string} activeValue - Currently active filter value
   * @param {function} onChange - Callback with selected value
   */
  window.KJO.filterPills = function (options, activeValue, onChange) {
    var row = KJO.el('div', 'shelf-filters');

    options.forEach(function (opt) {
      var pill = KJO.el('button', 'filter-pill' + (opt.value === activeValue ? ' filter-pill-active' : ''));
      pill.textContent = opt.label;
      pill.setAttribute('data-filter', opt.value);
      pill.addEventListener('click', function () {
        row.querySelectorAll('.filter-pill').forEach(function (p) {
          p.classList.remove('filter-pill-active');
        });
        pill.classList.add('filter-pill-active');
        onChange(opt.value);
      });
      row.appendChild(pill);
    });

    return row;
  };

  /**
   * Subtle loading indicator.
   */
  window.KJO.loading = function () {
    return KJO.el('div', 'shelf-loading glass-card', 'Loading...');
  };

  /**
   * Empty state with message.
   */
  window.KJO.empty = function (message) {
    return KJO.el('div', 'shelf-empty glass-card', message || 'Nothing here yet.');
  };

  /**
   * Error state with retry button.
   */
  window.KJO.error = function (message, retryFn) {
    var wrap = KJO.el('div', 'shelf-empty glass-card');
    wrap.appendChild(KJO.el('p', '', message || 'Something went wrong.'));
    if (retryFn) {
      var btn = KJO.el('button', 'neu-button neu-button-round', 'Try again');
      btn.addEventListener('click', retryFn);
      wrap.appendChild(btn);
    }
    return wrap;
  };

  // ---------------------------------------------------------------------------
  // Video Modal (YouTube embed)
  // ---------------------------------------------------------------------------

  window.KJO.videoModal = (function () {
    var overlay, modal, iframe, titleEl;
    var isOpen = false;

    function ensureDOM() {
      if (modal) return;

      overlay = KJO.el('div', 'v2-video-overlay');
      overlay.addEventListener('click', close);

      var iconWrap = KJO.el('span', '');
      iconWrap.innerHTML = KJO.icon('video', 20, { className: 'v2-section-icon' });
      titleEl = KJO.el('h3', '', 'Trailer');
      var closeBtn = KJO.el('button', 'v2-video-close', '\u00d7');
      closeBtn.addEventListener('click', close);
      var header = KJO.tree('div', 'v2-video-modal-header', [iconWrap, titleEl, closeBtn]);

      iframe = KJO.el('iframe', '', null, {
        allowfullscreen: '',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        frameborder: '0'
      });
      var responsive = KJO.tree('div', 'v2-video-responsive', [iframe]);
      var body = KJO.tree('div', 'v2-video-modal-body', [responsive]);

      modal = KJO.tree('div', 'v2-video-modal', [header, body]);

      document.body.appendChild(overlay);
      document.body.appendChild(modal);
    }

    function open(videoId, title) {
      ensureDOM();
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1&autoplay=1';
      titleEl.textContent = title || 'Trailer';
      overlay.classList.add('v2-video-overlay-visible');
      modal.classList.add('v2-video-modal-open');
      isOpen = true;
      history.pushState({ modal: 'video' }, '');
    }

    function close(fromPopstate) {
      if (!isOpen) return;
      overlay.classList.remove('v2-video-overlay-visible');
      modal.classList.remove('v2-video-modal-open');
      setTimeout(function () { iframe.src = ''; }, 300);
      isOpen = false;
      if (!fromPopstate) history.back();
    }

    window.addEventListener('popstate', function (e) {
      if (isOpen) close(true);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    return { open: open, close: close };
  })();

  // ---------------------------------------------------------------------------
  // Detail Bottom Sheet (game/media detail view with notes)
  // ---------------------------------------------------------------------------

  window.KJO.detailSheet = (function () {
    var overlay, sheet, body, bgLayer, activeIframe;
    var isOpen = false;

    function ensureDOM() {
      if (sheet) return;

      overlay = KJO.el('div', 'detail-sheet-overlay');
      overlay.addEventListener('click', close);

      sheet = KJO.el('div', 'detail-sheet');
      sheet.addEventListener('click', function (e) { e.stopPropagation(); });

      // Blurred cover background
      bgLayer = KJO.el('div', 'detail-sheet-bg');
      sheet.appendChild(bgLayer);

      // Header with drag handle and close button
      var handle = KJO.el('div', 'detail-sheet-handle');
      handle.appendChild(KJO.el('span', 'detail-sheet-handle-bar'));
      var closeBtn = KJO.el('button', 'detail-sheet-close', '\u00d7');
      closeBtn.addEventListener('click', close);
      var header = KJO.tree('div', 'detail-sheet-header', [handle, closeBtn]);

      body = KJO.el('div', 'detail-sheet-body');
      sheet.appendChild(header);
      sheet.appendChild(body);

      document.body.appendChild(overlay);
      document.body.appendChild(sheet);
    }

    /**
     * Open the detail sheet with tabbed content.
     * @param {Object} opts
     * @param {string} [opts.coverUrl] - Cover image URL
     * @param {string} [opts.title] - Title text
     * @param {string} [opts.status] - Status label
     * @param {string} [opts.meta] - Meta text (platform, media type)
     * @param {string} [opts.genres] - Genres text
     * @param {string} [opts.notes] - HTML notes content
     * @param {string} [opts.rating] - Rating text
     * @param {string} [opts.icon] - Fallback icon name
     * @param {string} [opts.videoId] - YouTube video ID for trailer tab
     * @param {Array}  [opts.links] - Array of {label, href} for external links
     */
    function open(opts) {
      ensureDOM();
      body.innerHTML = '';
      activeIframe = null;

      // Blurred cover background
      if (opts.coverUrl) {
        bgLayer.style.backgroundImage = 'url(' + opts.coverUrl + ')';
        bgLayer.classList.add('detail-sheet-bg-active');
      } else {
        bgLayer.style.backgroundImage = '';
        bgLayer.classList.remove('detail-sheet-bg-active');
      }

      // Title only — cover and meta already visible on the card
      body.appendChild(KJO.el('h3', 'detail-sheet-title', opts.title));

      // Build tabs if we have notes or trailer
      var hasNotes = !!opts.notes;
      var hasTrailer = !!opts.videoId;
      var tabs = [];

      if (hasNotes) {
        var notesPanel = KJO.el('div', 'detail-sheet-tab-panel');
        var notesContent = KJO.el('div', 'detail-sheet-notes');
        notesContent.innerHTML = opts.notes;
        notesPanel.appendChild(notesContent);
        tabs.push({ label: 'Notes', panel: notesPanel });
      }

      if (hasTrailer) {
        var trailerPanel = KJO.el('div', 'detail-sheet-tab-panel');
        var responsive = KJO.el('div', 'detail-sheet-video');
        var iframe = KJO.el('iframe', '', null, {
          allowfullscreen: '',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          frameborder: '0'
        });
        activeIframe = iframe;
        responsive.appendChild(iframe);
        trailerPanel.appendChild(responsive);
        tabs.push({ label: 'Trailer', panel: trailerPanel,
          onActivate: function () {
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + opts.videoId + '?rel=0&modestbranding=1&autoplay=1';
          },
          onDeactivate: function () {
            iframe.src = '';
          }
        });
      }

      if (tabs.length > 0) {
        body.appendChild(KJO.el('div', 'detail-sheet-divider'));

        // Tab bar (only show if multiple tabs)
        if (tabs.length > 1) {
          var tabBar = KJO.el('div', 'detail-sheet-tabs');
          for (var i = 0; i < tabs.length; i++) {
            (function (idx) {
              var tab = tabs[idx];
              var btn = KJO.el('button', 'detail-sheet-tab' + (idx === 0 ? ' detail-sheet-tab-active' : ''), tab.label);
              btn.addEventListener('click', function () {
                // Swap active tab
                tabBar.querySelectorAll('.detail-sheet-tab').forEach(function (t) {
                  t.classList.remove('detail-sheet-tab-active');
                });
                btn.classList.add('detail-sheet-tab-active');
                // Fade transition between panels
                for (var j = 0; j < tabs.length; j++) {
                  if (j === idx) {
                    tabs[j].panel.classList.add('tab-panel-active');
                  } else {
                    tabs[j].panel.classList.remove('tab-panel-active');
                    if (tabs[j].onDeactivate) tabs[j].onDeactivate();
                  }
                }
                if (tab.onActivate) tab.onActivate();
              });
              tabBar.appendChild(btn);
            })(i);
          }
          body.appendChild(tabBar);
        }

        // Append panels (first visible, rest hidden via fade)
        for (var i = 0; i < tabs.length; i++) {
          tabs[i].panel.classList.add('detail-sheet-tab-panel');
          if (i === 0) tabs[i].panel.classList.add('tab-panel-active');
          body.appendChild(tabs[i].panel);
        }
      }

      // External links row
      if (opts.links && opts.links.length) {
        var linksRow = KJO.el('div', 'detail-sheet-actions');
        for (var i = 0; i < opts.links.length; i++) {
          linksRow.appendChild(KJO.el('a', 'detail-sheet-action', opts.links[i].label, {
            href: opts.links[i].href, target: '_blank', rel: 'noopener'
          }));
        }
        body.appendChild(linksRow);
      }

      // Show
      overlay.classList.add('sheet-open');
      sheet.classList.add('sheet-open');
      document.body.style.overflow = 'hidden';
      isOpen = true;
      history.pushState({ modal: 'detail' }, '');
    }

    function close(fromPopstate) {
      if (!isOpen) return;
      overlay.classList.remove('sheet-open');
      sheet.classList.remove('sheet-open');
      document.body.style.overflow = '';
      // Stop any playing video
      if (activeIframe) {
        activeIframe.src = '';
        activeIframe = null;
      }
      isOpen = false;
      if (!fromPopstate) history.back();
    }

    window.addEventListener('popstate', function (e) {
      if (isOpen) close(true);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    return { open: open, close: close };
  })();

  // ---------------------------------------------------------------------------
  // Shared shelf utilities (extracted from playing.js / watching.js)
  // ---------------------------------------------------------------------------

  /**
   * Capitalize first letter.
   */
  window.KJO.capitalize = function (str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  /**
   * Slugify a string for CSS class names.
   */
  window.KJO.slugify = function (str) {
    return (str || '').toLowerCase().replace(/\s+/g, '-');
  };

  /**
   * Build a cover-art well with lazy-load image or placeholder icon.
   */
  window.KJO.coverWell = function (imageUrl, alt, placeholderIcon) {
    var well = KJO.el('div', 'shelf-cover-well');
    if (imageUrl) {
      var img = KJO.el('img', 'shelf-cover-img', null, {
        src: imageUrl,
        alt: alt || '',
        loading: 'lazy'
      });
      img.onload = function () { img.classList.add('loaded'); };
      well.appendChild(img);
    } else {
      well.classList.add('shelf-cover-placeholder');
      well.innerHTML = placeholderIcon;
    }
    return well;
  };

  /**
   * Build a status pill span.
   */
  window.KJO.statusPill = function (status) {
    if (!status) return null;
    return KJO.el('span', 'status-pill status-' + KJO.slugify(status), KJO.capitalize(status));
  };

  /**
   * Apply staggered entrance animation delay to an element.
   */
  window.KJO.staggerDelay = function (el, index) {
    el.style.animationDelay = (Math.min(index, 10) * 0.08) + 's';
  };

  /**
   * Show/hide shelf cards based on data-attribute filters.
   * Uses smooth fade transitions and shows empty state when nothing matches.
   * @param {Element} grid - Container with .shelf-card children
   * @param {Object} filters - e.g. { status: 'playing', type: 'all' }
   */
  window.KJO.filterCards = function (grid, filters) {
    var cards = grid.querySelectorAll('.shelf-card');
    var visibleCount = 0;

    // Lock grid height to prevent scroll jump during transition
    grid.style.minHeight = grid.offsetHeight + 'px';

    // Remove any existing filter empty state
    var existing = grid.querySelector('.shelf-filter-empty');
    if (existing) existing.remove();

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var show = true;
      for (var attr in filters) {
        if (filters.hasOwnProperty(attr)) {
          var val = filters[attr];
          if (val !== 'all' && card.getAttribute('data-' + attr) !== val) {
            show = false;
            break;
          }
        }
      }

      if (show) {
        visibleCount++;
        // Reveal: remove display:none first, then fade in
        if (card.style.display === 'none') {
          card.classList.add('shelf-card-filtered');
          card.style.display = '';
          void card.offsetWidth; // commit display change before removing class
          card.classList.remove('shelf-card-filtered');
        } else {
          card.classList.remove('shelf-card-filtered');
        }
      } else {
        // Hide: fade out, then set display:none after transition
        card.classList.add('shelf-card-filtered');
        (function (c) {
          setTimeout(function () {
            if (c.classList.contains('shelf-card-filtered')) {
              c.style.display = 'none';
            }
          }, 250);
        })(card);
      }
    }

    // Show empty state after cards finish fading out
    if (visibleCount === 0) {
      setTimeout(function () {
        var msg = KJO.el('div', 'shelf-filter-empty shelf-empty glass-card', 'Nothing matches this filter.');
        msg.classList.add('shelf-card-filtered');
        grid.appendChild(msg);
        // Double-rAF ensures the browser has painted the initial (hidden) state
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            msg.classList.remove('shelf-card-filtered');
          });
        });
        // Release grid height lock after empty state is in place
        grid.style.transition = 'min-height 0.3s ease';
        grid.style.minHeight = '';
        setTimeout(function () { grid.style.transition = ''; }, 350);
      }, 260); // slightly after the 250ms card fade-out
    } else {
      // Release grid height lock after cards finish transitioning
      setTimeout(function () {
        grid.style.transition = 'min-height 0.3s ease';
        grid.style.minHeight = '';
        setTimeout(function () { grid.style.transition = ''; }, 350);
      }, 260);
    }
  };
})();
