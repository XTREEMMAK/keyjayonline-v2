/**
 * Emulator Player — serves the EmulatorJS iframe HTML.
 *
 * Hosted on keyjayonline.com because NeoCities sets a restrictive CSP
 * that blocks connections to cdn.emulatorjs.org. This endpoint returns
 * the emulator HTML with a permissive CSP allowing EmulatorJS resources.
 */

export function GET({ url }) {
	const core = url.searchParams.get('core') || 'nes';
	const rom = url.searchParams.get('rom') || '';

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emulator — KeyJay Online</title>
  <style>
    body, html { margin: 0; padding: 0; background: #1a1a2e; overflow: hidden; }
    #game { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="game"></div>
  <script>
    EJS_player = '#game';
    EJS_core = ${JSON.stringify(core)};
    EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
    EJS_color = '#6366f1';

    ${rom ? `EJS_gameUrl = ${JSON.stringify(rom)};` : ''}

    // Listen for ROM data sent via postMessage from the NeoCities SPA.
    // Receives an ArrayBuffer (blob URLs can't cross origins).
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'load-rom' && e.data.buffer) {
        var blob = new Blob([e.data.buffer]);
        EJS_gameUrl = URL.createObjectURL(blob);
        var script = document.createElement('script');
        script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
        document.body.appendChild(script);
      }
    });
  </script>
  <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy':
				"default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.emulatorjs.org;",
			'Access-Control-Allow-Origin': 'https://keyjay.neocities.org'
		}
	});
}
