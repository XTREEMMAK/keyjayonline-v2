<script>
	import { goto } from '$app/navigation';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';

	let { data } = $props();
	const { album, samples, meta } = data;

	// Audio player state
	let currentTrackIndex = $state(0);
	let isPlaying = $state(false);
	let audioElement = $state(null);
	let currentTime = $state(0);
	let duration = $state(0);

	// Share functionality
	let shareSuccess = $state(false);

	const currentTrack = $derived(samples[currentTrackIndex]);

	// Helper to get external link icon (matching AlbumModalSwal pattern)
	function getExternalLinkIcon(link) {
		if (link.icon_type === 'custom' && link.icon_value) {
			return link.icon_value;
		}
		if (link.icon_type === 'iconify' && link.icon_value) {
			return link.icon_value;
		}

		const platform = (link.label || '').toLowerCase();
		const platformIcons = {
			'spotify': 'simple-icons:spotify',
			'apple music': 'simple-icons:applemusic',
			'applemusic': 'simple-icons:applemusic',
			'apple': 'simple-icons:applemusic',
			'youtube': 'simple-icons:youtube',
			'youtube music': 'simple-icons:youtubemusic',
			'bandcamp': 'simple-icons:bandcamp',
			'soundcloud': 'simple-icons:soundcloud',
			'tidal': 'simple-icons:tidal',
			'amazon music': 'simple-icons:amazonmusic',
			'amazon': 'simple-icons:amazonmusic',
			'deezer': 'simple-icons:deezer',
			'pandora': 'simple-icons:pandora'
		};

		return platformIcons[platform] || 'mdi:link';
	}

	// Helper to get platform-specific colors (matching AlbumModalSwal pattern)
	function getPlatformColors(link) {
		const platform = (link.label || '').toLowerCase();

		const platformColors = {
			'spotify': { bg: 'rgba(34, 197, 94, 0.2)', bgHover: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },
			'apple music': { bg: 'rgba(248, 66, 90, 0.2)', bgHover: 'rgba(248, 66, 90, 0.3)', color: '#f8425a' },
			'applemusic': { bg: 'rgba(248, 66, 90, 0.2)', bgHover: 'rgba(248, 66, 90, 0.3)', color: '#f8425a' },
			'apple': { bg: 'rgba(248, 66, 90, 0.2)', bgHover: 'rgba(248, 66, 90, 0.3)', color: '#f8425a' },
			'youtube': { bg: 'rgba(255, 0, 0, 0.2)', bgHover: 'rgba(255, 0, 0, 0.3)', color: '#ff0000' },
			'youtube music': { bg: 'rgba(255, 0, 0, 0.2)', bgHover: 'rgba(255, 0, 0, 0.3)', color: '#ff0000' },
			'bandcamp': { bg: 'rgba(99, 154, 210, 0.2)', bgHover: 'rgba(99, 154, 210, 0.3)', color: '#639ad2' },
			'soundcloud': { bg: 'rgba(255, 85, 0, 0.2)', bgHover: 'rgba(255, 85, 0, 0.3)', color: '#ff5500' },
			'tidal': { bg: 'rgba(0, 0, 0, 0.2)', bgHover: 'rgba(0, 0, 0, 0.4)', color: '#ffffff' },
			'amazon music': { bg: 'rgba(255, 153, 0, 0.2)', bgHover: 'rgba(255, 153, 0, 0.3)', color: '#ff9900' },
			'amazon': { bg: 'rgba(255, 153, 0, 0.2)', bgHover: 'rgba(255, 153, 0, 0.3)', color: '#ff9900' },
			'deezer': { bg: 'rgba(254, 123, 41, 0.2)', bgHover: 'rgba(254, 123, 41, 0.3)', color: '#fe7b29' },
			'pandora': { bg: 'rgba(0, 112, 204, 0.2)', bgHover: 'rgba(0, 112, 204, 0.3)', color: '#0070cc' }
		};

		return platformColors[platform] || { bg: 'rgba(59, 130, 246, 0.2)', bgHover: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
	}

	// Helper to group credits by category
	function groupCreditsByCategory(credits) {
		const grouped = {};

		credits.forEach(credit => {
			const categories = new Set();

			if (credit.roles && credit.roles.length > 0) {
				credit.roles.forEach(role => {
					categories.add(role.category || 'Other');
				});
			} else {
				categories.add('Other');
			}

			categories.forEach(category => {
				if (!grouped[category]) {
					grouped[category] = [];
				}
				const rolesInCategory = credit.roles?.filter(r => (r.category || 'Other') === category) || [{ title: credit.role }];
				grouped[category].push({
					...credit,
					displayRoles: rolesInCategory.map(r => r.title).join(', ')
				});
			});
		});

		return grouped;
	}

	const groupedCredits = $derived(groupCreditsByCategory(album.credits || []));

	// Sort categories by priority order (matching AlbumModalSwal)
	const priorityOrder = ['Creator', 'Producer', 'Composer', 'Song Writer', 'Vocalists', 'Rapper', 'Mixing', 'Mastering'];
	const sortedCreditCategories = $derived(
		Object.keys(groupedCredits).sort((a, b) => {
			const aIndex = priorityOrder.indexOf(a);
			const bIndex = priorityOrder.indexOf(b);

			// If both are in priority list, sort by that order
			if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
			// Priority categories come first
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;
			// Otherwise sort alphabetically
			return a.localeCompare(b);
		})
	);

	// Collapsible state for credit sections (Creator expanded by default, others collapsed)
	let collapsedCreditSections = $state({});

	// Initialize collapsed state when credits change
	$effect(() => {
		const initialState = {};
		sortedCreditCategories.forEach(category => {
			// Creator section starts expanded (false), all others collapsed (true)
			initialState[category] = category !== 'Creator';
		});
		collapsedCreditSections = initialState;
	});

	function toggleCreditSection(category) {
		collapsedCreditSections = {
			...collapsedCreditSections,
			[category]: !collapsedCreditSections[category]
		};
	}

	function playTrack(index) {
		currentTrackIndex = index;
		isPlaying = true;
		if (audioElement) {
			audioElement.play();
		}
	}

	function togglePlay() {
		if (!audioElement) return;
		if (isPlaying) {
			audioElement.pause();
		} else {
			audioElement.play();
		}
		isPlaying = !isPlaying;
	}

	function nextTrack() {
		if (currentTrackIndex < samples.length - 1) {
			playTrack(currentTrackIndex + 1);
		}
	}

	function previousTrack() {
		if (currentTrackIndex > 0) {
			playTrack(currentTrackIndex - 1);
		}
	}

	async function handleShare() {
		const shareUrl = generateShareUrl('album', album.id);
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	function goToMainSite() {
		goto('/#music');
	}

	function formatTime(seconds) {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Transform audio URL for CORS handling
	const currentAudioUrl = $derived(
		currentTrack?.previewUrl ? getAudioUrl(currentTrack.previewUrl) : null
	);
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="music.album" />
	<meta property="og:url" content="{PUBLIC_SITE_URL}/share/album/{album.id}" />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content={meta.image} />
	<meta property="og:site_name" content="KEY JAY ONLINE" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={meta.image} />

	<!-- Music-specific -->
	{#if meta.releaseDate}
		<meta property="music:release_date" content={meta.releaseDate} />
	{/if}
	{#if meta.artist}
		<meta property="music:musician" content={meta.artist} />
	{/if}
</svelte:head>

<div class="album-share-page">
	<!-- Blurred Album Cover Background -->
	{#if album.cover_art}
		<div class="background-cover" style="background-image: url('{album.cover_art}')"></div>
	{/if}

	<!-- Header with Navigation -->
	<header class="share-header">
		<button onclick={goToMainSite} class="back-button">
			<Icon icon="mdi:arrow-left" />
			Visit Main Site
		</button>

		<button onclick={handleShare} class="share-button">
			<Icon icon={shareSuccess ? 'mdi:check' : 'mdi:share-variant'} />
			{shareSuccess ? 'Copied!' : 'Share'}
		</button>
	</header>

	<!-- Main Content -->
	<main class="album-content">
		<!-- Album Artwork & Info -->
		<section class="album-hero">
			{#if album.cover_art}
				<img src={album.cover_art} alt={album.title} class="album-cover" />
			{/if}

			<div class="album-info">
				<h1>{album.title}</h1>
				{#if album.artist}
					<p class="artist">{album.artist}</p>
				{/if}
				{#if album.release_date}
					<p class="release-date">{new Date(album.release_date).getFullYear()}</p>
				{/if}
			</div>
		</section>

		<!-- Description / Liner Notes -->
		{#if album.description || album.liner_notes}
			<section class="album-description">
				<h2>About This Album</h2>
				<div class="description-content">
					{#if album.rich_content}
						{@html sanitizeHtml(album.rich_content)}
					{:else if album.description}
						{@html sanitizeHtml(album.description)}
					{:else}
						<p style="white-space: pre-wrap;">{album.liner_notes}</p>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Audio Player with Track List -->
		{#if samples && samples.length > 0}
			<section class="audio-player-section">
				<h2>Track Samples</h2>

				<!-- Current Track Display -->
				<div class="now-playing">
					<div class="track-info">
						<h3>{currentTrack?.title || 'No track selected'}</h3>
						<p>{currentTrack?.artist || album.artist || 'KEY JAY'}</p>
					</div>

					<!-- Playback Controls -->
					<div class="playback-controls">
						<button
							onclick={previousTrack}
							disabled={currentTrackIndex === 0}
							aria-label="Previous track"
						>
							<Icon icon="mdi:skip-previous" width={28} height={28} />
						</button>

						<button onclick={togglePlay} class="play-button" aria-label={isPlaying ? 'Pause' : 'Play'}>
							<Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} width={32} height={32} />
						</button>

						<button
							onclick={nextTrack}
							disabled={currentTrackIndex === samples.length - 1}
							aria-label="Next track"
						>
							<Icon icon="mdi:skip-next" width={28} height={28} />
						</button>
					</div>

					<!-- Progress Bar -->
					<div class="progress-bar">
						<input
							type="range"
							min="0"
							max={duration || 100}
							value={currentTime}
							oninput={(e) => {
								if (audioElement) {
									audioElement.currentTime = parseFloat(e.target.value);
								}
							}}
							aria-label="Seek"
						/>
						<div class="time-display">
							<span>{formatTime(currentTime)}</span>
							<span>{formatTime(duration)}</span>
						</div>
					</div>
				</div>

				<!-- Track List -->
				<ul class="track-list">
					{#each samples as track, index}
						<li
							class="track-item"
							class:active={index === currentTrackIndex}
							onclick={() => playTrack(index)}
							onkeydown={(e) => e.key === 'Enter' && playTrack(index)}
							role="button"
							tabindex="0"
						>
							<span class="track-number">{track.trackNumber || index + 1}</span>
							<span class="track-name">{track.title}</span>
							<span class="track-duration">{track.duration || '--:--'}</span>
						</li>
					{/each}
				</ul>

				<!-- Hidden Audio Element -->
				{#if currentAudioUrl}
					<audio
						bind:this={audioElement}
						src={currentAudioUrl}
						bind:currentTime
						bind:duration
						onended={nextTrack}
						onplay={() => (isPlaying = true)}
						onpause={() => (isPlaying = false)}
					/>
				{/if}
			</section>
		{/if}

		<!-- External Streaming Links -->
		{#if album.external_links && album.external_links.length > 0}
			<section class="streaming-links">
				<h2>Listen On</h2>
				<div class="link-grid">
					{#each album.external_links as link}
						{@const colors = getPlatformColors(link)}
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="streaming-link"
							title={link.label}
							style="background: {colors.bg}; color: {colors.color}; --hover-bg: {colors.bgHover};"
						>
							<Icon icon={getExternalLinkIcon(link)} width={48} height={48} />
							<span>{link.label}</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Videos Section -->
		{#if album.youtube_videos && album.youtube_videos.length > 0}
			<section class="videos-section">
				<h2>Videos</h2>
				<div class="video-grid">
					{#each album.youtube_videos as video}
						<div class="video-item">
							<iframe
								src="https://www.youtube.com/embed/{video.id}"
								title={video.title || 'Video'}
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowfullscreen
							></iframe>
							{#if video.title}
								<p>{video.title}</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Credits Section -->
		{#if album.credits && album.credits.length > 0}
			<section class="credits-section">
				<h2>Credits</h2>
				<div class="credits-content">
					{#each sortedCreditCategories as category}
						{@const categoryCredits = groupedCredits[category]}
						{@const isCollapsed = collapsedCreditSections[category]}
						<div class="credit-category">
							<button
								class="credit-category-header"
								onclick={() => toggleCreditSection(category)}
								aria-expanded={!isCollapsed}
							>
								<div class="credit-category-title">
									<Icon icon="mdi:account-group" width={18} height={18} />
									<span>{category}</span>
									<span class="credit-count">({categoryCredits.length})</span>
								</div>
								<Icon
									icon="mdi:chevron-down"
									width={20}
									height={20}
									class="credit-chevron"
									style="transform: rotate({isCollapsed ? '0deg' : '180deg'})"
								/>
							</button>
							<div class="credit-list-wrapper" class:collapsed={isCollapsed}>
								<div class="credit-list">
									{#each categoryCredits as credit}
										<div class="credit-item">
											{#if credit.profile_image}
												<img src={credit.profile_image} alt={credit.name} class="credit-avatar" />
											{:else}
												<div class="credit-avatar-placeholder">
													<Icon icon="mdi:account" width={24} height={24} />
												</div>
											{/if}
											<div class="credit-details">
												<div class="credit-name">{credit.name}</div>
												<div class="credit-role">{credit.displayRoles || credit.role}</div>
												{#if credit.website_url}
													<a href={credit.website_url} target="_blank" rel="noopener noreferrer" class="credit-link">
														<Icon icon="mdi:open-in-new" width={12} height={12} />
														View Profile
													</a>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="share-footer">
		<button onclick={goToMainSite} class="footer-button">Explore More</button>
	</footer>
</div>

<style>
	/* Background cover with blur */
	.background-cover {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-size: cover;
		background-position: center;
		filter: blur(40px) brightness(0.4);
		transform: scale(1.1);
		z-index: 0;
		animation: slowPan 30s ease-in-out infinite alternate;
	}

	@keyframes slowPan {
		0% {
			transform: scale(1.1) translateX(0) translateY(0);
		}
		100% {
			transform: scale(1.2) translateX(-2%) translateY(-2%);
		}
	}

	/* Neumorphic styling matching main site aesthetic */
	.album-share-page {
		position: relative;
		min-height: 100vh;
		background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%);
		padding: 2rem;
		z-index: 1;
		animation: gradientShift 15s ease infinite;
	}

	@keyframes gradientShift {
		0%, 100% {
			background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%);
		}
		50% {
			background: linear-gradient(135deg, rgba(118, 75, 162, 0.7) 0%, rgba(236, 72, 153, 0.7) 100%);
		}
	}

	.share-header {
		position: relative;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.back-button,
	.share-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.3s;
		font-size: 1rem;
		font-weight: 500;
	}

	.back-button:hover,
	.share-button:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
	}

	.album-content {
		position: relative;
		z-index: 10;
		max-width: 1200px;
		margin: 0 auto;
	}

	.album-hero {
		display: flex;
		gap: 2rem;
		margin-bottom: 3rem;
		align-items: center;
	}

	.album-cover {
		width: 300px;
		height: 300px;
		border-radius: 20px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		object-fit: cover;
	}

	.album-info h1 {
		font-size: 3rem;
		color: white;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.artist {
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.25rem;
		text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
	}

	.release-date {
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.7);
		text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
	}

	.album-description,
	.audio-player-section,
	.streaming-links,
	.videos-section,
	.credits-section {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(15px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.album-description h2,
	.audio-player-section h2,
	.streaming-links h2,
	.videos-section h2,
	.credits-section h2 {
		color: white;
		font-size: 1.75rem;
		margin-bottom: 1.5rem;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.description-content,
	.credits-content {
		color: rgba(255, 255, 255, 0.95);
		line-height: 1.6;
	}

	.now-playing {
		margin-bottom: 2rem;
	}

	.track-info {
		text-align: center;
		margin-bottom: 1rem;
	}

	.track-info h3 {
		color: white;
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.track-info p {
		color: rgba(255, 255, 255, 0.8);
		font-size: 1rem;
	}

	.playback-controls {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 1rem 0;
	}

	.playback-controls button {
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.playback-controls button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.playback-controls button:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.3);
		transform: scale(1.05);
	}

	.play-button {
		width: 60px !important;
		height: 60px !important;
		background: rgba(255, 255, 255, 0.25) !important;
	}

	.progress-bar {
		margin-top: 1rem;
	}

	.progress-bar input[type='range'] {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		-webkit-appearance: none;
	}

	.progress-bar input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.progress-bar input[type='range']::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.time-display {
		display: flex;
		justify-content: space-between;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.track-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.track-item {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		cursor: pointer;
		border-radius: 8px;
		transition: background 0.2s;
		color: rgba(255, 255, 255, 0.9);
		align-items: center;
	}

	.track-item:hover,
	.track-item.active {
		background: rgba(255, 255, 255, 0.15);
	}

	.track-item.active {
		color: white;
		font-weight: 500;
	}

	.track-number {
		min-width: 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
	}

	.track-name {
		flex: 1;
	}

	.track-duration {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.875rem;
	}

	.link-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.streaming-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		text-decoration: none;
		transition: all 0.3s;
	}

	.streaming-link:hover {
		background: var(--hover-bg) !important;
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
	}

	.video-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.video-item iframe {
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 12px;
	}

	.video-item p {
		margin-top: 0.5rem;
		color: rgba(255, 255, 255, 0.9);
		text-align: center;
	}

	.credit-category {
		margin-bottom: 1rem;
	}

	.credit-category-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: rgba(59, 130, 246, 0.15);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 8px;
		color: white;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
		margin-bottom: 12px;
	}

	.credit-category-header:hover {
		background: rgba(59, 130, 246, 0.25);
	}

	.credit-category-title {
		display: flex;
		align-items: center;
		gap: 8px;
		color: white;
	}

	.credit-category-title :global(svg) {
		color: #3b82f6;
	}

	.credit-count {
		color: rgba(156, 163, 175, 0.9);
		font-weight: 400;
	}

	.credit-chevron {
		color: rgba(156, 163, 175, 0.9);
		transition: transform 0.3s ease;
	}

	.credit-list-wrapper {
		max-height: 2000px;
		overflow: hidden;
		transition: max-height 0.4s ease, padding 0.4s ease, opacity 0.3s ease;
		padding-top: 12px;
		opacity: 1;
	}

	.credit-list-wrapper.collapsed {
		max-height: 0;
		padding-top: 0;
		opacity: 0;
	}

	.credit-list {
		display: grid;
		gap: 1rem;
	}

	.credit-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(55, 65, 81, 0.3);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		border-left: 3px solid rgba(59, 130, 246, 0.5);
		transition: all 0.3s;
	}

	.credit-item:hover {
		background: rgba(55, 65, 81, 0.5);
		border-left-color: #60a5fa;
		transform: translateX(4px);
	}

	.credit-avatar,
	.credit-avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.credit-avatar {
		object-fit: cover;
		border: 2px solid rgba(59, 130, 246, 0.3);
	}

	.credit-avatar-placeholder {
		background: rgba(59, 130, 246, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #3b82f6;
	}

	.credit-details {
		flex: 1;
		min-width: 0;
	}

	.credit-name {
		color: white;
		font-weight: 500;
		font-size: 0.95rem;
		margin-bottom: 2px;
	}

	.credit-role {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
	}

	.credit-link {
		color: #3b82f6;
		font-size: 0.75rem;
		margin-top: 2px;
		display: flex;
		align-items: center;
		gap: 4px;
		text-decoration: none;
	}

	.credit-link:hover {
		color: #60a5fa;
	}

	.share-footer {
		position: relative;
		z-index: 10;
		text-align: center;
		padding: 2rem;
		margin-top: 4rem;
	}

	.footer-button {
		padding: 0.75rem 2rem;
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50px;
		color: white;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s;
	}

	.footer-button:hover {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.album-share-page {
			padding: 1rem;
		}

		.share-header {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.back-button,
		.share-button {
			font-size: 0.875rem;
			padding: 0.5rem 1rem;
		}

		.album-hero {
			flex-direction: column;
			text-align: center;
		}

		.album-cover {
			width: 100%;
			max-width: 300px;
		}

		.album-info h1 {
			font-size: 2rem;
		}

		.artist {
			font-size: 1.25rem;
		}

		.link-grid {
			grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		}

		.video-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
