<script>
	import { fly, fade } from 'svelte/transition';
	import { playerVisible, playerMinimized, loadRandomTrack, showPlayer, hidePlayer, expandPlayer, minimizePlayer, hasTrackLoaded, isPlaying, currentTrack } from '$lib/stores/musicPlayer.js';
	import { activeSection, navigateTo, sectionMeta, enabledSections } from '$lib/stores/navigation.js';
	import { toggleMobileMenu, mobileMenuOpen, closeMobileMenu } from '$lib/stores/mobileNav.js';
	import { sectionModalOpen } from '$lib/stores/stickyNav.js';
	import { immediateTap } from '$lib/actions/immediateTap.js';

	// Props
	let { socialLinks = [] } = $props();

	// Hide bottom bar on home page or when modal is open (CSS visibility to prevent shifts)
	const isHomePage = $derived($activeSection === 'home');
	const barHidden = $derived(isHomePage || $sectionModalOpen);

	// Music button visibility - show everywhere except home
	const showMusicButton = $derived(!isHomePage);

	// Music glow indicator (shows when music is playing and menu is closed)
	const showMusicGlow = $derived($isPlaying && !$mobileMenuOpen);

	// Bottom bar stays at fixed position - player overlays on top

	// Social submenu state
	let socialMenuOpen = $state(false);

	function toggleSocialMenu() {
		// Close mobile menu if opening social menu
		if (!socialMenuOpen) {
			closeMobileMenu();
		}
		socialMenuOpen = !socialMenuOpen;
	}

	function handleMenuToggle() {
		// Close social menu if opening mobile menu
		if (!$mobileMenuOpen) {
			closeSocialMenu();
		}
		toggleMobileMenu();
	}

	function closeSocialMenu() {
		socialMenuOpen = false;
	}

	// Button handlers
	function handleMusicClick() {
		// If player is not visible: show it (load track if none loaded)
		// If player is visible and minimized: expand it
		// If player is visible and expanded: minimize it (don't pause music)
		if (!$playerVisible) {
			// Show player, load random track only if nothing is loaded
			if (!$currentTrack) {
				loadRandomTrack();
			}
			showPlayer();
			expandPlayer();
		} else if ($playerMinimized) {
			// Player is visible but minimized - expand it
			expandPlayer();
		} else {
			// Player is visible and expanded - minimize it
			minimizePlayer();
		}
	}

	function goHome() {
		navigateTo('home');
		// Don't close menu on navigation
	}

	function handleNavClick(section) {
		navigateTo(section);
		// Close the navigation submenu after selecting a section
		closeMobileMenu();
	}

	function handleContactClick() {
		navigateTo('contact');
		// Don't close menu on navigation
	}

	// Get enabled navigation items (exclude home for menu)
	const navItems = $derived($enabledSections.filter(s => s !== 'home'));
</script>

<!-- Bottom Navigation Bar - Always rendered, hidden on home via CSS to prevent layout shifts -->
<div
	class="bottom-bar"
	class:bar-hidden={barHidden}
>
		<!-- Position 1: Home Button -->
		<button
			class="bar-button home-button"
			use:immediateTap={goHome}
			onclick={goHome}
			aria-label="Go to home"
		>
			<iconify-icon icon="mdi:home" class="text-xl"></iconify-icon>
		</button>

		<!-- Position 2: Music Button (shows pulsing ring when playing) -->
		{#if showMusicButton}
			<button
				class="bar-button music-button"
				class:music-glow={showMusicGlow}
				use:immediateTap={handleMusicClick}
				onclick={handleMusicClick}
				aria-label="Play music"
			>
				<iconify-icon icon="mdi:music-note" class="text-xl"></iconify-icon>
			</button>
		{:else}
			<div class="bar-spacer"></div>
		{/if}

		<!-- Position 3: Center Hamburger Menu -->
		<button
			class="bar-button hamburger-button"
			class:open={$mobileMenuOpen}
			use:immediateTap={handleMenuToggle}
			onclick={handleMenuToggle}
			aria-label={$mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
			aria-expanded={$mobileMenuOpen}
		>
			<span class="hamburger-line hamburger-line-top"></span>
			<span class="hamburger-line hamburger-line-middle"></span>
			<span class="hamburger-line hamburger-line-bottom"></span>
		</button>

		<!-- Position 4: Contact Button -->
		<button
			class="bar-button contact-button"
			use:immediateTap={handleContactClick}
			onclick={handleContactClick}
			aria-label="Go to contact"
		>
			<iconify-icon icon="mdi:email" class="text-xl"></iconify-icon>
		</button>

		<!-- Position 5: Social Button -->
		<button
			class="bar-button social-button"
			class:active={socialMenuOpen}
			use:immediateTap={toggleSocialMenu}
			onclick={toggleSocialMenu}
			aria-label={socialMenuOpen ? 'Close social menu' : 'Open social menu'}
			aria-expanded={socialMenuOpen}
		>
			<iconify-icon icon="mdi:share-variant" class="text-xl"></iconify-icon>
		</button>
	</div>

<!-- Page Navigation Dropdown (appears above bottom bar) -->
{#if $mobileMenuOpen && !barHidden}
	<div
		class="mobile-menu-dropdown"
		in:fly={{ y: 20, duration: 300 }}
		out:fly={{ y: 20, duration: 250 }}
	>
		{#each navItems as section}
			<button
				class="mobile-menu-item"
				class:active={$activeSection === section}
				onclick={() => handleNavClick(section)}
				aria-current={$activeSection === section ? 'page' : undefined}
				style="--item-glow-color: {sectionMeta[section].color};"
			>
				<iconify-icon icon={sectionMeta[section].icon} class="text-xl"></iconify-icon>
				<span>{sectionMeta[section].label}</span>
			</button>
		{/each}
	</div>
{/if}

<!-- Social Menu Dropdown (appears above bottom bar) -->
{#if socialMenuOpen && !barHidden}
	<div
		class="social-menu-dropdown"
		in:fly={{ y: 20, duration: 300 }}
		out:fly={{ y: 20, duration: 250 }}
	>
		<div class="social-menu-header">
			<iconify-icon icon="mdi:account-group" class="text-sm"></iconify-icon>
			<span>Connect</span>
		</div>
		{#if socialLinks.length > 0}
			{#each socialLinks as social}
				<a
					href={social.url}
					class="social-menu-item"
					target="_blank"
					rel="noopener noreferrer"
					style="--social-hover-color: {social.color?.includes('red') ? 'rgba(239, 68, 68, 0.15)' : social.color?.includes('pink') ? 'rgba(236, 72, 153, 0.15)' : social.color?.includes('blue') ? 'rgba(59, 130, 246, 0.15)' : social.color?.includes('purple') ? 'rgba(139, 92, 246, 0.15)' : social.color?.includes('green') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)'};"
				>
					<div class="social-icon-container">
						<iconify-icon icon={social.icon} class="text-xl {social.color}"></iconify-icon>
					</div>
					<span class="social-name">{social.name}</span>
					<iconify-icon icon="mdi:open-in-new" class="text-xs text-gray-500 ml-auto"></iconify-icon>
				</a>
			{/each}
		{:else}
			<span class="social-menu-empty">No social links available</span>
		{/if}
	</div>
{/if}

<!-- Backdrop overlay when any menu is open -->
{#if ($mobileMenuOpen || socialMenuOpen) && !barHidden}
	<div
		class="mobile-backdrop"
		onclick={() => {
			closeMobileMenu();
			closeSocialMenu();
		}}
		transition:fade={{ duration: 200 }}
	></div>
{/if}

<style>
	/* Bottom Bar - 5-column grid layout */
	.bottom-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		height: 64px;
		/* Glassmorphism background */
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		box-shadow:
			0 -4px 30px rgba(0, 0, 0, 0.15),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		/* 5-column grid */
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
		align-items: center;
		justify-items: center;
		padding: 0 12px;
		gap: 8px;
		/* Smooth transition for opacity */
		transition: opacity 0.2s ease, transform 0.2s ease;
		/* GPU compositing layer for smooth visibility transitions */
		transform: translateZ(0);
		/* Isolate layout/paint from page to prevent shifts */
		contain: layout paint;
		/* Prevent scroll from consuming taps — fixed element doesn't scroll */
		touch-action: none;
	}

	/* Hidden state for home page - use CSS instead of DOM removal to prevent shifts */
	.bottom-bar.bar-hidden {
		opacity: 0;
		pointer-events: none;
		transform: translateY(100%) translateZ(0);
	}

	/* Bar Buttons - Common styles */
	.bar-button {
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: white;
		touch-action: manipulation;
	}

	.bar-button:hover {
		transform: scale(1.1);
		background: rgba(255, 255, 255, 0.05);
	}

	.bar-button:active {
		transform: scale(0.95);
	}

	/* Spacer for when music button is hidden */
	.bar-spacer {
		width: 44px;
		height: 44px;
	}

	/* Home Button */
	.home-button {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
		           inset 0 1px 1px rgba(255, 255, 255, 0.1);
	}

	.home-button:hover {
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3),
		           0 0 20px rgba(16, 185, 129, 0.4);
	}

	/* Music Button */
	.music-button {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
		           inset 0 1px 1px rgba(255, 255, 255, 0.1);
		position: relative;
	}

	.music-button:hover {
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3),
		           0 0 20px rgba(59, 130, 246, 0.4);
	}

	/* Pulsing ring glow when music is playing */
	@keyframes ring-pulse {
		0% {
			transform: scale(1);
			opacity: 0.8;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	.music-button.music-glow {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
		           inset 0 1px 1px rgba(255, 255, 255, 0.1),
		           0 0 12px rgba(59, 130, 246, 0.4);
	}

	.music-button.music-glow::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 50%;
		border: 2px solid rgba(59, 130, 246, 0.7);
		animation: ring-pulse 1.5s ease-out infinite;
		pointer-events: none;
	}

	/* Hamburger Button - Centered */
	.hamburger-button {
		position: relative;
	}

	/* Hamburger Lines */
	.hamburger-line {
		display: block;
		width: 24px;
		height: 2px;
		background: white;
		border-radius: 1px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.hamburger-line-top {
		top: 12px;
	}

	.hamburger-line-middle {
		top: 21px;
	}

	.hamburger-line-bottom {
		top: 30px;
	}

	/* Hamburger → X Animation */
	.hamburger-button.open .hamburger-line-top {
		top: 21px;
		transform: translateX(-50%) rotate(45deg);
	}

	.hamburger-button.open .hamburger-line-middle {
		opacity: 0;
		transform: translateX(-50%) scale(0);
	}

	.hamburger-button.open .hamburger-line-bottom {
		top: 21px;
		transform: translateX(-50%) rotate(-45deg);
	}

	/* Contact Button */
	.contact-button {
		background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
		           inset 0 1px 1px rgba(255, 255, 255, 0.1);
	}

	.contact-button:hover {
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3),
		           0 0 20px rgba(236, 72, 153, 0.4);
	}

	/* Social Button */
	.social-button {
		background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
		           inset 0 1px 1px rgba(255, 255, 255, 0.1);
	}

	.social-button:hover {
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3),
		           0 0 20px rgba(139, 92, 246, 0.4);
	}

	.social-button.active {
		background: linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%);
	}

	/* Backdrop overlay */
	.mobile-backdrop {
		position: fixed;
		inset: 0;
		z-index: 39;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
	}

	/* Mobile Menu Dropdown - Centered above bottom bar */
	.mobile-menu-dropdown {
		position: fixed;
		left: 50%;
		bottom: 72px;
		transform: translateX(-50%);
		z-index: 42;
		/* Glassmorphism */
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		border-radius: 16px;
		padding: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		box-shadow:
			0 20px 40px rgba(0, 0, 0, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		min-width: 240px;
		max-width: 320px;
		width: calc(100% - 32px);
		max-height: 60vh;
		overflow-y: auto;
	}

	/* Menu items */
	.mobile-menu-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: transparent;
		border: none;
		border-radius: 10px;
		color: rgba(156, 163, 175, 0.9);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		touch-action: manipulation;
	}

	.mobile-menu-item:hover {
		background: rgba(59, 130, 246, 0.1);
		color: rgba(255, 255, 255, 0.95);
	}

	.mobile-menu-item.active {
		background: linear-gradient(135deg, var(--item-glow-color, #667eea), color-mix(in srgb, var(--item-glow-color, #667eea) 70%, #1a1a2e));
		color: var(--neu-text-primary, #fff);
		box-shadow:
			inset 2px 2px 4px rgba(255, 255, 255, 0.1),
			inset -2px -2px 4px rgba(0, 0, 0, 0.2);
	}

	/* Social Menu Dropdown - Same styling as mobile menu */
	.social-menu-dropdown {
		position: fixed;
		left: 50%;
		bottom: 72px;
		transform: translateX(-50%);
		z-index: 42;
		/* Glassmorphism */
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		border-radius: 16px;
		padding: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		box-shadow:
			0 20px 40px rgba(0, 0, 0, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		min-width: 200px;
		max-width: 280px;
		width: calc(100% - 32px);
	}

	/* Social Menu Header */
	.social-menu-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px 12px;
		color: rgba(156, 163, 175, 0.7);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 8px;
	}

	/* Social Menu Item */
	.social-menu-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: 12px;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		text-decoration: none;
	}

	.social-icon-container {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		transition: all 0.2s ease;
	}

	.social-name {
		flex: 1;
	}

	.social-menu-item:hover {
		background: var(--social-hover-color, rgba(139, 92, 246, 0.15));
		transform: translateX(4px);
	}

	.social-menu-item:hover .social-icon-container {
		background: rgba(255, 255, 255, 0.1);
		transform: scale(1.05);
	}

	.social-menu-item:hover .text-gray-500 {
		color: rgba(255, 255, 255, 0.6);
	}

	.social-menu-empty {
		display: block;
		padding: 16px;
		text-align: center;
		color: rgba(156, 163, 175, 0.6);
		font-size: 0.875rem;
	}

	/* Mobile performance: Reduce backdrop-filter intensity on smaller screens */
	@media (max-width: 1024px) {
		.bottom-bar,
		.mobile-menu-dropdown,
		.social-menu-dropdown {
			backdrop-filter: blur(12px);
			-webkit-backdrop-filter: blur(12px);
			background: rgba(30, 32, 38, 0.85);
		}
	}

	/* Small screen adjustments */
	@media (max-width: 360px) {
		.bottom-bar {
			padding: 0 8px;
			gap: 4px;
		}

		.bar-button {
			width: 38px;
			height: 38px;
			min-width: 38px;
			min-height: 38px;
		}

		.bar-spacer {
			width: 38px;
			height: 38px;
		}
	}

	/* Hide on desktop - Mobile only component */
	@media (min-width: 769px) {
		.bottom-bar,
		.mobile-menu-dropdown,
		.social-menu-dropdown,
		.mobile-backdrop {
			display: none !important;
		}
	}
</style>
