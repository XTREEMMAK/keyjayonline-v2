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

export interface ProductionEmbed {
	id: string;
	url: string;
	embedUrl: string;
	embedId?: string;
	type: 'youtube' | 'vimeo';
	title?: string;
	description?: string;
	thumbnailUrl?: string;
	displayOrder?: number;
	featured?: boolean;
}

export interface AudioPlaylist {
	id: string | number;
	title: string;
	description?: string;
	playlistType?: 'music' | 'radio_play' | 'podcast' | 'sound_design' | 'general';
	coverArt?: string;
}

export interface AudioPlaylistTrack {
	id: string | number;
	title: string;
	artist: string;
	audioUrl: string | null;
	thumbnail: string | null;
	genre?: string;
	duration?: string;
	album?: string;
}

export interface NetworkReference {
	id: string | number;
	name: string;
	url?: string;
	icon?: string;
	color?: string;
}

export interface ExternalLink {
	id: string | number;
	platform?: string;
	url: string;
	label?: string;
	linkType?: string;
	iconType?: 'custom' | 'iconify';
	iconValue?: string;
	network?: NetworkReference | null;
	isPrimary?: boolean;
	// Raw Directus field names (pre-transform)
	icon_type?: 'custom' | 'iconify';
	icon_value?: string | { icon_reference_id: string };
	display_order?: number;
	is_primary?: boolean;
}

export type ProductionActionType = 'viewer' | 'audio_player' | 'external_link';

export interface ProductionAction {
	id: string | number;
	actionType: ProductionActionType;
	url?: string;
	label: string;
	icon: string;
	color?: string;
	isPrimary: boolean;
	sortOrder: number;
	// viewer-specific
	viewerType?: 'comic_pages' | 'gallery';
	viewerText?: string;
	galleryId?: string | number;
	// audio_player-specific
	playlistId?: string | number;
	trackIndex?: number;
	// external_link-specific
	linkType?: string;
	network?: NetworkReference | null;
	openInNewTab?: boolean;
}

export interface CreditRole {
	title: string;
	category: string;
}

export interface CreditSocialLink {
	network: string;
	network_url: string;
}

export interface Credit {
	role: string;
	roles?: CreditRole[];
	name: string;
	additional_info?: string;
	bio?: string;
	website_url?: string;
	social_links?: CreditSocialLink[];
	display_order?: number;
	profile_image?: string;
}

export interface StudioCategory {
	id: string | number;
	slug: string;
	displayName: string;
	icon: string;
	displayOrder: number;
}

export interface StudioGearItem {
	id: string | number;
	name: string;
	description: string;
	icon: string;
	displayOrder: number;
	category: string;
	categoryData?: StudioCategory | null;
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