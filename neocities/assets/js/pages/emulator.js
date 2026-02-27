/**
 * Emulator Page — In-browser retro game emulator
 * Uses EmulatorJS via iframe (required for SPAs).
 */

(function () {
  'use strict';
  var KJO = window.KJO;

  var SYSTEMS = [
    { label: 'NES',     core: 'nes',    ext: '.nes' },
    { label: 'SNES',    core: 'snes',   ext: '.sfc,.smc' },
    { label: 'GB',      core: 'gb',     ext: '.gb' },
    { label: 'GBA',     core: 'gba',    ext: '.gba' },
    { label: 'Genesis', core: 'segaMD', ext: '.md,.bin,.smd' },
    { label: 'N64',     core: 'n64',    ext: '.n64,.z64' },
    { label: 'PS1',     core: 'psx',    ext: '.bin,.cue,.iso' }
  ];

  var selectedCore = null;
  var romObjectUrl = null;

  function buildAcceptList() {
    var exts = [];
    for (var i = 0; i < SYSTEMS.length; i++) {
      var parts = SYSTEMS[i].ext.split(',');
      for (var j = 0; j < parts.length; j++) {
        if (exts.indexOf(parts[j]) === -1) exts.push(parts[j]);
      }
    }
    return exts.join(',');
  }

  function render(container) {
    selectedCore = null;
    romObjectUrl = null;

    container.appendChild(KJO.sectionLabel(
      KJO.icon('joystick', 28, { className: 'v2-section-icon' }),
      'Emulator'
    ));

    // Description
    container.appendChild(KJO.el('p', 'emu-desc', 'Pick a system, load a ROM, and play retro games right in the browser.'));

    // System picker
    var systemRow = KJO.el('div', 'emu-system-row');
    var systemBtns = [];

    for (var i = 0; i < SYSTEMS.length; i++) {
      (function (sys, idx) {
        var btn = KJO.el('button', 'emu-system-btn glass-card', sys.label);
        btn.addEventListener('click', function () {
          selectedCore = sys.core;
          for (var j = 0; j < systemBtns.length; j++) {
            systemBtns[j].classList.remove('emu-active');
          }
          btn.classList.add('emu-active');
          updateLaunchState();
        });
        systemBtns.push(btn);
        systemRow.appendChild(btn);
      })(SYSTEMS[i], i);
    }

    container.appendChild(systemRow);

    // ROM input section
    var romSection = KJO.el('div', 'emu-rom-section glass-card');

    var romLabel = KJO.el('div', 'emu-rom-label', 'Load a ROM file');

    var fileInput = KJO.el('input', 'emu-file-input', null, {
      type: 'file',
      accept: buildAcceptList()
    });

    var urlLabel = KJO.el('div', 'emu-or', '\u2014 or paste a ROM URL \u2014');
    var urlInput = KJO.el('input', 'emu-url-input', null, {
      type: 'text',
      placeholder: 'https://example.com/game.nes'
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        if (romObjectUrl) URL.revokeObjectURL(romObjectUrl);
        romObjectUrl = URL.createObjectURL(fileInput.files[0]);
        urlInput.value = '';
        updateLaunchState();
      }
    });

    urlInput.addEventListener('input', function () {
      if (urlInput.value.trim()) {
        if (romObjectUrl) { URL.revokeObjectURL(romObjectUrl); romObjectUrl = null; }
        fileInput.value = '';
        updateLaunchState();
      }
    });

    KJO.appendAll(romSection, [romLabel, fileInput, urlLabel, urlInput]);
    container.appendChild(romSection);

    // Launch button
    var launchBtn = KJO.el('button', 'neu-button neu-button-round emu-launch-btn', 'Launch Emulator');
    launchBtn.disabled = true;
    container.appendChild(launchBtn);

    // Emulator frame container (hidden until launched)
    var frameWrap = KJO.el('div', 'emu-frame-wrap');
    frameWrap.style.display = 'none';

    var iframe = KJO.el('iframe', 'emu-frame', null, {
      allowfullscreen: '',
      allow: 'autoplay; gamepad',
      frameborder: '0'
    });
    iframe.title = 'Emulator';

    var fullscreenBtn = KJO.el('button', 'emu-fullscreen-btn glass-card', '\u26f6');
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.addEventListener('click', function () {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      }
    });

    frameWrap.appendChild(iframe);
    frameWrap.appendChild(fullscreenBtn);
    container.appendChild(frameWrap);

    function updateLaunchState() {
      var hasRom = !!(romObjectUrl || urlInput.value.trim());
      launchBtn.disabled = !(selectedCore && hasRom);
    }

    launchBtn.addEventListener('click', function () {
      if (!selectedCore) return;

      var rom = romObjectUrl || urlInput.value.trim();
      if (!rom) return;

      // Build iframe URL
      var src = 'emulator.html?core=' + encodeURIComponent(selectedCore);
      if (!romObjectUrl) {
        // URL-based ROM — pass as query param
        src += '&rom=' + encodeURIComponent(rom);
      }

      iframe.src = src;
      frameWrap.style.display = '';

      // If file-based ROM, send blob URL via postMessage after iframe loads
      if (romObjectUrl) {
        iframe.onload = function () {
          iframe.contentWindow.postMessage({ type: 'load-rom', url: romObjectUrl }, '*');
        };
      }

      // Scroll to the emulator frame
      setTimeout(function () {
        var nav = document.querySelector('.spa-nav');
        var offset = nav ? nav.offsetHeight + 12 : 12;
        var top = frameWrap.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }, 100);
    });
  }

  KJO.router.register('emulator', render);
})();
