<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import { PUBLIC_SITE_URL } from '$env/static/public';
	import Icon from '@iconify/svelte';

	let { data } = $props();
	
	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);
	
	// Get hero image from database or use fallback
	const heroImage = $derived.by(() => {
		return data.techPageHeader || 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200';
	});

	// Tech projects data
	const techProjects = [
		{
			id: 1,
			title: 'Audio Plugin Suite',
			category: 'Music Technology',
			tech: ['C++', 'JUCE', 'DSP'],
			description: 'Custom audio plugins for music production including EQ, compression, and creative effects.',
			image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600',
			github: 'https://github.com/keyjay/audio-plugins',
			demo: '/demo/audio-plugins',
			status: 'Active Development'
		},
		{
			id: 2,
			title: 'Creative Portfolio Site',
			category: 'Web Development',
			tech: ['SvelteKit', 'Tailwind CSS', 'Node.js'],
			description: 'Modern responsive website built with SvelteKit 5, featuring smooth animations and optimized performance.',
			image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=600',
			github: 'https://github.com/keyjay/portfolio-v2',
			demo: PUBLIC_SITE_URL,
			status: 'Live'
		},
		{
			id: 3,
			title: 'MIDI Controller Interface',
			category: 'Hardware Integration',
			tech: ['Python', 'MIDI', 'Raspberry Pi'],
			description: 'Custom MIDI controller interface for live performance with LED feedback and customizable mappings.',
			image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
			github: 'https://github.com/keyjay/midi-controller',
			demo: '/demo/midi-controller',
			status: 'Completed'
		}
	];

	// Tech tutorials data
	const tutorials = [
		{
			id: 1,
			title: 'Building Audio Plugins with JUCE',
			category: 'Audio Programming',
			difficulty: 'Intermediate',
			duration: '45 min read',
			description: 'Complete guide to creating your first audio plugin using the JUCE framework.',
			image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=600',
			tags: ['JUCE', 'C++', 'Audio', 'DSP'],
			published: '2024-03-20'
		},
		{
			id: 2,
			title: 'SvelteKit 5 Performance Optimization',
			category: 'Web Development',
			difficulty: 'Advanced',
			duration: '30 min read',
			description: 'Advanced techniques for optimizing SvelteKit applications for maximum performance.',
			image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
			tags: ['SvelteKit', 'Performance', 'Optimization'],
			published: '2024-03-10'
		},
		{
			id: 3,
			title: 'MIDI Programming Fundamentals',
			category: 'Hardware Integration',
			difficulty: 'Beginner',
			duration: '25 min read',
			description: 'Learn the basics of MIDI programming and how to interface with hardware controllers.',
			image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600',
			tags: ['MIDI', 'Python', 'Hardware'],
			published: '2024-02-25'
		}
	];

	// Tech stack
	const techStack = [
		{
			category: 'Languages',
			items: [
				{ name: 'JavaScript', icon: 'simple-icons:javascript', level: 90 },
				{ name: 'TypeScript', icon: 'simple-icons:typescript', level: 85 },
				{ name: 'Python', icon: 'simple-icons:python', level: 80 },
				{ name: 'C++', icon: 'simple-icons:cplusplus', level: 75 }
			]
		},
		{
			category: 'Frameworks',
			items: [
				{ name: 'SvelteKit', icon: 'simple-icons:svelte', level: 95 },
				{ name: 'React', icon: 'simple-icons:react', level: 85 },
				{ name: 'Node.js', icon: 'simple-icons:nodedotjs', level: 80 },
				{ name: 'JUCE', icon: 'mdi:music-note', level: 70 }
			]
		},
		{
			category: 'Tools',
			items: [
				{ name: 'Git', icon: 'simple-icons:git', level: 90 },
				{ name: 'Docker', icon: 'simple-icons:docker', level: 75 },
				{ name: 'AWS', icon: 'simple-icons:amazonwebservices', level: 70 },
				{ name: 'Figma', icon: 'simple-icons:figma', level: 80 }
			]
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

	function getDifficultyColor(difficulty) {
		switch(difficulty) {
			case 'Beginner': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'Intermediate': return 'text-yellow-400 border-yellow-600/30 bg-yellow-600/20';
			case 'Advanced': return 'text-red-400 border-red-600/30 bg-red-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}

	function getStatusColor(status) {
		switch(status) {
			case 'Live': return 'text-green-400 border-green-600/30 bg-green-600/20';
			case 'Active Development': return 'text-blue-400 border-blue-600/30 bg-blue-600/20';
			case 'Completed': return 'text-purple-400 border-purple-600/30 bg-purple-600/20';
			default: return 'text-gray-400 border-gray-600/30 bg-gray-600/20';
		}
	}
</script>

<svelte:head>
	<title>Tech - KEY JAY ONLINE</title>
	<meta name="description" content="Technology projects, programming tutorials, and software development insights" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden section-triangle z-20">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src={heroImage} 
				alt="Code and Technology"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="tech-title hero-title-responsive font-bold text-white" class:animate={titleAnimated}>
						TECH
					</h1>
					<p class="tech-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Exploring the intersection of music and technology through code, projects, and innovation
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Projects Section -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-20 z-10 relative" style="margin-top: -60px; padding-top: 80px; isolation: isolate;">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Featured Projects</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					A selection of technical projects combining my passion for music and programming
				</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 relative" style="z-index: 1;">
				{#each techProjects as project}
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 transform hover:scale-[1.02] flex flex-col min-h-[500px] isolate">
						<div class="aspect-video relative">
							<img 
								src={project.image} 
								alt={project.title}
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute top-4 left-4">
								<span class="bg-cyan-600/20 text-cyan-400 px-2 py-1 text-xs rounded-full border border-cyan-600/30">{project.category}</span>
							</div>
							<div class="absolute top-4 right-4">
								<span class="px-2 py-1 text-xs rounded-full border {getStatusColor(project.status)}">{project.status}</span>
							</div>
						</div>
						<div class="p-8 flex-1 flex flex-col justify-between">
							<div>
								<h3 class="text-xl font-semibold text-white mb-3 line-clamp-2">
									{project.title}
								</h3>
								<p class="text-gray-400 text-sm mb-4 line-clamp-3">
									{project.description}
								</p>
								<div class="flex flex-wrap gap-2 mb-4">
									{#each project.tech as tech}
										<span class="bg-gray-700/50 text-gray-300 px-2 py-1 text-xs rounded">{tech}</span>
									{/each}
								</div>
							</div>
							<div class="flex gap-3">
								<a 
									href={project.github} 
									target="_blank"
									class="flex-1 relative overflow-hidden px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105 text-center group"
								>
									<Icon icon="mdi:github" class="absolute right-0 top-1/2 -translate-y-1/2 text-[4rem] opacity-10 group-hover:opacity-20 transition-opacity duration-300" style="right: -10px;" />
									<span class="relative z-10">Code</span>
								</a>
								<a 
									href={project.demo} 
									target="_blank"
									class="flex-1 relative overflow-hidden px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105 text-center group"
								>
									<Icon icon="mdi:eye" class="absolute right-0 top-1/2 -translate-y-1/2 text-[4rem] opacity-10 group-hover:opacity-20 transition-opacity duration-300" style="right: -10px;" />
									<span class="relative z-10">Demo</span>
								</a>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<!-- Tutorials Section -->
	<section class="bg-gray-800 py-20 section-wave-top z-10">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Tech Tutorials</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Step-by-step guides and insights from my development experience
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each tutorials as tutorial}
					<article class="bg-gray-900/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 transform hover:scale-[1.02] flex flex-col min-h-[500px] isolate">
						<div class="aspect-video relative">
							<img 
								src={tutorial.image} 
								alt={tutorial.title}
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							<div class="absolute top-4 left-4">
								<span class="bg-orange-600/20 text-orange-400 px-2 py-1 text-xs rounded-full border border-orange-600/30">{tutorial.category}</span>
							</div>
							<div class="absolute top-4 right-4">
								<span class="px-2 py-1 text-xs rounded-full border {getDifficultyColor(tutorial.difficulty)}">{tutorial.difficulty}</span>
							</div>
						</div>
						<div class="p-8 flex-1 flex flex-col justify-between">
							<div>
								<h3 class="text-xl font-semibold text-white mb-3 line-clamp-2">
									{tutorial.title}
								</h3>
								<p class="text-gray-400 text-sm mb-4 line-clamp-3">
									{tutorial.description}
								</p>
								<div class="flex flex-wrap gap-2 mb-4">
									{#each tutorial.tags as tag}
										<span class="bg-cyan-600/20 text-cyan-400 px-2 py-1 text-xs rounded border border-cyan-600/30">{tag}</span>
									{/each}
								</div>
							</div>
							<div class="space-y-3">
								<div class="flex items-center justify-between text-xs text-gray-500">
									<span>{tutorial.duration}</span>
									<span>{tutorial.published}</span>
								</div>
								<button class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105">
									Read Tutorial
								</button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<!-- Tech Stack Section -->
	<section class="bg-gradient-to-br from-cyan-900/20 via-gray-900 to-blue-900/20 py-20 section-curve-top z-0">
		<div class="container mx-auto px-4">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-white mb-4">Technology Stack</h2>
				<p class="text-gray-400 max-w-2xl mx-auto">
					Tools and technologies I use to bring ideas to life
				</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
				{#each techStack as stack}
					<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8">
						<h3 class="text-xl font-semibold text-white mb-6 text-center">{stack.category}</h3>
						<div class="space-y-4">
							{#each stack.items as item}
								<div class="flex items-center gap-4">
									<Icon icon={item.icon} class="text-cyan-400 text-2xl flex-shrink-0" />
									<div class="flex-1">
										<div class="flex justify-between items-center mb-2">
											<span class="text-white font-medium">{item.name}</span>
											<span class="text-gray-400 text-sm">{item.level}%</span>
										</div>
										<div class="w-full bg-gray-700 rounded-full h-2">
											<div 
												class="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
												style="width: {item.level}%"
											></div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Contact CTA Section -->
	<section class="bg-gray-800 py-20 section-slant-top z-0">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Let's Build Something Amazing</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Whether you need custom software, want to collaborate on a project, or just want to discuss technology, I'd love to hear from you.
			</p>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<button class="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-full hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/30 hover:scale-105 transform">
					Start a Project
				</button>
				<button class="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105">
					View More Projects
				</button>
			</div>

			<div class="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
				<div class="text-center">
					<Icon icon="mdi:code-tags" class="text-cyan-400 text-3xl mb-2" />
					<h3 class="text-white font-semibold mb-1">Clean Code</h3>
					<p class="text-gray-400 text-sm">Well-structured, maintainable solutions</p>
				</div>
				<div class="text-center">
					<Icon icon="mdi:speedometer" class="text-blue-400 text-3xl mb-2" />
					<h3 class="text-white font-semibold mb-1">Performance</h3>
					<p class="text-gray-400 text-sm">Optimized for speed and efficiency</p>
				</div>
				<div class="text-center">
					<Icon icon="mdi:devices" class="text-purple-400 text-3xl mb-2" />
					<h3 class="text-white font-semibold mb-1">Cross-Platform</h3>
					<p class="text-gray-400 text-sm">Solutions that work everywhere</p>
				</div>
				<div class="text-center">
					<Icon icon="mdi:account-group" class="text-green-400 text-3xl mb-2" />
					<h3 class="text-white font-semibold mb-1">Collaborative</h3>
					<p class="text-gray-400 text-sm">Team-oriented development approach</p>
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

	.tech-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.tech-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.tech-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.tech-subtitle.animate {
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