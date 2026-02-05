import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		paths: {
			assets: process.env.CDN_BASE_URL || ''
		}
	}
};

export default config;
