<script>
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { sanitizeHtml } from '$lib/utils/markdown.js';
	import { relativeDate } from '$lib/utils/relativeDate.js';
	import WaveBackground from '$lib/components/radio/WaveBackground.svelte';

	let { data } = $props();
	const socialLinks = $derived(data.socialLinks || []);
	const supportPlatforms = $derived(data.siteSettings?.supportPlatforms || []);

	onMount(() => {
		document.body.classList.add('hide-global-footer');
		return () => document.body.classList.remove('hide-global-footer');
	});
</script>

<svelte:head>
	<title>Now - KEY JAY ONLINE</title>
</svelte:head>

<div class="min-h-screen relative overflow-hidden">
	<!-- Canvas wave background (desktop only — RAF loop causes scroll jank on mobile) -->
	<div class="absolute inset-0 opacity-70 hidden md:block">
		<WaveBackground />
	</div>

	<!-- Animated gradient layers — mobile only (desktop uses WaveBackground canvas) -->
	<div class="gradient-bg gradient-layer-1 md:hidden"></div>
	<div class="gradient-bg gradient-layer-2 md:hidden"></div>
	<div class="gradient-bg gradient-layer-3 md:hidden"></div>

	<!-- Content -->
	<div class="relative z-10">
	<!-- Header -->
	<header class="pt-12 pb-8 px-4">
		<div class="max-w-2xl mx-auto">
			<a
				href="/"
				class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all duration-200 mb-8 hover:-translate-x-0.5"
			>
				<iconify-icon icon="mdi:arrow-left" class="text-base"></iconify-icon>
				Back to home
			</a>

			<h1 class="text-4xl sm:text-5xl font-bold mb-3 now-title">/now</h1>
			<p class="text-gray-300 text-lg">
				What I'm working on, thinking about, and creating right now.
			</p>
			<p class="now-explainer text-sm text-gray-400 mt-4 flex items-start gap-2">
				<iconify-icon icon="mdi:information-outline" class="text-base mt-0.5 shrink-0"></iconify-icon>
				<span>A /now page is a periodic snapshot of what's going on in my life and work — not a blog, not social media. Inspired by <a href="https://nownownow.com" target="_blank" rel="noopener noreferrer" class="text-gray-300 underline hover:text-white transition-colors">nownownow.com</a>.</span>
			</p>
		</div>
	</header>

	<!-- Entries -->
	<div class="px-4 pb-20">
		<div class="max-w-2xl mx-auto">
			{#if data.entries.length === 0}
				<div class="neu-card-flat p-12 text-center">
					<iconify-icon icon="mdi:clock-outline" class="text-4xl text-gray-600 mb-3"></iconify-icon>
					<p class="text-gray-500 text-lg">Nothing here yet.</p>
					<p class="text-gray-600 text-sm mt-2">Check back soon for updates.</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each data.entries as entry, i (entry.id)}
						<article
							class="now-entry-card"
							in:fly={{ y: 20, duration: 300, delay: i * 50 }}
							out:fade={{ duration: 150 }}
							animate:flip={{ duration: 250 }}
						>
							<!-- Date -->
							<div class="mb-3">
								<time
									class="text-sm text-gray-500"
									datetime={entry.publishedAt}
									title={new Date(entry.publishedAt).toLocaleDateString('en-US', {
										weekday: 'long',
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
								>
									{relativeDate(entry.publishedAt)}
								</time>
							</div>

							<!-- Content -->
							<div class="prose prose-invert prose-sm max-w-none now-prose">
								{@html sanitizeHtml(entry.content)}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<footer class="now-footer-section">
		<div class="now-footer-content">
			<img src="/img/KJ_Logo_Medium_W.svg" alt="KEY JAY Logo" class="now-footer-logo" />
			<span class="now-footer-title">KEYJAY ONLINE</span>

			{#if socialLinks.length > 0}
				<div class="now-social-links">
					{#each socialLinks as social}
						<a href={social.url} target="_blank" rel="noopener noreferrer" title={social.name}>
							<iconify-icon icon={social.icon || 'mdi:link'} width="24" height="24"></iconify-icon>
						</a>
					{/each}
				</div>
			{/if}

			{#if supportPlatforms.length > 0}
				<div class="now-support-links">
					{#each supportPlatforms as platform}
						<a
							href={platform.url}
							target="_blank"
							rel="noopener noreferrer"
							class="now-support-link"
							title="Support on {platform.name}"
						>
							<iconify-icon icon={platform.icon || 'mdi:heart'} width="16" height="16"></iconify-icon>
							<span>{platform.name}</span>
						</a>
					{/each}
				</div>
			{/if}

			<a
				href="/feed.xml"
				class="now-rss-button inline-flex items-center gap-2"
			>
				<iconify-icon icon="mdi:rss" class="text-base"></iconify-icon>
				Subscribe via RSS
			</a>

			<p class="now-footer-copyright">&copy; {new Date().getFullYear()} J2it. All rights reserved.</p>
		</div>
	</footer>
	</div>
</div>

<style>
	/* Sliding gradient layers — oversized hard-edge splits, GPU-composited translateX */
	.gradient-bg {
		position: absolute;
		top: 0;
		bottom: 0;
		left: -50%;
		right: -50%;
		z-index: 1;
		animation: gradient-slide 15s ease-in-out infinite alternate;
		will-change: transform;
		mix-blend-mode: screen;
	}

	/* Layer 1: deep indigo / vivid blue — slowest, base layer */
	.gradient-layer-1 {
		background-image: linear-gradient(-60deg, #2a1a5e 50%, #4a6cf7 50%);
		opacity: 0.4;
	}

	/* Layer 2: rich purple / bright violet — medium speed, reverse direction */
	.gradient-layer-2 {
		background-image: linear-gradient(-60deg, #5b2d8e 50%, #8b5cf6 50%);
		opacity: 0.25;
		animation-direction: alternate-reverse;
		animation-duration: 20s;
	}

	/* Layer 3: vivid blue / electric periwinkle — fastest, accent */
	.gradient-layer-3 {
		background-image: linear-gradient(-60deg, #3b5bdb 50%, #748ffc 50%);
		opacity: 0.2;
		animation-duration: 25s;
	}

	@keyframes gradient-slide {
		0% { transform: translateX(-25%); }
		100% { transform: translateX(25%); }
	}

	/* Gradient title */
	.now-title {
		background: linear-gradient(135deg, #667eea, #a78bfa, #667eea);
		background-size: 200% auto;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* Entry card — neumorphic flat card with left accent border */
	.now-entry-card {
		background: var(--neu-bg);
		border-radius: 16px;
		border: 1px solid var(--neu-border);
		border-left: 3px solid rgba(102, 126, 234, 0.4);
		box-shadow:
			4px 4px 12px var(--neu-shadow-dark),
			-4px -4px 12px var(--neu-shadow-light);
		padding: 1.25rem 1.5rem;
	}

	/* RSS button */
	.now-rss-button {
		background: var(--neu-bg);
		border-radius: 50px;
		border: 1px solid var(--neu-border);
		box-shadow:
			4px 4px 8px var(--neu-shadow-dark),
			-4px -4px 8px var(--neu-shadow-light);
		padding: 0.5rem 1.25rem;
		margin-top: 0.75rem;
		color: var(--neu-text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.now-rss-button:hover {
		color: var(--neu-text-primary);
		box-shadow:
			2px 2px 4px var(--neu-shadow-dark),
			-2px -2px 4px var(--neu-shadow-light);
	}

	/* Explainer text — dark scrim for legibility over gradient on mobile */
	.now-explainer {
		background: rgba(0, 0, 0, 0.35);
		border-radius: 0.5rem;
		padding: 0.75rem;
	}

	@media (min-width: 768px) {
		.now-explainer {
			background: none;
			padding: 0;
		}
	}

	/* Custom footer — matches share page pattern */
	.now-footer-section {
		position: relative;
		z-index: 10;
		margin-top: auto;
		padding: 3rem 2rem;
		text-align: center;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.now-footer-content {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.now-footer-logo {
		width: 250px;
		height: auto;
		margin-bottom: 1rem;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
	}

	.now-footer-title {
		display: block;
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 0.2em;
		color: white;
		opacity: 0.9;
		margin-bottom: 1rem;
	}

	.now-social-links {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.now-social-links a {
		color: rgba(255, 255, 255, 0.7);
		transition: all 0.3s;
	}

	.now-social-links a:hover {
		color: white;
		transform: scale(1.1);
	}

	.now-support-links {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.now-support-link {
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

	.now-support-link:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		transform: scale(1.05);
	}

	.now-footer-copyright {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin: 1rem 0 0;
	}

	/* Dark prose overrides for the /now page */
	.now-prose :global(a) {
		color: #93c5fd;
		text-decoration: underline;
		text-decoration-color: rgba(147, 197, 253, 0.3);
		transition: text-decoration-color 0.2s;
	}

	.now-prose :global(a:hover) {
		text-decoration-color: rgba(147, 197, 253, 0.8);
	}

	.now-prose :global(code) {
		color: #fbbf24;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.15em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	.now-prose :global(pre) {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
	}

	.now-prose :global(pre code) {
		color: #e5e7eb;
		background: none;
		padding: 0;
	}

	.now-prose :global(blockquote) {
		border-left-color: #4b5563;
		color: #9ca3af;
	}

	.now-prose :global(hr) {
		border-color: #374151;
	}

	.now-prose :global(strong) {
		color: #f3f4f6;
	}

	/* Hide global footer when this page is active */
	:global(body.hide-global-footer .relative.z-20:has(footer#contact)),
	:global(body.hide-global-footer > div.relative.z-20) {
		display: none !important;
	}
</style>
