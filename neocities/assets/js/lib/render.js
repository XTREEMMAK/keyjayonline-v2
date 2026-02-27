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
   * @param {Element} grid - Container with .shelf-card children
   * @param {Object} filters - e.g. { status: 'playing', type: 'all' }
   */
  window.KJO.filterCards = function (grid, filters) {
    var cards = grid.querySelectorAll('.shelf-card');
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
      card.style.display = show ? '' : 'none';
    }
  };
})();
