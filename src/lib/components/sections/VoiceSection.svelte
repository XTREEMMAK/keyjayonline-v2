<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import AudioPlayer from '$lib/components/music/AudioPlayer.svelte';
	import Icon from '@iconify/svelte';
	import { navigateTo } from '$lib/stores/navigation.js';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';
	import { letterPulse } from '$lib/actions/letterAnimation.js';
	import { sectionData, loadSection } from '$lib/stores/sectionData.js';
	import { getAudioUrl } from '$lib/utils/environment.js';
	import { copyShareUrl } from '$lib/utils/shareLinks.js';
	import { PUBLIC_SITE_URL } from '$env/static/public';

	// Title letters for animation
	const titleLetters = 'Voice'.split('');

	// State
	let container = $state();
	let mixer = $state();
	let activeCategory = $state('all');
	let openDropdownId = $state(null);
	let shareSuccessId = $state(null);

	// Handle share button click - uses Directus slug directly
	async function handleShare(project, e) {
		e.stopPropagation();
		const base = PUBLIC_SITE_URL || (browser ? window.location.origin : '');
		const shareUrl = `${base}/share/voice/${project.slug}`;
		const success = await copyShareUrl(shareUrl);
		if (success) {
			shareSuccessId = project.id;
			setTimeout(() => (shareSuccessId = null), 2000);
		}
	}

	// Derived state from store
	const sectionState = $derived($sectionData.voice);
	const voiceData = $derived(sectionState.data || {});
	const projects = $derived(voiceData.projects || []);
	const categories = $derived(voiceData.categories || []);
	const isLoading = $derived(sectionState.status === 'loading');
	const isLoaded = $derived(sectionState.status === 'loaded');
	const hasError = $derived(sectionState.status === 'error');

	// Projects are ready for MixItUp - categorySlugs provides space-separated class names
	const allSamples = $derived(projects);

	// Fallback testimonials (used if Directus data not available)
	const fallbackTestimonials = [
		{
			name: 'Sandra Espinoza',
			date: '05/2013',
			quote: "Working with Jamaal has been the most fluid and easy going experience I've ever had with a director. Jamaal's highly motivated about his work and is delightfully thorough in both his marketing efforts and the acting direction provided for the project! He goes the extra mile to provide talents with the opportunity to have access to things they might not have otherwise, and it makes the project feel all the more like a community effort. I'm happy to work with him and hope to see him produce more great works in the future!",
			rating: 5
		},
		{
			name: 'Jeremiah Caudle',
			date: '05/2012',
			quote: "This guy has got to be one of the most talented person I have ever met. A worthy rival in writing and producing/mixing. A genius musician, and to top it all off; a freakin' amazing voice. Not only can he sing like nobodies business, but both his voices for protagonists as well as antagonists are nothing short of genius. Not to mention his evil laugh is one that will give you shivers!",
			rating: 5
		},
		{
			name: 'Nina M.',
			date: '05/2016',
			quote: "I worked with Jamaal for the first time in 2011 when I was cast to play Lida Garuzo in his radio play F.L.U.R. I was a fledgling when it came to voice acting at the time, and even though I was still rough around the edges, Jamaal made sure to not only provide guidance when required, but also support and words of encouragement. It was easy to work with him because he made it clear how he wanted his characters to be portrayed and what was expected from us, making the entire production smooth sailing. The thing I like most about Jamaal is how he empowers his peers, but also gives it his all. It never feels like you're doing a job, it feels like you're part of a family, maybe something bigger. He is driven, organized, and someone I would gladly work for again.",
			rating: 5
		}
	];

	// Client testimonials - from Directus or fallback
	const testimonials = $derived(
		voiceData.testimonials && voiceData.testimonials.length > 0
			? voiceData.testimonials
			: fallbackTestimonials
	);

	onMount(async () => {
		if (!browser) return;

		// Load voice data if not already loaded
		if (sectionState.status === 'idle') {
			await loadSection('voice');
		}

		// Close dropdown when clicking outside
		const handleClickOutside = (e) => {
			if (openDropdownId && !e.target.closest('.external-links-dropdown')) {
				openDropdownId = null;
			}
		};
		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			if (mixer) {
				mixer.destroy();
			}
		};
	});

	// Initialize MixItUp when data is loaded
	$effect(() => {
		if (browser && isLoaded && container && allSamples.length > 0 && !mixer) {
			import('mixitup').then(({ default: mixitup }) => {
				mixer = mixitup(container, {
					selectors: {
						target: '.mix-item'
					},
					animation: {
						duration: 300,
						effects: 'fade scale(0.5)'
					}
				});
			});
		}
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

	function toggleDropdown(projectId, e) {
		e.stopPropagation();
		openDropdownId = openDropdownId === projectId ? null : projectId;
	}
</script>

<!-- ============================================================================ -->
<!-- VOICE SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="voice-section min-h-screen section-gradient-voice gradient-animated relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="voice" opacity={0.12} />

	<!-- Section Header with Indigo Accent -->
	<div class="pt-16 md:pt-28 pb-8 text-center relative">
		<div
			class="absolute inset-0 bg-gradient-to-b from-indigo-600/20 via-purple-500/5 to-transparent pointer-events-none"
		></div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3 relative">
			{#each titleLetters as letter, i}
				<span
					use:letterPulse={{ delay: i * 60 }}
					class="bg-gradient-to-r from-indigo-400 via-purple-300 to-violet-400 bg-clip-text text-transparent inline-block"
					>{letter}</span
				>
			{/each}
		</h1>
		<p class="text-lg text-indigo-200/70 relative">Professional voice-over services</p>
	</div>

	<!-- Voice Categories Section -->
	<section
		class="bg-gradient-to-b from-[var(--neu-bg)]/95 via-indigo-950/20 to-[var(--neu-bg)]/95 backdrop-blur-sm py-20 relative"
	>
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Voice-Over Portfolio</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Explore my range across different voice-over styles and genres
				</p>
			</div>

			<!-- Loading State -->
			{#if isLoading}
				<div class="flex justify-center items-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
				</div>
			{:else if hasError}
				<div class="text-center py-20">
					<Icon icon="mdi:alert-circle" class="text-red-400 text-5xl mb-4 mx-auto" />
					<p class="text-gray-400">Failed to load voice projects. Please try again later.</p>
				</div>
			{:else if isLoaded}
				<!-- Category Tabs -->
				<div class="flex justify-center mb-12">
					<div class="flex flex-wrap gap-2 neu-card-inset p-2 rounded-xl">
						<button
							onclick={() => setActiveCategory('all')}
							class="px-6 py-3 rounded-lg font-medium transition-all duration-300 {activeCategory ===
							'all'
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
								: 'bg-transparent text-gray-400 hover:text-white'}"
						>
							All
						</button>
						{#each categories as category}
							<button
								onclick={() => setActiveCategory(category.slug)}
								class="px-6 py-3 rounded-lg font-medium transition-all duration-300 {activeCategory ===
								category.slug
									? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
									: 'bg-transparent text-gray-400 hover:text-white'}"
							>
								{category.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- Voice Samples with MixItUp -->
				<div class="w-full px-4">
					{#if allSamples.length === 0}
						<div class="text-center py-20">
							<Icon icon="mdi:microphone-off" class="text-gray-500 text-5xl mb-4 mx-auto" />
							<p class="text-gray-400">No voice projects available yet.</p>
						</div>
					{:else}
						<div
							bind:this={container}
							class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]"
						>
							{#each allSamples as sample}
								<div class="mix-item {sample.categorySlugs}">
									<div class="neu-card p-6 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
										<!-- Dark overlay when dropdown is open -->
										{#if openDropdownId === sample.id}
											<div class="absolute inset-0 bg-black/40 z-10 pointer-events-none transition-opacity duration-200"></div>
										{/if}

										<!-- Action Buttons (Share + External Links) -->
										<div class="absolute top-4 right-4 z-20 flex items-center gap-2">
											<!-- Share Button -->
											<button
												onclick={(e) => handleShare(sample, e)}
												class="w-8 h-8 flex items-center justify-center rounded-full bg-purple-600/20 hover:bg-purple-600/40 transition-colors"
												title="Share"
											>
												<Icon icon={shareSuccessId === sample.id ? 'mdi:check' : 'mdi:share-variant'} class="text-purple-400 text-lg" />
											</button>

											<!-- External Links Dropdown Button -->
											{#if sample.externalLinks && sample.externalLinks.length > 0}
												<div class="external-links-dropdown relative">
													<button
														onclick={(e) => toggleDropdown(sample.id, e)}
														class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600/20 hover:bg-indigo-600/40 transition-colors"
														title="External Links"
													>
														<Icon icon="mdi:earth" class="text-indigo-400 text-lg" />
													</button>

												<!-- Dropdown Menu with slide animation -->
												<div
													class="absolute top-10 right-0 w-48 bg-[var(--neu-bg)] rounded-lg shadow-xl border border-gray-700/50 overflow-hidden z-50 transition-all duration-200 origin-top-right
													{openDropdownId === sample.id
														? 'opacity-100 scale-100 translate-y-0'
														: 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}"
												>
													{#each sample.externalLinks as link}
														<a
															href={link.url}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-indigo-600/20 hover:text-white transition-colors"
														>
															<Icon icon="mdi:open-in-new" class="text-indigo-400" />
															{link.label || 'Listen'}
														</a>
													{/each}
												</div>
											</div>
											{/if}
										</div>

										<div class="flex items-start justify-between mb-4 pr-10 relative z-0">
											<div>
												<div class="flex items-center gap-2 mb-2 flex-wrap">
													{#each sample.categories as cat}
														<span
															class="bg-indigo-600/20 text-indigo-400 px-2 py-1 text-xs rounded border border-indigo-600/30"
														>
															{cat.name}
														</span>
													{/each}
													{#if sample.categories.length === 0}
														<span
															class="bg-gray-600/20 text-gray-400 px-2 py-1 text-xs rounded border border-gray-600/30"
														>
															Uncategorized
														</span>
													{/if}
													{#if sample.clientName}
														<span
															class="bg-purple-600/20 text-purple-400 px-2 py-1 text-xs rounded border border-purple-600/30"
														>
															{sample.clientName}
														</span>
													{/if}
												</div>
												<h4 class="text-lg font-semibold text-white mb-1">{sample.title}</h4>
												{#if sample.description}
													<p class="text-gray-400 text-sm mb-2">{sample.description}</p>
												{/if}
												{#if sample.feeling && sample.feeling.length > 0}
													<span class="text-indigo-400 text-xs font-medium">
														{sample.feeling.join(', ')}
													</span>
												{/if}
											</div>
										</div>

										<div class="relative z-0">
											{#if sample.audioUrl}
												<AudioPlayer
													audioUrl={getAudioUrl(sample.audioUrl)}
													waveColor="rgba(99, 102, 241, 0.3)"
													progressColor="rgba(99, 102, 241, 0.8)"
													height={60}
												/>
											{:else}
												<div
													class="h-[60px] flex items-center justify-center text-gray-500 text-sm border border-gray-700/30 rounded"
												>
													No audio available
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Services Section -->
	<section class="subsection-gradient-dark subsection-accent-blue relative py-20">
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
					<p class="text-gray-400 mb-6">
						Professional voice for TV, radio, and online advertisements with quick turnaround
						times.
					</p>
					<ul class="text-gray-300 text-sm space-y-2 text-left">
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> 24-48 hour delivery
						</li>
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Multiple take options
						</li>
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Commercial usage rights
						</li>
					</ul>
				</div>

				<div class="neu-card p-8 text-center hover:scale-[1.02] transition-all duration-300">
					<Icon icon="mdi:book-open-page-variant" class="text-purple-400 text-5xl mb-4 mx-auto" />
					<h3 class="text-xl font-semibold text-white mb-3">Narration</h3>
					<p class="text-gray-400 mb-6">
						Engaging narration for documentaries, e-learning, and audiobooks with clear
						articulation.
					</p>
					<ul class="text-gray-300 text-sm space-y-2 text-left">
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Long-form content expertise
						</li>
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Educational content specialty
						</li>
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Chapter-by-chapter delivery
						</li>
					</ul>
				</div>

				<div class="neu-card p-8 text-center hover:scale-[1.02] transition-all duration-300">
					<Icon icon="mdi:drama-masks" class="text-green-400 text-5xl mb-4 mx-auto" />
					<h3 class="text-xl font-semibold text-white mb-3">Character Voices</h3>
					<p class="text-gray-400 mb-6">
						Unique character voices for animation, games, and interactive media projects.
					</p>
					<ul class="text-gray-300 text-sm space-y-2 text-left">
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Wide vocal range
						</li>
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Consistent character delivery
						</li>
						<li class="flex items-center gap-2">
							<Icon icon="mdi:check" class="text-green-400" /> Direction-friendly approach
						</li>
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
						<blockquote class="text-gray-300 mb-6 italic testimonial-content">
							{@html testimonial.quote}
						</blockquote>
						<div class="border-t border-gray-700 pt-4 flex items-center gap-4">
							{#if testimonial.avatarUrl}
								<img
									src={testimonial.avatarUrl}
									alt={testimonial.name}
									class="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
								/>
							{:else}
								<div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
									{testimonial.name?.charAt(0) || '?'}
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<div class="text-white font-semibold">
									{testimonial.name}{#if testimonial.title}<span class="text-gray-400 font-normal">, {testimonial.title}</span>{/if}
								</div>
								{#if testimonial.company}
									<div class="text-gray-300 text-sm">{testimonial.company}</div>
								{/if}
								<div class="flex items-center gap-2 text-gray-400 text-sm">
									{#if testimonial.projectName}
										<span class="text-indigo-400">Re: {testimonial.projectName}</span>
										{#if testimonial.date}<span>•</span>{/if}
									{/if}
									{#if testimonial.date}
										<span>{testimonial.date}</span>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Contact CTA Section -->
	<section
		class="bg-gradient-to-b from-[var(--neu-bg-dark)] via-[#1a1d24] to-[var(--neu-bg-dark)] py-20 relative"
	>
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Ready to Bring Your Project to Life?</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Let's discuss your voice-over needs and create something amazing together. Professional
				quality, quick turnaround, and competitive rates.
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<button
					onclick={handleContactClick}
					class="neu-button-primary px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300"
				>
					Get a Quote
				</button>
				<button
					class="neu-button px-8 py-4 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105"
				>
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

	/* Style HTML content from WYSIWYG editor */
	.testimonial-content :global(p) {
		margin-bottom: 0.5rem;
	}
	.testimonial-content :global(p:last-child) {
		margin-bottom: 0;
	}
	.testimonial-content :global(strong),
	.testimonial-content :global(b) {
		font-weight: 600;
		color: #fff;
	}
	.testimonial-content :global(em),
	.testimonial-content :global(i) {
		font-style: italic;
	}
	.testimonial-content :global(a) {
		color: #818cf8;
		text-decoration: underline;
	}
	.testimonial-content :global(a:hover) {
		color: #a5b4fc;
	}
</style>
