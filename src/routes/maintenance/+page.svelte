<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { PUBLIC_CONTACT_EMAIL } from '$env/static/public';

	let currentTime = $state('');

	onMount(() => {
		// Update time every second
		function updateTime() {
			const now = new Date();
			currentTime = now.toLocaleTimeString('en-US', { 
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		}
		
		updateTime();
		const interval = setInterval(updateTime, 1000);
		
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Under Maintenance | Key Jay Online</title>
	<meta name="description" content="Key Jay Online is currently under maintenance. We'll be back soon!">
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
	<div class="text-center max-w-2xl mx-auto" in:fade={{ duration: 800 }}>
		
		<!-- Logo/Icon -->
		<div class="mb-8" in:fly={{ y: -30, duration: 800, delay: 200 }}>
			<div class="w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
				<iconify-icon icon="mdi:wrench" class="text-white text-4xl"></iconify-icon>
			</div>
		</div>
		
		<!-- Main Content -->
		<div in:fly={{ y: 50, duration: 800, delay: 400 }}>
			<h1 class="text-4xl md:text-5xl font-light text-white mb-6 uppercase tracking-widest">
				Under Maintenance
			</h1>
			
			<p class="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
				We're currently performing some updates to improve your experience. 
				<br class="hidden md:block">
				We'll be back online shortly!
			</p>
			
			<!-- Time Display -->
			<div class="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl mb-8">
				<div class="text-gray-400 text-sm uppercase tracking-wider mb-2">Current Time (UTC)</div>
				<div class="text-3xl md:text-4xl font-mono text-white">{currentTime}</div>
			</div>
			
			<!-- Expected Return -->
			<div class="bg-blue-900/30 rounded-xl p-4 border border-blue-500/30 mb-8">
				<p class="text-blue-200 text-sm">
					<strong>Expected return:</strong> We aim to be back within the next few hours.
				</p>
			</div>
			
			<!-- Contact Info -->
			<div class="text-gray-400 text-sm">
				<p>Need immediate assistance? Contact us at:</p>
				<a href="mailto:{PUBLIC_CONTACT_EMAIL}" 
				   class="text-blue-400 hover:text-blue-300 transition-colors duration-300">
					{PUBLIC_CONTACT_EMAIL}
				</a>
			</div>
		</div>
		
		<!-- Decorative Elements -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
			<div class="absolute bottom-20 right-20 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style="animation-delay: 1.5s;"></div>
			<div class="absolute top-1/2 left-10 w-20 h-20 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style="animation-delay: 3s;"></div>
		</div>
	</div>
</div>

