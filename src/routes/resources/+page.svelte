<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import ResourceModalSwal from '$lib/components/resources/ResourceModalSwal.svelte';
	import CodeSnippetModal from '$lib/components/resources/CodeSnippetModal.svelte';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';

	let {
		data
	} = $props();

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);
	let visibleElements = $state(new Set());
	let searchQuery = $state(data.filters.search);
	let selectedCategory = $state(data.filters.category);
	let selectedPricing = $state(data.filters.pricing);
	let resourceModal;
	let codeModal;

	// Helper function to get category icon
	function getCategoryIcon(category) {
		if (category.icon_type === 'iconify' && category.icon_value) {
			return category.icon_value;
		}
		
		// Default icons based on common category names
		const defaultIcons = {
			'development': 'mdi:code-braces',
			'audio': 'mdi:music',
			'design': 'mdi:palette',
			'productivity': 'mdi:lightning-bolt',
			'hardware': 'mdi:memory',
			'learning': 'mdi:school',
			'other': 'mdi:folder'
		};
		
		return defaultIcons[category.slug] || 'mdi:folder';
	}

	// Helper function to get pricing color and text
	function getPricingInfo(resource) {
		switch (resource.pricing_type) {
			case 'free':
				return { color: 'text-green-400', bg: 'bg-green-400/20', text: 'Free' };
			case 'paid':
				return { 
					color: 'text-blue-400', 
					bg: 'bg-blue-400/20', 
					text: resource.price_amount ? `$${resource.price_amount}` : 'Paid' 
				};
			case 'subscription':
				return { 
					color: 'text-yellow-400', 
					bg: 'bg-yellow-400/20', 
					text: resource.price_amount ? `$${resource.price_amount}/mo` : 'Subscription' 
				};
			case 'freemium':
				return { color: 'text-purple-400', bg: 'bg-purple-400/20', text: 'Freemium' };
			default:
				return { color: 'text-gray-400', bg: 'bg-gray-400/20', text: 'Unknown' };
		}
	}

	// Helper function to update URL with filters
	function updateFilters() {
		const params = new URLSearchParams();
		if (selectedCategory !== 'all') params.set('category', selectedCategory);
		if (searchQuery.trim()) params.set('search', searchQuery.trim());
		if (selectedPricing !== 'all') params.set('pricing', selectedPricing);
		
		const newUrl = `/resources${params.toString() ? '?' + params.toString() : ''}`;
		goto(newUrl, { replaceState: true });
	}

	// Modal functions
	async function openResourceModal(resource) {
		try {
			resourceModal = new ResourceModalSwal({
				target: document.body,
				props: { resource }
			});
			await resourceModal.showModal();
		} catch (error) {
			console.error('Error opening resource modal:', error);
		}
	}

	async function openCodeModal(snippet) {
		try {
			codeModal = new CodeSnippetModal({
				target: document.body,
				props: { snippet }
			});
			await codeModal.showModal();
		} catch (error) {
			console.error('Error opening code modal:', error);
		}
	}

	// Intersection observer for animations
	function observeElement(node, key) {
		return createIntersectionObserver(node, (isVisible) => {
			if (isVisible) {
				visibleElements = new Set([...visibleElements, key]);
			}
		}, { threshold: 0.1, rootMargin: '50px' });
	}

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
</script>

<svelte:head>
	<title>Resources - KEY JAY ONLINE</title>
	<meta name="description" content="Development tools, audio production gear, creative software, and coding resources curated by KEY JAY" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1200" 
				alt="Development Tools"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="resources-title hero-title-responsive font-bold text-white" class:animate={titleAnimated}>
						RESOURCES
					</h1>
					<p class="resources-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Curated tools, software, and resources for developers, creators, and tech enthusiasts
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Stats Overview -->
	<section class="bg-gray-900/50 py-16">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-blue-400 mb-2">{data.stats.totalResources}</div>
						<div class="text-gray-400 text-sm">Total Resources</div>
					</div>
					
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-green-400 mb-2">{data.stats.totalCategories}</div>
						<div class="text-gray-400 text-sm">Categories</div>
					</div>
					
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-yellow-400 mb-2">{data.stats.featuredCount}</div>
						<div class="text-gray-400 text-sm">Featured Tools</div>
					</div>
					
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-purple-400 mb-2">{data.stats.codeSnippetsCount}</div>
						<div class="text-gray-400 text-sm">Code Snippets</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Search and Filters -->
	<section class="bg-gray-800/30 py-8">
		<div class="container mx-auto px-4">
			<div class="max-w-6xl mx-auto">
				<!-- Search Bar -->
				<div class="mb-6">
					<div class="relative max-w-md mx-auto">
						<input 
							type="text"
							placeholder="Search resources..."
							bind:value={searchQuery}
							onkeydown={(e) => e.key === 'Enter' && updateFilters()}
							class="w-full px-4 py-3 pl-12 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
						/>
						<iconify-icon icon="mdi:magnify" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl"></iconify-icon>
						{#if searchQuery.trim()}
							<button 
								onclick={() => { searchQuery = ''; updateFilters(); }}
								class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
							>
								<iconify-icon icon="mdi:close" class="text-lg"></iconify-icon>
							</button>
						{/if}
					</div>
				</div>

				<!-- Category Filters -->
				<div class="mb-6">
					<div class="flex flex-wrap gap-2 justify-center">
						<button 
							class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
							class:bg-blue-600={selectedCategory === 'all'}
							class:text-white={selectedCategory === 'all'}
							class:bg-gray-700={selectedCategory !== 'all'}
							class:text-gray-300={selectedCategory !== 'all'}
							onclick={() => { selectedCategory = 'all'; updateFilters(); }}
						>
							<iconify-icon icon="mdi:view-grid" class="text-sm"></iconify-icon>
							All Resources
						</button>
						
						{#each data.categories as category}
							<button 
								class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
								class:bg-blue-600={selectedCategory === category.slug}
								class:text-white={selectedCategory === category.slug}
								class:bg-gray-700={selectedCategory !== category.slug}
								class:text-gray-300={selectedCategory !== category.slug}
								onclick={() => { selectedCategory = category.slug; updateFilters(); }}
							>
								<iconify-icon icon={getCategoryIcon(category)} class="text-sm"></iconify-icon>
								{category.name}
								{#if category.resource_count}
									<span class="text-xs bg-gray-600 rounded-full px-2 py-0.5">{category.resource_count}</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Pricing Filter -->
				<div class="flex justify-center">
					<div class="flex gap-2">
						{#each ['all', 'free', 'paid', 'subscription', 'freemium'] as pricing}
							<button 
								class="px-3 py-1 rounded-full text-xs font-medium transition-all duration-300"
								class:bg-purple-600={selectedPricing === pricing}
								class:text-white={selectedPricing === pricing}
								class:bg-gray-600={selectedPricing !== pricing}
								class:text-gray-300={selectedPricing !== pricing}
								onclick={() => { selectedPricing = pricing; updateFilters(); }}
							>
								{pricing.charAt(0).toUpperCase() + pricing.slice(1)}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Featured Resources -->
	{#if data.featuredResources.length > 0 && selectedCategory === 'all' && !searchQuery.trim()}
		<section class="bg-gray-900/95 backdrop-blur-sm py-20">
			<div class="container mx-auto px-4">
				<div class="text-center mb-12" use:observeElement={'featured-title'}>
					<h2 class="text-3xl font-bold text-white mb-4" 
						class:opacity-100={visibleElements.has('featured-title')}
						class:translate-y-0={visibleElements.has('featured-title')}
						class:opacity-0={!visibleElements.has('featured-title')}
						class:translate-y-8={!visibleElements.has('featured-title')}
						class:transition-all={true}
						class:duration-700={true}
					>
						Featured Resources
					</h2>
					<p class="text-gray-400 max-w-2xl mx-auto">
						Handpicked tools and resources that I personally use and recommend
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{#each data.featuredResources as resource, i}
						{@const pricing = getPricingInfo(resource)}
						<article 
							class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 cursor-pointer"
							onclick={() => openResourceModal(resource)}
							use:observeElement={'featured-' + i}
						>
							<div 
								class="opacity-0 translate-y-8 transition-all duration-700"
								class:opacity-100={visibleElements.has('featured-' + i)}
								class:translate-y-0={visibleElements.has('featured-' + i)}
								style="transition-delay: {i * 100}ms"
							>
								{#if resource.featured_image}
									<div class="aspect-video relative">
										<img 
											src={resource.featured_image} 
											alt={resource.title}
											class="w-full h-full object-cover"
										/>
										<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
									</div>
								{/if}
								
								<div class="p-6">
									<div class="flex items-start justify-between mb-3">
										<h3 class="text-lg font-semibold text-white line-clamp-2">
											{resource.title}
										</h3>
										<span class="px-2 py-1 text-xs rounded-full {pricing.bg} {pricing.color} ml-2 flex-shrink-0">
											{pricing.text}
										</span>
									</div>
									
									<p class="text-gray-400 text-sm mb-3 line-clamp-2">
										{resource.description}
									</p>
									
									{#if resource.category}
										<div class="flex items-center gap-2 text-xs">
											<iconify-icon icon={getCategoryIcon(resource.category)} class="text-blue-400"></iconify-icon>
											<span class="text-blue-400">{resource.category.name}</span>
											{#if resource.personal_rating}
												<span class="ml-auto text-yellow-400">
													<iconify-icon icon="mdi:star" class="mr-1"></iconify-icon>
													{resource.personal_rating}/10
												</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				</div>
			</div>
		</section>

		<div style="margin-top: -80px; position: relative; z-index: 20;">
			<SvgDivider type="wave" className="text-gray-800" />
		</div>
	{/if}

	<!-- All Resources Grid -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12" use:observeElement={'resources-title'}>
				<h2 class="text-3xl font-bold text-white mb-4"
					class:opacity-100={visibleElements.has('resources-title')}
					class:translate-y-0={visibleElements.has('resources-title')}
					class:opacity-0={!visibleElements.has('resources-title')}
					class:translate-y-8={!visibleElements.has('resources-title')}
					class:transition-all={true}
					class:duration-700={true}
				>
					{selectedCategory === 'all' ? 'All Resources' : data.categories.find(c => c.slug === selectedCategory)?.name || 'Resources'}
				</h2>
				{#if searchQuery.trim()}
					<p class="text-gray-400">
						{data.resources.length} results for "{searchQuery}"
					</p>
				{:else}
					<p class="text-gray-400">
						{data.resources.length} tools and resources available
					</p>
				{/if}
			</div>

			{#if data.resources.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{#each data.resources as resource, i}
						{@const pricing = getPricingInfo(resource)}
						<article 
							class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
							onclick={() => openResourceModal(resource)}
							use:observeElement={'resource-' + i}
						>
							<div 
								class="opacity-0 translate-y-8 transition-all duration-700"
								class:opacity-100={visibleElements.has('resource-' + i)}
								class:translate-y-0={visibleElements.has('resource-' + i)}
								style="transition-delay: {(i % 6) * 100}ms"
							>
								{#if resource.featured_image}
									<div class="aspect-video relative overflow-hidden">
										<img 
											src={resource.featured_image} 
											alt={resource.title}
											class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
										/>
										<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
										{#if resource.featured}
											<div class="absolute top-4 left-4">
												<span class="bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded-full border border-yellow-600/30">Featured</span>
											</div>
										{/if}
										<div class="absolute top-4 right-4">
											<span class="px-2 py-1 text-xs rounded-full {pricing.bg} {pricing.color}">{pricing.text}</span>
										</div>
									</div>
								{/if}
								
								<div class="p-6">
									<div class="flex items-start justify-between mb-3">
										<h3 class="text-xl font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
											{resource.title}
										</h3>
									</div>
									
									<p class="text-gray-400 text-sm mb-4 line-clamp-3">
										{resource.description}
									</p>
									
									<div class="flex items-center justify-between">
										{#if resource.category}
											<div class="flex items-center gap-2 text-xs">
												<iconify-icon icon={getCategoryIcon(resource.category)} class="text-blue-400"></iconify-icon>
												<span class="text-blue-400">{resource.category.name}</span>
											</div>
										{/if}
										
										{#if resource.personal_rating}
											<div class="flex items-center gap-1">
												<iconify-icon icon="mdi:star" class="text-yellow-400 text-sm"></iconify-icon>
												<span class="text-white font-medium text-sm">{resource.personal_rating}/10</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<div class="text-center py-20">
					<iconify-icon icon="mdi:folder-search" class="text-gray-400 text-6xl mb-4"></iconify-icon>
					<h3 class="text-xl font-semibold text-white mb-2">No Resources Found</h3>
					<p class="text-gray-400 mb-6">Try adjusting your search or filters</p>
					<button 
						onclick={() => { searchQuery = ''; selectedCategory = 'all'; selectedPricing = 'all'; updateFilters(); }}
						class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300"
					>
						Clear Filters
					</button>
				</div>
			{/if}
		</div>
	</section>

	<!-- Code Snippets Section -->
	{#if Object.keys(data.codeSnippetsByLanguage).length > 0}
		<div style="margin-top: -80px; position: relative; z-index: 20;">
			<SvgDivider type="curve" flipY={true} className="text-purple-900" />
		</div>

		<section class="bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 py-20" style="margin-top: -80px; padding-top: 120px;">
			<div class="container mx-auto px-4">
				<div class="text-center mb-12" use:observeElement={'code-title'}>
					<h2 class="text-3xl font-bold text-white mb-4"
						class:opacity-100={visibleElements.has('code-title')}
						class:translate-y-0={visibleElements.has('code-title')}
						class:opacity-0={!visibleElements.has('code-title')}
						class:translate-y-8={!visibleElements.has('code-title')}
						class:transition-all={true}
						class:duration-700={true}
					>
						Code Snippets
					</h2>
					<p class="text-gray-400 max-w-2xl mx-auto">
						Useful code snippets and utilities for various programming languages
					</p>
				</div>

				{#each Object.entries(data.codeSnippetsByLanguage) as [language, snippets], langIndex}
					<div class="mb-12" use:observeElement={'lang-' + langIndex}>
						<h3 class="text-xl font-semibold text-white mb-6 flex items-center gap-3"
							class:opacity-100={visibleElements.has('lang-' + langIndex)}
							class:translate-x-0={visibleElements.has('lang-' + langIndex)}
							class:opacity-0={!visibleElements.has('lang-' + langIndex)}
							class:translate-x-8={!visibleElements.has('lang-' + langIndex)}
							class:transition-all={true}
							class:duration-700={true}
						>
							<iconify-icon icon="mdi:code-tags" class="text-purple-400"></iconify-icon>
							{language}
							<span class="text-sm text-gray-400">({snippets.length} snippets)</span>
						</h3>
						
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{#each snippets.slice(0, 6) as snippet, i}
								<article 
									class="bg-gray-800/50 rounded-xl p-6 hover:bg-gray-700/50 transition-all duration-300 cursor-pointer border border-gray-700/50"
									onclick={() => openCodeModal(snippet)}
									use:observeElement={'snippet-' + langIndex + '-' + i}
								>
									<div 
										class="opacity-0 translate-y-4 transition-all duration-500"
										class:opacity-100={visibleElements.has('snippet-' + langIndex + '-' + i)}
										class:translate-y-0={visibleElements.has('snippet-' + langIndex + '-' + i)}
										style="transition-delay: {i * 100}ms"
									>
										<div class="flex items-start justify-between mb-3">
											<h4 class="text-white font-medium line-clamp-2">{snippet.title}</h4>
											{#if snippet.featured}
												<span class="bg-purple-600/20 text-purple-400 px-2 py-1 text-xs rounded-full ml-2 flex-shrink-0">Featured</span>
											{/if}
										</div>
										
										<p class="text-gray-400 text-sm mb-4 line-clamp-2">
											{snippet.description}
										</p>
										
										<div class="bg-gray-900/80 rounded-lg p-3 mb-3">
											<code class="text-green-400 text-xs font-mono line-clamp-3">
												{snippet.code_content?.substring(0, 120)}...
											</code>
										</div>
										
										<div class="flex items-center justify-between text-xs">
											<span class="text-purple-400">{snippet.difficulty_level}</span>
											<span class="text-gray-500">Click to view</span>
										</div>
									</div>
								</article>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
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

	.resources-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.resources-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.resources-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.resources-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}
</style>