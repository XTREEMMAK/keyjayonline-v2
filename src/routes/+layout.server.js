import { getSiteSettings } from '$lib/api/index.js';
import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { MAINT_COOKIE_NAME, validateBypassToken } from '$lib/utils/pinAuth.js';

export async function load({ url, cookies }) {
	try {
		const siteSettings = await getSiteSettings();

		// Check if site is in maintenance mode (status is already normalized to lowercase in getSiteSettings)
		if (siteSettings.status === 'maintenance') {
			// Check for admin bypass cookie
			const bypassToken = cookies.get(MAINT_COOKIE_NAME);
			let bypassed = false;

			if (bypassToken) {
				const secret = env.MAINTENANCE_BYPASS_SECRET;
				if (secret) {
					const { valid } = validateBypassToken(bypassToken, secret);
					if (valid) {
						bypassed = true;
					}
				}
				if (!bypassed) {
					cookies.delete(MAINT_COOKIE_NAME, { path: '/' });
				}
			}

			if (!bypassed && !url.pathname.startsWith('/maintenance')) {
				throw redirect(307, '/maintenance');
			}

			// If bypassed, continue loading but flag it for the preview banner
			if (bypassed) {
				const currentPath = url.pathname.slice(1) || 'home';
				const pageKey = currentPath.split('/')[0];

				if (pageKey !== 'home' && pageKey !== '404' && pageKey !== 'maintenance') {
					const pageConfig = siteSettings.pages[pageKey];
					if (pageConfig && pageConfig.disabled) {
						throw redirect(302, '/');
					}
				}

				return {
					siteSettings,
					socialLinks: siteSettings.socialLinks,
					maintenanceBypass: true
				};
			}
		}
		
		// If site is live but user is on maintenance page, redirect to home
		if (siteSettings.status === 'live' && url.pathname.startsWith('/maintenance')) {
			throw redirect(302, '/');
		}

		// Check if current page is disabled
		const currentPath = url.pathname.slice(1) || 'home'; // Remove leading slash
		const pageKey = currentPath.split('/')[0]; // Get first segment for nested routes

		if (pageKey !== 'home' && pageKey !== '404' && pageKey !== 'maintenance') {
			const pageConfig = siteSettings.pages[pageKey];

			if (pageConfig && pageConfig.disabled) {
				throw redirect(302, '/');
			}
		}

		return {
			siteSettings,
			socialLinks: siteSettings.socialLinks
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
			socialLinks: []
		};
	}
}