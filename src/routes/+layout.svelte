<script>
	import '../app.css';
	import { page } from '$app/stores';
	import Footer from '$lib/components/layout/Footer.svelte';
	import ScrollToTop from '$lib/components/ui/ScrollToTop.svelte';
	import PersistentMusicPlayer from '$lib/components/music/PersistentMusicPlayer.svelte';
	import { PUBLIC_SITE_URL } from '$env/static/public';

	let { children, data } = $props();

	// Check if we're on an error page to conditionally hide footer
	const isErrorPage = $derived($page.status >= 400);
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

<!-- Global Footer - Hidden on error pages, always on top of content -->
{#if !isErrorPage}
	<div class="relative z-20">
		<Footer siteSettings={data?.siteSettings} socialLinks={data?.socialLinks} supportPlatforms={data?.siteSettings?.supportPlatforms} />
	</div>
{/if}

<!-- Scroll to Top Button -->
<ScrollToTop />

<!-- Persistent Music Player -->
<PersistentMusicPlayer />
