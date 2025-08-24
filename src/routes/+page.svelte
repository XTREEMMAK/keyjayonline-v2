<script>
	import Hero from '$lib/components/layout/Hero.svelte';
	import FeaturedWork from '$lib/components/layout/FeaturedWork.svelte';
	import About from '$lib/components/layout/About.svelte';
	import Blog from '$lib/components/layout/Blog.svelte';
	
	let { data } = $props();
</script>

<svelte:head>
	<title>KEY JAY ONLINE</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="KEY JAY ONLINE - Music | Tech | Gaming | Creative Productions">
</svelte:head>

<div class="bg-[#0b0c0f]">
	<Hero />
	
	<!-- Main Content Sections -->
	<div id="main-content">
		<FeaturedWork featuredWorks={data.featuredWorks} />
		<About />
		<Blog blogPosts={data.latestBlogPosts} />
	</div>
</div>
