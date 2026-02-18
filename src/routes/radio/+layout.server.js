import { getRadioSettings } from '$lib/api/content/radio.js';
import { getSiteSettings } from '$lib/api/site/settings.js';

export async function load() {
	try {
		const [radioSettings, siteSettings] = await Promise.all([
			getRadioSettings(),
			getSiteSettings()
		]);

		return {
			radioSettings,
			supportPlatforms: siteSettings.supportPlatforms || []
		};
	} catch (error) {
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
