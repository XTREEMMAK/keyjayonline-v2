<script>
	import { fly, fade, slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import {
		activeStickySection,
		sectionModalOpen,
		mainNavOverlayVisible,
		toggleMainNavOverlay,
		hideMainNavOverlay
	} from '$lib/stores/stickyNav.js';
	import { navigateTo, enabledSections, sectionMeta } from '$lib/stores/navigation.js';
	import { mobileMenuOpen } from '$lib/stores/mobileNav.js';

	let { section, children, filterLabel = 'Filters', mobileOnly = false } = $props();

	const isActive = $derived($activeStickySection === section && !$sectionModalOpen && !$mobileMenuOpen);

	let filterMenuOpen = $state(false);

	// Close filter menu when section changes or nav deactivates
	$effect(() => {
		if (!isActive) filterMenuOpen = false;
	});

	// Lock body scroll when overlay menu is open
	$effect(() => {
		if (!browser) return;
		if ($mainNavOverlayVisible) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

{#if isActive}
	<!-- Section Sub-Nav Portal (fixed at top, neumorphic style) -->
	<div
		class="section-sticky-nav {mobileOnly ? 'md:hidden' : ''}"
		transition:fly={{ y: -60, duration: 250 }}
	>
		<div class="container mx-auto px-4">
			<div class="flex items-center gap-3 py-2.5">
				<!-- Hamburger button to show main nav (desktop only) -->
				<button
					onclick={toggleMainNavOverlay}
					class="flex-shrink-0 neu-nav-hamburger hidden md:block"
					title="Show main navigation"
					aria-label="Show main navigation"
				>
					<Icon icon={$mainNavOverlayVisible ? 'mdi:close' : 'mdi:menu'} class="text-xl" />
				</button>

				<!-- Desktop: show children inline -->
				<div class="hidden md:flex flex-1 items-center justify-center">
					{@render children()}
				</div>

				<!-- Mobile: filter toggle button (neumorphic dropdown style) -->
				<div class="md:hidden flex-1 flex justify-center">
					<button
						onclick={() => filterMenuOpen = !filterMenuOpen}
						class="neu-filter-toggle"
						class:active={filterMenuOpen}
						aria-expanded={filterMenuOpen}
					>
						<Icon icon="mdi:filter-variant" class="text-base" />
						<span class="font-semibold">{filterLabel}</span>
						<Icon icon={filterMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} class="text-base transition-transform duration-200" />
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Mobile filter dropdown panel -->
	{#if filterMenuOpen}
		<!-- Backdrop -->
		<button
			class="fixed inset-0 z-[39] md:hidden"
			onclick={() => filterMenuOpen = false}
			aria-label="Close filters"
			transition:fade={{ duration: 150 }}
		></button>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="filter-dropdown md:hidden"
			transition:slide={{ duration: 200 }}
			onclick={(e) => { if (e.target.closest('button')) filterMenuOpen = false; }}
		>
			<div class="container mx-auto px-4 py-3">
				<div class="flex flex-wrap gap-2 justify-center">
					{@render children()}
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Nav Overlay (slides down when hamburger clicked) -->
	{#if $mainNavOverlayVisible}
		<!-- Backdrop to close overlay -->
		<button
			class="fixed inset-0 z-[44] bg-black/30 backdrop-blur-sm"
			onclick={hideMainNavOverlay}
			aria-label="Close navigation"
			transition:fade={{ duration: 150 }}
		></button>

		<div
			class="section-nav-overlay"
			transition:fly={{ y: -60, duration: 200 }}
		>
			<div class="px-6 py-5">
				<div class="flex items-center gap-5">
					<!-- Large Logo (left) with animated ring -->
					<div class="logo-ring-wrapper" in:fly={{ y: -10, duration: 200, delay: 50 }}>
						<div class="logo-ring"></div>
						<button
							onclick={() => { hideMainNavOverlay(); navigateTo('home'); }}
							class="flex-shrink-0 neu-overlay-logo"
							aria-label="Go to home"
						>
							<img
								src="/img/KJ_Logo_Medium_W.svg"
								alt="KEY JAY ONLINE"
								class="w-14 h-14 object-contain"
							/>
						</button>
					</div>

					<!-- Divider -->
					<div class="w-px self-stretch bg-gray-600/40 flex-shrink-0"></div>

					<!-- Nav items (stacked vertically, cascading) -->
					<div class="flex flex-col gap-1">
						{#each $enabledSections.filter(s => s !== 'home') as sectionKey, i}
							<button
								onclick={() => { hideMainNavOverlay(); navigateTo(sectionKey); }}
								class="neu-overlay-item"
								style="--item-glow-color: {sectionMeta[sectionKey]?.color || '#6366f1'}"
								class:active={sectionKey === section}
								in:fly={{ x: -20, duration: 200, delay: 80 + i * 60 }}
							>
								<Icon icon={sectionMeta[sectionKey]?.icon} class="text-lg" style="color: {sectionMeta[sectionKey]?.color}" />
								{sectionMeta[sectionKey]?.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Neumorphic sticky nav bar */
	.section-sticky-nav {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		z-index: 40;
		height: 60px;
		background: rgba(42, 45, 53, 0.55);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(16px) saturate(1.2);
		-webkit-backdrop-filter: blur(16px) saturate(1.2);
	}

	/* Mobile filter dropdown below sticky nav */
	.filter-dropdown {
		position: fixed;
		left: 0;
		right: 0;
		top: 60px;
		z-index: 40;
		background: rgba(30, 33, 40, 0.9);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(16px) saturate(1.2);
		-webkit-backdrop-filter: blur(16px) saturate(1.2);
	}

	/* Mobile filter toggle - neumorphic dropdown button */
	.neu-filter-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 8px 18px;
		border-radius: 50px;
		font-size: 0.8rem;
		color: var(--neu-text-secondary, #9ca3af);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow:
			3px 3px 6px var(--neu-shadow-dark, rgba(18, 20, 24, 0.6)),
			-3px -3px 6px var(--neu-shadow-light, rgba(60, 64, 72, 0.3));
	}

	.neu-filter-toggle:hover,
	.neu-filter-toggle.active {
		color: var(--neu-text-primary, #fff);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow:
			inset 2px 2px 4px var(--neu-shadow-dark, rgba(18, 20, 24, 0.6)),
			inset -2px -2px 4px var(--neu-shadow-light, rgba(60, 64, 72, 0.3));
	}

	/* Hamburger button - neumorphic */
	.neu-nav-hamburger {
		padding: 8px;
		border-radius: 12px;
		color: var(--neu-text-secondary, #9ca3af);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.neu-nav-hamburger:hover {
		color: var(--neu-text-primary, #fff);
		background: rgba(255, 255, 255, 0.05);
		box-shadow:
			2px 2px 4px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-2px -2px 4px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	/* Nav overlay - neumorphic */
	.section-nav-overlay {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 64px;
		z-index: 45;
		background: rgba(42, 45, 53, 0.6);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(16px) saturate(1.2);
		-webkit-backdrop-filter: blur(16px) saturate(1.2);
		max-width: 90vw;
	}

	/* Logo ring wrapper */
	.logo-ring-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Animated growing ring behind logo */
	.logo-ring {
		position: absolute;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 2px solid rgba(6, 182, 212, 0.4);
		animation: ring-grow 2.5s ease-out infinite;
	}

	@keyframes ring-grow {
		0% {
			transform: scale(1);
			opacity: 0.5;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	/* Logo button in overlay — large, prominent */
	.neu-overlay-logo {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--neu-border, rgba(255, 255, 255, 0.05));
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow:
			2px 2px 4px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-2px -2px 4px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-overlay-logo:hover {
		background: rgba(255, 255, 255, 0.05);
		box-shadow:
			2px 2px 4px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-2px -2px 4px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	/* Overlay nav items - match neumorphic navbar style */
	.neu-overlay-item {
		padding: 8px 16px;
		border-radius: 50px;
		color: var(--neu-text-secondary, #9ca3af);
		font-weight: 600;
		font-size: 0.8rem;
		letter-spacing: 0.05em;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.neu-overlay-item:hover {
		color: var(--neu-text-primary, #fff);
		background: rgba(255, 255, 255, 0.05);
	}

	.neu-overlay-item.active {
		background: linear-gradient(135deg, var(--item-glow-color), color-mix(in srgb, var(--item-glow-color) 70%, #1a1a2e));
		color: var(--neu-text-primary, #fff);
		box-shadow:
			2px 2px 4px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-2px -2px 4px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}
</style>
