/**
 * Default color mappings for music streaming platforms
 * @param {string} platform - Platform name (case-insensitive)
 * @returns {string} Tailwind CSS color classes
 */
export function getMusicPlatformColors(platform) {
	const colorMap = {
		'bandcamp': 'text-cyan-400 hover:text-cyan-300',
		'youtube': 'text-red-500 hover:text-red-400',
		'spotify': 'text-green-500 hover:text-green-400',
		'apple music': 'text-gray-300 hover:text-white',
		'applemusic': 'text-gray-300 hover:text-white',
		'tidal': 'text-white hover:text-gray-300',
		'soundcloud': 'text-orange-500 hover:text-orange-400',
		'amazon music': 'text-blue-400 hover:text-blue-300',
		'deezer': 'text-orange-400 hover:text-orange-300'
	};
	
	return colorMap[platform?.toLowerCase()] || 'text-white hover:text-gray-300';
}

/**
 * Default color mappings for social media platforms
 * @param {string} platform - Platform name (case-insensitive)
 * @returns {string} Tailwind CSS color classes
 */
export function getSocialPlatformColors(platform) {
	const colorMap = {
		'youtube': 'text-red-500 hover:text-red-400',
		'instagram': 'text-pink-500 hover:text-pink-400',
		'twitter': 'text-blue-400 hover:text-blue-300',
		'spotify': 'text-green-500 hover:text-green-400',
		'facebook': 'text-blue-600 hover:text-blue-500',
		'tiktok': 'text-white hover:text-gray-300',
		'bandcamp': 'text-cyan-400 hover:text-cyan-300',
		'soundcloud': 'text-orange-500 hover:text-orange-400',
		'twitch': 'text-purple-500 hover:text-purple-400'
	};
	
	return colorMap[platform?.toLowerCase()] || 'text-gray-400 hover:text-white';
}