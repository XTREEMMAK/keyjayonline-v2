import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			// Proxy requests to /api/proxy-audio/* to the CDN
			// This bypasses CORS issues in development
			'/api/proxy-audio': {
				target: 'https://kjo.nyc3.cdn.digitaloceanspaces.com',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/proxy-audio/, ''),
				configure: (proxy, options) => {
					proxy.on('error', (err, req, res) => {
						console.log('Proxy error:', err);
					});
					proxy.on('proxyReq', (proxyReq, req, res) => {
						console.log('Proxying request:', req.url);
					});
				}
			}
		}
	}
});
