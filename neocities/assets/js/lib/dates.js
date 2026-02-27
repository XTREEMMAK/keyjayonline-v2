/**
 * Date Formatting Utilities
 * Extracted from script.js — relative date formatting for entries.
 */

(function () {
  'use strict';
  window.KJO = window.KJO || {};

  /**
   * Returns a human-friendly relative time string.
   * e.g. "just now", "5m ago", "3d ago", "2w ago", "Jan 15, 2026"
   */
  window.KJO.relativeDate = function (date) {
    if (!date) return '';

    var now = Date.now();
    var then = new Date(date).getTime();
    var diffMs = now - then;
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHr = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHr / 24);
    var diffWeek = Math.floor(diffDay / 7);
    var diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';
    if (diffWeek < 5) return diffWeek + 'w ago';
    if (diffMonth < 12) return diffMonth + 'mo ago';

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /**
   * Returns a full date string for title/tooltip attributes.
   */
  window.KJO.formatFullDate = function (date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
})();
