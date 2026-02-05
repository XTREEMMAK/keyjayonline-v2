<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import SocialIcons from '$lib/components/ui/SocialIcons.svelte';
	import SophisticatedMenu from '$lib/components/ui/SophisticatedMenu.svelte';
	
	let { 
		siteSettings = null,
		socialLinks = []
	} = $props();
	
	let menuButton = $state();
	let logo = $state();
	let navOpen = $state(false);
	let lastScrollY = $state(0);
	let showNavigation = $state(true);
	let isMobile = $state(false);
	let isScrolled = $state(false);

	onMount(() => {
		let ticking = false;

		// Check if mobile on mount and resize
		function checkMobile() {
			isMobile = window.innerWidth < 640;
		}

		// Scroll-based hiding/showing of navigation with smooth transitions and increased threshold
		function handleScroll() {
			if (!ticking) {
				requestAnimationFrame(() => {
					const currentScrollY = window.scrollY;
					const scrollDifference = Math.abs(currentScrollY - lastScrollY);

					// Track if we've scrolled to activate sticky nav effects
					isScrolled = currentScrollY > 50;

					// Increased scroll play - only trigger if there's significant scroll movement
					if (scrollDifference > 15) {
						// Hide navigation on scroll down (increased threshold for more scroll play)
						if (currentScrollY > lastScrollY && currentScrollY > 200) {
							showNavigation = false;
						}
						// Show navigation on scroll up
						else if (currentScrollY < lastScrollY || currentScrollY <= 150) {
							showNavigation = true;
						}

						lastScrollY = currentScrollY;
					}
					
					ticking = false;
				});
				
				ticking = true;
			}
		}

		// Initial mobile check
		checkMobile();

		// Use passive listener for better performance
		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', checkMobile, { passive: true });
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', checkMobile);
		};
	});

	function toggleMenu() {
		navOpen = !navOpen;
		document.body.style.overflow = navOpen ? 'hidden' : 'auto';
	}

	function closeMenu() {
		navOpen = false;
		document.body.style.overflow = 'auto';
	}
</script>

{#if showNavigation}
	<!-- Header containing logo and menu button -->
	<div class="fixed top-6 left-1/2 -translate-x-1/2 z-50 sm:left-6 sm:translate-x-0 hidden sm:block {isScrolled ? '-mt-6' : ''}" transition:fly={{ x: -200, duration: 400 }}>
		<!-- Logo - Use a larger size and center on mobile -->
		<a href="/" class="logo p-2 transition-all duration-700 ease-out transform scale-100 hover:scale-105 flex flex-col items-center group" bind:this={logo}>
			<img src="/img/KJ_Logo_Medium_W.svg" alt="KEY JAY Logo" class="w-16 sm:w-24 md:w-32 h-auto transition-all duration-700 group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" width="128" height="128">
			<span class="text-white text-xs sm:text-sm font-light tracking-wider mt-1 opacity-80 transition-all duration-700 group-hover:opacity-100 group-hover:text-blue-200">KEYJAY ONLINE</span>
		</a>
	</div>

	<div class="fixed top-6 left-6 sm:left-auto sm:right-6 z-50 flex items-center gap-4" 
		 transition:fly={{ 
			x: isMobile ? -200 : 200, 
			duration: 400 
		 }}>
		<!-- Social Media Section - Hidden on smaller screens -->
		{#if !navOpen}
			<div class="hidden sm:flex items-center"
				 in:fly={{ x: 200, duration: 300, delay: 100 }}
				 out:fly={{ x: 200, duration: 300 }}>
				<SocialIcons layout="horizontal" size={32} gap="gap-4" className="text-white" {socialLinks} />
			</div>
		{/if}
		
		<!-- Menu Button -->
		{#if !navOpen}
			<div class="menu-button cursor-pointer px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-gray-900/50 hover:bg-gray-800/70 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-700 ease-out flex items-center justify-center gap-1 sm:gap-2 group" 
				 bind:this={menuButton} 
				 onclick={toggleMenu}
				 onkeydown={(e) => {
				 	if (e.key === 'Enter' || e.key === ' ') {
				 		e.preventDefault();
				 		toggleMenu();
				 	}
				 }}
				 role="button" 
				 tabindex="0"
				 in:fly={{ x: isMobile ? -50 : 50, duration: 300, delay: 100 }}
				 out:fly={{ x: isMobile ? -50 : 50, duration: 300 }}>
			<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-blue-300 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
			</svg>
			<span class="text-white text-sm sm:text-xl font-semibold tracking-wider group-hover:text-blue-300 transition-colors duration-700">MENU</span>
			</div>
		{/if}
	</div>
{/if}

<!-- Sophisticated Menu -->
<SophisticatedMenu 
	isOpen={navOpen}
	onClose={closeMenu}
	siteSettings={siteSettings}
/>