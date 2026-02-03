<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';
	import ContentViewerModal from '$lib/components/ui/ContentViewerModal.svelte';
	import ProductionDetailModal from '$lib/components/ui/ProductionDetailModal.svelte';
	import { navbarVisible } from '$lib/stores/navigation.js';
	import { letterPulse } from '$lib/actions/letterAnimation.js';
	import { sectionData, loadSection } from '$lib/stores/sectionData.js';
	import { getAudioUrl } from '$lib/utils/environment.js';

	// Title letters for animation
	const titleLetters = 'Productions'.split('');

	// MixItUp state
	let container = $state();
	let mixer = $state(null);
	let activeFilter = $state('all');

	// Content viewer state (for comic pages)
	let viewerOpen = $state(false);
	let viewerPages = $state([]);
	let viewerTitle = $state('');
	let viewerLoading = $state(false);

	// Production detail modal state
	let detailModalOpen = $state(false);
	let selectedProduction = $state(null);

	// Derived state from store
	const sectionState = $derived($sectionData.productions);
	const productionsData = $derived(sectionState.data || {});
	const productions = $derived(productionsData.productions || []);
	const dbCategories = $derived(productionsData.categories || []);
	const socialLinks = $derived(productionsData.socialLinks || []);
	const isLoading = $derived(sectionState.status === 'loading');
	const isLoaded = $derived(sectionState.status === 'loaded');
	const hasError = $derived(sectionState.status === 'error');

	// Build categories from database + default "All"
	const categories = $derived([
		{ id: 'all', label: 'All', icon: 'mdi:view-grid', slug: 'all' },
		...dbCategories.map(cat => ({
			id: cat.slug,
			label: cat.name,
			icon: cat.icon || getCategoryIconBySlug(cat.slug),
			slug: cat.slug,
			color: cat.color
		}))
	]);

	// Fallback categories if database is empty
	const fallbackCategories = [
		{ id: 'all', label: 'All', icon: 'mdi:view-grid' },
		{ id: 'video', label: 'Videos', icon: 'mdi:video' },
		{ id: 'comic', label: 'Comics', icon: 'mdi:book-open-page-variant' },
		{ id: 'game', label: 'Games', icon: 'mdi:gamepad-variant' },
		{ id: 'audio', label: 'Audio Dramas', icon: 'mdi:headphones' }
	];

	// Use fallback if no categories from DB
	const displayCategories = $derived(categories.length > 1 ? categories : fallbackCategories);

	// Get featured production
	const featuredProduction = $derived(
		productions.find(p => p.featured && (p.productionStatus === 'in_production' || p.productionStatus === 'in_development')) ||
		productions.find(p => p.featured) ||
		productions[0] ||
		null
	);

	// Helper to get icon by slug
	function getCategoryIconBySlug(slug) {
		const icons = {
			video: 'mdi:video',
			comic: 'mdi:book-open-page-variant',
			game: 'mdi:gamepad-variant',
			audio: 'mdi:headphones'
		};
		return icons[slug] || 'mdi:folder';
	}

	// Filter productions with MixItUp
	function filterProductions(category) {
		activeFilter = category;
		if (mixer) {
			if (category === 'all') {
				mixer.filter('all');
			} else {
				mixer.filter(`.${category}`);
			}
		}
	}

	// Initialize MixItUp and load data
	onMount(async () => {
		// Load section data
		if (browser) {
			try {
				await loadSection('productions');
			} catch (err) {
				console.error('Failed to load productions:', err);
			}
		}
	});

	// Initialize MixItUp when data is loaded
	$effect(() => {
		if (browser && container && isLoaded && productions.length > 0 && !mixer) {
			import('mixitup').then(({ default: mixitup }) => {
				mixer = mixitup(container, {
					selectors: {
						target: '.mix-item'
					},
					animation: {
						duration: 300,
						effects: 'fade scale(0.5)'
					}
				});
			});
		}
	});

	onDestroy(() => {
		if (mixer) {
			mixer.destroy();
		}
	});

	// Open content viewer for comic pages
	async function openContentViewer(production) {
		if (production.contentType !== 'comic_pages') return;

		viewerTitle = production.title;
		viewerLoading = true;
		viewerOpen = true;

		try {
			const response = await fetch(`/api/productions/${production.id}/pages`);
			if (response.ok) {
				const data = await response.json();
				viewerPages = data.pages || [];
			}
		} catch (err) {
			console.error('Failed to load pages:', err);
			viewerPages = [];
		} finally {
			viewerLoading = false;
		}
	}

	function closeContentViewer() {
		viewerOpen = false;
		viewerPages = [];
		viewerTitle = '';
	}

	function getStatusColor(status) {
		switch(status) {
			case 'Released':
			case 'Complete': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'In Production':
			case 'In Development': return 'text-yellow-400 border-yellow-600/30 bg-yellow-600/20';
			case 'Ongoing': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}

	function getCategoryColor(category) {
		switch(category) {
			case 'video': return 'text-red-400 border-red-600/30 bg-red-600/20';
			case 'comic': return 'text-purple-400 border-purple-600/30 bg-purple-600/20';
			case 'game': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			case 'audio': return 'text-green-400 border-green-600/30 bg-green-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}

	function getCategoryIcon(category) {
		switch(category) {
			case 'video': return 'mdi:video';
			case 'comic': return 'mdi:book-open-page-variant';
			case 'game': return 'mdi:gamepad-variant';
			case 'audio': return 'mdi:headphones';
			default: return 'mdi:folder';
		}
	}

	function handleImageError(event, production) {
		const img = event.target;
		if (production?.fallbackImage && img.src !== production.fallbackImage) {
			img.src = production.fallbackImage;
		}
	}

	// Get image URL with fallback
	function getImageUrl(production) {
		return production.image || production.fallbackImage || 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600';
	}

	// Handle card click - open detail modal
	function handleCardClick(production) {
		selectedProduction = production;
		detailModalOpen = true;
	}

	// Close detail modal
	function closeDetailModal() {
		detailModalOpen = false;
		selectedProduction = null;
	}

	// Handle view pages from detail modal (for comics)
	function handleViewPagesFromDetail(production) {
		closeDetailModal();
		openContentViewer(production);
	}
</script>

<!-- Production Detail Modal -->
<ProductionDetailModal
	isOpen={detailModalOpen}
	production={selectedProduction}
	onClose={closeDetailModal}
	onViewPages={handleViewPagesFromDetail}
/>

<!-- Content Viewer Modal (for comic pages) -->
<ContentViewerModal
	isOpen={viewerOpen}
	pages={viewerPages}
	title={viewerTitle}
	loading={viewerLoading}
	onClose={closeContentViewer}
/>

<!-- ============================================================================ -->
<!-- PRODUCTIONS SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="productions-section min-h-screen section-gradient-productions gradient-animated relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="productions" opacity={0.12} />

	<!-- Section Header with Orange Accent -->
	<div class="pt-28 pb-8 text-center relative">
		<div class="absolute inset-0 bg-gradient-to-b from-orange-600/20 via-red-500/5 to-transparent pointer-events-none"></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			{#each titleLetters as letter, i}
				<span
					use:letterPulse={{ delay: i * 60 }}
					class="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent inline-block"
				>{letter}</span>
			{/each}
		</h1>
		<p class="text-lg text-orange-200/70 relative">Creative works across multiple mediums</p>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-32">
			<div class="text-center">
				<Icon icon="mdi:loading" class="text-orange-400 text-5xl animate-spin mb-4 mx-auto" />
				<p class="text-gray-400">Loading productions...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="flex items-center justify-center py-32">
			<div class="text-center">
				<Icon icon="mdi:alert-circle" class="text-red-400 text-5xl mb-4 mx-auto" />
				<p class="text-gray-400">Failed to load productions. Please try again later.</p>
			</div>
		</div>
	{:else}
		<!-- Featured Production -->
		{#if featuredProduction}
			<section class="bg-gradient-to-b from-[var(--neu-bg-dark)]/95 via-orange-950/15 to-[var(--neu-bg-dark)]/95 backdrop-blur-sm py-16 relative">
				<div class="container mx-auto px-4">
					<div class="max-w-6xl mx-auto">
						<div class="neu-card overflow-hidden">
							<div class="grid grid-cols-1 lg:grid-cols-2">
								<!-- Featured Image -->
								<div class="aspect-video lg:aspect-auto relative">
									<img
										src={getImageUrl(featuredProduction)}
										alt={featuredProduction.title}
										onerror={(e) => handleImageError(e, featuredProduction)}
										class="w-full h-full object-cover"
									/>
									<div class="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent lg:bg-gradient-to-t lg:from-black/40 lg:via-transparent lg:to-transparent"></div>
									<div class="absolute top-4 left-4">
										<span class="px-3 py-1 text-xs font-semibold rounded-full {getStatusColor(featuredProduction.status)}">
											{featuredProduction.status}
										</span>
									</div>
								</div>

								<!-- Featured Content -->
								<div class="p-8 lg:p-12 flex flex-col justify-center">
									<div class="flex items-center gap-3 mb-4">
										<Icon icon={getCategoryIcon(featuredProduction.category)} class="text-orange-400 text-2xl" />
										<span class="text-orange-400 font-semibold uppercase tracking-wider text-sm">{featuredProduction.type}</span>
									</div>

									<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">{featuredProduction.title}</h2>
									<p class="text-gray-300 text-lg mb-6 leading-relaxed">{featuredProduction.description}</p>

									{#if featuredProduction.tags && featuredProduction.tags.length > 0}
										<div class="flex flex-wrap gap-2 mb-6">
											{#each featuredProduction.tags as tag}
												<span class="bg-gray-700/50 text-gray-300 px-3 py-1 text-sm rounded-full">{tag}</span>
											{/each}
										</div>
									{/if}

									<div class="flex items-center gap-6 text-gray-400 text-sm mb-8">
										{#if featuredProduction.year}
											<span class="flex items-center gap-2">
												<Icon icon="mdi:calendar" class="text-lg" />
												{featuredProduction.year}
											</span>
										{/if}
										{#if featuredProduction.episodes}
											<span class="flex items-center gap-2">
												<Icon icon="mdi:playlist-play" class="text-lg" />
												{featuredProduction.episodes}
											</span>
										{/if}
										{#if featuredProduction.platform}
											<span class="flex items-center gap-2">
												<Icon icon="mdi:devices" class="text-lg" />
												{featuredProduction.platform}
											</span>
										{/if}
									</div>

									<div class="flex flex-wrap gap-4">
										{#if featuredProduction.links?.listen}
											<a href={featuredProduction.links.listen} target="_blank" rel="noopener noreferrer" class="neu-button-primary px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
												<Icon icon="mdi:headphones" class="text-xl" />
												Listen Now
											</a>
										{/if}
										{#if featuredProduction.links?.watch}
											<a href={featuredProduction.links.watch} target="_blank" rel="noopener noreferrer" class="neu-button-primary px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
												<Icon icon="mdi:play" class="text-xl" />
												Watch Now
											</a>
										{/if}
										{#if featuredProduction.links?.read}
											<a href={featuredProduction.links.read} target="_blank" rel="noopener noreferrer" class="neu-button-primary px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
												<Icon icon="mdi:book-open-variant" class="text-xl" />
												Read Now
											</a>
										{/if}
										{#if featuredProduction.contentType === 'comic_pages'}
											<button onclick={() => openContentViewer(featuredProduction)} class="neu-button-primary px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
												<Icon icon="mdi:book-open-variant" class="text-xl" />
												View Pages
											</button>
										{/if}
										{#if featuredProduction.externalLinks && featuredProduction.externalLinks.length > 0}
											<a href={featuredProduction.externalLinks[0].url} target="_blank" rel="noopener noreferrer" class="neu-button px-6 py-3 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2">
												<Icon icon="mdi:information-outline" class="text-xl" />
												Learn More
											</a>
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Filter Navigation -->
		<section
			class="bg-[var(--neu-bg)]/95 backdrop-blur-sm py-8 sticky z-30 transition-[top] duration-300"
			style="top: {$navbarVisible ? '88px' : '0px'}"
		>
			<div class="container mx-auto px-4">
				<div class="flex flex-wrap justify-center gap-3">
					{#each displayCategories as category}
						<button
							onclick={() => filterProductions(category.id)}
							class="px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2
								{activeFilter === category.id
									? 'bg-gradient-to-r from-orange-600 to-red-600 text-white scale-105'
									: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'}"
						>
							<Icon icon={category.icon} class="text-lg" />
							{category.label}
						</button>
					{/each}
				</div>
			</div>
		</section>

		<!-- Productions Grid -->
		<section class="bg-gradient-to-b from-[var(--neu-bg)]/95 via-amber-950/10 to-[var(--neu-bg)]/95 backdrop-blur-sm py-12 relative">
			<div class="container mx-auto px-4">
				{#if productions.length === 0}
					<div class="text-center py-16">
						<Icon icon="mdi:folder-open-outline" class="text-gray-600 text-6xl mb-4 mx-auto" />
						<h3 class="text-xl text-gray-400 mb-2">No productions yet</h3>
						<p class="text-gray-500">Check back soon for new content.</p>
					</div>
				{:else}
					<div bind:this={container} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{#each productions as production (production.id)}
							<div class="mix-item {production.categorySlugs || production.category}">
								<article
									class="neu-card overflow-hidden hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
									onclick={() => handleCardClick(production)}
									role="button"
									tabindex="0"
									onkeypress={(e) => e.key === 'Enter' && handleCardClick(production)}
								>
									<!-- Card Image -->
									<div class="aspect-video relative">
										<img
											src={getImageUrl(production)}
											alt={production.title}
											onerror={(e) => handleImageError(e, production)}
											class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
										/>
										<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:scale-110 transition-transform duration-500"></div>

										<!-- Category Badge -->
										<div class="absolute top-4 left-4">
											<span class="px-2 py-1 text-xs rounded-full border {getCategoryColor(production.category)} flex items-center gap-1">
												<Icon icon={getCategoryIcon(production.category)} class="text-sm" />
												{production.type}
											</span>
										</div>

										<!-- Status Badge -->
										<div class="absolute top-4 right-4">
											<span class="px-2 py-1 text-xs rounded-full {getStatusColor(production.status)}">{production.status}</span>
										</div>

										<!-- Play/View Overlay -->
										<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
											<div class="bg-white/10 backdrop-blur-sm rounded-full p-4">
												{#if production.category === 'video' || production.category === 'audio'}
													<Icon icon="mdi:play" class="text-white text-3xl" />
												{:else if production.category === 'comic'}
													<Icon icon="mdi:book-open-variant" class="text-white text-3xl" />
												{:else}
													<Icon icon="mdi:gamepad-variant" class="text-white text-3xl" />
												{/if}
											</div>
										</div>
									</div>

									<!-- Card Content -->
									<div class="p-6">
										<div class="flex items-start justify-between mb-2">
											<h3 class="text-lg font-semibold text-white line-clamp-2 flex-1">
												{production.title}
											</h3>
											{#if production.year}
												<span class="text-gray-500 text-xs ml-2 flex-shrink-0">{production.year}</span>
											{/if}
										</div>

										<p class="text-gray-400 text-sm mb-4 line-clamp-2">
											{production.description}
										</p>

										<!-- Meta Info -->
										<div class="flex items-center gap-4 text-gray-500 text-xs mb-4">
											{#if production.episodes}
												<span class="flex items-center gap-1">
													<Icon icon="mdi:playlist-play" />
													{production.episodes}
												</span>
											{/if}
											{#if production.issues}
												<span class="flex items-center gap-1">
													<Icon icon="mdi:book-multiple" />
													{production.issues}
												</span>
											{/if}
											{#if production.platform}
												<span class="flex items-center gap-1">
													<Icon icon="mdi:devices" />
													{production.platform}
												</span>
											{/if}
											{#if production.duration}
												<span class="flex items-center gap-1">
													<Icon icon="mdi:clock-outline" />
													{production.duration}
												</span>
											{/if}
											{#if production.count}
												<span class="flex items-center gap-1">
													<Icon icon="mdi:folder-multiple" />
													{production.count}
												</span>
											{/if}
										</div>

										<!-- Tags -->
										{#if production.tags && production.tags.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each production.tags.slice(0, 3) as tag}
													<span class="bg-gray-700/50 text-gray-300 px-2 py-1 text-xs rounded">{tag}</span>
												{/each}
											</div>
										{/if}
									</div>
								</article>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<!-- Coming Soon / In Development -->
		{@const upcomingProductions = productions.filter(p => p.productionStatus === 'in_development' || p.productionStatus === 'in_production')}
		{#if upcomingProductions.length > 0}
			<section class="bg-gradient-to-br from-orange-900/20 via-[var(--neu-bg)] to-red-900/20 py-16">
				<div class="container mx-auto px-4">
					<div class="text-center mb-12">
						<h2 class="text-3xl font-bold text-white mb-4">On the Horizon</h2>
						<p class="text-gray-400 max-w-2xl mx-auto">
							Upcoming projects and works in progress
						</p>
					</div>

					<div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
						{#each upcomingProductions as project}
							<div class="neu-card p-6 flex items-start gap-4">
								<div class="flex-shrink-0 w-12 h-12 rounded-full bg-orange-600/20 flex items-center justify-center">
									<Icon icon={getCategoryIcon(project.category)} class="text-orange-400 text-2xl" />
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-1">
										<h3 class="text-lg font-semibold text-white">{project.title}</h3>
										<span class="px-2 py-0.5 text-xs rounded-full {getStatusColor(project.status)}">{project.status}</span>
									</div>
									<p class="text-gray-400 text-sm mb-2">{project.type}</p>
									<p class="text-gray-500 text-sm">{project.description}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- Newsletter / Updates CTA with Dynamic Social Links -->
		<section class="subsection-gradient-dark subsection-accent-blue relative py-16">
			<div class="container mx-auto px-4 text-center">
				<Icon icon="mdi:bell-ring-outline" class="text-orange-400 text-5xl mb-4 mx-auto" />
				<h2 class="text-3xl font-bold text-white mb-4">Stay Updated</h2>
				<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
					Be the first to know when new productions drop. Follow for updates on releases, behind-the-scenes content, and exclusive previews.
				</p>

				<div class="flex flex-wrap justify-center gap-4">
					{#if socialLinks.length > 0}
						{#each socialLinks as social}
							<a
								href={social.url}
								target="_blank"
								rel="noopener noreferrer"
								class="neu-button px-6 py-3 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2"
							>
								<Icon icon={social.icon} class="text-xl" style="color: {social.color}" />
								{social.name}
							</a>
						{/each}
					{:else}
						<!-- Fallback static links -->
						<a href="#" class="neu-button px-6 py-3 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2">
							<Icon icon="mdi:youtube" class="text-xl text-red-500" />
							YouTube
						</a>
						<a href="#" class="neu-button px-6 py-3 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2">
							<Icon icon="mdi:twitter" class="text-xl text-blue-400" />
							Twitter
						</a>
						<a href="#" class="neu-button px-6 py-3 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2">
							<Icon icon="mdi:instagram" class="text-xl text-pink-500" />
							Instagram
						</a>
					{/if}
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.productions-section {
		/* Container styles */
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 3rem;
		line-clamp: 2;
	}

	/* Neumorphic card styles (fallback if not in global CSS) */
	.neu-card {
		background: var(--neu-bg, #2a2d35);
		border-radius: 16px;
		box-shadow:
			8px 8px 16px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-8px -8px 16px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-filter-button {
		background: var(--neu-bg, #2a2d35);
		box-shadow:
			4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-button {
		background: var(--neu-bg, #2a2d35);
		border-radius: 50px;
		box-shadow:
			6px 6px 12px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-6px -6px 12px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
		transition: all 0.2s ease;
	}

	.neu-button-primary {
		border-radius: 50px;
		box-shadow:
			6px 6px 12px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-6px -6px 12px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}
</style>
