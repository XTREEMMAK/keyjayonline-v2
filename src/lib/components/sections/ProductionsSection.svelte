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
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { loadPlaylist, showPlayer, expandPlayer } from '$lib/stores/musicPlayer.js';
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
	const socialLinks = $derived(productionsData.socialLinks || []);
	const testimonials = $derived(productionsData.testimonials || []);
	const isLoading = $derived(sectionState.status === 'loading');
	const isLoaded = $derived(sectionState.status === 'loaded');
	const hasError = $derived(sectionState.status === 'error');

	// Build categories from API response + default "All"
	const apiCategories = $derived(productionsData.categories || []);
	const displayCategories = $derived([
		{ id: 'all', label: 'All', icon: 'mdi:view-grid', slug: 'all' },
		...apiCategories.map(cat => ({
			id: cat.slug,
			label: cat.name,
			icon: cat.icon || 'mdi:folder',
			slug: cat.slug
		}))
	]);

	// Get featured production
	const featuredProduction = $derived(
		productions.find(p => p.featured && (p.productionStatus === 'in_production' || p.productionStatus === 'in_development')) ||
		productions.find(p => p.featured) ||
		productions[0] ||
		null
	);

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

	// Open gallery viewer — fetches albums from a gallery by ID
	async function openContentViewer(galleryId, title = '') {
		if (!galleryId) return;

		viewerTitle = title;
		viewerLoading = true;
		viewerOpen = true;

		try {
			const response = await fetch(`/api/galleries/${galleryId}/albums`);
			if (response.ok) {
				const data = await response.json();
				viewerPages = data.albums || [];
			}
		} catch (err) {
			console.error('Failed to load gallery albums:', err);
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

	// Load and play an audio playlist in the persistent music player
	async function playProductionPlaylist(playlistId) {
		if (!playlistId) return;
		try {
			const response = await fetch(`/api/playlists/${playlistId}/tracks`);
			if (!response.ok) throw new Error('Failed to load playlist');
			const data = await response.json();
			if (data.tracks?.length > 0) {
				loadPlaylist(data.tracks, 0, 'production');
				showPlayer();
				expandPlayer();
			}
		} catch (err) {
			console.error('Failed to play production playlist:', err);
		}
	}

	// Handle unified production actions from detail modal
	// Keep detail modal open underneath (z-50 vs z-99999) so user returns to it after closing viewer
	function handleProductionAction(action) {
		switch (action.actionType) {
			case 'viewer':
				openContentViewer(action.galleryId, selectedProduction?.title || action.label);
				break;
			case 'audio_player':
				playProductionPlaylist(action.playlistId);
				break;
		}
	}

	// Handle actions from featured production section (no detail modal context)
	function handleFeaturedAction(action) {
		switch (action.actionType) {
			case 'viewer':
				openContentViewer(action.galleryId, featuredProduction?.title || action.label);
				break;
			case 'audio_player':
				playProductionPlaylist(action.playlistId);
				break;
		}
	}
</script>

<!-- Production Detail Modal -->
<ProductionDetailModal
	isOpen={detailModalOpen}
	production={selectedProduction}
	onClose={closeDetailModal}
	onAction={handleProductionAction}
/>

<!-- Gallery Viewer Modal -->
<ContentViewerModal
	isOpen={viewerOpen}
	pages={viewerPages}
	title={viewerTitle}
	loading={viewerLoading}
	onClose={closeContentViewer}
	manageOverlayStore={!detailModalOpen}
/>

<!-- ============================================================================ -->
<!-- PRODUCTIONS SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="productions-section min-h-screen section-gradient-productions gradient-animated relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="productions" opacity={0.12} />

	<!-- Section Header with Orange Accent -->
	<div class="pt-16 md:pt-28 pb-8 text-center relative">
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
			<section class="bg-gradient-to-b from-[var(--neu-bg-dark)]/95 via-orange-950/15 to-[var(--neu-bg-dark)]/95 py-16 relative">
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
										loading="lazy"
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
									<div class="flex items-center gap-3 mb-4 flex-wrap">
										{#each featuredProduction.categories as cat}
											<span class="flex items-center gap-1.5 text-orange-400 font-semibold uppercase tracking-wider text-sm">
												<Icon icon={cat.icon} class="text-2xl" />
												{cat.name}
											</span>
										{/each}
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
												{featuredProduction.year}{#if featuredProduction.yearEnd && featuredProduction.yearEnd !== featuredProduction.year}–{featuredProduction.yearEnd}{/if}
											</span>
										{/if}
										{#if featuredProduction.episodes}
											<span class="flex items-center gap-2">
												<Icon icon="mdi:playlist-play" class="text-lg" />
												{featuredProduction.episodes}
											</span>
										{/if}
									</div>

									<div class="flex flex-col items-center gap-4">
										{#each (featuredProduction.actions || []).filter(a => a.isPrimary) as action}
											{#if action.actionType === 'external_link'}
												<a href={action.url} target="_blank" rel="noopener noreferrer" class="neu-button-primary px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
													<Icon icon={action.icon} class="text-xl" />
													{action.label}
												</a>
											{:else}
												<button onclick={() => handleFeaturedAction(action)} class="neu-button-primary px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
													<Icon icon={action.icon} class="text-xl" />
													{action.label}
												</button>
											{/if}
										{/each}
										{#if (featuredProduction.actions || []).filter(a => !a.isPrimary).length > 0}
											<p class="text-xs text-gray-400 uppercase tracking-wider">Additional Links</p>
											<div class="w-full flex flex-wrap justify-center gap-3">
												{#each (featuredProduction.actions || []).filter(a => !a.isPrimary) as action}
													{#if action.actionType === 'external_link'}
														<a href={action.url} target="_blank" rel="noopener noreferrer" class="neu-button px-5 py-2.5 text-white rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm">
															<Icon icon={action.icon} class="text-xl" style={action.color ? `color: ${action.color}` : ''} />
															{action.label}
														</a>
													{:else}
														<button onclick={() => handleFeaturedAction(action)} class="neu-button px-5 py-2.5 text-white rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm">
															<Icon icon={action.icon} class="text-xl" />
															{action.label}
														</button>
													{/if}
												{/each}
											</div>
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
		<section class="bg-gradient-to-b from-[var(--neu-bg)]/95 via-amber-950/10 to-[var(--neu-bg)]/95 py-12 relative">
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
							<div class="mix-item {production.categorySlugs}">
								<article
									class="neu-card overflow-hidden hover:scale-[1.02] transition-transform duration-300 group cursor-pointer"
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
											loading="lazy"
										/>
										<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:scale-110 transition-transform duration-500"></div>

										<!-- Category Badges -->
										<div class="absolute top-4 left-4 flex flex-wrap gap-1">
											{#each production.categories as cat}
												<span class="px-2 py-1 text-xs rounded-full border flex items-center gap-1"
													style="color: {cat.color}; border-color: {cat.color}4D; background-color: {cat.color}33;">
													<Icon icon={cat.icon} class="text-sm" />
													{cat.name}
												</span>
											{/each}
										</div>

										<!-- Status Badge -->
										<div class="absolute top-4 right-4">
											<span class="px-2 py-1 text-xs rounded-full {getStatusColor(production.status)}">{production.status}</span>
										</div>

										<!-- Play/View Overlay -->
										<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
											<div class="bg-white/20 rounded-full p-4">
												{#if production.category.includes('video') || production.category.includes('audio')}
													<Icon icon="mdi:play" class="text-white text-3xl" />
												{:else if production.category.includes('comic')}
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
												<span class="text-gray-500 text-xs ml-2 flex-shrink-0">{production.year}{#if production.yearEnd && production.yearEnd !== production.year}–{production.yearEnd}{/if}</span>
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
											{#if production.duration}
												<span class="flex items-center gap-1">
													<Icon icon="mdi:clock-outline" />
													{production.duration}
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
									<Icon icon={project.categoryIcon} class="text-orange-400 text-2xl" />
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

		<!-- Testimonials Section -->
		{#if testimonials.length > 0}
			<section class="bg-gradient-to-br from-orange-900/20 via-[var(--neu-bg)] to-amber-900/20 py-16">
				<div class="container mx-auto px-4">
					<div class="text-center mb-12">
						<h2 class="text-3xl font-bold text-white mb-4">Client Testimonials</h2>
						<p class="text-gray-400 max-w-2xl mx-auto">
							What clients say about working with me on their production projects
						</p>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{#each testimonials as testimonial}
							<div class="neu-card p-8 hover:scale-[1.02] transition-all duration-300">
								<div class="flex items-center mb-4">
									{#each Array(testimonial.rating) as _}
										<Icon icon="mdi:star" class="text-yellow-400 text-lg" />
									{/each}
								</div>
								<blockquote class="text-gray-300 mb-6 italic testimonial-content">
									{@html sanitizeHtml(testimonial.quote, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })}
								</blockquote>
								<div class="border-t border-gray-700 pt-4 flex items-center gap-4">
									{#if testimonial.avatarUrl}
										<img
											src={testimonial.avatarUrl}
											alt={testimonial.name}
											class="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
										/>
									{:else}
										<div class="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white font-bold text-xl">
											{testimonial.name?.charAt(0) || '?'}
										</div>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="text-white font-semibold">
											{testimonial.name}{#if testimonial.title}<span class="text-gray-400 font-normal">, {testimonial.title}</span>{/if}
										</div>
										{#if testimonial.company}
											<div class="text-gray-300 text-sm">{testimonial.company}</div>
										{/if}
										<div class="flex items-center gap-2 text-gray-400 text-sm">
											{#if testimonial.projectName}
												<span class="text-orange-400">Re: {testimonial.projectName}</span>
												{#if testimonial.date}<span>•</span>{/if}
											{/if}
											{#if testimonial.date}
												<span>{testimonial.date}</span>
											{/if}
										</div>
									</div>
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
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Mobile: Show more lines for descriptions */
	@media (max-width: 768px) {
		.line-clamp-2 {
			-webkit-line-clamp: 4;
			line-clamp: 4;
		}
	}

	/* Desktop: Keep 2 lines */
	@media (min-width: 769px) {
		.line-clamp-2 {
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}
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

	/* Style HTML content from WYSIWYG editor */
	.testimonial-content :global(p) {
		margin-bottom: 0.5rem;
	}
	.testimonial-content :global(p:last-child) {
		margin-bottom: 0;
	}
	.testimonial-content :global(strong),
	.testimonial-content :global(b) {
		font-weight: 600;
		color: #fff;
	}
	.testimonial-content :global(em),
	.testimonial-content :global(i) {
		font-style: italic;
	}
	.testimonial-content :global(a) {
		color: #fb923c;
		text-decoration: underline;
	}
	.testimonial-content :global(a:hover) {
		color: #fdba74;
	}
</style>
