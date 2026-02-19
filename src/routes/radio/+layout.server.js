import { getRadioSettings } from '$lib/api/content/radio.js';
import { getSiteSettings } from '$lib/api/site/settings.js';
import { redirect } from '@sveltejs/kit';

export async function load() {
	try {
		const [radioSettings, siteSettings] = await Promise.all([
			getRadioSettings(),
			getSiteSettings()
		]);

		// Redirect to home if radio is disabled
		if (!siteSettings.radioEnabled) {
			throw redirect(302, '/');
		}

		return {
			radioSettings,
			supportPlatforms: siteSettings.supportPlatforms || []
		};
	} catch (error) {
		// Re-throw redirects
		if (error.status) {
			throw error;
		}

		console.error('Error loading radio layout data:', error);
		return {
			radioSettings: {
				maintenanceMode: false,
				maintenanceMessage: null,
				currentPlaylistId: null
			},
			supportPlatforms: []
		};
	}
}
