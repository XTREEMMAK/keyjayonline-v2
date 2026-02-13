<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';
	import { navbarVisible } from '$lib/stores/navigation.js';
	import { showSectionSubNav, hideSectionSubNav, techActiveTab, portalScrollLock, setPortalScrollLock, sectionModalOpen, sentinelRecheck, recheckSentinels } from '$lib/stores/stickyNav.js';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';
	import { letterPulse } from '$lib/actions/letterAnimation.js';
	import { sectionData, loadSection } from '$lib/stores/sectionData.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade, fly, slide } from 'svelte/transition';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';

	const titleLetters = 'Tech'.split('');

	// Tab state
	let activeTab = $state('projects');

	// Sticky sub-nav state
	let subNavSentinelRef = $state(null);
	let bottomSentinelRef = $state(null);
	let subNavSticky = $state(false);
	let topSentinelAbove = $state(false);
	let bottomSentinelReached = $state(false);

	// Legend toggle
	let showLegend = $state(false);

	// Detail modal state
	let detailModalOpen = $state(false);
	let selectedProject = $state(null);

	// Derived state from store
	const sectionState = $derived($sectionData.tech);
	const techData = $derived(sectionState.data || {});
	const projects = $derived(techData.projects || []);
	const techStack = $derived(techData.techStack || []);
	const showcaseItems = $derived(techData.showcase || []);
	const isLoading = $derived(sectionState.status === 'loading');
	const isLoaded = $derived(sectionState.status === 'loaded');
	const hasError = $derived(sectionState.status === 'error');

	// Featured project
	const featuredProject = $derived(
		projects.find(p => p.featured) || null
	);

	// Non-featured projects for the grid
	const gridProjects = $derived(
		projects.filter(p => p !== featuredProject)
	);

	// Group tech stack by category
	const stackByCategory = $derived(() => {
		const groups = {};
		for (const item of techStack) {
			const cat = item.category || 'other';
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(item);
		}
		return groups;
	});

	// Category display names
	const categoryLabels = {
		systems_networking: 'Systems & Networking',
		infrastructure: 'Infrastructure & Virtualization',
		web_development: 'Web Development',
		languages: 'Languages & Scripting',
		ai_automation: 'AI & Automation',
		hardware: 'Hardware & Home Automation',
		services: 'Platforms & Services'
	};

	// Category icons
	const categoryIcons = {
		systems_networking: 'mdi:lan',
		infrastructure: 'mdi:server',
		web_development: 'mdi:web',
		languages: 'mdi:code-braces',
		ai_automation: 'mdi:robot',
		hardware: 'mdi:desktop-tower',
		services: 'mdi:cloud'
	};

	// Category display order
	const categoryOrder = [
		'systems_networking', 'infrastructure', 'web_development',
		'languages', 'ai_automation', 'hardware', 'services'
	];

	onMount(async () => {
		if (browser) {
			try {
				await loadSection('tech');
			} catch (err) {
				console.error('Failed to load tech section:', err);
			}
		}
	});

	function getStatusColor(status) {
		switch (status) {
			case 'active': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'in_development': return 'text-yellow-400 border-yellow-600/30 bg-yellow-600/20';
			case 'maintained': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			case 'archived': return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}

	function getStatusLabel(status) {
		switch (status) {
			case 'active': return 'Active';
			case 'in_development': return 'In Development';
			case 'maintained': return 'Maintained';
			case 'archived': return 'Archived';
			default: return status;
		}
	}

	function handleCardClick(project) {
		selectedProject = project;
		detailModalOpen = true;
	}

	function closeDetailModal() {
		detailModalOpen = false;
		selectedProject = null;
	}

	function handleModalClose() {
		popModalState();
		closeDetailModal();
	}

	function handleKeydown(event) {
		if (!detailModalOpen) return;
		if (event.key === 'Escape') {
			handleModalClose();
		}
	}

	// Modal lifecycle
	$effect(() => {
		if (detailModalOpen && browser) {
			pushModalState('tech-project-detail');
			const cleanupPopstate = setupPopstateHandler('tech-project-detail', () => {
				closeDetailModal();
			});
			window.addEventListener('keydown', handleKeydown);
			document.body.style.overflow = 'hidden';

			return () => {
				cleanupPopstate();
				window.removeEventListener('keydown', handleKeydown);
				document.body.style.overflow = '';
			};
		} else if (browser) {
			window.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		}
	});

	// Hide sticky nav portal when modal is open (modals are trapped in z-10 stacking context)
	$effect(() => {
		sectionModalOpen.set(detailModalOpen);
	});

	// Top sentinel observer (140px offset so sticky nav persists longer when scrolling up)
	$effect(() => {
		if (browser && subNavSentinelRef) {
			const cleanup = createIntersectionObserver(
				subNavSentinelRef,
				(isVisible, entry) => {
					if (portalScrollLock) return;
					topSentinelAbove = !isVisible && entry.boundingClientRect.bottom <= 140;
				},
				{ threshold: 0, rootMargin: '-140px 0px 0px 0px' }
			);
			return cleanup;
		}
	});

	// Bottom sentinel observer — hides portal when user scrolls past content into CTAs
	$effect(() => {
		if (browser && bottomSentinelRef) {
			const cleanup = createIntersectionObserver(
				bottomSentinelRef,
				(isVisible, entry) => {
					if (portalScrollLock) return;
					bottomSentinelReached = entry.boundingClientRect.top <= 0;
				},
				{ threshold: 0, rootMargin: '0px' }
			);
			return cleanup;
		}
	});

	// Reactive portal state: show when top sentinel above AND still in content area
	$effect(() => {
		if (topSentinelAbove && !bottomSentinelReached) {
			subNavSticky = true;
			showSectionSubNav('tech');
		} else {
			subNavSticky = false;
			hideSectionSubNav();
		}
	});

	// Manual sentinel recheck — triggered via store after scroll lock releases or content changes
	$effect(() => {
		$sentinelRecheck;
		if (!browser) return;
		requestAnimationFrame(() => {
			if (portalScrollLock) return;
			if (subNavSentinelRef) {
				const rect = subNavSentinelRef.getBoundingClientRect();
				topSentinelAbove = !!(rect.bottom <= 140);
			}
			if (bottomSentinelRef) {
				const rect = bottomSentinelRef.getBoundingClientRect();
				bottomSentinelReached = !!(rect.top <= 0);
			}
		});
	});

	function scrollToContent() {
		if (!browser || !subNavSentinelRef) return;
		setPortalScrollLock(true);
		requestAnimationFrame(() => {
			const portalBar = document.querySelector('.section-sticky-nav');
			const offset = portalBar ? portalBar.offsetHeight : 0;
			const absTop = subNavSentinelRef.getBoundingClientRect().top + window.scrollY;
			window.scrollTo({ top: absTop - offset + 2, behavior: 'smooth' });
			setTimeout(() => {
				setPortalScrollLock(false);
				recheckSentinels();
			}, 600);
		});
	}

	function switchTab(tab) {
		if (tab === activeTab) return;
		activeTab = tab;
		scrollToContent();
	}

	// Sync activeTab with sticky nav store (bidirectional)
	$effect(() => {
		techActiveTab.set(activeTab);
	});
	// Store subscription: only sync state, no scroll (portal handles its own scroll)
	const unsubTab = techActiveTab.subscribe(t => {
		if (t !== activeTab) {
			activeTab = t;
			tick().then(() => recheckSentinels());
		}
	});

	onDestroy(() => {
		hideSectionSubNav();
		unsubTab();
	});
</script>

<!-- Project Detail Modal -->
{#if detailModalOpen && selectedProject}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8"
		role="dialog"
		aria-modal="true"
		aria-label={selectedProject.name || 'Project details'}
		transition:fade={{ duration: 200 }}
	>
		<div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick={handleModalClose} onkeydown={(e) => e.key === 'Escape' && handleModalClose()} role="button" tabindex="-1"></div>

		<div
			class="relative w-full max-w-full md:max-w-3xl h-full md:h-auto max-h-full md:max-h-[90vh] bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f172a] rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<!-- Close button -->
			<div class="absolute top-4 right-4 z-20">
				<button
					onclick={handleModalClose}
					class="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/30 hover:bg-black/50"
					title="Close (Escape)"
				>
					<Icon icon="mdi:close" class="text-2xl" />
				</button>
			</div>

			<div class="overflow-y-auto flex-1 custom-scrollbar">
				<!-- Hero Image -->
				{#if selectedProject.cover_image}
					<div class="relative aspect-video md:aspect-[21/9] overflow-hidden">
						<img
							src={selectedProject.cover_image}
							alt={selectedProject.name}
							class="w-full h-full object-cover"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent"></div>
						<div class="absolute top-4 left-4">
							<span class="px-3 py-1 text-xs font-semibold rounded-full border {getStatusColor(selectedProject.project_status)}">
								{getStatusLabel(selectedProject.project_status)}
							</span>
						</div>
					</div>
				{:else}
					<div class="relative aspect-video md:aspect-[21/9] bg-gradient-to-br from-cyan-900/40 to-blue-900/40 flex items-center justify-center">
						<Icon icon="mdi:code-tags" class="text-cyan-400/30 text-8xl" />
						<div class="absolute top-4 left-4">
							<span class="px-3 py-1 text-xs font-semibold rounded-full border {getStatusColor(selectedProject.project_status)}">
								{getStatusLabel(selectedProject.project_status)}
							</span>
						</div>
					</div>
				{/if}

				<!-- Content -->
				<div class="p-6 md:p-8 -mt-12 relative">
					<h2 class="text-3xl md:text-4xl font-bold text-white mb-2">{selectedProject.name}</h2>

					{#if selectedProject.tagline}
						<p class="text-gray-400 text-base italic mb-4">{selectedProject.tagline}</p>
					{/if}

					<!-- Tech Stack Pills -->
					{#if selectedProject.tech_stack?.length > 0}
						<div class="flex flex-wrap gap-2 mb-6">
							{#each selectedProject.tech_stack as tech}
								<span class="px-3 py-1 text-xs rounded-full bg-cyan-600/20 text-cyan-300 border border-cyan-600/30">
									{tech}
								</span>
							{/each}
						</div>
					{/if}

					<!-- Description -->
					{#if selectedProject.description}
						<div class="prose prose-invert prose-sm max-w-none mb-8 text-gray-300 leading-relaxed">
							{@html sanitizeHtml(selectedProject.description, {
								ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'code', 'pre'],
								ALLOWED_ATTR: ['href', 'target', 'rel']
							})}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex flex-wrap gap-3">
						{#if selectedProject.project_url}
							<a
								href={selectedProject.project_url}
								target="_blank"
								rel="noopener noreferrer"
								class="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2"
							>
								<Icon icon="mdi:open-in-new" class="text-xl" />
								View Live
							</a>
						{/if}
						{#if selectedProject.repo_url}
							<a
								href={selectedProject.repo_url}
								target="_blank"
								rel="noopener noreferrer"
								class="px-6 py-3 neu-button text-white rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2"
							>
								<Icon icon="mdi:github" class="text-xl" />
								Source Code
							</a>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ============================================================================ -->
<!-- TECH SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="tech-section min-h-screen section-gradient-tech gradient-animated relative">
	<SectionBackground section="tech" opacity={0.12} />

	<!-- Section Header with Cyan Accent -->
	<div class="pt-16 md:pt-28 pb-8 text-center relative">
		<div class="absolute inset-0 bg-gradient-to-b from-cyan-600/20 via-blue-500/5 to-transparent pointer-events-none"></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			{#each titleLetters as letter, i}
				<span
					use:letterPulse={{ delay: i * 60 }}
					class="bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent inline-block"
				>{letter}</span>
			{/each}
		</h1>
		<p class="text-lg text-cyan-200/70 relative">Infrastructure, development & projects</p>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-32">
			<div class="text-center">
				<Icon icon="mdi:loading" class="text-cyan-400 text-5xl animate-spin mb-4 mx-auto" />
				<p class="text-gray-400">Loading tech section...</p>
			</div>
		</div>
	{:else if hasError}
		<div class="flex items-center justify-center py-32">
			<div class="text-center">
				<Icon icon="mdi:alert-circle" class="text-red-400 text-5xl mb-4 mx-auto" />
				<p class="text-gray-400">Failed to load tech section. Please try again later.</p>
			</div>
		</div>
	{:else}
		<!-- Tab Navigation (in-flow, stays rendered — already scrolled off-screen when portal activates) -->
		<section
			class="bg-[var(--neu-bg)]/95 backdrop-blur-sm py-6 z-30"
		>
			<div class="container mx-auto px-4">
				<div class="flex justify-center gap-3">
					<button
						onclick={() => switchTab('stack')}
						class="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2
							{activeTab === 'stack'
								? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'}"
					>
						<Icon icon="mdi:layers-triple" class="text-lg" />
						Stack
					</button>
					<button
						onclick={() => switchTab('projects')}
						class="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2
							{activeTab === 'projects'
								? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'}"
					>
						<Icon icon="mdi:rocket-launch" class="text-lg" />
						Projects
					</button>
					<button
						onclick={() => switchTab('showcase')}
						class="px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2
							{activeTab === 'showcase'
								? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white scale-105'
								: 'neu-filter-button text-gray-300 hover:text-white hover:scale-105'}"
					>
						<Icon icon="mdi:view-gallery" class="text-lg" />
						Showcase
					</button>
				</div>
			</div>
		</section>

		<!-- Sentinel for sticky sub-nav detection (below sub-nav so portal only triggers after it fully exits viewport) -->
		<div bind:this={subNavSentinelRef} class="sub-nav-sentinel h-px w-full"></div>

		<!-- Tab Content with Animated Transitions -->
		{#key activeTab}
			<div in:fade={{ duration: 250, delay: 50 }} out:fade={{ duration: 150 }}>
				<!-- Stack Tab -->
				{#if activeTab === 'stack'}
					<section class="bg-gradient-to-b from-[var(--neu-bg)]/95 via-cyan-950/10 to-[var(--neu-bg)]/95 py-12 relative">
						<div class="container mx-auto px-4">
							{#if techStack.length === 0}
								<!-- Empty State -->
								<div class="text-center py-16">
									<Icon icon="mdi:layers-triple" class="text-gray-600 text-6xl mb-4 mx-auto" />
									<h3 class="text-xl text-gray-400 mb-2">Tech stack coming soon</h3>
									<p class="text-gray-500">Technologies and infrastructure will appear here.</p>
								</div>
							{:else}
								<!-- Proficiency Legend -->
								<div class="max-w-5xl mx-auto mb-8">
									<button
										onclick={() => showLegend = !showLegend}
										class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-400 transition-colors"
									>
										<Icon icon="mdi:information-outline" class="text-base" />
										What do the proficiency dots mean?
										<Icon icon={showLegend ? 'mdi:chevron-up' : 'mdi:chevron-down'} class="text-base" />
									</button>
									{#if showLegend}
										<div class="mt-3 neu-card p-4 text-sm text-gray-400 space-y-2" transition:slide={{ duration: 200 }}>
											<div class="flex items-center gap-3">
												<div class="flex gap-1">
													{#each Array(5) as _}<div class="w-2 h-2 rounded-full bg-cyan-400"></div>{/each}
												</div>
												<span>Expert — daily use, deep comfort</span>
											</div>
											<div class="flex items-center gap-3">
												<div class="flex gap-1">
													{#each Array(5) as _, i}<div class="w-2 h-2 rounded-full {i < 4 ? 'bg-cyan-400' : 'bg-gray-700'}"></div>{/each}
												</div>
												<span>Strong — use regularly, confident</span>
											</div>
											<div class="flex items-center gap-3">
												<div class="flex gap-1">
													{#each Array(5) as _, i}<div class="w-2 h-2 rounded-full {i < 3 ? 'bg-cyan-400' : 'bg-gray-700'}"></div>{/each}
												</div>
												<span>Capable — used in real projects</span>
											</div>
											<div class="flex items-center gap-3">
												<div class="flex gap-1">
													{#each Array(5) as _, i}<div class="w-2 h-2 rounded-full {i < 2 ? 'bg-cyan-400' : 'bg-gray-700'}"></div>{/each}
												</div>
												<span>Familiar — some experience</span>
											</div>
											<div class="flex items-center gap-3">
												<div class="flex gap-1">
													{#each Array(5) as _, i}<div class="w-2 h-2 rounded-full {i < 1 ? 'bg-cyan-400' : 'bg-gray-700'}"></div>{/each}
												</div>
												<span>Exposure — learning</span>
											</div>
										</div>
									{/if}
								</div>

								<div class="max-w-5xl mx-auto space-y-12">
									{#each categoryOrder.filter(cat => stackByCategory()[cat]?.length > 0) as category}
										{@const items = stackByCategory()[category]}
										<div>
											<div class="flex items-center gap-3 mb-6">
												<Icon icon={categoryIcons[category] || 'mdi:dots-horizontal'} class="text-cyan-400 text-2xl" />
												<h2 class="text-2xl font-bold text-white">{categoryLabels[category] || category}</h2>
												<div class="flex-1 h-px bg-gradient-to-r from-cyan-600/30 to-transparent"></div>
											</div>

											<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
												{#each items as item (item.id)}
													<div class="neu-card p-5 flex items-start gap-4 hover:scale-[1.02] transition-transform duration-300">
														<!-- Icon -->
														<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 flex items-center justify-center">
															{#if item.icon}
																<Icon icon={item.icon} class="text-cyan-400 text-2xl" />
															{:else}
																<Icon icon={categoryIcons[category] || 'mdi:code-tags'} class="text-cyan-400/60 text-2xl" />
															{/if}
														</div>

														<div class="flex-1 min-w-0">
															<div class="flex items-center gap-2 mb-1">
																{#if item.url}
																	<a href={item.url} target="_blank" rel="noopener noreferrer" class="text-white font-semibold hover:text-cyan-400 transition-colors truncate">
																		{item.name}
																	</a>
																	<Icon icon="mdi:open-in-new" class="text-gray-500 text-xs flex-shrink-0" />
																{:else}
																	<span class="text-white font-semibold truncate">{item.name}</span>
																{/if}
															</div>

															{#if item.description}
																<p class="text-gray-400 text-sm line-clamp-2 mb-2">{item.description}</p>
															{/if}

															<!-- Proficiency Dots -->
															{#if item.proficiency > 0}
																<div class="flex gap-1">
																	{#each Array(5) as _, idx}
																		<div class="w-2 h-2 rounded-full {idx < item.proficiency ? 'bg-cyan-400' : 'bg-gray-700'}"></div>
																	{/each}
																</div>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</section>

				<!-- Projects Tab -->
				{:else if activeTab === 'projects'}
					<section class="bg-gradient-to-b from-[var(--neu-bg)]/95 via-cyan-950/10 to-[var(--neu-bg)]/95 py-12 relative">
						<div class="container mx-auto px-4">
							{#if projects.length === 0}
								<!-- Empty State -->
								<div class="text-center py-16">
									<Icon icon="mdi:code-tags" class="text-gray-600 text-6xl mb-4 mx-auto" />
									<h3 class="text-xl text-gray-400 mb-2">No projects yet</h3>
									<p class="text-gray-500">Projects will appear here once added.</p>
								</div>
							{:else}
								<!-- Featured Project -->
								{#if featuredProject}
									<div class="max-w-6xl mx-auto mb-12">
										<div class="neu-card overflow-hidden">
											<div class="grid grid-cols-1 lg:grid-cols-2">
												<div class="aspect-video lg:aspect-auto relative">
													{#if featuredProject.cover_image}
														<img
															src={featuredProject.cover_image}
															alt={featuredProject.name}
															class="w-full h-full object-cover"
															loading="lazy"
														/>
													{:else}
														<div class="w-full h-full min-h-[240px] bg-gradient-to-br from-cyan-900/40 to-blue-900/40 flex items-center justify-center">
															<Icon icon="mdi:code-tags" class="text-cyan-400/30 text-8xl" />
														</div>
													{/if}
													<div class="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent lg:bg-gradient-to-t lg:from-black/40 lg:via-transparent lg:to-transparent"></div>
													<div class="absolute top-4 left-4">
														<span class="px-3 py-1 text-xs font-semibold rounded-full border {getStatusColor(featuredProject.project_status)}">
															{getStatusLabel(featuredProject.project_status)}
														</span>
													</div>
												</div>

												<div class="p-8 lg:p-12 flex flex-col justify-center">
													<h2 class="text-3xl lg:text-4xl font-bold text-white mb-4">{featuredProject.name}</h2>
													{#if featuredProject.tagline}
														<p class="text-gray-300 text-lg mb-6 leading-relaxed">{featuredProject.tagline}</p>
													{/if}

													{#if featuredProject.tech_stack?.length > 0}
														<div class="flex flex-wrap gap-2 mb-6">
															{#each featuredProject.tech_stack as tech}
																<span class="px-3 py-1 text-xs rounded-full bg-cyan-600/20 text-cyan-300 border border-cyan-600/30">{tech}</span>
															{/each}
														</div>
													{/if}

													<div class="flex flex-wrap gap-3">
														{#if featuredProject.project_url}
															<a href={featuredProject.project_url} target="_blank" rel="noopener noreferrer" class="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center gap-2">
																<Icon icon="mdi:open-in-new" class="text-xl" />
																View Live
															</a>
														{/if}
														{#if featuredProject.repo_url}
															<a href={featuredProject.repo_url} target="_blank" rel="noopener noreferrer" class="neu-button px-6 py-3 text-white rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2">
																<Icon icon="mdi:github" class="text-xl" />
																Source Code
															</a>
														{/if}
														<button
															onclick={() => handleCardClick(featuredProject)}
															class="neu-button px-6 py-3 text-white rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2"
														>
															<Icon icon="mdi:information-outline" class="text-xl" />
															Details
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
								{/if}

								<!-- Project Cards Grid -->
								{#if gridProjects.length > 0}
									<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
										{#each gridProjects as project (project.id)}
											<button
												class="neu-card overflow-hidden hover:scale-[1.02] transition-transform duration-300 group cursor-pointer text-left w-full border-none bg-transparent p-0"
												onclick={() => handleCardClick(project)}
											>
												<div class="aspect-video relative">
													{#if project.cover_image}
														<img
															src={project.cover_image}
															alt={project.name}
															class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
															loading="lazy"
														/>
													{:else}
														<div class="w-full h-full bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
															<Icon icon="mdi:code-tags" class="text-cyan-400/20 text-6xl" />
														</div>
													{/if}
													<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:scale-110 transition-transform duration-500"></div>

													<div class="absolute top-4 left-4">
														<span class="px-2 py-1 text-xs rounded-full border {getStatusColor(project.project_status)}">
															{getStatusLabel(project.project_status)}
														</span>
													</div>

													<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
														<div class="bg-white/20 rounded-full p-4">
															<Icon icon="mdi:information-outline" class="text-white text-3xl" />
														</div>
													</div>
												</div>

												<div class="p-6">
													<h3 class="text-lg font-semibold text-white mb-1 line-clamp-1">{project.name}</h3>
													{#if project.tagline}
														<p class="text-gray-400 text-sm mb-4 line-clamp-2">{project.tagline}</p>
													{/if}

													{#if project.tech_stack?.length > 0}
														<div class="flex flex-wrap gap-1.5">
															{#each project.tech_stack.slice(0, 4) as tech}
																<span class="px-2 py-0.5 text-xs rounded-full bg-cyan-600/15 text-cyan-400/80 border border-cyan-600/20">{tech}</span>
															{/each}
															{#if project.tech_stack.length > 4}
																<span class="px-2 py-0.5 text-xs rounded-full bg-gray-600/15 text-gray-400">+{project.tech_stack.length - 4}</span>
															{/if}
														</div>
													{/if}
												</div>
											</button>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					</section>

				<!-- Showcase Tab -->
				{:else if activeTab === 'showcase'}
					<section class="bg-gradient-to-b from-[var(--neu-bg)]/95 via-cyan-950/10 to-[var(--neu-bg)]/95 py-12 relative">
						<div class="container mx-auto px-4">
							{#if showcaseItems.length === 0}
								<!-- Empty State -->
								<div class="text-center py-16">
									<Icon icon="mdi:view-gallery" class="text-gray-600 text-6xl mb-4 mx-auto" />
									<h3 class="text-xl text-gray-400 mb-2">Showcase coming soon</h3>
									<p class="text-gray-500">Lab builds, videos, and more will appear here.</p>
								</div>
							{:else}
								<div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
									{#each showcaseItems as item (item.id)}
										<div class="neu-card overflow-hidden">
											{#if item.image}
												<div class="aspect-video relative">
													<img src={item.image} alt={item.title} class="w-full h-full object-cover" loading="lazy" />
												</div>
											{:else if item.video_url}
												<div class="aspect-video">
													<iframe
														src={item.video_url}
														title={item.title}
														class="w-full h-full"
														frameborder="0"
														allowfullscreen
													></iframe>
												</div>
											{:else}
												<div class="aspect-video bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center">
													<Icon icon={item.type === 'photo' ? 'mdi:image-outline' : 'mdi:play-circle-outline'} class="text-cyan-400/30 text-6xl" />
												</div>
											{/if}
											<div class="p-5">
												<h3 class="text-lg font-semibold text-white mb-2">{item.title}</h3>
												{#if item.description}
													<p class="text-gray-400 text-sm">{item.description}</p>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</section>
				{/if}
			</div>
		{/key}

		<!-- Bottom sentinel: hides sticky nav when scrolling into CTA sections -->
		<div bind:this={bottomSentinelRef} class="sub-nav-bottom-sentinel h-px w-full"></div>

		<!-- J2IT Service CTA -->
		<section class="bg-gradient-to-b from-[var(--neu-bg)] via-[var(--neu-bg-light)]/50 to-[var(--neu-bg)] py-16 relative">
			<div class="container mx-auto px-4">
				<div class="max-w-2xl mx-auto text-center">
					<h2 class="text-3xl font-bold text-white mb-4">Need IT Services?</h2>
					<p class="text-gray-400 mb-8">
						Desktop support, network setup, server configuration, and infrastructure consulting for small businesses.
					</p>
					<a
						href="https://j2it.us"
						target="_blank"
						rel="noopener noreferrer"
						class="neu-button-primary inline-block px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300"
					>
						Visit J2IT
					</a>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.section-gradient-tech {
		background: linear-gradient(
			135deg,
			rgba(8, 145, 178, 0.15) 0%,
			rgba(30, 58, 138, 0.1) 50%,
			rgba(67, 56, 202, 0.15) 100%
		);
	}

	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(6, 182, 212, 0.6) rgba(31, 41, 55, 0.3);
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(31, 41, 55, 0.2);
		border-radius: 3px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4));
		border-radius: 3px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(6, 182, 212, 0.6), rgba(59, 130, 246, 0.6));
	}
</style>
