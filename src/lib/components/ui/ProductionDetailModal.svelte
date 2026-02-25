<script>
	/**
	 * ProductionDetailModal - Contained modal for viewing production details
	 *
	 * Features:
	 * - Centered, max-width modal with scrollable content
	 * - Hero image with status badge
	 * - Description and rich content
	 * - Video/media embed support
	 * - Directus-driven action buttons (primary/secondary from external_links)
	 * - Gallery viewer integration
	 * - Keyboard support (escape to close)
	 * - Share button for shareable links
	 */

	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { fade, fly, slide } from 'svelte/transition';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import VideoEmbed from '$lib/components/media/VideoEmbed.svelte';
	import { generateShareUrl, copyShareUrl } from '$lib/utils/shareLinks.js';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { getExternalLinkIcon } from '$lib/utils/externalLinks.js';
	import { groupCreditsByRole, PRODUCTIONS_ROLE_PRIORITY, COMICS_ROLE_PRIORITY, countSocialIcons, SOCIAL_ICON_OVERFLOW_THRESHOLD } from '$lib/utils/creditGrouping.js';
	import SkeletonImage from '$lib/components/ui/SkeletonImage.svelte';
	import ActionPickerModal from '$lib/components/ui/ActionPickerModal.svelte';
	// Props
	let {
		isOpen = false,
		production = null,
		onClose = () => {},
		onAction = (action) => {},
		loading = false
	} = $props();

	// Share state
	let shareSuccess = $state(false);

	// Tab state
	let activeTab = $state('details');

	// Credits: separate tab if >5, otherwise inline in Details
	const credits = $derived(production?.credits || []);
	const creditsInSeparateTab = $derived(credits.length > 5);

	const hasDetailsContent = $derived(
		!!(production?.description || production?.roles || (!creditsInSeparateTab && credits.length > 0) || production?.toolsMedium)
	);
	const hasStoryContent = $derived(
		!!(production?.behindTheScenes || production?.outcome)
	);
	// Embeds (O2M array from API, already sorted featured-first)
	const embeds = $derived(production?.embeds || []);
	const hasMediaContent = $derived(embeds.length > 0);
	const hasCreditsTab = $derived(creditsInSeparateTab && credits.length > 0);
	const isComic = $derived(production?.category?.includes('comic'));
	const creditsPriority = $derived(isComic ? COMICS_ROLE_PRIORITY : PRODUCTIONS_ROLE_PRIORITY);
	const groupedCredits = $derived(
		creditsInSeparateTab ? groupCreditsByRole(credits, creditsPriority) : []
	);

	// Credits UI state
	let expandedGroups = $state({});
	let socialOverlayOpen = $state({});
	let selectedCredit = $state(null);

	function toggleGroup(role) {
		expandedGroups = { ...expandedGroups, [role]: expandedGroups[role] === false ? true : false };
	}

	function toggleSocialOverlay(key) {
		socialOverlayOpen = { ...socialOverlayOpen, [key]: !socialOverlayOpen[key] };
	}

	const availableTabs = $derived(() => {
		const tabs = [];
		if (hasDetailsContent) tabs.push({ id: 'details', label: 'Details', icon: 'mdi:information-outline' });
		if (hasCreditsTab) tabs.push({ id: 'credits', label: 'Credits', icon: 'mdi:account-group' });
		if (hasStoryContent) tabs.push({ id: 'story', label: 'Story', icon: 'mdi:book-open-variant' });
		if (hasMediaContent) tabs.push({ id: 'media', label: 'Media', icon: 'mdi:play-circle-outline' });
		return tabs;
	});

	const showTabs = $derived(availableTabs().length >= 2);

	// Unified production actions (viewer, audio_player, external_link)
	const actions = $derived(production?.actions || []);
	const primaryActions = $derived(actions.filter(a => a.isPrimary));
	const secondaryActions = $derived(actions.filter(a => !a.isPrimary));
	const hasActions = $derived(actions.length > 0);

	// Group primary actions by type for dropdown condensing
	const viewerActions = $derived(primaryActions.filter(a => a.actionType === 'viewer'));
	const audioActions = $derived(primaryActions.filter(a => a.actionType === 'audio_player'));
	const videoActions = $derived(primaryActions.filter(a => a.actionType === 'video_player'));

	// Action picker modal state
	let actionPickerOpen = $state(false);
	let actionPickerTitle = $state('');
	let actionPickerActions = $state([]);
	let actionPickerColor = $state('orange');

	function openActionPicker(title, actions, color) {
		actionPickerTitle = title;
		actionPickerActions = actions;
		actionPickerColor = color;
		actionPickerOpen = true;
	}

	function closeActionPicker() {
		actionPickerOpen = false;
	}

	function handlePickerSelect(action) {
		onAction(action);
	}

	// Close modal
	function handleClose() {
		closeActionPicker();
		expandedGroups = {};
		socialOverlayOpen = {};
		selectedCredit = null;
		popModalState(); // Go back in history if we pushed a state
		onClose();
	}

	// Switch active tab
	function switchTab(tabId) {
		selectedCredit = null;
		activeTab = tabId;
	}

	// Handle keyboard navigation
	function handleKeydown(event) {
		if (!isOpen) return;

		if (event.key === 'Escape') {
			// Don't close if ActionPickerModal is open on top
			if (actionPickerOpen) return;
			// Don't close if ContentViewerModal is open on top
			let viewerOpen = false;
			contentViewerOpen.subscribe(v => viewerOpen = v)();
			if (viewerOpen) return;
			handleClose();
		}
	}

	// Handle share action
	async function handleShare() {
		if (!production?.slug) {
			console.warn('Cannot share - production has no slug');
			return;
		}
		const shareUrl = generateShareUrl('production', { slug: production.slug });
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccess = true;
			setTimeout(() => (shareSuccess = false), 2000);
		}
	}

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			// Reset to first available tab
			const tabs = availableTabs();
			if (tabs.length > 0) {
				activeTab = tabs[0].id;
			}

			// Add keyboard listener and history handling
			if (browser) {
				// Push history state for back button handling
				pushModalState('production-detail');

				// Setup popstate listener for back button (modal-aware)
				const cleanupPopstate = setupPopstateHandler('production-detail', () => {
					onClose();
				});

				window.addEventListener('keydown', handleKeydown);
				// Prevent body scroll
				document.body.style.overflow = 'hidden';

				return () => {
					cleanupPopstate();
					window.removeEventListener('keydown', handleKeydown);
					document.body.style.overflow = '';
				};
			}
		} else {
			// Reset credits UI state on any close path (X, back button, etc.)
			expandedGroups = {};
			socialOverlayOpen = {};
			selectedCredit = null;
			// Remove keyboard listener
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
				// Restore body scroll
				document.body.style.overflow = '';
			}
		}
	});

	// Scroll to detail header when credit detail opens
	$effect(() => {
		if (selectedCredit && browser) {
			requestAnimationFrame(() => {
				const detailView = document.getElementById('credit-detail-view');
				if (detailView) {
					detailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			});
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (browser) {
				window.removeEventListener('keydown', handleKeydown);
				document.body.style.overflow = '';
			}
		};
	});

	function getStatusColor(status) {
		switch (status) {
			case 'Released':
			case 'Complete':
				return 'bg-green-600/80 text-green-100';
			case 'In Production':
			case 'In Development':
				return 'bg-yellow-600/80 text-yellow-100';
			case 'Ongoing':
				return 'bg-blue-600/80 text-blue-100';
			default:
				return 'bg-gray-600/80 text-gray-100';
		}
	}

</script>

<!-- Action Picker Modal (for grouped galleries/playlists) -->
<ActionPickerModal
	isOpen={actionPickerOpen}
	title={actionPickerTitle}
	actions={actionPickerActions}
	accentColor={actionPickerColor}
	onSelect={handlePickerSelect}
	onClose={closeActionPicker}
/>

{#if isOpen && production}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8"
		role="dialog"
		aria-modal="true"
		aria-label={production.title || 'Production details'}
		transition:fade={{ duration: 200 }}
	>
		<!-- Click outside to close -->
		<div class="absolute inset-0 bg-black/90" onclick={handleClose}></div>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-full md:max-w-4xl h-full md:h-auto max-h-full md:max-h-[90vh] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a] rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<!-- Header Buttons -->
			<div class="absolute top-4 right-4 z-20 flex items-center gap-2">
				<!-- Share button -->
				{#if production?.slug}
					<button
						onclick={handleShare}
						class="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/30 hover:bg-black/50"
						title={shareSuccess ? 'Link copied!' : 'Share'}
					>
						<Icon icon={shareSuccess ? 'mdi:check' : 'mdi:share-variant'} class="text-2xl" />
					</button>
				{/if}
				<!-- Close button -->
				<button
					onclick={handleClose}
					class="p-2 text-white/70 hover:text-white transition-colors rounded-full bg-black/30 hover:bg-black/50"
					title="Close (Escape)"
				>
					<Icon icon="mdi:close" class="text-2xl" />
				</button>
			</div>

			<!-- Scrollable content -->
			<div class="overflow-y-auto flex-1 custom-scrollbar overscroll-contain" style="transform: translateZ(0); -webkit-overflow-scrolling: touch;">
				{#if loading}
					<!-- Loading state -->
					<div class="flex flex-col items-center justify-center gap-4 py-32 text-white/70">
						<Icon icon="mdi:loading" class="text-5xl animate-spin" />
						<p>Loading...</p>
					</div>
				{:else}
					<!-- Hero Image -->
					<div class="relative aspect-video md:aspect-[21/9] overflow-hidden">
						<SkeletonImage
							src={production.image || 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200'}
							alt={production.title}
							class="w-full h-full"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent"
						></div>

						<!-- Status Badge -->
						<div class="absolute top-4 left-4">
							<span class="px-3 py-1 text-sm font-semibold rounded-full {getStatusColor(production.status)}">
								{production.status}
							</span>
						</div>

					</div>

					<!-- Content -->
					<div class="p-6 md:p-8 -mt-12 relative">
						<!-- Title & Meta -->
						<div class="mb-6">
							<h2 class="text-3xl md:text-4xl font-bold text-white mb-2">
								{production.title}
							</h2>

							{#if production.tagline}
								<p class="text-gray-400 text-base italic mb-3">{production.tagline}</p>
							{/if}

							<!-- Meta Info -->
							<div class="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
								{#each (production.categories || []) as cat}
									<span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gray-300">
										<Icon icon={cat.icon} class="text-lg" />
										{cat.name}
									</span>
								{/each}
								{#if production.year}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:calendar" class="text-lg" />
										{production.year}{#if production.yearEnd && production.yearEnd !== production.year}–{production.yearEnd}{/if}
									</span>
								{/if}
								{#if production.episodes}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:playlist-play" class="text-lg" />
										{production.episodes}
									</span>
								{/if}
								{#if production.duration}
									<span class="flex items-center gap-1.5">
										<Icon icon="mdi:clock-outline" class="text-lg" />
										{production.duration}
									</span>
								{/if}
							</div>
						</div>

						<!-- Tags -->
						{#if production.tags && production.tags.length > 0}
							<div class="flex flex-wrap gap-2 mb-6">
								{#each production.tags as tag}
									<span class="bg-white/10 text-gray-300 px-3 py-1 text-sm rounded-full">
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						<!-- Snippet: Social icons (inline or overflow) -->
						{#snippet creditSocialIcons(credit, key)}
							{#if credit.website_url || (credit.social_links && credit.social_links.length > 0)}
								{#if countSocialIcons(credit) >= SOCIAL_ICON_OVERFLOW_THRESHOLD}
									<!-- Overflow: info button -->
									<button
										onclick={() => toggleSocialOverlay(key)}
										class="flex-shrink-0 ml-auto text-gray-400 hover:text-white transition-colors p-1"
										title="View links"
									>
										<Icon icon="mdi:account-details" class="text-lg" />
									</button>
									<!-- Social overlay -->
									{#if socialOverlayOpen[key]}
										<div
											class="absolute inset-0 flex items-center justify-center gap-3 flex-wrap rounded-lg z-10 p-3 bg-slate-900/85 backdrop-blur-sm social-overlay-mobile"
											transition:fade={{ duration: 200 }}
										>
											{#if credit.website_url}
												<a href={credit.website_url} target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors" title="Website">
													<Icon icon="mdi:web" class="text-xl" />
												</a>
											{/if}
											{#if credit.social_links}
												{#each credit.social_links as social}
													{#if social.network_url}
														<a href={social.network_url} target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors" title={social.network || 'Link'}>
															<Icon icon={getExternalLinkIcon({ url: social.network_url, label: social.network })} class="text-lg" />
														</a>
													{/if}
												{/each}
											{/if}
											<button
												onclick={() => toggleSocialOverlay(key)}
												class="absolute top-1 right-1 text-gray-400 hover:text-white transition-colors p-0.5"
												title="Close"
											>
												<Icon icon="mdi:close" class="text-sm" />
											</button>
										</div>
									{/if}
								{:else}
									<!-- Inline icons -->
									<div class="flex items-center gap-1.5 flex-shrink-0 ml-auto">
										{#if credit.website_url}
											<a href={credit.website_url} target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors" title="Website">
												<Icon icon="mdi:web" class="text-lg" />
											</a>
										{/if}
										{#if credit.social_links}
											{#each credit.social_links as social}
												{#if social.network_url}
													<a href={social.network_url} target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors" title={social.network || 'Link'}>
														<Icon icon={getExternalLinkIcon({ url: social.network_url, label: social.network })} class="text-base" />
													</a>
												{/if}
											{/each}
										{/if}
									</div>
								{/if}
							{/if}
						{/snippet}

						<!-- Snippet: Credits List (inline, ≤5 credits) -->
						{#snippet creditsList()}
							<div class="flex flex-col gap-3">
								{#each credits as credit, idx}
									<div class="relative flex items-center gap-3 bg-white/5 rounded-lg p-3 transition-all duration-200">
										{#if credit.profile_image}
											<img
												src={credit.profile_image}
												alt={credit.name}
												class="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer border-2 border-transparent hover:border-blue-500/70 hover:scale-110 transition-all duration-200"
												onclick={(e) => { e.stopPropagation(); selectedCredit = credit; }}
											/>
										{:else}
											<div
												class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-blue-500/30 hover:scale-110 transition-all duration-200"
												onclick={(e) => { e.stopPropagation(); selectedCredit = credit; }}
											>
												<Icon icon="mdi:account" class="text-xl text-gray-400" />
											</div>
										{/if}
										<div class="flex-1 min-w-0">
											<p class="text-white font-medium text-sm">{credit.name}</p>
											<p class="text-gray-400 text-xs">
												{credit.roles ? credit.roles.map(r => r.title).join(', ') : credit.role}
											</p>
											{#if credit.additional_info}
												<p class="text-gray-500 text-xs italic mt-0.5">{credit.additional_info}</p>
											{/if}
										</div>
										{@render creditSocialIcons(credit, `inline-${idx}`)}
									</div>
								{/each}
							</div>
						{/snippet}

						<!-- Snippet: Grouped Credits List (separate tab, >5 credits) -->
						{#snippet groupedCreditsList()}
							<div class="flex flex-col gap-4">
								{#each groupedCredits as group, gIdx}
									<div>
										<!-- Group header -->
										<button
											onclick={() => toggleGroup(group.role)}
											class="w-full flex justify-between items-center px-4 py-3 bg-blue-500/15 border border-blue-500/30 rounded-lg text-white font-semibold text-sm cursor-pointer transition-all duration-200 hover:bg-blue-500/25"
										>
											<span class="flex items-center gap-2">
												<Icon icon="mdi:account-group" class="text-lg text-blue-500" />
												{group.role}
												<span class="text-gray-400 font-normal">({group.credits.length})</span>
											</span>
											<Icon
												icon="mdi:chevron-down"
												class="text-xl text-gray-400 transition-transform duration-300 {expandedGroups[group.role] === false ? '' : 'rotate-180'}"
											/>
										</button>
										<!-- Group content -->
										{#if expandedGroups[group.role] !== false}
											<div class="pt-3 flex flex-col gap-2" transition:slide={{ duration: 250 }}>
												{#each group.credits as credit, cIdx}
													<div class="relative flex items-center gap-3 bg-white/5 rounded-lg p-3 border-l-3 border-blue-500 transition-all duration-200">
														{#if credit.profile_image}
															<img
																src={credit.profile_image}
																alt={credit.name}
																class="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-blue-500/30 cursor-pointer hover:border-blue-500/70 hover:scale-110 transition-all duration-200"
																onclick={(e) => { e.stopPropagation(); selectedCredit = credit; }}
															/>
														{:else}
															<div
																class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-blue-500/35 hover:scale-110 transition-all duration-200"
																onclick={(e) => { e.stopPropagation(); selectedCredit = credit; }}
															>
																<Icon icon="mdi:account" class="text-xl text-blue-500" />
															</div>
														{/if}
														<div class="flex-1 min-w-0">
															<p class="text-white font-medium text-sm">{credit.name}</p>
															<p class="text-gray-400 text-xs">{credit.displayRole}</p>
															{#if credit.additional_info}
																<p class="text-gray-500 text-xs italic mt-0.5">{credit.additional_info}</p>
															{/if}
														</div>
														{@render creditSocialIcons(credit, `group-${gIdx}-${cIdx}`)}
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/snippet}

						<!-- Snippet: Credit Detail View (drill-down) -->
						{#snippet creditDetailView(credit)}
							<div class="space-y-6" id="credit-detail-view">
								<!-- Back button -->
								<button
									onclick={() => selectedCredit = null}
									class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
								>
									<Icon icon="mdi:arrow-left" class="text-lg" />
									Back to Credits
								</button>

								<!-- Profile header -->
								<div class="flex flex-col items-center text-center">
									{#if credit.profile_image}
										<img
											src={credit.profile_image}
											alt={credit.name}
											class="w-24 h-24 rounded-full object-cover border-3 border-blue-500/40 mb-4"
										/>
									{:else}
										<div class="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
											<Icon icon="mdi:account" class="text-4xl text-blue-500" />
										</div>
									{/if}
									<h3 class="text-xl font-bold text-white">{credit.name}</h3>
									<p class="text-gray-400 text-sm mt-1">
										{credit.roles ? credit.roles.map(r => r.title).join(', ') : credit.role}
									</p>
									{#if credit.additional_info}
										<p class="text-gray-500 text-sm italic mt-1">{credit.additional_info}</p>
									{/if}
								</div>

								<!-- Bio -->
								{#if credit.bio}
									<div class="border-t border-white/10 pt-4">
										<h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Biography</h4>
									<div class="text-gray-300 leading-relaxed text-sm [&_p]:mb-3 [&_p:last-child]:mb-0">{@html sanitizeHtml(credit.bio)}</div>
									</div>
								{/if}

								<!-- Links -->
								{#if credit.website_url || (credit.social_links && credit.social_links.length > 0)}
									<div class="border-t border-white/10 pt-4">
										<h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Links</h4>
										<div class="flex flex-col gap-2">
											{#if credit.website_url}
												<a
													href={credit.website_url}
													target="_blank"
													rel="noopener noreferrer"
													class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
												>
													<Icon icon="mdi:web" class="text-lg text-gray-400 group-hover:text-white" />
													<span class="text-gray-300 group-hover:text-white text-sm truncate flex-1">{credit.website_url.replace(/^https?:\/\//, '')}</span>
													<Icon icon="mdi:open-in-new" class="text-sm text-gray-500" />
												</a>
											{/if}
											{#if credit.social_links}
												{#each credit.social_links as social}
													{#if social.network_url}
														<a
															href={social.network_url}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
														>
															<Icon icon={getExternalLinkIcon({ url: social.network_url, label: social.network })} class="text-lg text-gray-400 group-hover:text-white" />
															<span class="text-gray-300 group-hover:text-white text-sm truncate flex-1">{social.network || social.network_url.replace(/^https?:\/\//, '')}</span>
															<Icon icon="mdi:open-in-new" class="text-sm text-gray-500" />
														</a>
													{/if}
												{/each}
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/snippet}

						<!-- Snippet: Details Panel -->
						{#snippet detailsPanel()}
							{#if hasDetailsContent}
								<div class="space-y-6 tab-sections">
									{#if production.description}
										<div>
											<p class="text-gray-300 text-lg leading-relaxed">
												{production.description}
											</p>
										</div>
									{/if}

									{#if production.roles}
										<div class="border-t border-white/10 pt-6">
											<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Icon icon="mdi:account-edit" class="text-lg" />
												My Role
											</h3>
											<div class="production-rich-content text-gray-300 leading-relaxed">
												{@html sanitizeHtml(production.roles, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })}
											</div>
										</div>
									{/if}

									{#if !creditsInSeparateTab && credits.length > 0}
										<div class="border-t border-white/10 pt-6">
											{#if selectedCredit}
												{@render creditDetailView(selectedCredit)}
											{:else}
												<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
													<Icon icon="mdi:account-group" class="text-lg" />
													Additional Credits
												</h3>
												{@render creditsList()}
											{/if}
										</div>
									{/if}

									{#if production.toolsMedium}
										<div class="border-t border-white/10 pt-6">
											<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Icon icon="mdi:tools" class="text-lg" />
												Tools & Medium
											</h3>
											<div class="production-rich-content text-gray-300 leading-relaxed">
												{@html sanitizeHtml(production.toolsMedium, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						{/snippet}

						<!-- Snippet: Credits Panel (when >5 credits, grouped by role) -->
						{#snippet creditsPanel()}
							{#if hasCreditsTab}
								{#if selectedCredit}
									<div class="space-y-6 tab-sections">
										{@render creditDetailView(selectedCredit)}
									</div>
								{:else}
									<div class="space-y-6 tab-sections">
										<div>
											<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
												<Icon icon="mdi:account-group" class="text-lg" />
												Credits ({credits.length})
											</h3>
											{@render groupedCreditsList()}
										</div>
									</div>
								{/if}
							{/if}
						{/snippet}

						<!-- Snippet: Story Panel -->
						{#snippet storyPanel()}
							{#if hasStoryContent}
								<div class="space-y-6 tab-sections">
									{#if production.behindTheScenes}
										<div class="border-t border-white/10 pt-6">
											<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Icon icon="mdi:camera-flip" class="text-lg" />
												Behind the Scenes
											</h3>
											<div class="production-rich-content text-gray-300 leading-relaxed">
												{@html sanitizeHtml(production.behindTheScenes, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })}
											</div>
										</div>
									{/if}

									{#if production.outcome}
										<div class="border-t border-white/10 pt-6">
											<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Icon icon="mdi:trophy-outline" class="text-lg" />
												Outcome
											</h3>
											<div class="production-rich-content text-gray-300 leading-relaxed">
												{@html sanitizeHtml(production.outcome, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						{/snippet}

						<!-- Snippet: Media Panel -->
						{#snippet mediaPanel()}
							{#if hasMediaContent}
								<div class="space-y-6 tab-sections">
									{#each embeds as embed, idx (embed.id)}
										<div>
											{#if embed.title}
												<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
													<Icon icon={embed.type === 'youtube' ? 'mdi:youtube' : 'mdi:play-circle-outline'} class="text-lg {embed.type === 'youtube' ? 'text-red-500' : 'text-blue-500'}" />
													{embed.title}
												</h3>
											{/if}
											<VideoEmbed url={embed.url} type={embed.type} title={embed.title || production.title} />
										</div>
										{#if idx < embeds.length - 1}
											<hr class="border-white/10" />
										{/if}
									{/each}
								</div>
							{/if}
						{/snippet}

						<!-- Tab Navigation -->
						{#if showTabs}
							<div class="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 overflow-x-auto scrollbar-hide">
								{#each availableTabs() as tab}
									<button
										onclick={() => switchTab(tab.id)}
										class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-200 {activeTab === tab.id
											? 'bg-gradient-to-r from-orange-600/80 to-red-600/80 text-white shadow-md shadow-orange-900/20'
											: 'text-gray-400 hover:text-gray-200 hover:bg-white/10'}"
									>
										<Icon icon={tab.icon} class="text-lg" />
										{tab.label}
									</button>
								{/each}
							</div>
						{/if}

						<!-- Tab Content / Detail Sections -->
						{#if hasDetailsContent || hasCreditsTab || hasStoryContent || hasMediaContent}
							<div class="mb-8">
								{#if !showTabs}
									{@render detailsPanel()}
									{@render creditsPanel()}
									{@render storyPanel()}
									{@render mediaPanel()}
								{:else}
									{#key activeTab}
										<div transition:fade={{ duration: 150 }}>
											{#if activeTab === 'details'}
												{@render detailsPanel()}
											{:else if activeTab === 'credits'}
												{@render creditsPanel()}
											{:else if activeTab === 'story'}
												{@render storyPanel()}
											{:else if activeTab === 'media'}
												{@render mediaPanel()}
											{/if}
										</div>
									{/key}
								{/if}
							</div>
						{/if}

						<!-- Action Footer -->
						{#if hasActions}
							<div class="border-t border-white/10 pt-6 mt-8">
								<!-- Primary Actions (grouped by type) -->
								{#if primaryActions.length > 0}
									<div class="flex flex-wrap justify-center gap-4 mb-6">
										<!-- Audio actions: single button or picker -->
										{#if audioActions.length === 1}
											<button
												onclick={() => onAction(audioActions[0])}
												class="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
											>
												<Icon icon={audioActions[0].icon} class="text-xl" />
												{audioActions[0].label}
											</button>
										{:else if audioActions.length > 1}
											<button
												onclick={() => openActionPicker('Listen', audioActions, 'green')}
												class="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
											>
												<Icon icon="mdi:headphones" class="text-xl" />
												Listen
											</button>
										{/if}
										<!-- Viewer actions: single button or picker -->
										{#if viewerActions.length === 1}
											<button
												onclick={() => onAction(viewerActions[0])}
												class="px-10 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30"
											>
												<Icon icon={viewerActions[0].icon} class="text-xl" />
												{viewerActions[0].label}
											</button>
										{:else if viewerActions.length > 1}
											<button
												onclick={() => openActionPicker('View', viewerActions, 'orange')}
												class="px-10 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30"
											>
												<Icon icon="mdi:image-multiple" class="text-xl" />
												View
											</button>
										{/if}
										<!-- Video actions: single button -->
										{#if videoActions.length >= 1}
											<button
												onclick={() => onAction(videoActions[0])}
												class="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
											>
												<Icon icon={videoActions[0].icon} class="text-xl" />
												{videoActions[0].label}
											</button>
										{/if}
										<!-- Primary external links (rendered directly) -->
										{#each primaryActions.filter(a => a.actionType === 'external_link') as action}
											<a
												href={action.url}
												target="_blank"
												rel="noopener noreferrer"
												class="px-10 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30"
											>
												<Icon icon={action.icon} class="text-xl" />
												{action.label}
											</a>
										{/each}
									</div>
								{/if}

								<!-- Secondary Actions -->
								{#if secondaryActions.length > 0}
									<div class="w-full text-center">
										<p class="text-xs text-gray-400 uppercase tracking-wider mb-3">Additional Links</p>
										<div class="flex flex-wrap justify-center gap-3">
											{#each secondaryActions as action}
												{#if action.actionType === 'external_link'}
													<a
														href={action.url}
														target="_blank"
														rel="noopener noreferrer"
														class="px-5 py-2.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-full transition-colors flex items-center gap-2 text-sm"
													>
														<Icon icon={action.icon} class="text-lg" style={action.color ? `color: ${action.color}` : ''} />
														{action.label}
													</a>
												{:else}
													<button
														onclick={() => onAction(action)}
														class="px-5 py-2.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-full transition-colors flex items-center gap-2 text-sm"
													>
														<Icon icon={action.icon} class="text-lg" />
														{action.label}
													</button>
												{/if}
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar styling */
	.custom-scrollbar::-webkit-scrollbar {
		width: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(15, 23, 42, 0.5);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, rgba(59, 130, 246, 0.6), rgba(139, 92, 246, 0.6));
		border-radius: 10px;
		border: 2px solid rgba(15, 23, 42, 0.5);
		transition: background 0.3s ease;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(180deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8));
	}

	/* Firefox scrollbar styling */
	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(59, 130, 246, 0.6) rgba(15, 23, 42, 0.5);
	}

	/* Rich content styling for WYSIWYG fields */
	.production-rich-content :global(p) {
		margin-bottom: 0.75rem;
	}

	.production-rich-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.production-rich-content :global(strong),
	.production-rich-content :global(b) {
		font-weight: 600;
		color: #fff;
	}

	.production-rich-content :global(a) {
		color: #fb923c;
		text-decoration: underline;
	}

	.production-rich-content :global(a:hover) {
		color: #fdba74;
	}

	.production-rich-content :global(ul) {
		padding-left: 1.5rem;
		margin-bottom: 0.75rem;
		list-style-type: disc;
	}

	.production-rich-content :global(ol) {
		padding-left: 1.5rem;
		margin-bottom: 0.75rem;
		list-style-type: decimal;
	}

	.production-rich-content :global(li) {
		margin-bottom: 0.25rem;
	}

	/* Tab section staggered slide-in animation */
	@keyframes sectionSlideIn {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.tab-sections > :global(*) {
		animation: sectionSlideIn 0.35s ease-out both;
	}

	.tab-sections > :global(:nth-child(1)) { animation-delay: 0.05s; }
	.tab-sections > :global(:nth-child(2)) { animation-delay: 0.12s; }
	.tab-sections > :global(:nth-child(3)) { animation-delay: 0.19s; }
	.tab-sections > :global(:nth-child(4)) { animation-delay: 0.26s; }
	.tab-sections > :global(:nth-child(5)) { animation-delay: 0.33s; }

	/* Hide scrollbar for tab navigation on mobile */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	/* Disable backdrop-filter on mobile for scroll performance */
	@media (max-width: 1024px) {
		:global(.social-overlay-mobile) {
			backdrop-filter: none !important;
			-webkit-backdrop-filter: none !important;
			background: rgba(15, 23, 42, 0.95) !important;
		}
	}

</style>
