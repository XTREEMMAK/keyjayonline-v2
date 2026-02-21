<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import Footer from '$lib/components/layout/Footer.svelte';
	import FloatingButtonContainer from '$lib/components/ui/FloatingButtonContainer.svelte';
	import PersistentMusicPlayer from '$lib/components/music/PersistentMusicPlayer.svelte';
	import RadioLaunchModal from '$lib/components/radio/RadioLaunchModal.svelte';
	import ScrollToTop from '$lib/components/ui/ScrollToTop.svelte';
	import { radioEnabled } from '$lib/stores/musicPlayer.js';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	let { children, data } = $props();

	// Initialize radioEnabled store from server data
	$effect(() => {
		radioEnabled.set(data?.siteSettings?.radioEnabled || false);
	});

	// Check if we're on an error page to conditionally hide footer
	const isErrorPage = $derived($page.status >= 400);

	// Skip default OG tags on share pages (they provide their own)
	const isSharePage = $derived($page.url.pathname.startsWith('/share/'));

	// Radio page uses standalone layout — hide site chrome
	const isRadioPage = $derived($page.url.pathname.startsWith('/radio'));

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

	// Scroll to top after navigation (except for hash links) + GA4 page view tracking
	afterNavigate(({ to }) => {
		if (!window.location.hash) {
			window.scrollTo(0, 0);
		}
		// Track page view in GA4 for SPA navigation (e.g. /share/* routes)
		if (typeof gtag === 'function' && to?.url) {
			gtag('event', 'page_view', { page_path: to.url.pathname });
		}
	});
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta http-equiv="x-ua-compatible" content="IE=edge" />
	<meta name="author" content="Jamaal Ephriam" />
	<meta
		name="description"
		content="The official website and portfolio for musician, creative, tech enthusiast, and producer Key Jay!"
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<!-- Canonical URL -->
	<link rel="canonical" href={PUBLIC_SITE_URL} />
	{#if !isSharePage}
		<!-- Facebook Meta Tags -->
		<meta property="og:url" content={PUBLIC_SITE_URL} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content="KEY JAY ONLINE" />
		<meta
			property="og:description"
			content="The official website and portfolio for musician, creative, tech enthusiast, and producer Key Jay!"
		/>
		<meta property="og:image" content="{PUBLIC_SITE_URL}/img/og-social.webp" />
		<meta property="og:site_name" content="KEY JAY ONLINE" />
		<!-- Twitter Meta Tags -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta property="twitter:domain" content={PUBLIC_SITE_URL.replace('https://', '')} />
		<meta property="twitter:url" content={PUBLIC_SITE_URL} />
		<meta name="twitter:title" content="KEY JAY ONLINE" />
		<meta
			name="twitter:description"
			content="The official website and portfolio for musician, creative, tech enthusiast, and producer Key Jay!"
		/>
		<meta name="twitter:image" content="{PUBLIC_SITE_URL}/img/og-social.webp" />
	{/if}
	<link rel="icon" href="/img/favicon.svg" type="image/svg+xml" />
	<!-- JSON-LD Structured Data -->
	{@html `<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@type": "Person",
		"name": "KEY JAY",
		"alternateName": "Jamaal Ephriam",
		"url": "${PUBLIC_SITE_URL}",
		"image": "${PUBLIC_SITE_URL}/img/og-social.webp",
		"description": "The official website and portfolio for musician, creative, tech enthusiast, and producer Key Jay!",
		"sameAs": [
			${data?.socialLinks?.map(s => `"${s.url}"`).join(',\n\t\t\t') || ''}
		],
		"jobTitle": ["Musician", "Composer", "Producer", "Voice Actor"],
		"knowsAbout": ["Music Production", "Voice Acting", "Web Development", "Game Development"]
	}
	</script>`}
	<!-- Google Analytics 4 -->
	{#if data?.siteSettings?.gaMeasurementId}
		{@html `<script async src="https://www.googletagmanager.com/gtag/js?id=${data.siteSettings.gaMeasurementId}"></script>
		<script>
			window.dataLayer = window.dataLayer || [];
			function gtag(){dataLayer.push(arguments);}
			gtag('js', new Date());
			gtag('config', '${data.siteSettings.gaMeasurementId}');
		</script>`}
	{/if}
	<!-- Iconify web component (v2.1.0 adds noobserver attribute for modal scroll fix) -->
	<script async src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
</svelte:head>

<!-- Page Content -->
<main class="min-h-screen">
	{@render children?.()}
</main>

<!-- Global Footer - Hidden on error pages, radio page, and during initial load -->
{#if !isErrorPage && !isRadioPage && pageReady}
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

{#if !isRadioPage}
	<!-- Floating Button Container (Mobile Only) -->
	<FloatingButtonContainer socialLinks={data?.socialLinks ?? []} />

	<!-- Scroll to Top Button (Mobile Only) -->
	<ScrollToTop />
{/if}

<!-- Persistent Music Player -->
<PersistentMusicPlayer />

<!-- Global Radio Launch Modal -->
<RadioLaunchModal />
