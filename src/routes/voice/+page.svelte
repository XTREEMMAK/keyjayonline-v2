<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import { letterPulse } from '$lib/actions/letterAnimation.js';

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);

	// Title letters for animation
	const titleLetters = 'VOICE'.split('');

	// Voice work categories
	const voiceCategories = [
		{
			id: 'commercial',
			name: 'Commercial',
			description: 'Professional voice-overs for advertisements and marketing',
			samples: [
				{
					title: 'Tech Product Launch',
					description: 'Energetic commercial for new smartphone',
					audio_url: '/audio/commercial-tech.mp3',
					duration: '0:30',
					style: 'Energetic, Professional'
				},
				{
					title: 'Coffee Brand Ad',
					description: 'Warm, inviting voice for premium coffee',
					audio_url: '/audio/commercial-coffee.mp3',
					duration: '0:45',
					style: 'Warm, Conversational'
				}
			]
		},
		{
			id: 'narration',
			name: 'Narration',
			description: 'Documentary and educational content narration',
			samples: [
				{
					title: 'Nature Documentary',
					description: 'Calm narration for wildlife documentary',
					audio_url: '/audio/narration-nature.mp3',
					duration: '1:20',
					style: 'Calm, Authoritative'
				},
				{
					title: 'Historical Timeline',
					description: 'Educational content about ancient civilizations',
					audio_url: '/audio/narration-history.mp3',
					duration: '2:15',
					style: 'Educational, Clear'
				}
			]
		},
		{
			id: 'character',
			name: 'Character Voices',
			description: 'Animation and video game character performances',
			samples: [
				{
					title: 'Fantasy RPG Hero',
					description: 'Heroic character for fantasy game',
					audio_url: '/audio/character-hero.mp3',
					duration: '0:25',
					style: 'Heroic, Determined'
				},
				{
					title: 'Animated Sidekick',
					description: 'Quirky companion character',
					audio_url: '/audio/character-sidekick.mp3',
					duration: '0:35',
					style: 'Playful, Energetic'
				}
			]
		}
	];

	// Client testimonials
	const testimonials = [
		{
			name: 'Sarah Mitchell',
			company: 'BrandVoice Studios',
			role: 'Creative Director',
			quote: 'Key Jay brought exactly the energy and professionalism we needed for our campaign. His vocal range is impressive.',
			project: 'Tech Product Series',
			rating: 5
		},
		{
			name: 'Marcus Chen',
			company: 'Indie Game Dev',
			role: 'Game Director',
			quote: 'Working with Key Jay was fantastic. He understood our characters immediately and delivered perfect performances.',
			project: 'Fantasy Adventure Game',
			rating: 5
		},
		{
			name: 'Lisa Rodriguez',
			company: 'EduContent Co.',
			role: 'Producer',
			quote: 'Clear, engaging narration that kept our audience interested throughout the entire series.',
			project: 'Educational Documentary',
			rating: 5
		}
	];

	let activeCategory = $state('all');
	let container = $state();
	let mixer = $state();

	// Flatten all samples for MixItUp
	const allSamples = voiceCategories.flatMap(category => 
		category.samples.map(sample => ({
			...sample,
			category: category.id,
			categoryName: category.name
		}))
	);

	onMount(async () => {
		if (!browser) return;

		// Initialize MixItUp
		if (container) {
			const { default: mixitup } = await import('mixitup');
			mixer = mixitup(container, {
				selectors: {
					target: '.mix-item'
				},
				animation: {
					duration: 300,
					effects: 'fade scale(0.5)'
				}
			});
		}

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
			if (mixer) {
				mixer.destroy();
			}
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function setActiveCategory(category) {
		activeCategory = category;
		if (mixer) {
			if (category === 'all') {
				mixer.filter('all');
			} else {
				mixer.filter(`.${category}`);
			}
		}
	}
</script>

<svelte:head>
	<title>Voice Work - KEY JAY ONLINE</title>
	<meta name="description" content="Professional voice-over services including commercials, narration, and character voices" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900/20 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden section-triangle z-20">
		<div
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img
				src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200"
				alt="Recording Studio"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="voice-title hero-title-responsive font-bold text-white" class:animate={titleAnimated}>
						{#each titleLetters as letter, i}
							<span use:letterPulse={{ delay: i * 100 }}>{letter}</span>
						{/each}
					</h1>
					<p class="voice-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Professional voice-over services bringing your projects to life with clarity and emotion
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Voice Categories Section -->
	<section class="relative bg-gradient-to-br from-indigo-900/30 via-purple-800/25 to-indigo-900/30 py-20" style="margin-top: -60px; padding-top: 80px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Voice-Over Portfolio</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Explore my range across different voice-over styles and genres
				</p>
			</div>

			<!-- Category Tabs -->
			<div class="flex justify-center mb-12">
				<div class="flex gap-2 bg-gray-800/50 p-2 rounded-xl">
					<button 
						onclick={() => setActiveCategory('all')}
						class="px-6 py-3 rounded-lg font-medium transition-all duration-300 {
							activeCategory === 'all'
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
								: 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/20'
						}"
					>
						All
					</button>
					{#each voiceCategories as category}
						<button 
							onclick={() => setActiveCategory(category.id)}
							class="px-6 py-3 rounded-lg font-medium transition-all duration-300 {
								activeCategory === category.id
									? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
									: 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/20'
							}"
						>
							{category.name}
						</button>
					{/each}
				</div>
			</div>

			<!-- Voice Samples with MixItUp -->
			<div class="max-w-6xl mx-auto">
				<div bind:this={container} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
					{#each allSamples as sample}
						<div class="mix-item bg-indigo-950/40 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/10 hover:bg-indigo-900/40 hover:border-indigo-500/20 transition-all duration-300 {sample.category}" data-category={sample.category}>
							<div class="flex items-start justify-between mb-4">
								<div>
									<div class="flex items-center gap-2 mb-2">
										<span class="bg-indigo-600/20 text-indigo-400 px-2 py-1 text-xs rounded border border-indigo-600/30">
											{sample.categoryName}
										</span>
										<span class="bg-gray-600/20 text-gray-400 px-2 py-1 text-xs rounded border border-gray-600/30">
											{sample.duration}
										</span>
									</div>
									<h4 class="text-lg font-semibold text-white mb-1">{sample.title}</h4>
									<p class="text-gray-400 text-sm mb-2">{sample.description}</p>
									<span class="text-indigo-400 text-xs font-medium">{sample.style}</span>
								</div>
							</div>
							
							<AudioPlayer 
								audioUrl={sample.audio_url}
								trackTitle={sample.title}
								waveColor="rgba(99, 102, 241, 0.3)"
								progressColor="rgba(99, 102, 241, 0.8)"
								height={60}
							/>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Services Section -->
	<section class="relative bg-gradient-to-tl from-purple-900/30 via-indigo-800/25 to-purple-900/30 py-20 pb-24 section-wave-top section-curve-bottom z-10">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Voice Services</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Professional voice-over solutions for all your project needs
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				<div class="bg-purple-950/40 backdrop-blur-sm rounded-xl p-8 text-center border border-purple-500/10 hover:bg-purple-900/40 hover:border-purple-500/20 transition-all duration-300 hover:scale-105">
					<iconify-icon icon="mdi:microphone" class="text-indigo-400 text-5xl mb-4"></iconify-icon>
					<h3 class="text-xl font-semibold text-white mb-3">Commercial Voice-Over</h3>
					<p class="text-gray-400 mb-6">Professional voice for TV, radio, and online advertisements with quick turnaround times.</p>
					<ul class="text-gray-300 text-sm space-y-2">
						<li>• 24-48 hour delivery</li>
						<li>• Multiple take options</li>
						<li>• Commercial usage rights</li>
					</ul>
				</div>

				<div class="bg-purple-950/40 backdrop-blur-sm rounded-xl p-8 text-center border border-purple-500/10 hover:bg-purple-900/40 hover:border-purple-500/20 transition-all duration-300 hover:scale-105">
					<iconify-icon icon="mdi:book-open-page-variant" class="text-purple-400 text-5xl mb-4"></iconify-icon>
					<h3 class="text-xl font-semibold text-white mb-3">Narration</h3>
					<p class="text-gray-400 mb-6">Engaging narration for documentaries, e-learning, and audiobooks with clear articulation.</p>
					<ul class="text-gray-300 text-sm space-y-2">
						<li>• Long-form content expertise</li>
						<li>• Educational content specialty</li>
						<li>• Chapter-by-chapter delivery</li>
					</ul>
				</div>

				<div class="bg-purple-950/40 backdrop-blur-sm rounded-xl p-8 text-center border border-purple-500/10 hover:bg-purple-900/40 hover:border-purple-500/20 transition-all duration-300 hover:scale-105">
					<iconify-icon icon="mdi:drama-masks" class="text-green-400 text-5xl mb-4"></iconify-icon>
					<h3 class="text-xl font-semibold text-white mb-3">Character Voices</h3>
					<p class="text-gray-400 mb-6">Unique character voices for animation, games, and interactive media projects.</p>
					<ul class="text-gray-300 text-sm space-y-2">
						<li>• Wide vocal range</li>
						<li>• Consistent character delivery</li>
						<li>• Direction-friendly approach</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Testimonials Section -->
	<section class="bg-gradient-to-br from-indigo-900/25 via-purple-900/20 to-indigo-900/25 py-20 z-10" style="margin-top: -80px; padding-top: 100px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Client Testimonials</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					What clients say about working with me on their voice-over projects
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each testimonials as testimonial}
					<div class="bg-indigo-950/40 backdrop-blur-sm rounded-xl p-8 border border-indigo-500/10 hover:bg-indigo-900/40 hover:border-indigo-500/20 transition-all duration-300 hover:scale-105">
						<div class="flex items-center mb-4">
							{#each Array(testimonial.rating) as _}
								<iconify-icon icon="mdi:star" class="text-yellow-400 text-lg"></iconify-icon>
							{/each}
						</div>
						<blockquote class="text-gray-300 mb-6 italic">
							"{testimonial.quote}"
						</blockquote>
						<div class="border-t border-gray-700 pt-4">
							<div class="text-white font-semibold">{testimonial.name}</div>
							<div class="text-indigo-400 text-sm">{testimonial.role}</div>
							<div class="text-gray-500 text-sm">{testimonial.company}</div>
							<div class="text-gray-400 text-xs mt-1">Project: {testimonial.project}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Contact CTA Section -->
	<section class="bg-gradient-to-t from-indigo-950/30 via-purple-900/20 to-transparent py-20 section-curve-top z-0" style="margin-top: -80px; padding-top: 160px;">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Ready to Bring Your Project to Life?</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Let's discuss your voice-over needs and create something amazing together. Professional quality, quick turnaround, and competitive rates.
			</p>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<button class="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 transform">
					Get a Quote
				</button>
				<button class="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105">
					Listen to More Samples
				</button>
			</div>

			<div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
				<div class="text-center">
					<iconify-icon icon="mdi:clock-fast" class="text-indigo-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">Quick Turnaround</h3>
					<p class="text-gray-400 text-sm">Most projects delivered within 24-48 hours</p>
				</div>
				<div class="text-center">
					<iconify-icon icon="mdi:shield-check" class="text-green-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">Professional Quality</h3>
					<p class="text-gray-400 text-sm">Studio-grade recording equipment and acoustics</p>
				</div>
				<div class="text-center">
					<iconify-icon icon="mdi:replay" class="text-purple-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">Revision Friendly</h3>
					<p class="text-gray-400 text-sm">Free revisions to ensure perfect results</p>
				</div>
			</div>
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

	/* Letter-by-letter scale animation */
	@keyframes letterPulse {
		0%, 100% {
			transform: scale(1) translateY(0);
			filter: brightness(1);
		}
		50% {
			transform: scale(1.25) translateY(-5px);
			filter: brightness(1.3);
		}
	}

	.voice-title :global(.letter-animate) {
		display: inline-block;
		animation: letterPulse 2.5s ease-in-out infinite;
		transform-origin: center bottom;
		will-change: transform, filter;
	}

	.voice-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.voice-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.voice-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.voice-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}

	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}

	.mix-item {
		position: relative;
		overflow: hidden;
	}
	
	/* Ensure smooth MixItUp transitions */
	.mixitup-control-active {
		background-color: rgb(99 102 241) !important;
	}
	
	/* Divider mask styles */
	.section-wave-top {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Wave shape using polygon points */
		clip-path: polygon(
			0 60px,
			10% 40px, 20% 50px, 30% 30px, 40% 50px, 50% 20px,
			60% 50px, 70% 30px, 80% 50px, 90% 40px, 100% 60px,
			100% 100%, 0 100%
		);
	}
	
	.section-curve-top {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Smooth curve using multiple polygon points */
		clip-path: polygon(
			0 80px,
			5% 72px, 10% 65px, 15% 58px, 20% 52px, 25% 46px,
			30% 40px, 35% 35px, 40% 31px, 45% 28px, 50% 26px,
			55% 28px, 60% 31px, 65% 35px, 70% 40px, 75% 46px,
			80% 52px, 85% 58px, 90% 65px, 95% 72px, 100% 80px,
			100% 100%, 0 100%
		);
	}
	
	.section-slant-top {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		clip-path: polygon(0 0, 100% 80px, 100% 100%, 0 100%);
	}
	
	.section-curve-bottom {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Smooth curve at the bottom using multiple polygon points */
		clip-path: polygon(
			0 0, 100% 0,
			100% calc(100% - 80px),
			95% calc(100% - 72px), 90% calc(100% - 65px), 85% calc(100% - 58px), 
			80% calc(100% - 52px), 75% calc(100% - 46px), 70% calc(100% - 40px), 
			65% calc(100% - 35px), 60% calc(100% - 31px), 55% calc(100% - 28px), 
			50% calc(100% - 26px),
			45% calc(100% - 28px), 40% calc(100% - 31px), 35% calc(100% - 35px), 
			30% calc(100% - 40px), 25% calc(100% - 46px), 20% calc(100% - 52px), 
			15% calc(100% - 58px), 10% calc(100% - 65px), 5% calc(100% - 72px), 
			0 calc(100% - 80px)
		);
	}
	
	.section-triangle {
		position: relative;
		/* Triangle pointing down from bottom center */
		clip-path: polygon(
			0 0, 100% 0, 100% calc(100% - 60px),
			50% 100%, 0 calc(100% - 60px)
		);
	}
	
	/* Wave top and curve bottom combined */
	.section-wave-top.section-curve-bottom {
		position: relative;
		margin-top: -80px;
		padding-top: 160px;
		/* Wave at top, curve at bottom */
		clip-path: polygon(
			0 60px,
			10% 40px, 20% 50px, 30% 30px, 40% 50px, 50% 20px,
			60% 50px, 70% 30px, 80% 50px, 90% 40px, 100% 60px,
			100% calc(100% - 80px),
			95% calc(100% - 72px), 90% calc(100% - 65px), 85% calc(100% - 58px), 
			80% calc(100% - 52px), 75% calc(100% - 46px), 70% calc(100% - 40px), 
			65% calc(100% - 35px), 60% calc(100% - 31px), 55% calc(100% - 28px), 
			50% calc(100% - 26px),
			45% calc(100% - 28px), 40% calc(100% - 31px), 35% calc(100% - 35px), 
			30% calc(100% - 40px), 25% calc(100% - 46px), 20% calc(100% - 52px), 
			15% calc(100% - 58px), 10% calc(100% - 65px), 5% calc(100% - 72px), 
			0 calc(100% - 80px)
		);
	}
</style>