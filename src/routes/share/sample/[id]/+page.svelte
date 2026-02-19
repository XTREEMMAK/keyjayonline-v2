<script>
	import { goto } from '$app/navigation';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { onMount, onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';
	import WaveSurfer from 'wavesurfer.js';
	import { getAudioPlayerConfig } from '$lib/utils/wavesurfer-helpers.js';
	import * as THREE from 'three';

	let { data } = $props();
	const { sample, meta, siteSettings, socialLinks } = data;

	// Support platforms from site settings
	const supportPlatforms = $derived(siteSettings?.supportPlatforms || []);

	// Sanitized description
	const sanitizedDescription = $derived(sample.description ? sanitizeHtml(sample.description) : null);

	// Description collapse state
	let descExpanded = $state(false);

	// WaveSurfer audio player state
	let waveContainer = $state(null);
	let wavesurfer = null;
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let currentTime = $state('0:00');
	let duration = $state('0:00');
	let volume = $state(1);
	let showVolume = $state(false);

	// Share functionality
	let shareSuccess = $state(false);

	// Three.js canvas
	let canvas = $state(null);
	let animationFrameId = null;
	let renderer = null;
	let scene = null;
	let camera = null;
	let particleMaterial = null;
	let particleGeometry = null;

	// Three.js shaders
	const particleVertex = `
		attribute float scale;
		uniform float uTime;

		void main() {
			vec3 p = position;
			float s = scale;

			p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
			p.x += (sin(p.y + uTime) * 0.5);
			s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;

			vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
			gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
			gl_Position = projectionMatrix * mvPosition;
		}
	`;

	const particleFragment = `
		void main() {
			gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5);
		}
	`;

	function initThreeJS() {
		if (!canvas) return;

		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight;
		const aspectRatio = winWidth / winHeight;

		camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.01, 1000);
		camera.position.set(0, 6, 5);

		scene = new THREE.Scene();

		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			alpha: true
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(winWidth, winHeight);

		initParticles();
		animate();
	}

	function initParticles() {
		const gap = 0.3;
		const amountX = 200;
		const amountY = 200;
		const particleNum = amountX * amountY;
		const particlePositions = new Float32Array(particleNum * 3);
		const particleScales = new Float32Array(particleNum);
		let i = 0;
		let j = 0;

		for (let ix = 0; ix < amountX; ix++) {
			for (let iy = 0; iy < amountY; iy++) {
				particlePositions[i] = ix * gap - (amountX * gap) / 2;
				particlePositions[i + 1] = 0;
				particlePositions[i + 2] = iy * gap - (amountX * gap) / 2;
				particleScales[j] = 1;
				i += 3;
				j++;
			}
		}

		particleGeometry = new THREE.BufferGeometry();
		particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
		particleGeometry.setAttribute('scale', new THREE.BufferAttribute(particleScales, 1));

		particleMaterial = new THREE.ShaderMaterial({
			transparent: true,
			vertexShader: particleVertex,
			fragmentShader: particleFragment,
			uniforms: {
				uTime: { type: 'f', value: 0 }
			}
		});

		const particles = new THREE.Points(particleGeometry, particleMaterial);
		scene.add(particles);
	}

	function animate() {
		particleMaterial.uniforms.uTime.value += 0.05;
		camera.lookAt(scene.position);
		renderer.render(scene, camera);
		animationFrameId = requestAnimationFrame(animate);
	}

	function onResize() {
		if (!renderer || !camera) return;
		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight;
		camera.aspect = winWidth / winHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(winWidth, winHeight);
	}

	function formatTime(seconds) {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Transform audio URL for CORS handling
	const audioUrl = $derived(sample.audioUrl ? getAudioUrl(sample.audioUrl) : null);

	onMount(() => {
		document.body.classList.add('hide-global-footer');

		setTimeout(() => {
			initThreeJS();
		}, 0);

		// Initialize WaveSurfer
		if (waveContainer && audioUrl) {
			wavesurfer = WaveSurfer.create({
				container: waveContainer,
				...getAudioPlayerConfig({
					waveColor: 'rgba(236, 72, 153, 0.5)',
					progressColor: 'rgba(236, 72, 153, 0.9)',
					height: 80
				}),
				url: audioUrl
			});

			wavesurfer.on('ready', () => {
				isLoading = false;
				duration = formatTime(wavesurfer.getDuration());
			});

			const mediaEl = wavesurfer.getMediaElement();
			let playbackInterval = null;

			function syncTime() {
				currentTime = formatTime(mediaEl.currentTime);
			}

			mediaEl.addEventListener('timeupdate', syncTime);

			wavesurfer.on('play', () => {
				isPlaying = true;
				playbackInterval = setInterval(syncTime, 100);
			});

			wavesurfer.on('pause', () => {
				isPlaying = false;
				clearInterval(playbackInterval);
				syncTime();
			});

			wavesurfer.on('finish', () => {
				isPlaying = false;
				clearInterval(playbackInterval);
			});
		}

		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
			document.body.classList.remove('hide-global-footer');
		};
	});

	onDestroy(() => {
		if (wavesurfer) {
			wavesurfer.destroy();
		}
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		if (particleGeometry) {
			particleGeometry.dispose();
		}
		if (particleMaterial) {
			particleMaterial.dispose();
		}
		if (renderer) {
			renderer.dispose();
		}
	});

	function togglePlay() {
		if (wavesurfer) {
			wavesurfer.playPause();
		}
	}

	function handleVolumeChange(e) {
		const newVolume = parseFloat(e.target.value);
		volume = newVolume;
		if (wavesurfer) {
			wavesurfer.setVolume(newVolume);
		}
	}

	function toggleMute() {
		if (volume > 0) {
			volume = 0;
		} else {
			volume = 1;
		}
		if (wavesurfer) {
			wavesurfer.setVolume(volume);
		}
	}

	const volumeIcon = $derived(
		volume === 0 ? 'mdi:volume-off' :
		volume < 0.5 ? 'mdi:volume-medium' :
		'mdi:volume-high'
	);

	async function handleShare() {
		const shareUrl = generateShareUrl('sample', { slug: sample.slug });
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	function goToMainSite() {
		goto('/#music');
	}
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="music.song" />
	<meta property="og:url" content="{PUBLIC_SITE_URL}/share/sample/{sample.slug}" />
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
	<!-- Gradient Background -->
	<div class="background-gradient"></div>

	<!-- Three.js Particle Canvas -->
	<canvas bind:this={canvas} class="particle-canvas"></canvas>

	<!-- Header with Navigation -->
	<header class="share-header">
		<button onclick={goToMainSite} class="back-button">
			<Icon icon="mdi:arrow-left" />
			Back to Music
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
			<!-- Sample Info -->
			<div class="sample-info">
				<div class="type-badge">
					<Icon icon="mdi:music-note" width={16} height={16} />
					Music Sample
				</div>

				<h1>{sample.title}</h1>

				<!-- Cover Image -->
				{#if sample.thumbnail}
					<div class="cover-image-container">
						<img src={sample.thumbnail} alt={sample.title} class="cover-image" />
					</div>
				{:else}
					<div class="cover-image-placeholder">
						<Icon icon="mdi:music-note" width={80} height={80} />
					</div>
				{/if}

				<div class="meta-row">
					{#if sample.artist}
						<span class="meta-item">
							<Icon icon="mdi:account-music" width={16} height={16} />
							{sample.artist}
						</span>
					{/if}
					{#if sample.genre}
						<span class="meta-item genre-label">
							<Icon icon="mdi:music-circle" width={16} height={16} />
							{sample.genre}
						</span>
					{/if}
				</div>
			</div>

			<!-- WaveSurfer Audio Player -->
			{#if audioUrl}
				<div class="audio-player">
					<div class="player-controls">
						<button onclick={togglePlay} class="play-button" aria-label={isPlaying ? 'Pause' : 'Play'}>
							{#if isLoading}
								<Icon icon="mdi:loading" width={32} height={32} class="animate-spin" />
							{:else}
								<Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} width={40} height={40} />
							{/if}
						</button>
						<div class="waveform-wrapper">
							<div bind:this={waveContainer} class="waveform-container"></div>
							<div class="time-display">
								<span>{currentTime}</span>
								<span>{duration}</span>
							</div>
						</div>
						<!-- Vertical Volume Control -->
						<div
							class="volume-control"
							onmouseenter={() => showVolume = true}
							onmouseleave={() => showVolume = false}
						>
							{#if showVolume}
								<div class="volume-slider-popup">
									<input
										type="range"
										min="0"
										max="1"
										step="0.01"
										value={volume}
										oninput={handleVolumeChange}
										class="volume-slider"
										orient="vertical"
										aria-label="Volume"
									/>
								</div>
							{/if}
							<button onclick={toggleMute} class="volume-button" aria-label="Volume">
								<Icon icon={volumeIcon} width={22} height={22} />
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Track Description (collapsible) -->
			{#if sanitizedDescription}
				<div class="description-section">
					<button
						onclick={() => descExpanded = !descExpanded}
						class="desc-toggle"
					>
						<Icon icon="mdi:information-outline" width={16} height={16} />
						Track Info
						<Icon icon={descExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} height={18} />
					</button>
					{#if descExpanded}
						<div class="desc-content" transition:slide={{ duration: 300 }}>
							{@html sanitizedDescription}
						</div>
					{/if}
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

	<!-- Page Footer -->
	<footer class="share-footer">
		<div class="footer-content">
			<img src="/img/KJ_Logo_Medium_W.svg" alt="KEY JAY Logo" class="footer-logo" />
			<span class="footer-title">KEYJAY ONLINE</span>

			<!-- Social Links -->
			{#if socialLinks && socialLinks.length > 0}
				<div class="social-links">
					{#each socialLinks as social}
						<a href={social.url} target="_blank" rel="noopener noreferrer" title={social.name}>
							<Icon icon={social.icon || 'mdi:link'} width={24} height={24} />
						</a>
					{/each}
				</div>
			{/if}

			<!-- Support Platforms -->
			{#if supportPlatforms && supportPlatforms.length > 0}
				<div class="support-links">
					{#each supportPlatforms as platform}
						<a
							href={platform.url}
							target="_blank"
							rel="noopener noreferrer"
							class="support-link"
							title="Support on {platform.name}"
						>
							<Icon icon={platform.icon || 'mdi:heart'} width={16} height={16} />
							<span>{platform.name}</span>
						</a>
					{/each}
				</div>
			{/if}

			<p class="footer-copyright">&copy; {new Date().getFullYear()} J2it. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	/* Background gradient - darker rotating with cool tones for music */
	.background-gradient {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			135deg,
			rgba(25, 25, 45, 0.95) 0%,
			rgba(30, 30, 55, 0.95) 50%,
			rgba(20, 20, 40, 0.95) 100%
		);
		z-index: 0;
		animation: gradientRotate 20s linear infinite;
	}

	@keyframes gradientRotate {
		0% {
			filter: hue-rotate(0deg);
		}
		100% {
			filter: hue-rotate(360deg);
		}
	}

	/* Three.js particle canvas */
	.particle-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		pointer-events: none;
	}

	/* Main container */
	.sample-share-page {
		position: relative;
		min-height: 100vh;
		padding: 2rem;
		padding-bottom: 2rem;
		z-index: 1;
		display: flex;
		flex-direction: column;
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
		max-width: 800px;
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 30px;
		padding: 2rem;
		text-align: center;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
	}

	/* Cover Image */
	.cover-image-container {
		margin-bottom: 1.5rem;
		border-radius: 16px;
		overflow: hidden;
	}

	.cover-image {
		width: 100%;
		height: auto;
		max-height: 400px;
		object-fit: cover;
		display: block;
	}

	.cover-image-placeholder {
		width: 100%;
		height: 200px;
		margin-bottom: 1.5rem;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.3);
	}

	.sample-info {
		margin-bottom: 2rem;
	}

	.type-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(236, 72, 153, 0.3);
		border-radius: 50px;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.sample-info h1 {
		font-size: 2.5rem;
		color: white;
		margin-bottom: 1rem;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
	}

	.genre-label {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* WaveSurfer Audio Player */
	.audio-player {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.player-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.play-button {
		width: 60px;
		height: 60px;
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
		flex-shrink: 0;
	}

	.play-button:hover {
		background: rgba(255, 255, 255, 0.35);
		transform: scale(1.05);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
	}

	.waveform-wrapper {
		flex: 1;
		min-width: 0;
	}

	.waveform-container {
		width: 100%;
		cursor: pointer;
	}

	.time-display {
		display: flex;
		justify-content: space-between;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.8rem;
		margin-top: 0.5rem;
	}

	/* Volume Control */
	.volume-control {
		position: relative;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.volume-button {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.volume-button:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.volume-slider-popup {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		padding: 12px 8px 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.volume-slider-popup::before {
		content: '';
		position: absolute;
		inset: 0 0 8px;
		background: rgba(30, 30, 50, 0.95);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: -1;
	}

	.volume-slider {
		-webkit-appearance: none;
		appearance: none;
		writing-mode: vertical-lr;
		direction: rtl;
		width: 6px;
		height: 100px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 3px;
		outline: none;
		cursor: pointer;
	}

	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgb(236, 72, 153);
		border: 2px solid rgba(255, 255, 255, 0.5);
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.volume-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgb(236, 72, 153);
		border: 2px solid rgba(255, 255, 255, 0.5);
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.volume-slider::-webkit-slider-runnable-track {
		background: linear-gradient(to top, rgba(236, 72, 153, 0.8), rgba(236, 72, 153, 0.3));
		border-radius: 3px;
	}

	.volume-slider::-moz-range-track {
		background: linear-gradient(to top, rgba(236, 72, 153, 0.8), rgba(236, 72, 153, 0.3));
		border-radius: 3px;
		border: none;
	}

	/* Description section */
	.description-section {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.desc-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 50px;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.desc-toggle:hover {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.desc-content {
		margin-top: 1rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.75);
		font-size: 0.9rem;
		line-height: 1.6;
		text-align: left;
		overflow: hidden;
	}

	.desc-content :global(a) {
		color: #ec4899;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.desc-content :global(a:hover) {
		color: #f472b6;
	}

	/* CTA */
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
			padding: 1.5rem;
		}

		.sample-info h1 {
			font-size: 1.75rem;
		}

		.play-button {
			width: 50px;
			height: 50px;
		}

		.player-controls {
			gap: 0.75rem;
		}

		.volume-button {
			width: 36px;
			height: 36px;
		}
	}

	/* Custom Footer */
	.share-footer {
		position: relative;
		z-index: 10;
		margin-top: auto;
		padding: 3rem 2rem;
		text-align: center;
	}

	.footer-content {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.footer-logo {
		width: 250px;
		height: auto;
		margin-bottom: 1rem;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
	}

	.footer-title {
		display: block;
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 0.2em;
		color: white;
		opacity: 0.9;
		margin-bottom: 1rem;
	}

	.social-links {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.social-links a {
		color: rgba(255, 255, 255, 0.7);
		transition: all 0.3s;
	}

	.social-links a:hover {
		color: white;
		transform: scale(1.1);
	}

	.support-links {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.support-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 50px;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-size: 0.8rem;
		transition: all 0.3s;
	}

	.support-link:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		transform: scale(1.05);
	}

	.footer-copyright {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin: 0;
	}

	/* Hide global footer when this page is active */
	:global(body.hide-global-footer .relative.z-20:has(footer#contact)),
	:global(body.hide-global-footer > div.relative.z-20) {
		display: none !important;
	}
</style>
