<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import Icon from '@iconify/svelte';
	import { navigateTo } from '$lib/stores/navigation.js';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';

	// State
	let container = $state();
	let mixer = $state();
	let activeCategory = $state('all');

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

		return () => {
			if (mixer) {
				mixer.destroy();
			}
		};
	});

	onDestroy(() => {
		if (mixer) {
			mixer.destroy();
		}
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

	function handleContactClick() {
		navigateTo('contact');
	}
</script>

<!-- ============================================================================ -->
<!-- VOICE SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="voice-section min-h-screen bg-gradient-to-br from-[var(--neu-bg)] via-indigo-900/10 to-[var(--neu-bg)] relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="voice" opacity={0.12} />

	<!-- Section Header with Indigo Accent -->
	<div class="pt-28 pb-8 text-center relative">
		<div class="absolute inset-0 bg-gradient-to-b from-indigo-600/20 via-purple-500/5 to-transparent pointer-events-none"></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			<span class="bg-gradient-to-r from-indigo-400 via-purple-300 to-violet-400 bg-clip-text text-transparent">Voice</span>
		</h1>
		<p class="text-lg text-indigo-200/70 relative">Professional voice-over services</p>
	</div>

	<!-- Voice Categories Section -->
	<section class="bg-[var(--neu-bg)]/95 backdrop-blur-sm py-20">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Voice-Over Portfolio</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Explore my range across different voice-over styles and genres
				</p>
			</div>

			<!-- Category Tabs -->
			<div class="flex justify-center mb-12">
				<div class="flex gap-2 neu-card-inset p-2 rounded-xl">
					<button
						onclick={() => setActiveCategory('all')}
						class="px-6 py-3 rounded-lg font-medium transition-all duration-300 {
							activeCategory === 'all'
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
								: 'bg-transparent text-gray-400 hover:text-white'
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
									: 'bg-transparent text-gray-400 hover:text-white'
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
						<div class="mix-item {sample.category}">
							<div class="neu-card p-6 hover:scale-[1.02] transition-all duration-300">
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
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Services Section -->
	<section class="bg-[var(--neu-bg-dark)] py-20">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Voice Services</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Professional voice-over solutions for all your project needs
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				<div class="neu-card p-8 text-center hover:scale-[1.02] transition-all duration-300">
					<Icon icon="mdi:microphone" class="text-indigo-400 text-5xl mb-4 mx-auto" />
					<h3 class="text-xl font-semibold text-white mb-3">Commercial Voice-Over</h3>
					<p class="text-gray-400 mb-6">Professional voice for TV, radio, and online advertisements with quick turnaround times.</p>
					<ul class="text-gray-300 text-sm space-y-2 text-left">
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> 24-48 hour delivery</li>
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Multiple take options</li>
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Commercial usage rights</li>
					</ul>
				</div>

				<div class="neu-card p-8 text-center hover:scale-[1.02] transition-all duration-300">
					<Icon icon="mdi:book-open-page-variant" class="text-purple-400 text-5xl mb-4 mx-auto" />
					<h3 class="text-xl font-semibold text-white mb-3">Narration</h3>
					<p class="text-gray-400 mb-6">Engaging narration for documentaries, e-learning, and audiobooks with clear articulation.</p>
					<ul class="text-gray-300 text-sm space-y-2 text-left">
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Long-form content expertise</li>
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Educational content specialty</li>
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Chapter-by-chapter delivery</li>
					</ul>
				</div>

				<div class="neu-card p-8 text-center hover:scale-[1.02] transition-all duration-300">
					<Icon icon="mdi:drama-masks" class="text-green-400 text-5xl mb-4 mx-auto" />
					<h3 class="text-xl font-semibold text-white mb-3">Character Voices</h3>
					<p class="text-gray-400 mb-6">Unique character voices for animation, games, and interactive media projects.</p>
					<ul class="text-gray-300 text-sm space-y-2 text-left">
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Wide vocal range</li>
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Consistent character delivery</li>
						<li class="flex items-center gap-2"><Icon icon="mdi:check" class="text-green-400" /> Direction-friendly approach</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Testimonials Section -->
	<section class="bg-gradient-to-br from-indigo-900/20 via-[var(--neu-bg)] to-purple-900/20 py-20">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Client Testimonials</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					What clients say about working with me on their voice-over projects
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each testimonials as testimonial}
					<div class="neu-card p-8 hover:scale-[1.02] transition-all duration-300">
						<div class="flex items-center mb-4">
							{#each Array(testimonial.rating) as _}
								<Icon icon="mdi:star" class="text-yellow-400 text-lg" />
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
	<section class="bg-[var(--neu-bg-dark)] py-20">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Ready to Bring Your Project to Life?</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Let's discuss your voice-over needs and create something amazing together. Professional quality, quick turnaround, and competitive rates.
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<button
					onclick={handleContactClick}
					class="neu-button-primary px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300"
				>
					Get a Quote
				</button>
				<button class="neu-button px-8 py-4 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105">
					Listen to More Samples
				</button>
			</div>

			<div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
				<div class="text-center">
					<Icon icon="mdi:clock-fast" class="text-indigo-400 text-3xl mb-2 mx-auto" />
					<h3 class="text-white font-semibold mb-1">Quick Turnaround</h3>
					<p class="text-gray-400 text-sm">Most projects delivered within 24-48 hours</p>
				</div>
				<div class="text-center">
					<Icon icon="mdi:shield-check" class="text-green-400 text-3xl mb-2 mx-auto" />
					<h3 class="text-white font-semibold mb-1">Professional Quality</h3>
					<p class="text-gray-400 text-sm">Studio-grade recording equipment and acoustics</p>
				</div>
				<div class="text-center">
					<Icon icon="mdi:replay" class="text-purple-400 text-3xl mb-2 mx-auto" />
					<h3 class="text-white font-semibold mb-1">Revision Friendly</h3>
					<p class="text-gray-400 text-sm">Free revisions to ensure perfect results</p>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.voice-section {
		/* Container styles */
	}

	/* Neumorphic card styles (fallback if not in global CSS) */
	.neu-card {
		background: var(--neu-bg, #2a2d35);
		border-radius: 16px;
		box-shadow:
			8px 8px 16px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-8px -8px 16px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-card-inset {
		background: var(--neu-bg, #2a2d35);
		border-radius: 12px;
		box-shadow:
			inset 4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			inset -4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-button {
		background: var(--neu-bg, #2a2d35);
		border-radius: 50px;
		box-shadow:
			6px 6px 12px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-6px -6px 12px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
		transition: all 0.2s ease;
	}

	.neu-button:hover {
		box-shadow:
			4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}

	.neu-button-primary {
		border-radius: 50px;
		box-shadow:
			6px 6px 12px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-6px -6px 12px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}
</style>
