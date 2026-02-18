import { getRadioPlaylist, getRadioSettings } from '$lib/api/content/radio.js';

export async function load() {
	try {
		const [tracks, settings] = await Promise.all([
			getRadioPlaylist(),
			getRadioSettings()
		]);

		return {
			tracks,
			maintenance: {
				active: settings.maintenanceMode,
				message: settings.maintenanceMessage
			}
		};
	} catch (error) {
		console.error('Error loading radio page data:', error);
		return {
			tracks: [],
			maintenance: {
				active: false,
				message: null
			}
		};
	}
}
