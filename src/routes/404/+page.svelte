<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';

	onMount(() => {
		// Optional: Redirect to home after a delay
		// setTimeout(() => {
		// 	goto('/');
		// }, 5000);
	});
</script>

<svelte:head>
	<title>404 - Page Not Found | Key Jay Online</title>
	<meta name="description" content="The page you're looking for could not be found.">
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
	<div class="text-center" in:fade={{ duration: 800 }}>
		<!-- Large 404 Text -->
		<div class="mb-8" in:fly={{ y: -50, duration: 800, delay: 200 }}>
			<h1 class="text-8xl md:text-9xl font-bold text-white opacity-20">404</h1>
		</div>
		
		<!-- Main Content -->
		<div class="max-w-md mx-auto" in:fly={{ y: 50, duration: 800, delay: 400 }}>
			<h2 class="text-3xl md:text-4xl font-light text-white mb-4 uppercase tracking-widest">
				Page Not Found
			</h2>
			
			<p class="text-lg text-gray-300 mb-8 leading-relaxed">
				Sorry, the page you're looking for doesn't exist or has been moved.
			</p>
			
			<!-- Action Buttons -->
			<div class="space-y-4">
				<button
					onclick={() => goto('/')}
					class="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transform"
				>
					Go Home
				</button>
				
				<button
					onclick={() => window.history.back()}
					class="w-full px-8 py-4 bg-transparent border border-gray-400 text-gray-300 font-semibold rounded-full hover:bg-gray-800/50 hover:text-white hover:border-white transition-all duration-300"
				>
					Go Back
				</button>
			</div>
		</div>
		
		<!-- Decorative Elements -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
			<div class="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style="animation-delay: 2s;"></div>
		</div>
	</div>
</div>