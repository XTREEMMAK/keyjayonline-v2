<script>
	import SocialIcons from '$lib/components/ui/SocialIcons.svelte';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { loadVantaScripts, waitForLibrary } from '$lib/utils/loadExternalScripts.js';
	import { navigateTo, sections, sectionMeta } from '$lib/stores/navigation.js';

	let {
		siteSettings = null,
		socialLinks = [],
		supportPlatforms = []
	} = $props();

	let footerElement = $state();
	let vantaEffect = $state();

	// Navigation items from the navigation store (excludes hidden pages like games, tech, blog)
	const navItems = sections.map((section) => ({
		section,
		label: sectionMeta[section]?.label || section
	}));

	function handleNavClick(e, section) {
		e.preventDefault();
		navigateTo(section);
		// Scroll to top
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
	
	onMount(async () => {
		// Load Vanta scripts dynamically
		try {
			await loadVantaScripts();
			const VANTA = await waitForLibrary('VANTA');
			
			// Small delay to ensure DOM is fully rendered
			const initVanta = () => {
				if (VANTA && footerElement) {
					// Get actual height of the footer element
					const footerHeight = footerElement.offsetHeight;
					const footerWidth = footerElement.offsetWidth;
				
				vantaEffect = VANTA.CLOUDS({
					el: footerElement,
					mouseControls: true,
					touchControls: true,
					gyroControls: false,
					minHeight: footerHeight || 400,
					minWidth: footerWidth || 200,
					height: footerHeight || '100%',
					width: footerWidth || '100%',
					skyColor: 0xa3a4d,
					speed: 1.60
				});
				
				// Force resize after initialization
				if (vantaEffect && vantaEffect.resize) {
					setTimeout(() => {
						vantaEffect.resize();
					}, 100);
				}
			}
		};
		
			// Initialize with a small delay
			setTimeout(initVanta, 50);
			
			// Cleanup function
			return () => {
				if (vantaEffect) {
					vantaEffect.destroy();
				}
			};
		} catch (error) {
			console.error('Failed to load Vanta background:', error);
		}
	});
</script>

<!-- Footer with Sitemap, Socials, and Linktree -->
<footer id="contact" class="relative py-16 px-4 text-center overflow-hidden min-h-[400px]" bind:this={footerElement}>
	<!-- Semi-transparent overlay for better contrast -->
	<div class="absolute inset-0 bg-black/40 z-5"></div>
	<div class="container mx-auto max-w-xl relative z-10">
		<!-- Logo -->
		<div class="flex flex-col items-center mb-6">
			<div class="w-1/2">
				<img src="/img/KJ_Logo_Medium_W.svg" alt="KEY JAY Logo" class="w-auto h-auto footer-logo drop-shadow-xl" width="256" height="256">
			</div>

			<span class="text-white text-4xl font-light tracking-wider mt-2 opacity-90 drop-shadow-lg">KEYJAY ONLINE</span>

			<!-- Social Media Icons - Centered below KEYJAY ONLINE -->
			<div class="flex justify-center mt-4 mb-2">
				<SocialIcons layout="horizontal" size={32} gap="gap-5" className="text-white/80 hover:text-white drop-shadow-lg" {socialLinks} />
			</div>

			<!-- Support Platforms (Ko-Fi, Patreon, etc.) - Subtle placement -->
			{#if supportPlatforms && supportPlatforms.length > 0}
				<div class="flex justify-center gap-3 mt-3">
					{#each supportPlatforms as platform}
						<a
							href={platform.url}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white text-sm transition-all duration-300 hover:scale-105"
							title="Support on {platform.name}"
						>
							<Icon icon={platform.icon || 'mdi:heart'} class="text-lg" />
							<span class="text-xs font-medium">{platform.name}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Site Navigation (SPA hash-based) -->
		<nav class="mb-6">
			<div class="flex flex-wrap justify-center gap-2 text-white text-sm drop-shadow-lg">
				{#each navItems as item, index}
					<button
						onclick={(e) => handleNavClick(e, item.section)}
						class="hover:text-blue-400 transition-colors duration-300 cursor-pointer bg-transparent border-none"
					>
						{item.label}
					</button>
					{#if index < navItems.length - 1}
						<span>|</span>
					{/if}
				{/each}
			</div>
		</nav>

		<!-- Copyright -->
		<p class="text-white text-sm drop-shadow-lg">
			© {new Date().getFullYear()} J2it. All rights reserved.
		</p>
	</div>
</footer>