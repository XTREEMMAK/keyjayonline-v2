<script>
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { createScrollObserver } from '$lib/utils/scrollObserver.js';
	import { browser } from '$app/environment';
	
	let { blogPosts = [] } = $props();
	
	let sectionElement = $state();
	let visible = $state(false);
	let container = $state();
	let mixer = $state();
	let activeFilter = $state('all');

	// Fallback blog posts data if no props provided
	const fallbackBlogPosts = [
		{
			id: 1,
			title: 'Building My Dream Studio Desk',
			excerpt: 'A look at my latest DIY project, focusing on ergonomics and sound design.',
			image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600',
			tags: ['Music Production', 'DIY'],
			category: 'music',
			date: '2024-03-15',
			readTime: '5 min read'
		},
		{
			id: 2,
			title: 'My Favorite Games of the Year',
			excerpt: 'A breakdown of the games that captured my attention in the last 12 months.',
			image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600',
			tags: ['Gaming', 'Reviews'],
			category: 'gaming',
			date: '2024-03-10',
			readTime: '8 min read'
		},
		{
			id: 3,
			title: 'Voice Acting in Indie Games',
			excerpt: 'Exploring the unique challenges and opportunities in indie game voice work.',
			image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600',
			tags: ['Voice Acting', 'Gaming'],
			category: 'voice',
			date: '2024-03-05',
			readTime: '6 min read'
		},
		{
			id: 4,
			title: 'Building Audio Plugins with JUCE',
			excerpt: 'A technical deep-dive into creating custom audio processing tools.',
			image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=600',
			tags: ['Programming', 'Audio'],
			category: 'tech',
			date: '2024-02-28',
			readTime: '12 min read'
		},
		{
			id: 5,
			title: 'Creative Workflow Optimization',
			excerpt: 'Tips and tricks for maximizing productivity across multiple creative disciplines.',
			image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600',
			tags: ['Productivity', 'Creative Process'],
			category: 'creative',
			date: '2024-02-20',
			readTime: '7 min read'
		},
		{
			id: 6,
			title: 'Collaboration in Remote Productions',
			excerpt: 'How technology enables seamless creative partnerships across distances.',
			image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600',
			tags: ['Production', 'Collaboration'],
			category: 'production',
			date: '2024-02-15',
			readTime: '9 min read'
		}
	];

	// Use real blog posts if available, otherwise fallback
	const displayPosts = $derived(blogPosts.length > 0 ? blogPosts : fallbackBlogPosts);

	// Filter categories - make reactive based on actual posts
	const filterCategories = $derived([
		{ id: 'all', name: 'All', count: displayPosts.length },
		{ id: 'featured', name: 'Featured', count: displayPosts.filter(p => p.featured_post).length },
		{ id: 'music', name: 'Music', count: displayPosts.filter(p => p.category === 'music').length },
		{ id: 'gaming', name: 'Gaming', count: displayPosts.filter(p => p.category === 'gaming').length },
		{ id: 'voice', name: 'Voice', count: displayPosts.filter(p => p.category === 'voice').length },
		{ id: 'tech', name: 'Tech', count: displayPosts.filter(p => p.category === 'tech').length },
		{ id: 'creative', name: 'Creative', count: displayPosts.filter(p => p.category === 'creative').length },
		{ id: 'production', name: 'Production', count: displayPosts.filter(p => p.category === 'production').length },
		{ id: 'general', name: 'General', count: displayPosts.filter(p => p.category === 'general').length }
	]);

	onMount(async () => {
		createScrollObserver(sectionElement, (isVisible) => {
			visible = isVisible;
		});

		// Initialize MixItUp when visible and browser is available
		const initMixItUp = async () => {
			if (browser && container && visible) {
				// Destroy existing mixer if it exists
				if (mixer) {
					mixer.destroy();
				}
				
				// Wait a bit for DOM to settle
				setTimeout(async () => {
					const { default: mixitup } = await import('mixitup');
					mixer = mixitup(container, {
						selectors: {
							target: '.mix-item'
						},
						animation: {
							duration: 300,
							effects: 'fade scale(0.5)'
						}
					});
				}, 100);
			}
		};

		// Initialize when component mounts
		initMixItUp();

		// Watch for changes in posts and reinitialize
		$effect(() => {
			if (displayPosts.length > 0 && visible) {
				initMixItUp();
			}
		});

		return () => {
			if (mixer) {
				mixer.destroy();
			}
		};
	});

	function setFilter(category) {
		activeFilter = category;
		if (mixer) {
			if (category === 'all') {
				mixer.filter('all');
			} else if (category === 'featured') {
				mixer.filter('.featured');
			} else {
				mixer.filter(`.${category}`);
			}
		}
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

	function formatDate(dateString) {
		const date = new Date(dateString);
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const year = date.getFullYear();
		return `${month}-${day}-${year}`;
	}
</script>

<!-- Blog Snippets Section -->
<section id="blog" class="relative py-24 px-8 bg-[#0d0e12]" bind:this={sectionElement}>
	{#if visible}
		<div class="container mx-auto" transition:fade={{ duration: 800 }}>
			<h2 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-center mb-6 sm:mb-8 uppercase tracking-widest">Latest Musings</h2>
			
			<!-- Filter Buttons -->
			<div class="flex flex-wrap justify-center gap-2 mb-12">
				{#each filterCategories as filter}
					<button 
						onclick={() => setFilter(filter.id)}
						class="px-4 py-2 rounded-full font-medium transition-all duration-300 {
							activeFilter === filter.id
								? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
								: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/20'
						}"
					>
						{filter.name}
						<span class="ml-1 text-xs opacity-70">({filter.count})</span>
					</button>
				{/each}
			</div>

			<!-- Blog Posts Grid with MixItUp -->
			<div bind:this={container} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
				{#each displayPosts as post}
					<article class="mix-item card bg-gray-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.02] {post.category || 'general'} {post.featured_post ? 'featured' : ''}" data-category={post.category || 'general'}>
						<a href="/blog/{post.slug || post.id}" class="aspect-video relative block overflow-hidden">
							<img src={post.image} alt={post.title} class="w-full h-full object-cover">
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute top-4 left-4 flex gap-2">
								<span class="px-2 py-1 text-xs rounded-full border {getCategoryColor(post.category || 'general')}">{post.category || 'general'}</span>
								{#if post.featured_post}
									<span class="px-2 py-1 text-xs rounded-full border border-yellow-600/30 bg-yellow-600/20 text-yellow-400">Featured</span>
								{/if}
							</div>
							<div class="absolute bottom-4 right-4">
								<span class="bg-black/60 text-white px-2 py-1 text-xs rounded">{post.readTime}</span>
							</div>
						</a>
						<div class="p-6">
							<div class="mb-3">
								<h3 class="text-xl font-semibold mb-2 text-white line-clamp-2">{post.title}</h3>
								<div class="flex flex-wrap gap-2 mb-3">
									{#each (post.tags || []) as tag}
										<span class="bg-gray-700/50 text-gray-300 rounded-full px-2 py-1 text-xs">{tag}</span>
									{/each}
								</div>
								<p class="text-gray-400 text-base mb-4 line-clamp-3">{post.excerpt}</p>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-500 text-xs">{formatDate(post.date)}</span>
								<a href="/blog/{post.slug || post.id}" class="text-blue-400 hover:text-blue-300 transition-colors duration-300 text-sm font-medium">
									Read more →
								</a>
							</div>
						</div>
					</article>
				{/each}
			</div>

			<!-- View All Blog Posts Button -->
			<div class="text-center mt-12">
				<a 
					href="/blog" 
					class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transform"
				>
					View All Posts
					<iconify-icon icon="mdi:arrow-right" class="text-lg"></iconify-icon>
				</a>
			</div>
		</div>
	{/if}
</section>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 3rem;
		line-clamp: 2;
	}
	
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 4.5rem;
		line-clamp: 3;
	}

	.mix-item {
		position: relative;
		overflow: hidden;
	}
	
	/* Ensure smooth MixItUp transitions */
	.mixitup-control-active {
		background-color: rgb(59 130 246) !important;
	}
</style>