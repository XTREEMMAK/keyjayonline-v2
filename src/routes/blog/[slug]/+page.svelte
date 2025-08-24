<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';

	let { data } = $props();
	
	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);

	const blogPost = $derived(data.blogPost);

	onMount(() => {
		if (!browser) return;

		let ticking = false;
		
		function updateParallax() {
			scrollY = window.scrollY;
			
			if (heroRef) {
				const heroHeight = heroRef.offsetHeight;
				const heroRect = heroRef.getBoundingClientRect();
				
				if (heroRect.top < -(heroHeight * 0.7)) {
					if (titleVisible && titleAnimated) {
						titleAnimated = false;
						setTimeout(() => {
							titleVisible = false;
						}, 300);
					}
				} else {
					if (!titleVisible) {
						titleVisible = true;
						setTimeout(() => {
							titleAnimated = true;
						}, 100);
					} else if (!titleAnimated) {
						titleAnimated = true;
					}
				}
			}
			
			ticking = false;
		}
		
		function handleScroll() {
			if (!ticking) {
				requestAnimationFrame(updateParallax);
				ticking = true;
			}
		}

		setTimeout(() => {
			titleAnimated = true;
		}, 500);

		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function formatDate(dateString) {
		const date = new Date(dateString);
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const year = date.getFullYear();
		return `${month}-${day}-${year}`;
	}

	function getCategoryColor(category) {
		switch(category) {
			case 'music': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			case 'gaming': return 'text-purple-400 border-purple-600/30 bg-purple-600/20';
			case 'voice': return 'text-indigo-400 border-indigo-600/30 bg-indigo-600/20';
			case 'tech': return 'text-cyan-400 border-cyan-600/30 bg-cyan-600/20';
			case 'creative': return 'text-orange-400 border-orange-600/30 bg-orange-600/20';
			case 'production': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'general': return 'text-rose-400 border-rose-600/30 bg-rose-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}
</script>

<svelte:head>
	<title>{blogPost.title} - KEY JAY ONLINE</title>
	<meta name="description" content={blogPost.excerpt} />
	<meta property="og:title" content="{blogPost.title} - KEY JAY ONLINE" />
	<meta property="og:description" content={blogPost.excerpt} />
	{#if blogPost.image}
		<meta property="og:image" content={blogPost.image} />
	{/if}
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-rose-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src={blogPost.image || '/img/blog-hero-default.jpg'} 
				alt={blogPost.title}
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16 max-w-4xl">
			{#if titleVisible}
				<div class="hero-text-container">
					<!-- Breadcrumb -->
					<nav class="text-sm text-gray-300 mb-4" class:animate={titleAnimated}>
						<a href="/blog" class="hover:text-white transition-colors duration-300">Blog</a>
						<span class="mx-2">/</span>
						<span class="text-rose-400">{blogPost.title}</span>
					</nav>
					
					<!-- Category and Date -->
					<div class="flex items-center gap-3 mb-4" class:animate={titleAnimated}>
						<span class="px-3 py-1 text-sm rounded-full border {getCategoryColor(blogPost.category)}">{blogPost.category}</span>
						<span class="text-gray-300 text-sm">{formatDate(blogPost.date)}</span>
						<span class="text-gray-300 text-sm">•</span>
						<span class="text-gray-300 text-sm">{blogPost.readTime}</span>
					</div>
					
					<h1 class="blog-title text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight" class:animate={titleAnimated}>
						{blogPost.title}
					</h1>
					
					{#if blogPost.excerpt}
						<p class="blog-subtitle text-lg text-gray-300 max-w-2xl mt-6" class:animate={titleAnimated}>
							{blogPost.excerpt}
						</p>
					{/if}
					
					<!-- Author -->
					<div class="flex items-center gap-3 mt-6" class:animate={titleAnimated}>
						<div class="w-10 h-10 bg-gradient-to-br from-rose-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
							KJ
						</div>
						<div>
							<div class="text-white font-medium">Key Jay</div>
							<div class="text-gray-400 text-sm">Musician, Producer & Tech Enthusiast</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Blog Content -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-20">
		<div class="container mx-auto px-4 max-w-4xl">
			<article class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl">
				<div class="prose prose-lg prose-invert max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>h1]:text-white [&>h2]:text-white [&>h3]:text-white [&>h4]:text-white [&>h5]:text-white [&>h6]:text-white [&>strong]:text-white [&>em]:text-gray-300 [&>blockquote]:border-l-rose-500 [&>blockquote]:bg-gray-700/30 [&>blockquote]:p-4 [&>blockquote]:my-6 [&>code]:bg-gray-700 [&>code]:text-rose-300 [&>pre]:bg-gray-700 [&>pre]:border [&>pre]:border-gray-600">
					{@html sanitizeHtml(blogPost.content)}
				</div>
				
				<!-- Tags -->
				{#if blogPost.tags && blogPost.tags.length > 0}
					<div class="mt-12 pt-8 border-t border-gray-700">
						<h4 class="text-white font-semibold mb-4">Tags</h4>
						<div class="flex flex-wrap gap-2">
							{#each blogPost.tags as tag}
								<span class="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-full px-3 py-1 text-sm transition-colors duration-300 cursor-pointer">
									#{tag}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</article>
			
			<!-- Back to Blog -->
			<div class="text-center mt-12">
				<a 
					href="/blog" 
					class="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors duration-300 font-medium"
				>
					<iconify-icon icon="mdi:arrow-left" class="text-lg"></iconify-icon>
					Back to Blog
				</a>
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="wave" className="text-gray-800" />
	</div>
</div>

<style>
	.blog-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.blog-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.blog-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.blog-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.hero-text-container > * {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.hero-text-container > *.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.hero-text-container > *:nth-child(1).animate { transition-delay: 0.1s; }
	.hero-text-container > *:nth-child(2).animate { transition-delay: 0.2s; }
	.hero-text-container > *:nth-child(3).animate { transition-delay: 0.3s; }
	.hero-text-container > *:nth-child(4).animate { transition-delay: 0.4s; }
	.hero-text-container > *:nth-child(5).animate { transition-delay: 0.5s; }
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}
</style>