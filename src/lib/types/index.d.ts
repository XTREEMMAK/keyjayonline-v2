// Type declarations for the application

export interface Album {
	id: string | number;
	title: string;
	artist?: string;
	release_type?: string;
	cover_art?: string;
	release_date?: string;
	description?: string;
	rich_content?: string;
	featured?: boolean;
	liner_notes?: string;
	access_type?: 'free' | 'paid' | 'subscriber';
	minimum_price?: number;
	suggested_price?: number;
	track_count?: number;
	genre?: string;
	tracks?: Track[];
	videos?: Video[];
	youtube_videos?: YouTubeVideo[];
	external_links?: ExternalLink[];
	credits?: Credit[];
	spotify_url?: string;
	bandcamp_url?: string;
	apple_music_url?: string;
	youtube_url?: string;
	tidal_url?: string;
}

export interface Track {
	id: string | number;
	title: string;
	duration?: string;
	licensable?: boolean;
	audio_file_url?: string;
	track_description?: string;
	access_type?: string;
}

export interface Video {
	id: string | number;
	title?: string;
	description?: string;
	video_type?: string;
	video_url?: string;
	thumbnail_url?: string;
	display_order?: number;
	featured?: boolean;
}

export interface YouTubeVideo {
	id: string;
	title?: string;
	description?: string;
	thumbnail_url?: string;
	featured?: boolean;
}

export interface ExternalLink {
	id: string | number;
	platform?: string;
	url: string;
	label?: string;
	icon_type?: 'custom' | 'iconify';
	icon_value?: string;
	display_order?: number;
	is_primary?: boolean;
}

export interface Credit {
	role: string;
	name: string;
	additional_info?: string;
	bio?: string;
	website_url?: string;
	display_order?: number;
}

// SweetAlert2 type declarations
declare module 'sweetalert2' {
	interface SweetAlertOptions {
		title?: string;
		html?: string;
		width?: string;
		maxWidth?: string;
		showCloseButton?: boolean;
		showConfirmButton?: boolean;
		customClass?: {
			popup?: string;
			htmlContainer?: string;
		};
		background?: string;
		color?: string;
		didOpen?: () => void;
		willClose?: () => void;
	}
}

// Window extensions for modal functions
declare global {
	interface Window {
		switchTab: (tabName: string) => void;
		togglePlay: (trackId: string) => void;
		handleDownload: (trackId: string) => void;
		handlePurchase: () => void;
	}
}

export {};