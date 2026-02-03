<script>
	import { goto } from '$app/navigation';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { getAudioUrl } from '$lib/utils/environment.js';

	let { data } = $props();
	const { sample, meta } = data;

	// Audio player state
	let isPlaying = $state(false);
	let audioElement = $state(null);
	let currentTime = $state(0);
	let duration = $state(0);

	// Share functionality
	let shareSuccess = $state(false);

	function togglePlay() {
		if (!audioElement) return;
		if (isPlaying) {
			audioElement.pause();
		} else {
			audioElement.play();
		}
		isPlaying = !isPlaying;
	}

	async function handleShare() {
		const shareUrl = generateShareUrl('sample', sample.id);
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	function goToMainSite() {
		goto(sample.type === 'music' ? '/#music' : '/#voice');
	}

	function formatTime(seconds) {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Transform audio URL for CORS handling
	const audioUrl = $derived(sample.audioUrl ? getAudioUrl(sample.audioUrl) : null);
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="music.song" />
	<meta property="og:url" content="{PUBLIC_SITE_URL}/share/sample/{sample.id}" />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content={meta.image} />
	<meta property="og:site_name" content="KEY JAY ONLINE" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={meta.image} />
</svelte:head>

<div class="sample-share-page">
	<!-- Blurred Thumbnail Background -->
	{#if sample.thumbnail}
		<div class="background-cover" style="background-image: url('{sample.thumbnail}')"></div>
	{/if}

	<!-- Header with Navigation -->
	<header class="share-header">
		<button onclick={goToMainSite} class="back-button">
			<Icon icon="mdi:arrow-left" />
			Back to {sample.type === 'music' ? 'Music' : 'Voice'}
		</button>

		<button onclick={handleShare} class="share-button">
			<Icon icon={shareSuccess ? 'mdi:check' : 'mdi:share-variant'} />
			{shareSuccess ? 'Copied!' : 'Share'}
		</button>
	</header>

	<!-- Main Content -->
	<main class="sample-content">
		<!-- Sample Card -->
		<div class="sample-card">
			<!-- Thumbnail -->
			{#if sample.thumbnail}
				<img src={sample.thumbnail} alt={sample.title} class="sample-thumbnail" />
			{:else}
				<div class="sample-thumbnail-placeholder">
					<Icon icon={sample.type === 'music' ? 'mdi:music-note' : 'mdi:microphone'} width={80} height={80} />
				</div>
			{/if}

			<!-- Sample Info -->
			<div class="sample-info">
				<div class="type-badge">
					<Icon icon={sample.type === 'music' ? 'mdi:music-note' : 'mdi:microphone'} width={16} height={16} />
					{sample.type === 'music' ? 'Music Sample' : 'Voice Sample'}
				</div>

				<h1>{sample.title}</h1>

				{#if sample.type === 'music'}
					{#if sample.artist}
						<p class="artist">{sample.artist}</p>
					{/if}
					{#if sample.genre}
						<p class="genre">Genre: {sample.genre}</p>
					{/if}
				{:else if sample.category}
					<p class="category">Category: {sample.category}</p>
				{/if}
			</div>

			<!-- Audio Player -->
			{#if audioUrl}
				<div class="audio-player">
					<!-- Playback Controls -->
					<div class="playback-controls">
						<button onclick={togglePlay} class="play-button" aria-label={isPlaying ? 'Pause' : 'Play'}>
							<Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} width={40} height={40} />
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

					<!-- Hidden Audio Element -->
					<audio
						bind:this={audioElement}
						src={audioUrl}
						bind:currentTime
						bind:duration
						onplay={() => (isPlaying = true)}
						onpause={() => (isPlaying = false)}
					/>
				</div>
			{/if}

			<!-- Call to Action -->
			<div class="cta-section">
				<p>Discover more samples and full tracks</p>
				<button onclick={goToMainSite} class="explore-button">
					<Icon icon="mdi:compass-outline" width={20} height={20} />
					Explore More
				</button>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="share-footer"></footer>
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
		filter: blur(60px) brightness(0.3);
		transform: scale(1.2);
		z-index: 0;
		animation: slowPan 40s ease-in-out infinite alternate;
	}

	@keyframes slowPan {
		0% {
			transform: scale(1.2) translateX(0) translateY(0);
		}
		100% {
			transform: scale(1.3) translateX(-3%) translateY(-3%);
		}
	}

	/* Main container */
	.sample-share-page {
		position: relative;
		min-height: 100vh;
		background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);
		padding: 2rem;
		z-index: 1;
		animation: gradientShift 15s ease infinite;
		display: flex;
		flex-direction: column;
	}

	@keyframes gradientShift {
		0%, 100% {
			background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);
		}
		50% {
			background: linear-gradient(135deg, rgba(118, 75, 162, 0.8) 0%, rgba(236, 72, 153, 0.8) 100%);
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

	.sample-content {
		position: relative;
		z-index: 10;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 0;
	}

	.sample-card {
		max-width: 600px;
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 30px;
		padding: 3rem;
		text-align: center;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
	}

	.sample-thumbnail,
	.sample-thumbnail-placeholder {
		width: 250px;
		height: 250px;
		margin: 0 auto 2rem;
		border-radius: 20px;
		object-fit: cover;
		box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
	}

	.sample-thumbnail-placeholder {
		background: rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.5);
	}

	.sample-info {
		margin-bottom: 2rem;
	}

	.type-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(59, 130, 246, 0.3);
		border-radius: 50px;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.sample-info h1 {
		font-size: 2.5rem;
		color: white;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.artist,
	.genre,
	.category {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.85);
		margin: 0.25rem 0;
		text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
	}

	.audio-player {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.playback-controls {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.play-button {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: all 0.3s;
	}

	.play-button:hover {
		background: rgba(255, 255, 255, 0.35);
		transform: scale(1.05);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
	}

	.progress-bar input[type='range'] {
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		-webkit-appearance: none;
	}

	.progress-bar input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.progress-bar input[type='range']::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.time-display {
		display: flex;
		justify-content: space-between;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.875rem;
		margin-top: 0.75rem;
	}

	.cta-section {
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.cta-section p {
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.explore-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50px;
		color: white;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
	}

	.explore-button:hover {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
		transform: translateY(-2px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
	}

	.share-footer {
		position: relative;
		z-index: 10;
		text-align: center;
		padding: 1rem;
		color: rgba(255, 255, 255, 0.8);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.sample-share-page {
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

		.sample-card {
			padding: 2rem 1.5rem;
		}

		.sample-thumbnail,
		.sample-thumbnail-placeholder {
			width: 200px;
			height: 200px;
		}

		.sample-info h1 {
			font-size: 2rem;
		}

		.artist,
		.genre,
		.category {
			font-size: 1.1rem;
		}

		.play-button {
			width: 70px;
			height: 70px;
		}
	}
</style>
