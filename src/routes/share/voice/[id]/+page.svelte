<script>
	import { goto } from '$app/navigation';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import WaveSurfer from 'wavesurfer.js';
	import { formatTime } from '$lib/utils/time.js';

	let { data } = $props();
	const { project, meta, siteSettings, socialLinks } = data;

	// Support platforms from site settings
	const supportPlatforms = $derived(siteSettings?.supportPlatforms || []);

	// Audio player state
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let currentTime = $state('0:00');
	let duration = $state('0:00');
	let currentClipIndex = $state(0);

	// Share functionality
	let shareSuccess = $state(false);

	// WaveSurfer
	let waveformContainer = $state(null);
	let wavesurfer = null;

	// Three.js canvas
	let canvas = $state(null);
	let animationFrameId = null;
	let renderer = null;
	let scene = null;
	let camera = null;
	let particleMaterial = null;
	let particleGeometry = null;

	// Current clip
	const currentClip = $derived(project.clips[currentClipIndex] || project.primaryClip);
	const audioUrl = $derived(currentClip?.audioUrl ? getAudioUrl(currentClip.audioUrl) : null);

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

		// Camera
		camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.01, 1000);
		camera.position.set(0, 6, 5);

		// Scene
		scene = new THREE.Scene();

		// Renderer
		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			alpha: true
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(winWidth, winHeight);

		// Particles
		initParticles();

		// Start animation
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

	function initWaveSurfer() {
		if (!waveformContainer || !audioUrl) return;

		// Destroy existing instance if any
		if (wavesurfer) {
			wavesurfer.destroy();
		}

		isLoading = true;

		wavesurfer = WaveSurfer.create({
			container: waveformContainer,
			waveColor: 'rgba(139, 92, 246, 0.6)',
			progressColor: 'rgba(168, 85, 247, 0.9)',
			cursorColor: '#ffffff',
			cursorWidth: 2,
			barWidth: 3,
			barGap: 2,
			barRadius: 3,
			height: 80,
			normalize: true,
			responsive: true,
			url: audioUrl
		});

		wavesurfer.on('ready', () => {
			isLoading = false;
			duration = formatTime(wavesurfer.getDuration());
		});

		wavesurfer.on('audioprocess', () => {
			currentTime = formatTime(wavesurfer.getCurrentTime());
		});

		wavesurfer.on('play', () => {
			isPlaying = true;
		});

		wavesurfer.on('pause', () => {
			isPlaying = false;
		});

		wavesurfer.on('finish', () => {
			isPlaying = false;
		});
	}

	onMount(() => {
		// Hide global footer on this page
		document.body.classList.add('hide-global-footer');

		// Wait for canvas to be available
		setTimeout(() => {
			initThreeJS();
		}, 0);

		// Initialize WaveSurfer
		setTimeout(() => {
			initWaveSurfer();
		}, 100);

		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
			document.body.classList.remove('hide-global-footer');
		};
	});

	onDestroy(() => {
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
		if (wavesurfer) {
			wavesurfer.destroy();
		}
	});

	function togglePlay() {
		if (wavesurfer && !isLoading) {
			wavesurfer.playPause();
		}
	}

	function selectClip(index) {
		if (index === currentClipIndex) return;
		const wasPlaying = isPlaying;
		if (wavesurfer) {
			wavesurfer.pause();
		}
		currentClipIndex = index;
		currentTime = '0:00';
		isLoading = true;

		// Reinitialize WaveSurfer with new clip
		setTimeout(() => {
			initWaveSurfer();
			// Auto-play if was playing before
			if (wasPlaying && wavesurfer) {
				wavesurfer.once('ready', () => {
					wavesurfer.play();
				});
			}
		}, 100);
	}

	async function handleShare() {
		const shareUrl = generateShareUrl('voice', { slug: project.slug });
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	function goToMainSite() {
		goto('/#voice');
	}
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{PUBLIC_SITE_URL}/share/voice/{project.slug}" />
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

<div class="voice-share-page">
	<!-- Gradient Background -->
	<div class="background-gradient"></div>

	<!-- Three.js Particle Canvas -->
	<canvas bind:this={canvas} class="particle-canvas"></canvas>

	<!-- Header with Navigation -->
	<header class="share-header">
		<button onclick={goToMainSite} class="back-button">
			<Icon icon="mdi:arrow-left" />
			Back to Voice
		</button>

		<button onclick={handleShare} class="share-button">
			<Icon icon={shareSuccess ? 'mdi:check' : 'mdi:share-variant'} />
			{shareSuccess ? 'Copied!' : 'Share'}
		</button>
	</header>

	<!-- Main Content -->
	<main class="voice-content">
		<!-- Voice Project Card -->
		<div class="voice-card">
			<!-- Categories -->
			{#if project.categories && project.categories.length > 0}
				<div class="categories">
					{#each project.categories as category}
						<span class="category-badge">
							<Icon icon="mdi:tag" width={14} height={14} />
							{category.name}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Project Info -->
			<div class="project-info">
				<div class="type-badge">
					<Icon icon="mdi:microphone" width={16} height={16} />
					Voice Project
				</div>

				<h1>{project.title}</h1>

				{#if project.clientName}
					<p class="client">Client: {project.clientName}</p>
				{/if}

				{#if project.description}
					<p class="description">{project.description}</p>
				{/if}

				{#if project.feelings && project.feelings.length > 0}
					<div class="feelings">
						{#each project.feelings as feeling}
							<span class="feeling-tag">{feeling}</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Waveform Audio Player -->
			{#if audioUrl}
				<div class="audio-player">
					<!-- Clip Selector (if multiple clips) -->
					{#if project.clips.length > 1}
						<div class="clip-selector">
							{#each project.clips as clip, index}
								<button
									class="clip-button"
									class:active={index === currentClipIndex}
									onclick={() => selectClip(index)}
								>
									{clip.title || `Clip ${index + 1}`}
								</button>
							{/each}
						</div>
					{/if}

					<!-- Waveform Container -->
					<div class="waveform-wrapper">
						<div bind:this={waveformContainer} class="waveform-container"></div>
					</div>

					<!-- Playback Controls -->
					<div class="playback-row">
						<button onclick={togglePlay} class="play-button" disabled={isLoading} aria-label={isPlaying ? 'Pause' : 'Play'}>
							{#if isLoading}
								<Icon icon="mdi:loading" width={32} height={32} class="animate-spin" />
							{:else}
								<Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} width={32} height={32} />
							{/if}
						</button>

						<div class="time-display">
							<span>{currentTime}</span>
							<span>/</span>
							<span>{duration}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- External Links -->
			{#if project.externalLinks && project.externalLinks.length > 0}
				<div class="external-links">
					<h3>Listen On</h3>
					<div class="links-row">
						{#each project.externalLinks as link}
							<a href={link.url} target="_blank" rel="noopener noreferrer" class="external-link" title={link.label}>
								<Icon icon={link.iconValue || 'mdi:open-in-new'} width={24} height={24} />
								<span>{link.label}</span>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Call to Action -->
			<div class="cta-section">
				<p>Discover more voice work and projects</p>
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
						<a href={platform.url} target="_blank" rel="noopener noreferrer" class="support-link" title="Support on {platform.name}">
							<Icon icon={platform.icon || 'mdi:heart'} width={16} height={16} />
							<span>{platform.name}</span>
						</a>
					{/each}
				</div>
			{/if}

			<p class="footer-copyright">© {new Date().getFullYear()} J2it. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	/* Background gradient - darker rotating */
	.background-gradient {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			135deg,
			rgba(30, 20, 50, 0.95) 0%,
			rgba(40, 25, 70, 0.95) 50%,
			rgba(25, 15, 45, 0.95) 100%
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
	.voice-share-page {
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

	.voice-content {
		position: relative;
		z-index: 10;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 0;
	}

	.voice-card {
		max-width: 700px;
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 30px;
		padding: 3rem;
		text-align: center;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
	}

	.categories {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.category-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		background: rgba(99, 102, 241, 0.3);
		border: 1px solid rgba(99, 102, 241, 0.5);
		border-radius: 50px;
		color: white;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.project-info {
		margin-bottom: 2rem;
	}

	.type-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(139, 92, 246, 0.3);
		border-radius: 50px;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.project-info h1 {
		font-size: 2.5rem;
		color: white;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.client {
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.85);
		margin: 0.5rem 0;
	}

	.description {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.75);
		margin: 1rem 0;
		line-height: 1.6;
	}

	.feelings {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-top: 1rem;
	}

	.feeling-tag {
		padding: 0.3rem 0.7rem;
		background: rgba(168, 85, 247, 0.2);
		border: 1px solid rgba(168, 85, 247, 0.4);
		border-radius: 20px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.75rem;
		text-transform: capitalize;
	}

	.audio-player {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.clip-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.clip-button {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.clip-button:hover {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.clip-button.active {
		background: rgba(139, 92, 246, 0.4);
		border-color: rgba(139, 92, 246, 0.6);
		color: white;
	}

	/* Waveform Styles */
	.waveform-wrapper {
		margin-bottom: 1.5rem;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		padding: 1rem;
	}

	.waveform-container {
		width: 100%;
	}

	:global(.waveform-container wave) {
		overflow: hidden !important;
	}

	.playback-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}

	.play-button {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(168, 85, 247, 0.6) 100%);
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: all 0.3s;
	}

	.play-button:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(168, 85, 247, 0.8) 100%);
		transform: scale(1.05);
		box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
	}

	.play-button:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.time-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.8);
		font-size: 1rem;
		font-family: monospace;
	}

	.external-links {
		margin-bottom: 2rem;
	}

	.external-links h3 {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
	}

	.links-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
	}

	.external-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50px;
		color: white;
		text-decoration: none;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.external-link:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
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

	/* Responsive Design */
	@media (max-width: 768px) {
		.voice-share-page {
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

		.voice-card {
			padding: 2rem 1.5rem;
		}

		.project-info h1 {
			font-size: 2rem;
		}

		.client,
		.description {
			font-size: 1rem;
		}

		.play-button {
			width: 50px;
			height: 50px;
		}

		.waveform-wrapper {
			padding: 0.75rem;
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
