<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);

	// Personal journey milestones
	const milestones = [
		{
			year: '2010',
			title: 'Musical Beginnings',
			description: 'Started producing beats in my bedroom with basic software and a dream to create something unique.',
			icon: 'mdi:music-note',
			category: 'music'
		},
		{
			year: '2015',
			title: 'First Voice Work',
			description: 'Discovered my passion for voice acting through indie game projects and podcast collaborations.',
			icon: 'mdi:microphone',
			category: 'voice'
		},
		{
			year: '2018',
			title: 'Tech Integration',
			description: 'Began developing custom audio plugins and tools, merging my love for music with programming.',
			icon: 'mdi:code-tags',
			category: 'tech'
		},
		{
			year: '2020',
			title: 'Gaming Content',
			description: 'Started creating gaming content and reviews, building a community around shared interests.',
			icon: 'mdi:gamepad-variant',
			category: 'gaming'
		},
		{
			year: '2022',
			title: 'Production Services',
			description: 'Launched full-service creative production, helping others bring their visions to life.',
			icon: 'mdi:video',
			category: 'production'
		},
		{
			year: '2024',
			title: 'KEY JAY ONLINE',
			description: 'Unified all my creative endeavors under one platform, connecting music, tech, gaming, and voice work.',
			icon: 'mdi:rocket-launch',
			category: 'creative'
		}
	];

	// Skills and expertise
	const skills = [
		{
			category: 'Music Production',
			skills: [
				{ name: 'Beat Making', level: 95 },
				{ name: 'Mixing & Mastering', level: 90 },
				{ name: 'Sound Design', level: 85 },
				{ name: 'Live Performance', level: 80 }
			],
			color: 'from-blue-500 to-blue-600'
		},
		{
			category: 'Voice Acting',
			skills: [
				{ name: 'Character Voices', level: 90 },
				{ name: 'Commercial Narration', level: 95 },
				{ name: 'Podcast Hosting', level: 85 },
				{ name: 'Audio Editing', level: 90 }
			],
			color: 'from-indigo-500 to-indigo-600'
		},
		{
			category: 'Technology',
			skills: [
				{ name: 'Audio Plugin Development', level: 80 },
				{ name: 'Web Development', level: 85 },
				{ name: 'MIDI Programming', level: 90 },
				{ name: 'System Integration', level: 75 }
			],
			color: 'from-cyan-500 to-cyan-600'
		},
		{
			category: 'Content Creation',
			skills: [
				{ name: 'Video Production', level: 85 },
				{ name: 'Gaming Reviews', level: 90 },
				{ name: 'Tutorial Creation', level: 80 },
				{ name: 'Community Building', level: 85 }
			],
			color: 'from-purple-500 to-purple-600'
		}
	];

	// Client testimonials
	const testimonials = [
		{
			name: 'Sarah Mitchell',
			company: 'BrandVoice Studios',
			role: 'Creative Director',
			quote: 'Working with Key Jay has been an absolute pleasure. His versatility across music production and voice work allowed us to create a cohesive brand experience that exceeded our expectations.',
			project: 'Brand Campaign Series',
			rating: 5,
			image: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150'
		},
		{
			name: 'Marcus Rodriguez',
			company: 'Indie Studios',
			role: 'Game Director',
			quote: 'Key Jay brought our characters to life with his incredible voice acting range. His understanding of gaming culture made the collaboration seamless and authentic.',
			project: 'RPG Character Voices',
			rating: 5,
			image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
		},
		{
			name: 'Emily Chen',
			company: 'TechFlow Media',
			role: 'Content Producer',
			quote: 'The combination of technical expertise and creative vision that Key Jay brings is rare. He delivered both the audio solution and the creative direction we needed.',
			project: 'Podcast Production',
			rating: 5,
			image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
		},
		{
			name: 'David Kim',
			company: 'StartupXYZ',
			role: 'CEO',
			quote: 'Key Jay\'s ability to understand our vision and translate it across multiple mediums - from music to voice to video - was exactly what our startup needed.',
			project: 'Complete Brand Experience',
			rating: 5,
			image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
		}
	];

	// Philosophy and values
	const values = [
		{
			title: 'Authenticity',
			description: 'Every project starts with genuine passion and honest expression.',
			icon: 'mdi:heart'
		},
		{
			title: 'Innovation',
			description: 'Blending traditional artistry with cutting-edge technology.',
			icon: 'mdi:lightbulb'
		},
		{
			title: 'Collaboration',
			description: 'The best creative work happens when minds come together.',
			icon: 'mdi:account-group'
		},
		{
			title: 'Quality',
			description: 'No compromises on craftsmanship and attention to detail.',
			icon: 'mdi:star'
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

	function getCategoryColor(category) {
		switch(category) {
			case 'music': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			case 'voice': return 'text-indigo-400 border-indigo-600/30 bg-indigo-600/20';
			case 'tech': return 'text-cyan-400 border-cyan-600/30 bg-cyan-600/20';
			case 'gaming': return 'text-purple-400 border-purple-600/30 bg-purple-600/20';
			case 'production': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'creative': return 'text-orange-400 border-orange-600/30 bg-orange-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}
</script>

<svelte:head>
	<title>About - KEY JAY ONLINE</title>
	<meta name="description" content="Learn about Key Jay's journey as a multi-disciplinary creative, spanning music production, voice acting, technology, and content creation" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200" 
				alt="Creative Workspace"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="about-title text-7xl sm:text-8xl md:text-9xl font-bold text-white" class:animate={titleAnimated}>
						ABOUT
					</h1>
					<p class="about-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Multi-disciplinary creative pushing boundaries across music, technology, voice, and digital content
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Personal Story Section -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-20">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
					<div>
						<h2 class="text-3xl font-bold text-white mb-6">The Creative Journey</h2>
						<div class="space-y-4 text-gray-300">
							<p>
								What started as bedroom beats and a passion for sound has evolved into a multi-faceted creative career spanning music production, voice acting, technology development, and content creation.
							</p>
							<p>
								I believe in the power of authentic expression across all mediums. Whether I'm crafting beats, bringing characters to life through voice, developing audio tools, or sharing gaming experiences, the core remains the same: genuine passion for the craft.
							</p>
							<p>
								<strong class="text-white">"Don't think, just play!"</strong> This philosophy drives everything I do - embracing spontaneity, trusting instinct, and finding joy in the creative process.
							</p>
						</div>
					</div>
					<div class="relative">
						<img 
							src="/img/J_Header_5k.webp" 
							alt="Key Jay"
							class="w-full rounded-2xl shadow-2xl"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="wave" className="text-gray-800" />
	</div>

	<!-- Journey Timeline -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Creative Evolution</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Key milestones that shaped my journey as a multi-disciplinary creative
				</p>
			</div>

			<div class="max-w-4xl mx-auto">
				{#each milestones as milestone, index}
					<div class="flex items-start gap-6 mb-8 {index < milestones.length - 1 ? 'pb-8 border-b border-gray-700' : ''}">
						<div class="flex-shrink-0">
							<div class="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-blue-600 text-white rounded-full">
								<iconify-icon icon={milestone.icon} class="text-2xl"></iconify-icon>
							</div>
						</div>
						<div class="flex-1">
							<div class="flex items-start justify-between mb-2">
								<div>
									<div class="flex items-center gap-3 mb-2">
										<span class="text-emerald-400 font-bold text-lg">{milestone.year}</span>
										<span class="px-2 py-1 text-xs rounded-full border {getCategoryColor(milestone.category)}">{milestone.category}</span>
									</div>
									<h3 class="text-xl font-semibold text-white mb-2">{milestone.title}</h3>
									<p class="text-gray-400">{milestone.description}</p>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="curve" flipY={true} className="text-emerald-900" />
	</div>

	<!-- Skills Section -->
	<section class="bg-gradient-to-br from-emerald-900/20 via-gray-900 to-blue-900/20 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Skills & Expertise</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Proficiency across multiple creative and technical disciplines
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
				{#each skills as skillCategory}
					<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6">
						<h3 class="text-lg font-semibold text-white mb-6 text-center">{skillCategory.category}</h3>
						<div class="space-y-4">
							{#each skillCategory.skills as skill}
								<div>
									<div class="flex justify-between items-center mb-2">
										<span class="text-gray-300 text-sm">{skill.name}</span>
										<span class="text-gray-400 text-xs">{skill.level}%</span>
									</div>
									<div class="w-full bg-gray-700 rounded-full h-2">
										<div 
											class="bg-gradient-to-r {skillCategory.color} h-2 rounded-full transition-all duration-1000"
											style="width: {skill.level}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="slant" className="text-gray-800" />
	</div>

	<!-- Testimonials Section -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Client Testimonials</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					What clients and collaborators say about working together
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				{#each testimonials as testimonial}
					<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 hover:bg-gray-800/50 transition-all duration-300">
						<div class="flex items-center mb-6">
							{#each Array(testimonial.rating) as _}
								<iconify-icon icon="mdi:star" class="text-yellow-400 text-lg"></iconify-icon>
							{/each}
						</div>
						<blockquote class="text-gray-300 mb-6 italic text-lg">
							"{testimonial.quote}"
						</blockquote>
						<div class="flex items-center gap-4">
							<img 
								src={testimonial.image} 
								alt={testimonial.name}
								class="w-12 h-12 rounded-full object-cover"
							/>
							<div>
								<div class="text-white font-semibold">{testimonial.name}</div>
								<div class="text-emerald-400 text-sm">{testimonial.role}</div>
								<div class="text-gray-500 text-sm">{testimonial.company}</div>
								<div class="text-gray-400 text-xs mt-1">Project: {testimonial.project}</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="wave" flipY={true} className="text-emerald-900" />
	</div>

	<!-- Values & Philosophy -->
	<section class="bg-gradient-to-br from-emerald-900/20 via-gray-900 to-blue-900/20 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Core Values</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					The principles that guide every creative decision and collaboration
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
				{#each values as value}
					<div class="text-center group">
						<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-blue-600 text-white rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
							<iconify-icon icon={value.icon} class="text-2xl"></iconify-icon>
						</div>
						<h3 class="text-xl font-semibold text-white mb-3">{value.title}</h3>
						<p class="text-gray-400">{value.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<div style="margin-top: -80px; position: relative; z-index: 20;">
		<SvgDivider type="curve" className="text-gray-800" />
	</div>

	<!-- Contact CTA -->
	<section class="bg-gray-800 py-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Let's Create Something Amazing</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Whether you need music production, voice work, technical solutions, or creative direction, I'm here to help bring your vision to life.
			</p>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<a 
					href="/contact"
					class="px-8 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-semibold rounded-full hover:from-emerald-700 hover:to-blue-700 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-105 transform"
				>
					Start a Conversation
				</a>
				<a 
					href="/productions"
					class="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105"
				>
					View Services
				</a>
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

	.about-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.about-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.about-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.about-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
	}
</style>