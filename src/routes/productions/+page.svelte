<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);

	// Production services data
	const services = [
		{
			id: 1,
			title: 'Music Production',
			category: 'Audio',
			icon: 'mdi:music-note',
			description: 'Full-service music production from concept to final master',
			features: ['Original Composition', 'Mixing & Mastering', 'Live Recording', 'Post-Production'],
			price: 'Starting at $500',
			duration: '2-4 weeks',
			image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600'
		},
		{
			id: 2,
			title: 'Video Production',
			category: 'Visual',
			icon: 'mdi:video',
			description: 'Professional video content creation and editing services',
			features: ['Concept Development', 'Filming & Direction', 'Post-Production', 'Color Grading'],
			price: 'Starting at $800',
			duration: '3-6 weeks',
			image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600'
		},
		{
			id: 3,
			title: 'Podcast Production',
			category: 'Audio',
			icon: 'mdi:microphone',
			description: 'Complete podcast production from recording to distribution',
			features: ['Recording Setup', 'Audio Enhancement', 'Show Notes', 'Distribution'],
			price: 'Starting at $300',
			duration: '1-2 weeks',
			image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600'
		}
	];

	// Portfolio pieces
	const portfolio = [
		{
			id: 1,
			title: 'Brand Commercial - TechFlow',
			type: 'Commercial',
			category: 'Video',
			description: 'Dynamic commercial showcasing innovative tech solutions',
			image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600',
			duration: '0:45',
			client: 'TechFlow Inc.',
			year: '2024',
			services: ['Direction', 'Post-Production', 'Sound Design']
		},
		{
			id: 2,
			title: 'Indie Artist EP - Luna Waves',
			type: 'Music Production',
			category: 'Audio',
			description: 'Complete EP production for emerging indie artist',
			image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
			duration: '18:32',
			client: 'Luna Waves',
			year: '2024',
			services: ['Production', 'Mixing', 'Mastering']
		},
		{
			id: 3,
			title: 'Corporate Training Series',
			type: 'Educational',
			category: 'Video',
			description: 'Multi-part training video series for corporate onboarding',
			image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
			duration: '45:00',
			client: 'Corporate Solutions Ltd.',
			year: '2024',
			services: ['Scripting', 'Production', 'Animation']
		},
		{
			id: 4,
			title: 'Tech Podcast - CodeTalk',
			type: 'Podcast',
			category: 'Audio',
			description: 'Weekly tech podcast featuring industry experts',
			image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600',
			duration: '35:00',
			client: 'CodeTalk Media',
			year: '2024',
			services: ['Recording', 'Editing', 'Distribution']
		},
		{
			id: 5,
			title: 'Product Launch Video',
			type: 'Marketing',
			category: 'Video',
			description: 'High-energy product reveal for consumer electronics',
			image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600',
			duration: '1:20',
			client: 'ElectroVibe',
			year: '2024',
			services: ['Concept', 'Production', 'Motion Graphics']
		},
		{
			id: 6,
			title: 'Ambient Soundtrack - Meditation App',
			type: 'Soundtrack',
			category: 'Audio',
			description: 'Calming ambient music for meditation application',
			image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600',
			duration: '60:00',
			client: 'MindfulSpace App',
			year: '2023',
			services: ['Composition', 'Production', 'Looping']
		}
	];

	// Process steps
	const processSteps = [
		{
			step: 1,
			title: 'Discovery & Planning',
			description: 'Understanding your vision, goals, and requirements',
			icon: 'mdi:lightbulb-outline',
			duration: '1-2 days'
		},
		{
			step: 2,
			title: 'Concept Development',
			description: 'Creating detailed concepts and project blueprints',
			icon: 'mdi:draw',
			duration: '3-5 days'
		},
		{
			step: 3,
			title: 'Production',
			description: 'Bringing your project to life with professional execution',
			icon: 'mdi:play-circle',
			duration: '1-4 weeks'
		},
		{
			step: 4,
			title: 'Review & Refinement',
			description: 'Collaborative review process with revisions',
			icon: 'mdi:refresh',
			duration: '3-7 days'
		},
		{
			step: 5,
			title: 'Final Delivery',
			description: 'Polished final product ready for your audience',
			icon: 'mdi:check-circle',
			duration: '1-2 days'
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
			case 'Audio': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'Video': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			case 'Visual': return 'text-purple-400 border-purple-600/30 bg-purple-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}
</script>

<svelte:head>
	<title>Productions - KEY JAY ONLINE</title>
	<meta name="description" content="Creative production services including music, video, and multimedia content creation" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden section-triangle z-20">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200" 
				alt="Production Studio"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="productions-title hero-title-responsive font-bold text-white" class:animate={titleAnimated}>
						PRODUCTIONS
					</h1>
					<p class="productions-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Creative production services bringing your vision to life through music, video, and multimedia content
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Services Section -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-20" style="margin-top: -60px; padding-top: 80px;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Production Services</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Professional creative services tailored to your project needs
				</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{#each services as service}
					<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 hover:bg-gray-800/50 transition-all duration-300 hover:scale-105">
						<div class="text-center mb-6">
							<div class="inline-flex items-center justify-center w-16 h-16 bg-orange-600/20 rounded-full mb-4">
								<iconify-icon icon={service.icon} class="text-orange-400 text-3xl"></iconify-icon>
							</div>
							<h3 class="text-xl font-semibold text-white mb-2">{service.title}</h3>
							<span class="px-3 py-1 text-xs rounded-full border {getCategoryColor(service.category)}">{service.category}</span>
						</div>
						
						<p class="text-gray-400 text-center mb-6">{service.description}</p>
						
						<div class="space-y-2 mb-6">
							{#each service.features as feature}
								<div class="flex items-center gap-3">
									<iconify-icon icon="mdi:check-circle" class="text-green-400 text-sm"></iconify-icon>
									<span class="text-gray-300 text-sm">{feature}</span>
								</div>
							{/each}
						</div>
						
						<div class="border-t border-gray-700 pt-6">
							<div class="flex justify-between items-center mb-4">
								<div>
									<div class="text-orange-400 font-semibold">{service.price}</div>
									<div class="text-gray-500 text-sm">{service.duration}</div>
								</div>
							</div>
							<button class="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105">
								Get Quote
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Portfolio Section -->
	<section class="bg-gray-800 py-20 section-wave-top z-10">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Recent Productions</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					A showcase of recent creative projects across different mediums
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each portfolio as project}
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 group cursor-pointer">
						<div class="aspect-video relative">
							<img 
								src={project.image} 
								alt={project.title}
								class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
							<div class="absolute top-4 left-4">
								<span class="px-2 py-1 text-xs rounded-full border {getCategoryColor(project.category)}">{project.category}</span>
							</div>
							<div class="absolute top-4 right-4">
								<span class="bg-black/60 text-white px-2 py-1 text-xs rounded">{project.duration}</span>
							</div>
							<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
								<div class="bg-white/10 backdrop-blur-sm rounded-full p-4">
									<iconify-icon icon="mdi:play" class="text-white text-3xl"></iconify-icon>
								</div>
							</div>
						</div>
						<div class="p-6">
							<div class="flex items-start justify-between mb-2">
								<div>
									<h3 class="text-lg font-semibold text-white mb-1 line-clamp-2">
										{project.title}
									</h3>
									<p class="text-orange-400 text-sm font-medium">{project.type}</p>
								</div>
								<span class="text-gray-500 text-xs">{project.year}</span>
							</div>
							<p class="text-gray-400 text-sm mb-3 line-clamp-2">
								{project.description}
							</p>
							<div class="flex flex-wrap gap-1 mb-3">
								{#each project.services as serviceType}
									<span class="bg-gray-700/50 text-gray-300 px-2 py-1 text-xs rounded">{serviceType}</span>
								{/each}
							</div>
							<div class="text-gray-500 text-xs">
								Client: {project.client}
							</div>
						</div>
					</article>
				{/each}
			</div>

			<div class="text-center mt-12">
				<button class="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:from-orange-700 hover:to-red-700 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-105 transform">
					View Full Portfolio
				</button>
			</div>
		</div>
	</section>

	<!-- Process Section -->
	<section class="bg-gradient-to-br from-orange-900/20 via-gray-900 to-red-900/20 py-20 section-curve-top z-0">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Production Process</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					A streamlined approach ensuring quality results and clear communication
				</p>
			</div>

			<div class="max-w-4xl mx-auto">
				{#each processSteps as step, index}
					<div class="flex items-start gap-6 mb-8 {index < processSteps.length - 1 ? 'pb-8 border-b border-gray-700' : ''}">
						<div class="flex-shrink-0">
							<div class="flex items-center justify-center w-12 h-12 bg-orange-600 text-white rounded-full font-bold">
								{step.step}
							</div>
						</div>
						<div class="flex-1">
							<div class="flex items-start justify-between">
								<div>
									<h3 class="text-xl font-semibold text-white mb-2 flex items-center gap-3">
										<iconify-icon icon={step.icon} class="text-orange-400 text-xl"></iconify-icon>
										{step.title}
									</h3>
									<p class="text-gray-400 mb-2">{step.description}</p>
									<span class="text-orange-400 text-sm font-medium">Duration: {step.duration}</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Contact CTA Section -->
	<section class="bg-gray-800 py-20 section-slant-top z-0">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Ready to Start Your Project?</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Let's discuss your creative vision and bring it to life. From concept to completion, I'll guide you through every step of the production process.
			</p>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
				<button class="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-full hover:from-orange-700 hover:to-red-700 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-105 transform">
					Start Your Project
				</button>
				<button class="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105">
					Schedule Consultation
				</button>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
				<div class="text-center">
					<iconify-icon icon="mdi:trophy" class="text-orange-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">Award-Winning</h3>
					<p class="text-gray-400 text-sm">Recognized creative excellence</p>
				</div>
				<div class="text-center">
					<iconify-icon icon="mdi:clock-check" class="text-blue-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">On-Time Delivery</h3>
					<p class="text-gray-400 text-sm">Reliable project completion</p>
				</div>
				<div class="text-center">
					<iconify-icon icon="mdi:account-heart" class="text-purple-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">Client-Focused</h3>
					<p class="text-gray-400 text-sm">Your vision is our priority</p>
				</div>
				<div class="text-center">
					<iconify-icon icon="mdi:star-circle" class="text-green-400 text-3xl mb-2"></iconify-icon>
					<h3 class="text-white font-semibold mb-1">Premium Quality</h3>
					<p class="text-gray-400 text-sm">Professional-grade results</p>
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

	.productions-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.productions-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.productions-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.productions-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.parallax-bg {
		will-change: transform;
		backface-visibility: hidden;
		perspective: 1000px;
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