/**
 * Hash Router
 * SPA routing for NeoCities outpost. Maps hash fragments to page render functions.
 */

(function () {
  'use strict';
  window.KJO = window.KJO || {};

  var PAGE_CONTAINER_ID = 'page-content';
  var routes = {};
  var currentCleanup = null;

  /**
   * Register a page handler.
   * @param {string} hash - Route key (e.g. 'home', 'playing')
   * @param {function} renderFn - Called with container element; may return a cleanup function
   */
  function register(hash, renderFn) {
    routes[hash] = renderFn;
  }

  /**
   * Update active state on all nav links.
   */
  function updateActiveNav(routeKey) {
    var links = document.querySelectorAll('.spa-nav-link');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var linkRoute = (link.getAttribute('href') || '').replace(/^#\/?/, '') || 'home';
      link.classList.toggle('spa-nav-active', linkRoute === routeKey);
    }
  }

  /**
   * Close the hamburger menu if it's open.
   * Delegates to shell's KJO.closeMenu() to keep state in sync.
   */
  function closeMenu() {
    if (KJO.closeMenu) KJO.closeMenu();
  }

  /**
   * Handle the current hash and render the matching page.
   */
  function handleRoute() {
    var hash = (window.location.hash || '').replace(/^#\/?/, '') || 'home';

    // Run cleanup for previous page
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    var renderFn = routes[hash] || routes['home'];
    if (!renderFn) return;

    updateActiveNav(hash);

    var nav = document.querySelector('.spa-nav');
    if (nav) {
      nav.scrollIntoView({ behavior: 'smooth' });
    }

    KJO.renderPage(PAGE_CONTAINER_ID, function (container) {
      var result = renderFn(container);
      if (typeof result === 'function') {
        currentCleanup = result;
      }
    });
  }

  window.addEventListener('hashchange', function () {
    closeMenu();
    handleRoute();
  });

  window.KJO.router = {
    register: register,
    start: function () {
      handleRoute();
    }
  };
})();
