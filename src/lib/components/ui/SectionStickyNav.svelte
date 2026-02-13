<script>
	import { fly, fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import {
		activeStickySection,
		sectionModalOpen,
		mainNavOverlayVisible,
		toggleMainNavOverlay,
		hideMainNavOverlay
	} from '$lib/stores/stickyNav.js';
	import { navigateTo, enabledSections, sectionMeta } from '$lib/stores/navigation.js';

	let { section, children } = $props();

	const isActive = $derived($activeStickySection === section && !$sectionModalOpen);
</script>

{#if isActive}
	<!-- Section Sub-Nav Portal (fixed at top, neumorphic style) -->
	<div
		class="section-sticky-nav"
		transition:fly={{ y: -60, duration: 250 }}
	>
		<div class="container mx-auto px-4">
			<div class="flex items-center gap-3 py-2.5">
				<!-- Hamburger button to show main nav -->
				<button
					onclick={toggleMainNavOverlay}
					class="flex-shrink-0 neu-nav-hamburger hidden md:block"
					title="Show main navigation"
					aria-label="Show main navigation"
				>
					<Icon icon={$mainNavOverlayVisible ? 'mdi:close' : 'mdi:menu'} class="text-xl" />
				</button>

				<!-- Sub-nav content (passed via children snippet) -->
				<div class="flex-1 flex flex-col items-center justify-center overflow-x-auto">
					{@render children()}
				</div>
			</div>
		</div>
	</div>

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
					<!-- Large Logo (left) -->
					<button
						onclick={() => { hideMainNavOverlay(); navigateTo('home'); }}
						class="flex-shrink-0 neu-overlay-logo"
						aria-label="Go to home"
						in:fly={{ y: -10, duration: 200, delay: 50 }}
					>
						<img
							src="/img/KJ_Logo_Medium_W.svg"
							alt="KEY JAY ONLINE"
							class="w-14 h-14 object-contain"
						/>
					</button>

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
		background: rgba(42, 45, 53, 0.55);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(16px) saturate(1.2);
		-webkit-backdrop-filter: blur(16px) saturate(1.2);
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
		top: 60px;
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

	/* Logo button in overlay — large, prominent */
	.neu-overlay-logo {
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
