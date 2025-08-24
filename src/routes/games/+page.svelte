<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';

	let {
		data
	} = $props();

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);

	// Game reviews data
	const gameReviews = [
		{
			id: 1,
			title: 'Cyberpunk 2077: Phantom Liberty',
			platform: 'PC',
			rating: 8.5,
			image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
			category: 'RPG',
			description: 'A compelling expansion that redeems the original with improved gameplay and storytelling.',
			review_date: '2024-03-15',
			playtime: '45 hours'
		},
		{
			id: 2,
			title: 'Baldur\'s Gate 3',
			platform: 'PC',
			rating: 9.2,
			image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600',
			category: 'RPG',
			description: 'A masterpiece of storytelling and player choice that sets a new standard for RPGs.',
			review_date: '2024-02-28',
			playtime: '120 hours'
		},
		{
			id: 3,
			title: 'Spider-Man 2',
			platform: 'PS5',
			rating: 8.8,
			image: 'https://images.unsplash.com/photo-1591154669695-5f2a8d20c089?w=600',
			category: 'Action',
			description: 'Incredible web-swinging mechanics with a solid story featuring both Spider-Men.',
			review_date: '2024-02-10',
			playtime: '25 hours'
		}
	];

	// Content creation data
	const gameContent = [
		{
			id: 1,
			type: 'Stream Highlight',
			title: 'Epic Boss Fight: Elden Ring',
			thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600',
			duration: '12:34',
			views: '15.2K',
			description: 'Watch as I take on one of the toughest bosses in Elden Ring'
		},
		{
			id: 2,
			type: 'Tutorial',
			title: 'How to Build in Minecraft',
			thumbnail: 'https://images.unsplash.com/photo-1585504198199-20277593b94f?w=600',
			duration: '18:45',
			views: '8.7K',
			description: 'Learn advanced building techniques for creating stunning structures'
		},
		{
			id: 3,
			type: 'Review',
			title: 'Is Starfield Worth Playing?',
			thumbnail: 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=600',
			duration: '22:10',
			views: '23.1K',
			description: 'My honest thoughts after 100+ hours in Bethesda\'s space epic'
		}
	];

	onMount(() => {
		if (!browser) return;

		let ticking = false;
		
		function updateParallax() {
			scrollY = window.scrollY;
			
			if (heroRef) {
				const heroHeight = heroRef.offsetHeight;
				const heroRect = heroRef.getBoundingClientRect();
				
				if (heroRect.top < -(heroHeight * 0.7)) {
					// Animate out first, then hide
					if (titleVisible && titleAnimated) {
						titleAnimated = false;
						setTimeout(() => {
							titleVisible = false;
						}, 300); // Wait for animation to complete
					}
				} else {
					if (!titleVisible) {
						titleVisible = true;
						setTimeout(() => {
							titleAnimated = true;
						}, 100);
					} else if (!titleAnimated) {
						titleAnimated = true;
					}
				}
			}
			
			ticking = false;
		}
		
		function handleScroll() {
			if (!ticking) {
				requestAnimationFrame(updateParallax);
				ticking = true;
			}
		}

		setTimeout(() => {
			titleAnimated = true;
		}, 500);

		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<svelte:head>
	<title>Games - KEY JAY ONLINE</title>
	<meta name="description" content="Gaming content, reviews, and entertainment from KEY JAY" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200" 
				alt="Gaming Setup"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="games-title text-7xl sm:text-8xl md:text-9xl font-bold text-white" class:animate={titleAnimated}>
						GAMES
					</h1>
					<p class="games-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Reviews, gameplay highlights, and gaming content from a music producer's perspective
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Game Reviews Section -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-20">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Game Reviews</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Honest reviews and insights from my gaming experiences across multiple platforms
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each gameReviews as game}
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 flex flex-col min-h-[500px]">
						<div class="aspect-video relative">
							<img 
								src={game.image} 
								alt={game.title}
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute top-4 left-4">
								<span class="bg-purple-600/20 text-purple-400 px-2 py-1 text-xs rounded-full border border-purple-600/30">{game.category}</span>
							</div>
							<div class="absolute top-4 right-4">
								<span class="bg-green-600/20 text-green-400 px-2 py-1 text-xs rounded-full border border-green-600/30">{game.platform}</span>
							</div>
							<div class="absolute bottom-4 right-4">
								<div class="flex items-center gap-1">
									<iconify-icon icon="mdi:star" class="text-yellow-400 text-lg"></iconify-icon>
									<span class="text-white font-bold">{game.rating}/10</span>
								</div>
							</div>
						</div>
						<div class="p-8 flex-1 flex flex-col justify-between">
							<div>
								<h3 class="text-xl font-semibold text-white mb-3 line-clamp-2">
									{game.title}
								</h3>
								<p class="text-gray-400 text-sm mb-4 line-clamp-3">
									{game.description}
								</p>
							</div>
							<div class="space-y-3">
								<div class="flex items-center justify-between text-xs text-gray-500">
									<span>Playtime: {game.playtime}</span>
									<span>{game.review_date}</span>
								</div>
								<button class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105">
									Read Full Review
								</button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="wave" className="text-gray-800" />
	</div>

	<!-- Gaming Content Section -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Gaming Content</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Stream highlights, tutorials, and gaming videos from my content creation journey
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each gameContent as content}
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 group cursor-pointer">
						<div class="aspect-video relative">
							<img 
								src={content.thumbnail} 
								alt={content.title}
								class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
							<div class="absolute top-4 left-4">
								<span class="bg-red-600/20 text-red-400 px-2 py-1 text-xs rounded-full border border-red-600/30">{content.type}</span>
							</div>
							<div class="absolute bottom-4 right-4">
								<span class="bg-black/60 text-white px-2 py-1 text-xs rounded">{content.duration}</span>
							</div>
							<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
								<div class="bg-white/10 backdrop-blur-sm rounded-full p-4">
									<iconify-icon icon="mdi:play" class="text-white text-3xl"></iconify-icon>
								</div>
							</div>
						</div>
						<div class="p-6">
							<h3 class="text-lg font-semibold text-white mb-2 line-clamp-2">
								{content.title}
							</h3>
							<p class="text-gray-400 text-sm mb-3 line-clamp-2">
								{content.description}
							</p>
							<div class="flex items-center justify-between text-xs text-gray-500">
								<span>{content.views} views</span>
								<iconify-icon icon="mdi:eye" class="text-gray-500"></iconify-icon>
							</div>
						</div>
					</article>
				{/each}
			</div>

			<div class="text-center mt-12">
				{@const youtubeLink = data.socialLinks.find(link => link.name?.toLowerCase().includes('youtube'))}
				{#if youtubeLink}
					<a 
						href={youtubeLink.url} 
						target="_blank"
						class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-full hover:from-red-700 hover:to-pink-700 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/30 hover:scale-105 transform"
					>
						<iconify-icon icon="mdi:youtube" class="text-xl"></iconify-icon>
						Watch More on YouTube
					</a>
				{/if}
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="curve" flipY={true} className="text-blue-900" />
	</div>

	<!-- Gaming Setup Section -->
	<section class="bg-gradient-to-br from-blue-900/20 via-gray-900 to-purple-900/20 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">My Gaming Setup</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				When I'm not creating music, I'm diving into virtual worlds. Here's the gear that powers both my gaming and streaming content.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
				<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 text-center">
					<iconify-icon icon="mdi:monitor" class="text-blue-400 text-4xl mb-4"></iconify-icon>
					<h3 class="text-white font-semibold mb-2">Display</h3>
					<p class="text-gray-400 text-sm">32" 4K Gaming Monitor</p>
				</div>
				<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 text-center">
					<iconify-icon icon="mdi:desktop-tower" class="text-purple-400 text-4xl mb-4"></iconify-icon>
					<h3 class="text-white font-semibold mb-2">PC</h3>
					<p class="text-gray-400 text-sm">Custom Built Gaming Rig</p>
				</div>
				<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 text-center">
					<iconify-icon icon="mdi:gamepad-variant" class="text-green-400 text-4xl mb-4"></iconify-icon>
					<h3 class="text-white font-semibold mb-2">Controller</h3>
					<p class="text-gray-400 text-sm">Xbox Series X Controller</p>
				</div>
				<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 text-center">
					<iconify-icon icon="mdi:headphones" class="text-yellow-400 text-4xl mb-4"></iconify-icon>
					<h3 class="text-white font-semibold mb-2">Audio</h3>
					<p class="text-gray-400 text-sm">Studio Headphones</p>
				</div>
			</div>

			<button class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transform">
				Connect & Game Together
			</button>
		</div>
	</section>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 3rem;
		line-clamp: 2;
	}
	
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 4.5rem;
		line-clamp: 3;
	}

	.games-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.games-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.games-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.games-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}
</style>