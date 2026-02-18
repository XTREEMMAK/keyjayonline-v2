<script>
	import { PUBLIC_SITE_URL } from '$env/static/public';
	let { children } = $props();
</script>

<svelte:head>
	<title>KEY JAY RADIO</title>
	<meta name="description" content="Listen to Key Jay Radio — continuous music from Key Jay's catalog" />
	<meta property="og:url" content="{PUBLIC_SITE_URL}/radio" />
	<meta property="og:type" content="music.radio_station" />
	<meta property="og:title" content="KEY JAY RADIO" />
	<meta property="og:description" content="Listen to Key Jay Radio — continuous music from Key Jay's catalog" />
	<meta property="og:image" content="{PUBLIC_SITE_URL}/img/og-social.webp" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="KEY JAY RADIO" />
	<meta name="twitter:description" content="Listen to Key Jay Radio — continuous music from Key Jay's catalog" />
</svelte:head>

<div class="radio-app h-dvh flex flex-col bg-[var(--neu-bg)] overflow-hidden">
	{@render children?.()}
</div>
