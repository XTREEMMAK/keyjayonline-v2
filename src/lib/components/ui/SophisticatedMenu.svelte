<script>
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import SocialIcons from '$lib/components/ui/SocialIcons.svelte';
	import { browser } from '$app/environment';
	
	let {
		isOpen = false,
		onClose = () => {},
		siteSettings = null
	} = $props();
	
	let isSmallScreen = $state(false);
	
	const allMenuItems = [
		{ name: 'Home', href: '/', icon: 'mdi:home-outline', description: 'Return to the main page', pageKey: 'home' },
		{ name: 'Music', href: '/music', icon: 'mdi:music-note-outline', description: 'Explore albums, singles & beats', pageKey: 'music' },
		{ name: 'Games', href: '/games', icon: 'mdi:gamepad-variant-outline', description: 'Gaming content & reviews', pageKey: 'games' },
		{ name: 'Voice', href: '/voice', icon: 'mdi:microphone-outline', description: 'Voice work portfolio', pageKey: 'voice' },
		{ name: 'Tech', href: '/tech', icon: 'mdi:code-tags', description: 'Projects & tutorials', pageKey: 'tech' },
		{ name: 'Productions', href: '/productions', icon: 'mdi:video-outline', description: 'Creative services', pageKey: 'productions' },
		{ name: 'Blog', href: '/blog', icon: 'mdi:pencil-outline', description: 'Latest thoughts & updates', pageKey: 'blog' },
		{ name: 'About', href: '/about', icon: 'mdi:account-outline', description: 'Learn about Key Jay', pageKey: 'about' },
		{ name: 'Contact', href: '/contact', icon: 'mdi:email-outline', description: 'Get in touch', pageKey: 'contact' }
	];

	// Filter out disabled pages
	const menuItems = $derived(() => {
		console.log('SophisticatedMenu - siteSettings:', siteSettings);
		
		if (!siteSettings?.pages) {
			console.log('SophisticatedMenu - No pages config, showing all items');
			return allMenuItems;
		}
		
		const filteredItems = allMenuItems.filter(item => {
			// Always show home page
			if (item.pageKey === 'home') return true;
			
			const pageConfig = siteSettings.pages[item.pageKey];
			const isDisabled = pageConfig?.disabled;
			
			console.log(`SophisticatedMenu - ${item.pageKey}:`, { pageConfig, isDisabled, shouldShow: !isDisabled });
			
			return !isDisabled;
		});
		
		console.log('SophisticatedMenu - Filtered menu items:', filteredItems.map(i => i.pageKey));
		return filteredItems;
	});
	
	onMount(() => {
		// Load Iconify for icons
		if (browser) {
			const script = document.createElement('script');
			script.src = 'https://code.iconify.design/iconify-icon/2.0.0/iconify-icon.min.js';
			document.head.appendChild(script);
			
			// Check screen size
			function checkScreenSize() {
				isSmallScreen = window.innerWidth < 648;
			}
			
			checkScreenSize();
			window.addEventListener('resize', checkScreenSize);
			
			return () => {
				window.removeEventListener('resize', checkScreenSize);
			};
		}
	});
	
	function handleNavClick(href) {
		onClose();
		// Use SvelteKit navigation instead of window.location
		if (browser) {
			// Import goto dynamically to avoid SSR issues
			import('$app/navigation').then(({ goto }) => {
				// Small delay to allow menu close animation
				setTimeout(() => {
					goto(href);
				}, 300);
			});
		}
	}
</script>

{#if isOpen}
	<div 
		class="fixed inset-0 z-50 flex"
		transition:fade={{ duration: 400 }}
	>
		<!-- Backdrop -->
		<div 
			class="absolute inset-0 bg-black/80 backdrop-blur-md"
			onclick={onClose}
			onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
			role="button"
			tabindex="0"
			aria-label="Close menu overlay"
		></div>
		
		<!-- Menu Panel -->
		<div 
			class="relative mr-auto sm:mr-0 sm:ml-auto w-full max-w-md h-full bg-gradient-to-br from-gray-900/95 via-blue-900/20 to-purple-900/20 backdrop-blur-xl border-r sm:border-r-0 sm:border-l border-white/10"
			transition:fly={{ x: isSmallScreen ? -300 : 300, duration: 500, easing: cubicOut }}
		>
			<!-- Close button -->
			<button 
				onclick={onClose}
				class="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-full transition-colors z-10"
				transition:scale={{ delay: 200, duration: 300 }}
				aria-label="Close menu"
			>
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
			
			<!-- Menu Content -->
			<div class="h-full flex flex-col p-6 pt-20">
				<!-- Brand -->
				<div class="mb-6 flex-shrink-0" transition:fly={{ y: -20, delay: 100, duration: 400 }}>
					<h2 class="text-xl font-bold text-white mb-2">Navigation</h2>
					<div class="w-10 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
				</div>
				
				<!-- Menu Items -->
				<nav class="flex-1 overflow-y-auto min-h-0 nav-scroll">
					<ul class="space-y-1 pb-4 pr-2">
						{#each menuItems() as item, i}
							{#if isOpen}
								<li 
									in:fly={{ 
										x: isSmallScreen ? -50 : 50, 
										delay: 100 + (i * 50), 
										duration: 400,
										easing: cubicOut 
									}}
									out:fly={{ 
										x: isSmallScreen ? -50 : 50, 
										duration: 200,
										easing: cubicOut 
									}}
								>
								<button
									onclick={() => handleNavClick(item.href)}
									class="group w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 text-left border border-transparent hover:border-white/10"
								>
									<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all duration-300 flex-shrink-0">
										<iconify-icon 
											icon={item.icon} 
											class="text-lg text-blue-400 group-hover:text-white transition-colors duration-300"
										></iconify-icon>
									</div>
									<div class="flex-1 min-w-0">
										<div class="text-white font-medium group-hover:text-blue-300 transition-colors duration-300 truncate">
											{item.name}
										</div>
										<div class="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300 truncate">
											{item.description}
										</div>
									</div>
									<svg class="w-4 h-4 text-gray-500 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
									</svg>
								</button>
							</li>
							{/if}
						{/each}
					</ul>
				</nav>
				
				<!-- Social Links -->
				<div class="mt-4 pt-4 border-t border-white/10 flex-shrink-0" transition:fly={{ 
					y: 20, 
					delay: 300 + (menuItems().length * 40), 
					duration: 400,
					easing: cubicOut 
				}}>
					<div class="text-center">
						<h3 class="text-white font-medium mb-2 text-sm">Connect</h3>
						<div class="flex justify-center">
							<SocialIcons 
								layout="horizontal" 
								size={24} 
								gap="gap-3" 
								className="text-gray-400 hover:text-white" 
							/>
						</div>
					</div>
				</div>
				
				<!-- Footer -->
				<div class="mt-3 text-center flex-shrink-0" transition:fly={{ 
					y: 20, 
					delay: 350 + (menuItems().length * 40), 
					duration: 400,
					easing: cubicOut 
				}}>
					<p class="text-gray-500 text-sm">
						© 2024 Key Jay Online
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar styling matching music modal */
	.nav-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgba(59, 130, 246, 0.6) rgba(31, 41, 55, 0.3);
	}
	
	.nav-scroll::-webkit-scrollbar {
		width: 6px;
	}
	
	.nav-scroll::-webkit-scrollbar-track {
		background: rgba(31, 41, 55, 0.2);
		border-radius: 3px;
	}
	
	.nav-scroll::-webkit-scrollbar-thumb {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4));
		border-radius: 3px;
	}
	
	.nav-scroll::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(147, 51, 234, 0.6));
	}
</style>