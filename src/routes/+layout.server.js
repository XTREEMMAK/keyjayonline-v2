import { getSiteSettings } from '$lib/api/index.js';
import { redirect, error } from '@sveltejs/kit';
import { CDN_BASE_URL, USE_CDN_FOR_ASSETS, NODE_ENV } from '$env/static/private';

// Temporarily hidden pages - remove this when ready to re-enable
const TEMPORARILY_HIDDEN_PAGES = ['games', 'tech', 'blog'];

export async function load({ url }) {
	try {
		const siteSettings = await getSiteSettings();
		
		// Check if site is in maintenance mode (status is already normalized to lowercase in getSiteSettings)
		if (siteSettings.status === 'maintenance') {
			// Don't redirect if already on maintenance page
			if (!url.pathname.startsWith('/maintenance')) {
				throw redirect(307, '/maintenance');
			}
		}
		
		// If site is live but user is on maintenance page, redirect to home
		if (siteSettings.status === 'live' && url.pathname.startsWith('/maintenance')) {
			throw redirect(302, '/');
		}

		// Check if current page is disabled
		const currentPath = url.pathname.slice(1) || 'home'; // Remove leading slash
		const pageKey = currentPath.split('/')[0]; // Get first segment for nested routes

		// Check if page is temporarily hidden
		if (TEMPORARILY_HIDDEN_PAGES.includes(pageKey)) {
			throw redirect(302, '/');
		}

		if (pageKey !== 'home' && pageKey !== '404' && pageKey !== 'maintenance') {
			const pageConfig = siteSettings.pages[pageKey];

			if (pageConfig && pageConfig.disabled) {
				throw redirect(302, '/');
			}
		}

		return {
			siteSettings,
			socialLinks: siteSettings.socialLinks,
			cdnBaseUrl: (USE_CDN_FOR_ASSETS === 'true' || NODE_ENV === 'production') ? CDN_BASE_URL : ''
		};
	} catch (error) {
		// If it's already a redirect, re-throw it
		if (error.status) {
			throw error;
		}
		
		// For other errors, log and continue with safe defaults
		console.error('Error loading site settings:', error);
		return {
			siteSettings: {
				status: 'live',
				pages: {}
			},
			socialLinks: [],
			cdnBaseUrl: (USE_CDN_FOR_ASSETS === 'true' || NODE_ENV === 'production') ? CDN_BASE_URL : ''
		};
	}
}