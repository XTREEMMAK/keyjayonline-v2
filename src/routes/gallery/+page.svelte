<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';
	import Swal from 'sweetalert2';

	let {
		data
	} = $props();

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);
	let visibleElements = $state(new Set());
	let masonryContainer = $state();
	let loadingMore = $state(false);
	let selectedGallery = $state(data.filters.gallery);
	let selectedTags = $state(data.filters.tags);
	let currentPage = $state(data.filters.page);
	let allPhotos = $state([...data.photos]);
	let isInfiniteScrollEnabled = $state(true);
	let lastScrollY = $state(0);

	// Masonry layout configuration
	const columnWidths = { base: 280, gap: 16 };
	let columns = $state([]);
	let containerWidth = $state(0);
	let numColumns = $state(3);

	// Helper function to get optimal column count based on container width
	function calculateColumns(width) {
		if (width < 640) return 1;      // mobile
		if (width < 1024) return 2;     // tablet
		if (width < 1280) return 3;     // desktop
		if (width < 1536) return 4;     // large desktop
		return 5;                        // xl desktop
	}

	// Initialize masonry layout
	function initializeMasonry() {
		if (!masonryContainer || !browser) return;
		
		containerWidth = masonryContainer.offsetWidth;
		numColumns = calculateColumns(containerWidth);
		
		// Initialize empty columns
		columns = Array(numColumns).fill(null).map(() => []);
		
		// Distribute photos across columns
		allPhotos.forEach((photo, index) => {
			const columnIndex = getShortestColumn();
			const photoWithIndex = { ...photo, originalIndex: index };
			columns[columnIndex].push(photoWithIndex);
		});
		
		// Trigger reactivity
		columns = [...columns];
	}

	// Get column with least height (for optimal distribution)
	function getShortestColumn() {
		let shortestIndex = 0;
		let shortestHeight = Infinity;
		
		columns.forEach((column, index) => {
			const columnHeight = column.reduce((sum, photo) => {
				// Estimate height based on aspect ratio
				const aspectRatio = photo.photo?.width && photo.photo?.height ? 
					photo.photo.height / photo.photo.width : 1;
				return sum + (columnWidths.base * aspectRatio) + columnWidths.gap;
			}, 0);
			
			if (columnHeight < shortestHeight) {
				shortestHeight = columnHeight;
				shortestIndex = index;
			}
		});
		
		return shortestIndex;
	}

	// Add new photos to masonry layout
	function addPhotosToMasonry(newPhotos) {
		newPhotos.forEach((photo, index) => {
			const columnIndex = getShortestColumn();
			const photoWithIndex = { ...photo, originalIndex: allPhotos.length + index };
			columns[columnIndex].push(photoWithIndex);
		});
		
		// Trigger reactivity
		columns = [...columns];
	}

	// Load more photos (infinite scroll)
	async function loadMorePhotos() {
		if (loadingMore || !data.pagination.hasNextPage) return;
		
		loadingMore = true;
		
		try {
			const nextPage = currentPage + 1;
			const response = await fetch(`/api/photos?page=${nextPage}&limit=${data.filters.limit}&gallery=${selectedGallery}&tags=${selectedTags.join(',')}`);
			const result = await response.json();
			
			if (result.photos && result.photos.length > 0) {
				allPhotos = [...allPhotos, ...result.photos];
				addPhotosToMasonry(result.photos);
				currentPage = nextPage;
				data.pagination = result.pagination;
			}
		} catch (error) {
			console.error('Error loading more photos:', error);
		} finally {
			loadingMore = false;
		}
	}

	// Open photo in modal
	function openPhotoModal(photo) {
		Swal.fire({
			html: `
				<div style="position: relative;">
					<img src="${photo.photo.url}" alt="${photo.alt_text}" style="width: 100%; height: auto; border-radius: 12px;" />
					${photo.title ? `<h3 style="color: white; margin-top: 16px; font-size: 1.25rem; font-weight: 600;">${photo.title}</h3>` : ''}
					${photo.description ? `<p style="color: #d1d5db; margin-top: 8px; line-height: 1.6;">${photo.description}</p>` : ''}
					${photo.location ? `
						<div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; color: #9ca3af;">
							<iconify-icon icon="mdi:map-marker"></iconify-icon>
							<span>${photo.location}</span>
						</div>
					` : ''}
					${photo.date_taken ? `
						<div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; color: #9ca3af;">
							<iconify-icon icon="mdi:calendar"></iconify-icon>
							<span>${new Date(photo.date_taken).toLocaleDateString()}</span>
						</div>
					` : ''}
				</div>
			`,
			showCloseButton: true,
			showConfirmButton: false,
			width: 'auto',
			maxWidth: '90vw',
			background: 'rgba(17, 24, 39, 0.95)',
			color: '#ffffff',
			customClass: {
				popup: 'photo-modal-popup'
			}
		});
	}

	// Filter functions
	function updateFilters() {
		const params = new URLSearchParams();
		if (selectedGallery !== 'all') params.set('gallery', selectedGallery);
		if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
		
		const newUrl = `/gallery${params.toString() ? '?' + params.toString() : ''}`;
		goto(newUrl);
	}

	// Handle scroll for infinite loading and parallax
	function handleScroll() {
		if (!browser) return;
		
		scrollY = window.scrollY;
		
		// Parallax effect for hero
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

		// Infinite scroll detection
		if (isInfiniteScrollEnabled && data.pagination.hasNextPage) {
			const scrollHeight = document.documentElement.scrollHeight;
			const scrollTop = window.scrollY;
			const clientHeight = window.innerHeight;
			
			if (scrollHeight - scrollTop - clientHeight < 1000) {
				loadMorePhotos();
			}
		}
		
		lastScrollY = scrollY;
	}

	// Handle window resize for responsive masonry
	function handleResize() {
		if (!masonryContainer || !browser) return;
		
		const newWidth = masonryContainer.offsetWidth;
		const newNumColumns = calculateColumns(newWidth);
		
		if (newNumColumns !== numColumns) {
			containerWidth = newWidth;
			numColumns = newNumColumns;
			initializeMasonry();
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

	// Photo element intersection observer for staggered animations
	function observePhoto(node, index) {
		return createIntersectionObserver(node, (isVisible) => {
			if (isVisible) {
				visibleElements = new Set([...visibleElements, `photo-${index}`]);
			}
		}, { threshold: 0.1, rootMargin: '100px' });
	}

	onMount(() => {
		if (!browser) return;

		// Initialize masonry layout
		setTimeout(initializeMasonry, 100);

		// Set up event listeners
		let scrollTicking = false;
		const throttledScrollHandler = () => {
			if (!scrollTicking) {
				requestAnimationFrame(() => {
					handleScroll();
					scrollTicking = false;
				});
				scrollTicking = true;
			}
		};

		let resizeTicking = false;
		const throttledResizeHandler = () => {
			if (!resizeTicking) {
				requestAnimationFrame(() => {
					handleResize();
					resizeTicking = false;
				});
				resizeTicking = true;
			}
		};

		window.addEventListener('scroll', throttledScrollHandler, { passive: true });
		window.addEventListener('resize', throttledResizeHandler, { passive: true });

		// Initial animations
		setTimeout(() => {
			titleAnimated = true;
		}, 500);

		return () => {
			window.removeEventListener('scroll', throttledScrollHandler);
			window.removeEventListener('resize', throttledResizeHandler);
		};
	});

	// Watch for data changes and reinitialize masonry
	$effect(() => {
		if (data.photos && allPhotos.length !== data.photos.length) {
			allPhotos = [...data.photos];
			setTimeout(initializeMasonry, 100);
		}
	});
</script>

<svelte:head>
	<title>Gallery - KEY JAY ONLINE</title>
	<meta name="description" content="Photo gallery showcasing moments, memories, and visual stories from KEY JAY's journey" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1200" 
				alt="Photography Gallery"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="gallery-title hero-title-responsive font-bold text-white" class:animate={titleAnimated}>
						GALLERY
					</h1>
					<p class="gallery-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Visual stories and moments captured through the lens
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
						<div class="text-3xl font-bold text-indigo-400 mb-2">{data.stats.totalPhotos}</div>
						<div class="text-gray-400 text-sm">Total Photos</div>
					</div>
					
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-purple-400 mb-2">{data.stats.totalGalleries}</div>
						<div class="text-gray-400 text-sm">Galleries</div>
					</div>
					
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-pink-400 mb-2">{data.stats.featuredCount}</div>
						<div class="text-gray-400 text-sm">Featured</div>
					</div>
					
					<div class="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
						<div class="text-3xl font-bold text-blue-400 mb-2">{data.stats.tagsCount}</div>
						<div class="text-gray-400 text-sm">Tags</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Gallery Filters -->
	<section class="bg-gray-800/30 py-8">
		<div class="container mx-auto px-4">
			<div class="max-w-6xl mx-auto">
				<!-- Gallery Filter -->
				<div class="mb-6">
					<div class="flex flex-wrap gap-2 justify-center">
						<button 
							class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
							class:bg-indigo-600={selectedGallery === 'all'}
							class:text-white={selectedGallery === 'all'}
							class:bg-gray-700={selectedGallery !== 'all'}
							class:text-gray-300={selectedGallery !== 'all'}
							onclick={() => { selectedGallery = 'all'; updateFilters(); }}
						>
							<iconify-icon icon="mdi:view-grid" class="text-sm"></iconify-icon>
							All Photos
						</button>
						
						{#each data.galleries as gallery}
							<button 
								class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
								class:bg-indigo-600={selectedGallery === gallery.slug}
								class:text-white={selectedGallery === gallery.slug}
								class:bg-gray-700={selectedGallery !== gallery.slug}
								class:text-gray-300={selectedGallery !== gallery.slug}
								onclick={() => { selectedGallery = gallery.slug; updateFilters(); }}
							>
								<iconify-icon icon="mdi:camera" class="text-sm"></iconify-icon>
								{gallery.name}
								{#if gallery.photo_count}
									<span class="text-xs bg-gray-600 rounded-full px-2 py-0.5">{gallery.photo_count}</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Tags Filter -->
				{#if data.photoTags.length > 0}
					<div class="flex justify-center">
						<div class="flex gap-2 flex-wrap max-w-4xl">
							{#each data.photoTags.slice(0, 10) as tag}
								<button 
									class="px-3 py-1 rounded-full text-xs font-medium transition-all duration-300"
									class:bg-purple-600={selectedTags.includes(tag.name)}
									class:text-white={selectedTags.includes(tag.name)}
									class:bg-gray-600={!selectedTags.includes(tag.name)}
									class:text-gray-300={!selectedTags.includes(tag.name)}
									onclick={() => {
										if (selectedTags.includes(tag.name)) {
											selectedTags = selectedTags.filter(t => t !== tag.name);
										} else {
											selectedTags = [...selectedTags, tag.name];
										}
										updateFilters();
									}}
								>
									#{tag.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Featured Photos -->
	{#if data.featuredPhotos.length > 0 && selectedGallery === 'all' && selectedTags.length === 0}
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
						Featured Photos
					</h2>
					<p class="text-gray-400 max-w-2xl mx-auto">
						Highlighted moments and memories worth showcasing
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{#each data.featuredPhotos as photo, i}
						<article 
							class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer group"
							onclick={() => openPhotoModal(photo)}
							use:observeElement={'featured-' + i}
						>
							<div 
								class="opacity-0 translate-y-8 transition-all duration-700"
								class:opacity-100={visibleElements.has('featured-' + i)}
								class:translate-y-0={visibleElements.has('featured-' + i)}
								style="transition-delay: {i * 100}ms"
							>
								<div class="aspect-square relative overflow-hidden">
									<img 
										src={photo.photo.medium} 
										alt={photo.alt_text}
										class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
										loading="lazy"
									/>
									<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
									<div class="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
										{#if photo.title}
											<h3 class="text-white font-semibold text-sm mb-1">{photo.title}</h3>
										{/if}
										{#if photo.location}
											<p class="text-gray-300 text-xs flex items-center gap-1">
												<iconify-icon icon="mdi:map-marker"></iconify-icon>
												{photo.location}
											</p>
										{/if}
									</div>
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

	<!-- Masonry Photo Grid -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12" use:observeElement={'gallery-title'}>
				<h2 class="text-3xl font-bold text-white mb-4"
					class:opacity-100={visibleElements.has('gallery-title')}
					class:translate-y-0={visibleElements.has('gallery-title')}
					class:opacity-0={!visibleElements.has('gallery-title')}
					class:translate-y-8={!visibleElements.has('gallery-title')}
					class:transition-all={true}
					class:duration-700={true}
				>
					{selectedGallery === 'all' ? 'All Photos' : data.galleries.find(g => g.slug === selectedGallery)?.name || 'Photos'}
				</h2>
				<p class="text-gray-400">
					{data.stats.totalPhotos} photos available
					{#if selectedTags.length > 0}
						• Tagged: {selectedTags.join(', ')}
					{/if}
				</p>
			</div>

			{#if allPhotos.length > 0}
				<!-- Masonry Container -->
				<div bind:this={masonryContainer} class="masonry-container">
					{#each columns as column, columnIndex}
						<div class="masonry-column">
							{#each column as photo, photoIndex}
								<article 
									class="masonry-item group cursor-pointer"
									onclick={() => openPhotoModal(photo)}
									use:observePhoto={photo.originalIndex}
								>
									<div 
										class="opacity-0 translate-y-4 transition-all duration-500"
										class:opacity-100={visibleElements.has(`photo-${photo.originalIndex}`)}
										class:translate-y-0={visibleElements.has(`photo-${photo.originalIndex}`)}
										style="transition-delay: {(photoIndex % 3) * 100}ms"
									>
										<div class="relative overflow-hidden rounded-xl bg-gray-700">
											<img 
												src={photo.photo.medium} 
												alt={photo.alt_text}
												class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
												loading="lazy"
											/>
											<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											
											{#if photo.title || photo.location}
												<div class="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
													{#if photo.title}
														<h3 class="text-white font-semibold text-sm mb-1">{photo.title}</h3>
													{/if}
													{#if photo.location}
														<p class="text-gray-300 text-xs flex items-center gap-1">
															<iconify-icon icon="mdi:map-marker"></iconify-icon>
															{photo.location}
														</p>
													{/if}
												</div>
											{/if}

											{#if photo.featured}
												<div class="absolute top-4 left-4">
													<span class="bg-yellow-600/20 text-yellow-400 px-2 py-1 text-xs rounded-full border border-yellow-600/30">Featured</span>
												</div>
											{/if}
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/each}
				</div>

				<!-- Loading indicator -->
				{#if loadingMore}
					<div class="text-center py-8">
						<div class="inline-flex items-center gap-2 text-gray-400">
							<iconify-icon icon="mdi:loading" class="text-xl animate-spin"></iconify-icon>
							Loading more photos...
						</div>
					</div>
				{/if}

				<!-- Load more button (fallback if infinite scroll fails) -->
				{#if data.pagination.hasNextPage && !loadingMore}
					<div class="text-center mt-12">
						<button 
							onclick={() => loadMorePhotos()}
							class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-300"
						>
							Load More Photos
						</button>
					</div>
				{/if}
			{:else}
				<div class="text-center py-20">
					<iconify-icon icon="mdi:camera-off" class="text-gray-400 text-6xl mb-4"></iconify-icon>
					<h3 class="text-xl font-semibold text-white mb-2">No Photos Found</h3>
					<p class="text-gray-400 mb-6">Try adjusting your gallery or tag filters</p>
					<button 
						onclick={() => { selectedGallery = 'all'; selectedTags = []; updateFilters(); }}
						class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-300"
					>
						Show All Photos
					</button>
				</div>
			{/if}
		</div>
	</section>
</div>

<style>
	.gallery-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.gallery-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.gallery-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.gallery-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}

	.masonry-container {
		display: flex;
		gap: 16px;
		width: 100%;
	}

	.masonry-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.masonry-item {
		break-inside: avoid;
		margin-bottom: 16px;
	}

	:global(.photo-modal-popup) {
		border-radius: 16px !important;
	}

	/* Responsive masonry adjustments */
	@media (max-width: 640px) {
		.masonry-container {
			gap: 12px;
		}
		
		.masonry-column {
			gap: 12px;
		}
		
		.masonry-item {
			margin-bottom: 12px;
		}
	}
</style>