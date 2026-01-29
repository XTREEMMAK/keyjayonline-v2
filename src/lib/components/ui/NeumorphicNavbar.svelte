<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { activeSection, navigateTo, sectionMeta, sections, navbarVisible } from '$lib/stores/navigation.js';
	import { hideMainNavbar } from '$lib/stores/stickyNav.js';
	import { browser } from '$app/environment';

	let isVisible = $state(true);
	let isScrolled = $state(false);
	let lastScrollY = 0;
	let isMobileMenuOpen = $state(false);
	let hasInitiallyLoaded = $state(false);

	// Navigation items (exclude home from visible nav, it's the default)
	const navItems = sections.filter((s) => s !== 'home');

	// Get the glow color for the current active section
	const glowColor = $derived(sectionMeta[$activeSection]?.color || '#667eea');

	// Combined visibility - hide if scroll hidden OR if section subnav takes over
	const shouldShow = $derived(isVisible && !$hideMainNavbar);

	onMount(() => {
		if (!browser) return;

		// Trigger initial slide-down animation after a brief delay
		setTimeout(() => {
			hasInitiallyLoaded = true;
		}, 100);

		function handleScroll() {
			const currentScrollY = window.scrollY;
			isScrolled = currentScrollY > 50;

			// Hide on scroll down, show on scroll up (only after 200px)
			if (currentScrollY > lastScrollY && currentScrollY > 200) {
				isVisible = false;
				isMobileMenuOpen = false;
				navbarVisible.set(false);
			} else {
				isVisible = true;
				navbarVisible.set(true);
			}

			lastScrollY = currentScrollY;
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function handleNavClick(section) {
		navigateTo(section);
		isMobileMenuOpen = false;
	}

	function goHome() {
		navigateTo('home');
		isMobileMenuOpen = false;
	}
</script>

{#if shouldShow && hasInitiallyLoaded}
	<nav
		class="neu-navbar flex items-center gap-1 transition-all duration-300"
		class:shadow-2xl={isScrolled}
		in:fly={{ y: -100, duration: 400 }}
		out:fly={{ y: -100, duration: 300 }}
		aria-label="Main navigation"
		style="--section-glow-color: {glowColor};"
	>
		<!-- Logo / Home button -->
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
		<div class="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

		<!-- Desktop Navigation -->
		<div class="hidden md:flex items-center gap-1">
			{#each navItems as section}
				<button
					class="neu-navbar-item uppercase tracking-wider"
					class:active={$activeSection === section}
					class:glow-active={$activeSection === section}
					onclick={() => handleNavClick(section)}
					aria-current={$activeSection === section ? 'page' : undefined}
					style="--item-glow-color: {sectionMeta[section].color};"
				>
					{sectionMeta[section].label}
				</button>
			{/each}
		</div>

		<!-- Mobile Navigation - Hamburger Menu -->
		<div class="flex md:hidden items-center">
			<button
				class="hamburger-btn p-2"
				class:open={isMobileMenuOpen}
				onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
				aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={isMobileMenuOpen}
			>
				<span class="hamburger-line"></span>
				<span class="hamburger-line"></span>
				<span class="hamburger-line"></span>
			</button>
		</div>
	</nav>

	<!-- Mobile Menu Dropdown -->
	{#if isMobileMenuOpen}
		<div
			class="mobile-menu-overlay md:hidden"
			onclick={() => isMobileMenuOpen = false}
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="mobile-menu" onclick={(e) => e.stopPropagation()}>
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
		</div>
	{/if}
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

	/* Mobile Menu Overlay */
	.mobile-menu-overlay {
		position: fixed;
		top: 70px;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 45;
	}

	.mobile-menu {
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
</style>
