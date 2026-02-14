<script>
	import { goto } from '$app/navigation';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import ContentViewerModal from '$lib/components/ui/ContentViewerModal.svelte';
	import { loadPlaylist, showPlayer, expandPlayer } from '$lib/stores/musicPlayer.js';

	let { data } = $props();
	const { production, meta, siteSettings, socialLinks } = data;

	// Content viewer state
	let viewerOpen = $state(false);
	let viewerPages = $state([]);
	let viewerTitle = $state('');
	let viewerLoading = $state(false);

	async function openContentViewer(galleryId, title = '') {
		if (!galleryId) return;
		viewerTitle = title;
		viewerLoading = true;
		viewerOpen = true;
		try {
			const response = await fetch(`/api/galleries/${galleryId}/albums`);
			if (response.ok) {
				const data = await response.json();
				viewerPages = data.albums || [];
			}
		} catch (err) {
			console.error('Failed to load gallery albums:', err);
			viewerPages = [];
		} finally {
			viewerLoading = false;
		}
	}

	function closeContentViewer() {
		viewerOpen = false;
		viewerPages = [];
	}

	async function playProductionPlaylist(playlistId) {
		if (!playlistId) return;
		try {
			const response = await fetch(`/api/playlists/${playlistId}/tracks`);
			if (!response.ok) throw new Error('Failed to load playlist');
			const data = await response.json();
			if (data.tracks?.length > 0) {
				loadPlaylist(data.tracks, 0, 'production');
				showPlayer();
				expandPlayer();
			}
		} catch (err) {
			console.error('Failed to play production playlist:', err);
		}
	}

	function handleAction(action) {
		switch (action.actionType) {
			case 'viewer':
				openContentViewer(action.galleryId, production.title || action.label);
				break;
			case 'audio_player':
				playProductionPlaylist(action.playlistId);
				break;
		}
	}

	// Support platforms from site settings
	const supportPlatforms = $derived(siteSettings?.supportPlatforms || []);

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

	onMount(() => {
		// Hide global footer on this page
		document.body.classList.add('hide-global-footer');

		// Wait for canvas to be available
		setTimeout(() => {
			initThreeJS();
		}, 0);

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
	});

	async function handleShare() {
		const shareUrl = generateShareUrl('production', { slug: production.slug });
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	function goToMainSite() {
		goto('/#productions');
	}

	// Cover image URL (already processed by server via buildAssetUrl)
	const coverImageUrl = $derived(production.image || null);
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{PUBLIC_SITE_URL}/share/production/{production.slug}" />
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

<div class="production-share-page">
	<!-- Gradient Background -->
	<div class="background-gradient"></div>

	<!-- Three.js Particle Canvas -->
	<canvas bind:this={canvas} class="particle-canvas"></canvas>

	<!-- Header with Navigation -->
	<header class="share-header">
		<button onclick={goToMainSite} class="back-button">
			<Icon icon="mdi:arrow-left" />
			Back to Productions
		</button>

		<button onclick={handleShare} class="share-button">
			<Icon icon={shareSuccess ? 'mdi:check' : 'mdi:share-variant'} />
			{shareSuccess ? 'Copied!' : 'Share'}
		</button>
	</header>

	<!-- Main Content -->
	<main class="production-content">
		<!-- Production Card -->
		<div class="production-card">
					<!-- Production Info -->
			<div class="production-info">
				{#each (production.categories || []) as cat}
					<div class="type-badge">
						<Icon icon={cat.icon} width={16} height={16} />
						{cat.name}
					</div>
				{/each}

				<h1>{production.title}</h1>

				<!-- Cover Image -->
				{#if coverImageUrl}
					<div class="cover-image-container">
						<img src={coverImageUrl} alt={production.title} class="cover-image" />
					</div>
				{/if}

				<div class="meta-row">
					{#if production.year}
						<span class="meta-item">
							<Icon icon="mdi:calendar" width={16} height={16} />
							{production.year}{#if production.yearEnd && production.yearEnd !== production.year}–{production.yearEnd}{/if}
						</span>
					{/if}
					{#if production.status}
						<span class="meta-item status-badge">
							<Icon icon="mdi:check-circle" width={16} height={16} />
							{production.status}
						</span>
					{/if}
				</div>

				{#if production.description}
					<p class="description">{production.description}</p>
				{/if}

				<!-- Stats Row -->
				{#if production.episodes || production.issues || production.duration}
					<div class="stats-row">
						{#if production.episodes}
							<div class="stat-item">
								<Icon icon="mdi:television-play" width={20} height={20} />
								<span>{production.episodes} Episodes</span>
							</div>
						{/if}
						{#if production.issues}
							<div class="stat-item">
								<Icon icon="mdi:book-multiple" width={20} height={20} />
								<span>{production.issues} Issues</span>
							</div>
						{/if}
						{#if production.duration}
							<div class="stat-item">
								<Icon icon="mdi:clock-outline" width={20} height={20} />
								<span>{production.duration}</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Tags -->
				{#if production.tags && production.tags.length > 0}
					<div class="tags">
						{#each production.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Actions & Links -->
			{#if production.actions && production.actions.length > 0}
				<div class="external-links">
					<h3>Links & Actions</h3>
					<div class="links-row">
						{#each production.actions as action}
							{#if action.actionType === 'external_link'}
								<a
									href={action.url}
									target="_blank"
									rel="noopener noreferrer"
									class="external-link"
									title={action.label}
								>
									<Icon icon={action.icon} width={24} height={24} />
									<span>{action.label}</span>
								</a>
							{:else}
								<button
									onclick={() => handleAction(action)}
									class="external-link"
									title={action.label}
								>
									<Icon icon={action.icon} width={24} height={24} />
									<span>{action.label}</span>
								</button>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Embedded Content Preview -->
			{#if production.embeds && production.embeds.length > 0}
				<div class="embed-preview">
					<h3>Videos & Media</h3>
					<div class="embeds-list">
						{#each production.embeds as embed (embed.id)}
							<div class="embed-item">
								{#if embed.title}
									<h4 class="embed-title">
										<Icon icon={embed.type === 'youtube' ? 'mdi:youtube' : 'mdi:play-circle-outline'} width={18} height={18} />
										{embed.title}
									</h4>
								{/if}
								<div class="embed-container">
									<iframe
										src={embed.embedUrl}
										title={embed.title || production.title}
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
									></iframe>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Call to Action -->
			<div class="cta-section">
				<p>Discover more creative projects</p>
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

			<p class="footer-copyright">© {new Date().getFullYear()} J2it. All rights reserved.</p>
		</div>
	</footer>
</div>

<!-- Gallery Viewer Modal -->
<ContentViewerModal
	isOpen={viewerOpen}
	pages={viewerPages}
	title={viewerTitle}
	loading={viewerLoading}
	onClose={closeContentViewer}
/>

<style>
	/* Background gradient - darker rotating with warm tones for productions */
	.background-gradient {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			135deg,
			rgba(40, 25, 35, 0.95) 0%,
			rgba(50, 30, 50, 0.95) 50%,
			rgba(35, 20, 40, 0.95) 100%
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
	.production-share-page {
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

	.production-content {
		position: relative;
		z-index: 10;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 0;
	}

	.production-card {
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

	.production-info {
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
		text-transform: capitalize;
	}

	.production-info h1 {
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

	.status-badge {
		padding: 0.25rem 0.75rem;
		background: rgba(16, 185, 129, 0.3);
		border-radius: 50px;
	}

	.description {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.75);
		margin: 1rem 0;
		line-height: 1.6;
	}

	.stats-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
		margin: 1.5rem 0;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 15px;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.95rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		margin-top: 1rem;
	}

	.tag {
		padding: 0.3rem 0.7rem;
		background: rgba(168, 85, 247, 0.2);
		border: 1px solid rgba(168, 85, 247, 0.4);
		border-radius: 20px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.75rem;
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
		cursor: pointer;
		transition: all 0.2s;
	}

	.external-link:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
	}

	/* Embed Preview */
	.embed-preview {
		margin-bottom: 2rem;
	}

	.embed-preview h3 {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
	}

	.embeds-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.embed-title {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 0.75rem;
		font-weight: 500;
	}

	.embed-container {
		position: relative;
		width: 100%;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		border-radius: 15px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.3);
	}

	.embed-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
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
		.production-share-page {
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

		.production-card {
			padding: 1.5rem;
		}

		.production-info h1 {
			font-size: 1.75rem;
		}

		.description {
			font-size: 0.95rem;
		}

		.stats-row {
			gap: 1rem;
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
