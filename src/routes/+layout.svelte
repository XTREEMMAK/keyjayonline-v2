<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { onNavigate } from '$app/navigation';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import ScrollToTop from '$lib/components/ui/ScrollToTop.svelte';
	import PersistentMusicPlayer from '$lib/components/music/PersistentMusicPlayer.svelte';
	
	let { children, data } = $props();
	
	// Check if we're on an error page to conditionally hide footer
	const isErrorPage = $derived($page.status >= 400);
	
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<meta charset="utf-8"/>
	<meta http-equiv="x-ua-compatible" content="IE=edge"/>
	<meta name="author" content="Jamaal Ephriam"/>
	<meta name="description" content="The official website of musician, composer, and producer KEY JAY!"/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
	<!-- Facebook Meta Tags -->
	<meta property="og:url" content="https://keyjayonline.com"/>
	<meta property="og:title" content="KEY JAY ONLINE"/>
	<meta property="og:description" content="The official website of musician, composer, and producer KEY JAY!"/>
	<meta property="og:image" content="/img/social_1200.jpg"/>
	<!-- Twitter Meta Tags -->
	<meta name="twitter:card" content="summary_large_image"/>
	<meta property="twitter:domain" content="keyjayonline.com"/>
	<meta property="twitter:url" content="https://keyjayonline.com"/>
	<meta name="twitter:title" content="KEY JAY ONLINE"/>
	<meta name="twitter:description" content="The official website of musician, composer, and producer KEY JAY!"/>
	<meta name="twitter:image" content="/img/social_1200.jpg"/>
	<link rel="icon" href="/img/kj_logo_icon.svg" type="image/svg+xml"/>
</svelte:head>

<!-- Global Header -->
<Header siteSettings={data?.siteSettings} socialLinks={data?.socialLinks} />

<!-- Page Content -->
<main>
	{@render children?.()}
</main>

<!-- Global Footer - Hidden on error pages -->
{#if !isErrorPage}
	<Footer siteSettings={data?.siteSettings} socialLinks={data?.socialLinks} />
{/if}

<!-- Scroll to Top Button -->
<ScrollToTop />

<!-- Persistent Music Player -->
<PersistentMusicPlayer />
