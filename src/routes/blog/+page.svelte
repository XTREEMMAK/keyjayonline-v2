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
	let container = $state();
	let mixer = $state();
	let activeFilter = $state('all');
	let searchQuery = $state('');
	let searchTimeout = $state();

	// Infinite scroll state
	let allPosts = $state([...data.blogPosts]); // Start with server-side data
	let loading = $state(false);
	let hasMore = $state(data.pagination?.hasMore ?? true);
	let currentPage = $state(data.pagination?.page ?? 1);

	// Use all loaded posts
	const blogPosts = $derived(allPosts);
	

	// Get hero image from Directus blog page header, featured blog post, or fallback
	const heroImage = $derived.by(() => {
		// Priority: 1. Directus blog page header, 2. Featured blog post image, 3. Fallback
		if (data.blogPageHeader) {
			return data.blogPageHeader;
		}
		const featuredPost = blogPosts.find(post => post.featured_image);
		return featuredPost?.featured_image || '/img/blog-hero-default.jpg';
	});

	// Filter categories with counts - make reactive
	const filterCategories = $derived([
		{ id: 'all', name: 'All Posts', count: blogPosts.length },
		{ id: 'featured', name: 'Featured', count: blogPosts.filter(p => p.featured_post).length },
		{ id: 'general', name: 'General', count: blogPosts.filter(p => p.category === 'general').length },
		{ id: 'music', name: 'Music', count: blogPosts.filter(p => p.category === 'music').length },
		{ id: 'gaming', name: 'Gaming', count: blogPosts.filter(p => p.category === 'gaming').length },
		{ id: 'voice', name: 'Voice', count: blogPosts.filter(p => p.category === 'voice').length },
		{ id: 'tech', name: 'Tech', count: blogPosts.filter(p => p.category === 'tech').length },
		{ id: 'creative', name: 'Creative', count: blogPosts.filter(p => p.category === 'creative').length },
		{ id: 'production', name: 'Production', count: blogPosts.filter(p => p.category === 'production').length }
	]);


	// Display all posts - MixitUp handles the filtering
	let displayPosts = $derived(blogPosts);

	onMount(async () => {
		if (!browser) return;

		let ticking = false;
		
		function updateParallax() {
			scrollY = window.scrollY;
			
			if (heroRef) {
				const heroHeight = heroRef.offsetHeight;
				const heroRect = heroRef.getBoundingClientRect();
				
				if (heroRect.top < -(heroHeight * 0.7)) {
					// Animate out first, then hide
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
			
			// Check for infinite scroll trigger
			if (!loading && hasMore) {
				const scrollHeight = document.documentElement.scrollHeight;
				const scrollTop = document.documentElement.scrollTop;
				const clientHeight = document.documentElement.clientHeight;
				
				// Trigger when 200px from bottom
				if (scrollTop + clientHeight >= scrollHeight - 200) {
					loadMorePosts();
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

		// Initialize MixItUp after DOM is ready
		setTimeout(async () => {
			if (container && !mixer) {
				const { default: mixitup } = await import('mixitup');
				mixer = mixitup(container, {
					selectors: {
						target: '.mix-item'
					},
					animation: {
						duration: 300,
						effects: 'fade scale(0.5)'
					},
					callbacks: {
						onMixEnd: function(state) {
							// MixitUp filter animation complete
						}
					}
				});
				// Initialize search classes
				updateSearchClasses();
			}
		}, 100);

		setTimeout(() => {
			titleAnimated = true;
		}, 500);

		window.addEventListener('scroll', handleScroll);
		
		return () => {
			if (mixer) {
				mixer.destroy();
			}
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function setFilter(category) {
		activeFilter = category;
		
		// Apply MixitUp filter
		if (mixer) {
			let filterSelector = 'all';
			
			if (category === 'featured') {
				filterSelector = '.featured';
			} else if (category !== 'all') {
				filterSelector = `.${category}`;
			}
			
			// If search is active, combine with search filter
			if (searchQuery.trim()) {
				if (filterSelector === 'all') {
					filterSelector = '.search-match';
				} else {
					filterSelector = `${filterSelector}.search-match`;
				}
			}
			
			mixer.filter(filterSelector);
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

	// Load more posts for infinite scroll
	async function loadMorePosts() {
		if (loading || !hasMore || isSearching) return;
		
		loading = true;
		try {
			const response = await fetch(`/api/blog?page=${currentPage + 1}&limit=9`);
			const data = await response.json();
			
			if (data.posts && data.posts.length > 0) {
				// Add new posts to the existing array
				allPosts = [...allPosts, ...data.posts];
				currentPage += 1;
				hasMore = data.pagination.hasMore;
				
				// Re-initialize MixitUp for new elements after DOM updates
				setTimeout(async () => {
					if (mixer) {
						mixer.destroy();
					}
					if (container) {
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
						// Update search classes and apply current filter
						updateSearchClasses();
						setFilter(activeFilter);
					}
				}, 100);
			} else {
				hasMore = false;
			}
		} catch (error) {
			console.error('Error loading more posts:', error);
		} finally {
			loading = false;
		}
	}

	// Handle search with debouncing - use client-side filtering
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			updateSearchClasses();
			setFilter(activeFilter); // Reapply current filter
		}, 300);
	}
	
	// Update search classes on all posts
	function updateSearchClasses() {
		if (!container) return;
		
		const items = container.querySelectorAll('.mix-item');
		const query = searchQuery.toLowerCase().trim();
		
		items.forEach((item, index) => {
			const post = allPosts[index];
			if (!post) return;
			
			const isMatch = !query || 
				post.title?.toLowerCase().includes(query) ||
				post.excerpt?.toLowerCase().includes(query) ||
				post.content?.toLowerCase().includes(query) ||
				post.tags?.some(tag => tag.toLowerCase().includes(query));
			
			if (isMatch) {
				item.classList.add('search-match');
			} else {
				item.classList.remove('search-match');
			}
		});
	}

</script>

<svelte:head>
	<title>Blog - KEY JAY ONLINE</title>
	<meta name="description" content="Insights, tutorials, and thoughts on music production, technology, gaming, and creative processes" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-rose-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src={heroImage} 
				alt="Writing and Content Creation"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="blog-title text-7xl sm:text-8xl md:text-9xl font-bold text-white" class:animate={titleAnimated}>
						BLOG
					</h1>
					<p class="blog-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Insights, tutorials, and musings on music, technology, gaming, and the creative process
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Search and Filters Section -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-12 border-b border-gray-800">
		<div class="container mx-auto px-4">
			<!-- Search Bar -->
			<div class="max-w-2xl mx-auto mb-8">
				<div class="relative">
					<iconify-icon icon="mdi:magnify" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl"></iconify-icon>
					<input 
						type="text"
						placeholder="Search posts by title, content, or tags..."
						bind:value={searchQuery}
						oninput={handleSearchInput}
						class="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all duration-300"
					/>
				</div>
			</div>

			<!-- Filter Buttons -->
			<div class="flex flex-wrap justify-center gap-3">
				{#each filterCategories as filter}
					<button 
						onclick={() => setFilter(filter.id)}
						class="px-4 py-2 rounded-full font-medium transition-all duration-300 {
							activeFilter === filter.id
								? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25' 
								: 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/20'
						}"
					>
						{filter.name}
						<span class="ml-1 text-xs opacity-70">({filter.count})</span>
					</button>
				{/each}
			</div>

			<!-- Results Summary -->
			<div class="text-center mt-6">
				<p class="text-gray-400">
					{displayPosts.length} total posts loaded
					{#if searchQuery.trim()}
						- search for "{searchQuery}"
					{/if}
					{#if activeFilter !== 'all'}
						- filtered by {activeFilter}
					{/if}
					{#if hasMore}
						(scroll for more)
					{/if}
				</p>
			</div>
		</div>
	</section>

	<!-- Blog Posts Grid -->
	<section class="bg-gray-900/50 py-20">
		<div class="container mx-auto px-4">
			{#if displayPosts.length === 0}
				<div class="text-center py-16">
					<iconify-icon icon="mdi:file-document-outline" class="text-gray-500 text-6xl mb-4"></iconify-icon>
					<h3 class="text-2xl font-semibold text-white mb-2">No posts found</h3>
					<p class="text-gray-400 mb-6">Try adjusting your search or filter criteria</p>
					<button 
						onclick={() => { 
							searchQuery = ''; 
							updateSearchClasses();
							setFilter('all'); 
						}}
						class="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors duration-300"
					>
						Clear All Filters
					</button>
				</div>
			{:else}
				<div bind:this={container} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
					{#each displayPosts as post}
						<article class="mix-item bg-gray-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl {post.category || 'general'} {post.featured_post ? 'featured' : ''}" data-category={post.category || 'general'}>
							<a href="/blog/{post.slug || post.id}" class="aspect-video relative block">
								<img 
									src={post.image} 
									alt={post.title}
									class="w-full h-full object-cover"
								/>
								<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
								<div class="absolute top-4 left-4 flex gap-2">
									<span class="px-2 py-1 text-xs rounded-full border {getCategoryColor(post.category)}">{post.category}</span>
									{#if post.featured_post}
										<span class="px-2 py-1 text-xs rounded-full border border-yellow-600/30 bg-yellow-600/20 text-yellow-400">Featured</span>
									{/if}
								</div>
								<div class="absolute bottom-4 right-4">
									<span class="bg-black/60 text-white px-2 py-1 text-xs rounded">{post.readTime}</span>
								</div>
							</a>
							<div class="p-6">
								<div class="mb-4">
									<h3 class="text-xl font-semibold mb-2 text-white line-clamp-2 hover:text-rose-300 transition-colors duration-300">
										{post.title}
									</h3>
									<div class="flex flex-wrap gap-2 mb-3">
										{#each (post.tags || []) as tag}
											<span class="bg-gray-700/50 text-gray-300 rounded-full px-2 py-1 text-xs">{tag}</span>
										{/each}
									</div>
									<p class="text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
								</div>
								<div class="flex items-center justify-between border-t border-gray-700 pt-4">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 bg-gradient-to-br from-rose-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
											KJ
										</div>
										<div>
											<div class="text-white text-sm font-medium">{post.author}</div>
											<div class="text-gray-500 text-xs">{formatDate(post.date)}</div>
										</div>
									</div>
									<a 
										href="/blog/{post.slug || post.id}" 
										class="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors duration-300 text-sm font-medium"
									>
										Read more
										<iconify-icon icon="mdi:arrow-right" class="text-sm"></iconify-icon>
									</a>
								</div>
							</div>
						</article>
					{/each}
				</div>

				<!-- Loading Indicator -->
				{#if loading}
					<div class="flex justify-center items-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
						<span class="ml-3 text-gray-400">Loading more posts...</span>
					</div>
				{:else if !hasMore}
					<div class="text-center py-8">
						<p class="text-gray-500">No more posts to load</p>
					</div>
				{/if}
			{/if}
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="wave" className="text-gray-800" />
	</div>

	<!-- Newsletter Signup -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Stay Updated</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Get notified when I publish new posts about music production, technology insights, gaming reviews, and creative processes.
			</p>
			
			<div class="max-w-md mx-auto px-4">
				<div class="flex flex-col sm:flex-row gap-3">
					<input 
						type="email"
						placeholder="Enter your email address"
						class="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all duration-300 min-w-0"
					/>
					<button class="px-6 py-3 bg-gradient-to-r from-rose-600 to-purple-600 text-white font-semibold rounded-lg hover:from-rose-700 hover:to-purple-700 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/25 whitespace-nowrap">
						Subscribe
					</button>
				</div>
				<p class="text-gray-500 text-xs mt-2">No spam, unsubscribe anytime</p>
			</div>
		</div>
	</section>
</div>

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
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}

	.mix-item {
		position: relative;
		overflow: hidden;
	}
	
	/* Ensure smooth MixItUp transitions */
	.mixitup-control-active {
		background-color: rgb(225 29 72) !important;
	}
</style>