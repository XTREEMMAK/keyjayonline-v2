<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import Swal from 'sweetalert2';
	import { letterPulse } from '$lib/actions/letterAnimation.js';

	// Title letters for animation
	const titleLetters = 'Demo Gallery'.split('');

	// Sample comic pages - using placeholder images for now
	const samplePages = [
		{ id: 1, title: 'Page 1', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+1' },
		{ id: 2, title: 'Page 2', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+2' },
		{ id: 3, title: 'Page 3', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+3' },
		{ id: 4, title: 'Page 4', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+4' },
		{ id: 5, title: 'Page 5', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+5' },
		{ id: 6, title: 'Page 6', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+6' },
		{ id: 7, title: 'Page 7', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+7' },
		{ id: 8, title: 'Page 8', imageUrl: 'https://via.placeholder.com/400x600/2a2d35/667eea?text=Comic+Page+8' }
	];

	function openViewer(page) {
		Swal.fire({
			imageUrl: page.imageUrl,
			imageAlt: page.title,
			showConfirmButton: false,
			showCloseButton: true,
			background: '#2a2d35',
			width: 'auto',
			padding: '1rem',
			customClass: {
				popup: 'comic-viewer-popup',
				closeButton: 'comic-viewer-close'
			}
		});
	}
</script>

<svelte:head>
	<title>Demo Gallery - KEY JAY ONLINE</title>
	<meta name="description" content="Sample pages from comic-based properties and creative works" />
</svelte:head>

<div class="min-h-screen section-gradient-productions gradient-animated relative">
	<!-- Section Header -->
	<div class="pt-28 pb-8 text-center relative">
		<div class="absolute inset-0 bg-gradient-to-b from-orange-600/20 via-red-500/5 to-transparent pointer-events-none"></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			{#each titleLetters as letter, i}
				<span
					use:letterPulse={{ delay: i * 60 }}
					class="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent inline-block"
				>{letter === ' ' ? '\u00A0' : letter}</span>
			{/each}
		</h1>
		<p class="text-lg text-orange-200/70 relative">Sample pages from comic-based properties</p>
	</div>

	<!-- Gallery Section -->
	<section class="py-16 relative">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<Icon icon="mdi:book-open-variant" class="text-orange-400 text-5xl mb-4 mx-auto" />
				<h2 class="text-3xl font-bold text-white mb-4">Comic Sample Pages</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Preview sample pages from various comic-based properties. Click on any page to view it in full size.
				</p>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each samplePages as page}
					<button
						onclick={() => openViewer(page)}
						class="neu-card p-3 hover:scale-105 transition-all duration-300 group cursor-pointer"
					>
						<div class="aspect-[2/3] relative overflow-hidden rounded-lg">
							<img
								src={page.imageUrl}
								alt={page.title}
								class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
								<div class="bg-white/10 backdrop-blur-sm rounded-full p-4">
									<Icon icon="mdi:magnify-plus" class="text-white text-3xl" />
								</div>
							</div>
						</div>
						<p class="text-sm text-gray-400 mt-3 text-center font-medium">{page.title}</p>
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Info Section -->
	<section class="subsection-gradient-dark subsection-accent-blue relative py-16">
		<div class="container mx-auto px-4 text-center">
			<Icon icon="mdi:information-outline" class="text-orange-400 text-5xl mb-4 mx-auto" />
			<h2 class="text-3xl font-bold text-white mb-4">About This Demo</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				This gallery showcases sample pages from various comic-based intellectual properties.
				The images shown here are placeholders - replace them with actual comic pages by adding
				images to the <code class="text-orange-400 bg-gray-800 px-2 py-1 rounded">/static/img/demo/</code> directory.
			</p>

			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="/productions"
					class="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25"
				>
					<Icon icon="mdi:arrow-left" class="text-xl" />
					Back to Productions
				</a>
				<a
					href="/"
					class="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-all duration-300"
				>
					<Icon icon="mdi:home" class="text-xl" />
					Home
				</a>
			</div>
		</div>
	</section>
</div>

<style>
	:global(.comic-viewer-popup) {
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(.comic-viewer-close) {
		color: white !important;
	}

	:global(.comic-viewer-close:hover) {
		color: #f97316 !important;
	}

	.neu-card {
		background: rgba(42, 45, 53, 0.8);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow:
			8px 8px 16px rgba(18, 20, 24, 0.6),
			-8px -8px 16px rgba(60, 64, 72, 0.3);
	}

	.neu-card:hover {
		border-color: rgba(249, 115, 22, 0.3);
		box-shadow:
			8px 8px 16px rgba(18, 20, 24, 0.6),
			-8px -8px 16px rgba(60, 64, 72, 0.3),
			0 0 20px rgba(249, 115, 22, 0.1);
	}
</style>
