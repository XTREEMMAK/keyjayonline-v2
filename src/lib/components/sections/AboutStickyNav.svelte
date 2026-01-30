<script>
	import { fly } from 'svelte/transition';
	import { stickyNavVisible, aboutActiveTab } from '$lib/stores/stickyNav.js';
	import { navigateTo, sectionMeta, sections } from '$lib/stores/navigation.js';

	// Tab themes for styling (must match AboutSection)
	const tabThemes = {
		bio: { accent: 'from-emerald-600 to-blue-600' },
		music: { accent: 'from-blue-600 to-purple-600' },
		tech: { accent: 'from-cyan-600 to-green-600' },
		creative: { accent: 'from-purple-600 to-pink-600' },
		productions: { accent: 'from-orange-600 to-amber-600' }
	};

	// Main nav items (exclude home)
	const mainNavItems = sections.filter((s) => s !== 'home');

	// Export switchTab so parent can pass it
	let { onTabSwitch = () => {} } = $props();

	let isMainMenuOpen = $state(false);

	function handleTabClick(tab) {
		aboutActiveTab.set(tab);
		onTabSwitch(tab);
	}

	function handleMainNavClick(section) {
		navigateTo(section);
		isMainMenuOpen = false;
	}

	function goHome() {
		navigateTo('home');
		isMainMenuOpen = false;
	}
</script>

{#if $stickyNavVisible}
	<div
		class="fixed left-0 right-0 z-50 bg-[var(--neu-bg)]/95 backdrop-blur-sm border-b border-gray-800"
		style="top: 0"
		transition:fly={{ y: -60, duration: 250 }}
	>
		<div class="container mx-auto px-4">
			<div class="flex items-center justify-between gap-2 py-2">
				<!-- Left: Hamburger for main nav + Logo -->
				<div class="flex items-center gap-2">
					<button
						class="hamburger-btn p-2"
						class:open={isMainMenuOpen}
						onclick={() => isMainMenuOpen = !isMainMenuOpen}
						aria-label={isMainMenuOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={isMainMenuOpen}
					>
						<span class="hamburger-line"></span>
						<span class="hamburger-line"></span>
						<span class="hamburger-line"></span>
					</button>

					<button
						class="neu-logo-btn"
						onclick={goHome}
						aria-label="Go to home"
					>
						<img
							src="/img/KJ_Logo_Medium_W.svg"
							alt="KEY JAY ONLINE"
							class="w-7 h-7 object-contain"
						/>
					</button>
				</div>

				<!-- Center: Tab Navigation -->
				<div class="flex-1 flex justify-center overflow-hidden">
					<div class="flex gap-1 overflow-x-auto no-scrollbar neu-card-inset p-1 max-w-full">
						{#each Object.keys(tabThemes) as tab}
							<button
								onclick={() => handleTabClick(tab)}
								class="flex-shrink-0 px-2 xs:px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-md font-semibold transition-all duration-300 text-xs sm:text-sm whitespace-nowrap {
									$aboutActiveTab === tab
										? `bg-gradient-to-r ${tabThemes[tab].accent} text-white shadow-lg`
										: 'text-gray-400 hover:text-white'
								}"
							>
								<span class="hidden md:inline">{tab === 'bio' ? 'Biography' : tab === 'music' ? 'Music & Audio' : tab === 'tech' ? 'Technology' : tab === 'creative' ? 'Voice Acting' : 'Productions'}</span>
								<span class="md:hidden">{tab === 'bio' ? 'Bio' : tab === 'music' ? 'Music' : tab === 'tech' ? 'Tech' : tab === 'creative' ? 'Voice' : 'Prods'}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Right: Spacer for symmetry -->
				<div class="w-[76px] hidden sm:block"></div>
			</div>
		</div>
	</div>

	<!-- Main Nav Dropdown Menu -->
	{#if isMainMenuOpen}
		<div
			class="main-menu-overlay"
			onclick={() => isMainMenuOpen = false}
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="main-menu" onclick={(e) => e.stopPropagation()}>
				{#each mainNavItems as section}
					<button
						class="main-menu-item"
						class:active={section === 'about'}
						onclick={() => handleMainNavClick(section)}
						style="--item-glow-color: {sectionMeta[section].color};"
					>
						<iconify-icon icon={sectionMeta[section].icon} class="text-xl"></iconify-icon>
						<span>{sectionMeta[section].label}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
{/if}

<style>
	.neu-card-inset {
		background: var(--neu-bg, #2a2d35);
		border-radius: 12px;
		box-shadow:
			inset 4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			inset -4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-logo-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 4px;
		border-radius: 50%;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.neu-logo-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	/* Hamburger Button */
	.hamburger-btn {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 4px;
		width: 36px;
		height: 36px;
		background: transparent;
		border: none;
		cursor: pointer;
		border-radius: 8px;
		transition: background 0.2s ease;
	}

	.hamburger-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.hamburger-line {
		display: block;
		width: 20px;
		height: 2px;
		background: var(--neu-text-secondary, #9ca3af);
		border-radius: 1px;
		transition: all 0.3s ease;
	}

	.hamburger-btn.open .hamburger-line:nth-child(1) {
		transform: translateY(6px) rotate(45deg);
	}

	.hamburger-btn.open .hamburger-line:nth-child(2) {
		opacity: 0;
	}

	.hamburger-btn.open .hamburger-line:nth-child(3) {
		transform: translateY(-6px) rotate(-45deg);
	}

	/* Main Menu Overlay */
	.main-menu-overlay {
		position: fixed;
		top: 60px;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 49;
	}

	.main-menu {
		background: var(--neu-bg, #2a2d35);
		border-radius: 0 0 20px 20px;
		padding: 16px;
		margin: 0 16px;
		margin-right: auto;
		max-width: 280px;
		box-shadow:
			8px 8px 16px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-8px -8px 16px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.main-menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: transparent;
		border: none;
		border-radius: 12px;
		color: var(--neu-text-secondary, #9ca3af);
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.main-menu-item:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--neu-text-primary, #fff);
	}

	.main-menu-item.active {
		background: linear-gradient(135deg, var(--item-glow-color, #667eea), color-mix(in srgb, var(--item-glow-color, #667eea) 70%, #1a1a2e));
		color: var(--neu-text-primary, #fff);
		box-shadow:
			inset 2px 2px 4px rgba(255, 255, 255, 0.1),
			inset -2px -2px 4px rgba(0, 0, 0, 0.2);
	}
</style>
