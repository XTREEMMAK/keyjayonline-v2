<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { activeSection, navigateTo, sectionMeta, enabledSections, navbarVisible } from '$lib/stores/navigation.js';
	import { hideMainNavbar, sectionModalOpen } from '$lib/stores/stickyNav.js';
	import { contentViewerOpen } from '$lib/stores/contentViewer.js';
	import { mobileMenuOpen, closeMobileMenu, toggleMobileMenu } from '$lib/stores/mobileNav.js';
	import { browser } from '$app/environment';
	import { mouseGlow } from '$lib/actions/mouseGlow.js';
	import { prefetchSection } from '$lib/stores/sectionData.js';

	let isVisible = $state(true);
	let isScrolled = $state(false);
	let lastScrollY = 0;
	let hasInitiallyLoaded = $state(false);
	let isMenuClosing = $state(false); // Delayed state for smooth close animation
	let prevMenuOpen = $state(false); // Track previous state
	let isMobile = $state(false); // Track mobile viewport

	// Delay navbar size change until menu animation completes
	$effect(() => {
		// Detect when menu transitions from open to closed
		if (prevMenuOpen && !$mobileMenuOpen) {
			isMenuClosing = true;
			setTimeout(() => {
				isMenuClosing = false;
			}, 200); // Match animation duration
		}
		prevMenuOpen = $mobileMenuOpen;
	});

	// Navigation items (exclude home from visible nav, it's the default)
	// Uses enabledSections to filter out disabled pages
	const navItems = $derived($enabledSections.filter((s) => s !== 'home'));

	// Get the glow color for the current active section
	const glowColor = $derived(sectionMeta[$activeSection]?.color || '#667eea');

	// Combined visibility - hide if scroll hidden OR if section subnav takes over OR if content viewer is open
	// Exception: Always show if mobile menu is open
	// On mobile: Only show on home page
	const shouldShow = $derived(
		(() => {
			// On mobile, only show on home page (show when scrolled up OR when menu is open)
			if (isMobile) {
				if ($activeSection === 'home') {
					return (isVisible || $mobileMenuOpen) && !$contentViewerOpen;
				}
				// Never show on non-home pages
				return false;
			}
			// On desktop, normal behavior (also hide when a section modal is open)
			return (isVisible && !$hideMainNavbar && !$contentViewerOpen && !$sectionModalOpen) || $mobileMenuOpen;
		})()
	);

	// Auto-close mobile menu when scrolling down (user dismissed navbar)
	$effect(() => {
		if (!isVisible && !$hideMainNavbar && !$contentViewerOpen && $mobileMenuOpen) {
			// Only auto-close if user scrolled down while menu was open
			// Don't close if menu was just opened via button
		}
	});

	// Lock body scroll when mobile menu is open
	$effect(() => {
		if (!browser) return;
		if ($mobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	onMount(() => {
		if (!browser) return;

		// Check if mobile viewport
		const checkMobile = () => {
			isMobile = window.innerWidth <= 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		// Trigger initial slide-down animation after a brief delay
		setTimeout(() => {
			hasInitiallyLoaded = true;
		}, 100);

		let ticking = false;
		function handleScroll() {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				const currentScrollY = window.scrollY;
				isScrolled = currentScrollY > 50;

				// Hide on scroll down, show on scroll up (only after 200px)
				// Dead zone of 5px prevents momentum scrolling from toggling rapidly
				const scrollDelta = currentScrollY - lastScrollY;
				if (scrollDelta > 5 && currentScrollY > 200) {
					isVisible = false;
					closeMobileMenu();
					navbarVisible.set(false);
				} else if (scrollDelta < -5) {
					isVisible = true;
					navbarVisible.set(true);
				}

				lastScrollY = currentScrollY;
				ticking = false;
			});
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', checkMobile);
		};
	});

	function handleNavClick(section) {
		navigateTo(section);
		closeMobileMenu();
	}

	function goHome() {
		navigateTo('home');
		closeMobileMenu();
	}
</script>

<nav
	use:mouseGlow={{ color: 'rgba(59, 130, 246, 0.12)', size: 300, blur: 60 }}
	class="neu-navbar {$mobileMenuOpen || isMenuClosing ? 'mobile-menu-open' : ''}"
	class:menu-closing={isMenuClosing && !$mobileMenuOpen}
	class:shadow-2xl={isScrolled}
	class:nav-hidden={!shouldShow || !hasInitiallyLoaded}
	aria-label="Main navigation"
	aria-hidden={!shouldShow || !hasInitiallyLoaded}
	style="--section-glow-color: {glowColor};"
>
	<!-- Mobile Layout: Centered Logo for navigation and menu -->
	<div class="flex md:hidden items-center justify-center w-full mobile-nav-header">
		<button
			class="neu-navbar-logo mobile-interactive-logo"
			class:active={$activeSection === 'home'}
			class:logo-glow-active={$activeSection === 'home'}
			class:menu-active={$mobileMenuOpen}
			onclick={$activeSection === 'home' ? toggleMobileMenu : goHome}
			aria-label={$activeSection === 'home' ? ($mobileMenuOpen ? 'Close menu' : 'Open menu') : 'Go to home'}
			aria-current={$activeSection === 'home' ? 'page' : undefined}
			aria-expanded={$activeSection === 'home' ? $mobileMenuOpen : undefined}
			style="--item-glow-color: {sectionMeta.home.color};"
		>
			<img
				src="/img/KJ_Logo_Medium_W.svg"
				alt="KEY JAY ONLINE"
				class="logo-img"
			/>
		</button>
	</div>

	<!-- Desktop Layout: Logo, Divider, Nav Items -->
	<div class="hidden md:flex items-center gap-1">
		<button
			class="neu-navbar-logo"
			class:active={$activeSection === 'home'}
			class:logo-glow-active={$activeSection === 'home'}
			onclick={goHome}
			aria-label="Go to home"
			aria-current={$activeSection === 'home' ? 'page' : undefined}
			style="--item-glow-color: {sectionMeta.home.color};"
		>
			<img
				src="/img/KJ_Logo_Medium_W.svg"
				alt="KEY JAY ONLINE"
				class="logo-img"
			/>
		</button>

		<!-- Divider -->
		<div class="w-px h-6 bg-white/10 mx-1"></div>

		{#each navItems as section}
			<button
				class="neu-navbar-item uppercase tracking-wider"
				class:active={$activeSection === section}
				class:glow-active={$activeSection === section}
				onmouseenter={() => prefetchSection(section)}
				onclick={() => handleNavClick(section)}
				aria-current={$activeSection === section ? 'page' : undefined}
				style="--item-glow-color: {sectionMeta[section].color};"
			>
				{sectionMeta[section].label}
			</button>
		{/each}
	</div>

	<!-- Mobile Menu Dropdown - Now inside nav for visual connection -->
	{#if $mobileMenuOpen}
		<div
			class="mobile-menu-container md:hidden"
			in:fly={{ y: -10, duration: 200 }}
			out:fly={{ y: -10, duration: 200 }}
		>
			{#each navItems as section}
				<button
					class="mobile-menu-item"
					class:active={$activeSection === section}
					onmouseenter={() => prefetchSection(section)}
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
</nav>

<!-- Backdrop overlay when mobile menu is open -->
{#if $mobileMenuOpen && shouldShow}
	<div
		class="mobile-backdrop md:hidden"
		onclick={closeMobileMenu}
		in:fly={{ duration: 200 }}
		out:fly={{ duration: 200 }}
	></div>
{/if}

<style>
	/* Additional styles specific to navbar component */
	nav {
		max-width: 95vw;
	}

	/* Logo button styling */
	.neu-navbar-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		min-width: 40px;
		min-height: 40px;
		padding: 6px;
		margin-right: 8px;
		border-radius: 50%;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.neu-navbar-logo:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.neu-navbar-logo.active {
		/* Use section-specific color */
		background: linear-gradient(135deg, var(--item-glow-color, #667eea), color-mix(in srgb, var(--item-glow-color, #667eea) 70%, #1a1a2e));
		box-shadow:
			2px 2px 4px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-2px -2px 4px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	/* Rotating glow for logo when home is active */
	.logo-glow-active {
		position: relative;
		overflow: visible;
	}

	.logo-glow-active::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 50%;
		background: conic-gradient(
			from var(--glow-angle, 0deg),
			var(--item-glow-color, #667eea),
			transparent 60deg,
			transparent 300deg,
			var(--item-glow-color, #667eea)
		);
		opacity: 0.8;
		z-index: -1;
		animation: rotate-glow 3s linear infinite;
		filter: blur(4px);
	}

	.logo-glow-active::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		/* Use section-specific color */
		background: linear-gradient(135deg, var(--item-glow-color, #667eea), color-mix(in srgb, var(--item-glow-color, #667eea) 70%, #1a1a2e));
		z-index: -1;
	}

	/* Logo image styling */
	.logo-img {
		width: 28px;
		height: 28px;
		min-width: 28px;
		min-height: 28px;
		object-fit: contain;
		display: block;
	}

	/* Larger logo on mobile */
	@media (max-width: 768px) {
		.logo-img {
			width: 40px;
			height: 40px;
			min-width: 40px;
			min-height: 40px;
		}

		/* Remove margin on mobile since logo is centered */
		.neu-navbar-logo {
			margin-right: 0;
		}

		.neu-navbar-logo {
			width: 56px;
			height: 56px;
			min-width: 56px;
			min-height: 56px;
			padding: 8px;
		}

		/* Disable expensive animations on mobile to fix render issues */
		.logo-glow-active::before,
		.glow-active::before {
			animation: none !important;
			filter: none !important;
			opacity: 0.3;
		}
	}

	/* Rotating glow effect for active nav items */
	.glow-active {
		position: relative;
		overflow: visible;
	}

	.glow-active::before {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 50px;
		background: conic-gradient(
			from var(--glow-angle, 0deg),
			var(--item-glow-color, #667eea),
			transparent 60deg,
			transparent 300deg,
			var(--item-glow-color, #667eea)
		);
		opacity: 0.8;
		z-index: -1;
		animation: rotate-glow 3s linear infinite;
		filter: blur(4px);
	}

	.glow-active::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50px;
		/* Use section-specific color */
		background: linear-gradient(135deg, var(--item-glow-color, #667eea), color-mix(in srgb, var(--item-glow-color, #667eea) 70%, #1a1a2e));
		z-index: -1;
	}

	@keyframes rotate-glow {
		from {
			--glow-angle: 0deg;
		}
		to {
			--glow-angle: 360deg;
		}
	}

	/* Register the custom property for animation */
	@property --glow-angle {
		syntax: '<angle>';
		initial-value: 0deg;
		inherits: false;
	}

	@media (max-width: 640px) {
		nav {
			padding: 6px 10px;
		}

		:global(.neu-navbar-item) {
			padding: 6px 10px;
			font-size: 0.75rem;
		}

		.glow-active::before {
			inset: -1px;
			filter: blur(3px);
		}
	}

	/* Mobile nav header - even padding */
	.mobile-nav-header {
		padding: 8px;
	}

	/* Mobile interactive logo - underglow animation on home page */
	.mobile-interactive-logo {
		position: relative;
	}

	@media (max-width: 768px) {
		/* Expanding ring effect for mobile logo on home page - extends beyond container */
		.mobile-interactive-logo::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 100%;
			height: 100%;
			transform: translate(-50%, -50%);
			border-radius: 50%;
			border: 2px solid rgba(59, 130, 246, 0.9);
			box-shadow: 0 0 12px rgba(59, 130, 246, 0.7),
			           0 0 24px rgba(59, 130, 246, 0.5);
			animation: ring-disperse 2s ease-out infinite;
			z-index: -1;
			pointer-events: none;
		}

		/* Secondary ring layer with delay */
		.mobile-interactive-logo::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 100%;
			height: 100%;
			transform: translate(-50%, -50%);
			border-radius: 50%;
			border: 2px solid rgba(59, 130, 246, 0.8);
			box-shadow: 0 0 16px rgba(59, 130, 246, 0.6),
			           0 0 32px rgba(59, 130, 246, 0.4);
			animation: ring-disperse 2s ease-out infinite;
			animation-delay: 1s;
			z-index: -2;
			pointer-events: none;
		}

		.mobile-interactive-logo:hover::before {
			animation: ring-disperse 1.2s ease-out infinite;
		}

		.mobile-interactive-logo:hover::after {
			animation: ring-disperse 1.2s ease-out infinite;
			animation-delay: 0.6s;
		}

		.mobile-interactive-logo.menu-active::before {
			border-color: rgba(59, 130, 246, 1);
			box-shadow: 0 0 16px rgba(59, 130, 246, 0.9),
			           0 0 32px rgba(59, 130, 246, 0.7);
		}

		.mobile-interactive-logo.menu-active::after {
			border-color: rgba(59, 130, 246, 0.9);
			box-shadow: 0 0 20px rgba(59, 130, 246, 0.8),
			           0 0 40px rgba(59, 130, 246, 0.6);
		}
	}

	@keyframes ring-disperse {
		0% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) scale(3);
			opacity: 0;
		}
	}

	/* Mobile: Always use column layout */
	@media (max-width: 768px) {
		.neu-navbar {
			flex-direction: column;
			align-items: stretch;
		}
	}

	/* Mobile menu open state - expand navbar to accommodate menu */
	.neu-navbar.mobile-menu-open {
		border-radius: 20px;
		padding-bottom: 4px;
	}

	/* Smooth close animation when tapping close button */
	@media (max-width: 768px) {
		.neu-navbar.menu-closing {
			animation: menu-collapse 0.2s ease-in-out forwards;
		}

		/* Remove transition during animation for smoother effect */
		.neu-navbar.menu-closing {
			transition: none;
		}
	}

	@keyframes menu-collapse {
		0% {
			border-radius: 20px;
			padding-bottom: 4px;
		}
		100% {
			border-radius: 50px;
			padding-bottom: 8px;
		}
	}

	/* Mobile menu container - inside the nav */
	.mobile-menu-container {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px 4px 4px 4px;
		margin-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	/* Backdrop overlay */
	.mobile-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		z-index: 45;
	}

	.mobile-menu-item {
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

	.mobile-menu-item:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--neu-text-primary, #fff);
	}

	.mobile-menu-item.active {
		background: linear-gradient(135deg, var(--item-glow-color, #667eea), color-mix(in srgb, var(--item-glow-color, #667eea) 70%, #1a1a2e));
		color: var(--neu-text-primary, #fff);
		box-shadow:
			inset 2px 2px 4px rgba(255, 255, 255, 0.1),
			inset -2px -2px 4px rgba(0, 0, 0, 0.2);
	}

	/* Menu divider */
	.menu-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 8px 0;
	}
</style>
