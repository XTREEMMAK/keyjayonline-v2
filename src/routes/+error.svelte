<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { loadVantaScripts, waitForLibrary } from '$lib/utils/loadExternalScripts.js';
	
	let { data } = $props();
	let errorPageElement = $state();
	let vantaEffect = $state();
	
	// Get error details from page store
	const error = $derived($page.error);
	const status = $derived($page.status);
	
	onMount(async () => {
		console.log('Error page loaded:', { status, error });
		
		// Load Vanta scripts dynamically
		try {
			await loadVantaScripts();
			const VANTA = await waitForLibrary('VANTA');
			
			// Initialize Vanta.js background
			const initVanta = () => {
				if (VANTA && errorPageElement) {
					// Get full viewport dimensions
					const pageHeight = window.innerHeight;
					const pageWidth = window.innerWidth;
					
					vantaEffect = VANTA.CLOUDS({
					el: errorPageElement,
					mouseControls: true,
					touchControls: true,
					gyroControls: false,
					minHeight: pageHeight || 800,
					minWidth: pageWidth || 400,
					height: pageHeight || '100vh',
					width: pageWidth || '100vw',
					skyColor: 0xa3a4d,
					speed: 1.20 // Slightly slower for 404 page ambiance
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

<svelte:head>
	<title>{status || '404'} - Page Not Found | Key Jay Online</title>
	<meta name="description" content="The page you're looking for could not be found.">
</svelte:head>

<!-- Error page with Vanta.js background -->
<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4 relative overflow-hidden" bind:this={errorPageElement}>
	<!-- Semi-transparent overlay for better text contrast -->
	<div class="absolute inset-0 bg-black/30 z-5"></div>
	
	<div class="text-center relative z-10" in:fade={{ duration: 800 }}>
		<!-- Large Error Code Text -->
		<div class="mb-8" in:fly={{ y: -50, duration: 800, delay: 200 }}>
			<h1 class="text-8xl md:text-9xl font-bold text-white opacity-30 drop-shadow-2xl">{status || '404'}</h1>
		</div>
		
		<!-- Main Content -->
		<div class="max-w-md mx-auto" in:fly={{ y: 50, duration: 800, delay: 400 }}>
			<h2 class="text-3xl md:text-4xl font-light text-white mb-4 uppercase tracking-widest drop-shadow-lg">
				{#if status === 404}
					Page Not Found
				{:else if status === 500}
					Server Error
				{:else if status === 503}
					Service Unavailable
				{:else}
					Something Went Wrong
				{/if}
			</h2>
			
			<p class="text-lg text-gray-200 mb-8 leading-relaxed drop-shadow-md">
				{#if status === 404}
					Sorry, the page you're looking for doesn't exist or has been moved.
				{:else if status === 500}
					We encountered an internal server error. Please try again later.
				{:else if status === 503}
					This service is temporarily unavailable. Please check back soon.
				{:else}
					An unexpected error occurred. Please try again.
				{/if}
			</p>
			
			<!-- Error Details (for development) -->
			{#if error && error.message}
				<div class="mb-8 text-left bg-red-900/30 backdrop-blur-sm border border-red-500/40 rounded-lg p-4 shadow-xl">
					<h3 class="text-red-300 font-semibold mb-2">Error Details:</h3>
					<p class="text-red-200 text-sm font-mono">{error.message}</p>
				</div>
			{/if}
			
			<!-- Action Buttons -->
			<div class="space-y-4">
				<button
					onclick={() => goto('/')}
					class="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transform backdrop-blur-sm"
				>
					Go Home
				</button>
				
				<button
					onclick={() => window.history.back()}
					class="w-full px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-full hover:bg-white/20 hover:border-white/50 transition-all duration-300 shadow-lg"
				>
					Go Back
				</button>
			</div>
		</div>
		
		<!-- Enhanced Decorative Elements that blend with Vanta -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
			<div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full mix-blend-screen filter blur-xl animate-pulse"></div>
			<div class="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full mix-blend-screen filter blur-xl animate-pulse" style="animation-delay: 2s;"></div>
		</div>
	</div>
</div>