<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import Footer from '$lib/components/layout/Footer.svelte';
	import ScrollToTop from '$lib/components/ui/ScrollToTop.svelte';
	import PersistentMusicPlayer from '$lib/components/music/PersistentMusicPlayer.svelte';
	import { PUBLIC_SITE_URL } from '$env/static/public';

	let { children, data } = $props();

	// Check if we're on an error page to conditionally hide footer
	const isErrorPage = $derived($page.status >= 400);

	// State to control footer visibility after initial load
	let pageReady = $state(false);

	// Disable browser scroll restoration and scroll to top immediately
	if (typeof window !== 'undefined') {
		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}
		// Immediate scroll to top on page load (before mount)
		if (!window.location.hash) {
			window.scrollTo(0, 0);
		}
	}

	// Show footer after page is ready
	onMount(() => {
		// Small delay to ensure page is fully settled
		const timer = setTimeout(() => {
			pageReady = true;
		}, 100);

		return () => clearTimeout(timer);
	});

	// Scroll to top after navigation (except for hash links)
	afterNavigate(() => {
		if (!window.location.hash) {
			window.scrollTo(0, 0);
		}
	});
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta http-equiv="x-ua-compatible" content="IE=edge" />
	<meta name="author" content="Jamaal Ephriam" />
	<meta
		name="description"
		content="The official website of musician, composer, and producer KEY JAY!"
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<!-- Canonical URL -->
	<link rel="canonical" href={PUBLIC_SITE_URL} />
	<!-- Facebook Meta Tags -->
	<meta property="og:url" content={PUBLIC_SITE_URL} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="KEY JAY ONLINE" />
	<meta
		property="og:description"
		content="The official website of musician, composer, and producer KEY JAY!"
	/>
	<meta property="og:image" content="{PUBLIC_SITE_URL}/img/social_1200.jpg" />
	<meta property="og:site_name" content="KEY JAY ONLINE" />
	<!-- Twitter Meta Tags -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content={PUBLIC_SITE_URL.replace('https://', '')} />
	<meta property="twitter:url" content={PUBLIC_SITE_URL} />
	<meta name="twitter:title" content="KEY JAY ONLINE" />
	<meta
		name="twitter:description"
		content="The official website of musician, composer, and producer KEY JAY!"
	/>
	<meta name="twitter:image" content="{PUBLIC_SITE_URL}/img/social_1200.jpg" />
	<link rel="icon" href="/img/kj_logo_icon.svg" type="image/svg+xml" />
	<!-- JSON-LD Structured Data -->
	{@html `<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@type": "Person",
		"name": "KEY JAY",
		"alternateName": "Jamaal Ephriam",
		"url": "${PUBLIC_SITE_URL}",
		"image": "${PUBLIC_SITE_URL}/img/social_1200.jpg",
		"description": "Musician, composer, producer, voice actor, and creative professional.",
		"sameAs": [
			${data?.socialLinks?.map(s => `"${s.url}"`).join(',\n\t\t\t') || ''}
		],
		"jobTitle": ["Musician", "Composer", "Producer", "Voice Actor"],
		"knowsAbout": ["Music Production", "Voice Acting", "Web Development", "Game Development"]
	}
	</script>`}
	<!-- Iconify for icons -->
	<script async src="https://code.iconify.design/iconify-icon/2.0.0/iconify-icon.min.js"></script>
</svelte:head>

<!-- Page Content -->
<main class="min-h-screen">
	{@render children?.()}
</main>

<!-- Global Footer - Hidden on error pages and during initial load, always on top of content -->
{#if !isErrorPage && pageReady}
	<div class="relative z-20 footer-wrapper" class:home-footer={$page.url.pathname === '/'}>
		<Footer siteSettings={data?.siteSettings} socialLinks={data?.socialLinks} supportPlatforms={data?.siteSettings?.supportPlatforms} />
	</div>
{/if}

<style>
	/* Make footer full viewport height on mobile for home page only */
	@media (max-width: 768px) {
		.footer-wrapper.home-footer {
			min-height: 100vh;
			min-height: 100dvh; /* Use dynamic viewport height for better mobile support */
			display: flex;
			flex-direction: column;
			justify-content: center; /* Center content vertically */
		}

		.footer-wrapper.home-footer :global(footer) {
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: center; /* Center footer content in the middle */
		}
	}
</style>

<!-- Scroll to Top Button -->
<ScrollToTop />

<!-- Persistent Music Player -->
<PersistentMusicPlayer />
