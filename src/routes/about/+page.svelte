<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fade, fly, slide } from 'svelte/transition';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import Icon from '@iconify/svelte';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';

	// ============================================================================
	// STATE VARIABLES
	// ============================================================================
	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);
	let activeTab = $state('bio');
	let tabContent = $state(null);
	let visibleElements = $state(new Set());
	let tabContentVisible = $state(true);

	// ============================================================================
	// CONFIGURATION DATA
	// ============================================================================

	// Tab color themes
	const tabThemes = {
		bio: {
			gradient: 'from-gray-900 via-emerald-900/10 to-gray-900',
			accent: 'from-emerald-600 to-blue-600',
			border: 'border-emerald-600',
			text: 'text-emerald-400',
			bg: 'bg-emerald-600/20'
		},
		music: {
			gradient: 'from-blue-900 via-purple-900/20 to-gray-900',
			accent: 'from-blue-600 to-purple-600',
			border: 'border-blue-600',
			text: 'text-blue-400',
			bg: 'bg-blue-600/20'
		},
		tech: {
			gradient: 'from-cyan-900 via-green-900/20 to-gray-900',
			accent: 'from-cyan-600 to-green-600',
			border: 'border-cyan-600',
			text: 'text-cyan-400',
			bg: 'bg-cyan-600/20'
		},
		creative: {
			gradient: 'from-orange-900 via-pink-900/20 to-gray-900',
			accent: 'from-orange-600 to-pink-600',
			border: 'border-orange-600',
			text: 'text-orange-400',
			bg: 'bg-orange-600/20'
		}
	};

	// ============================================================================
	// CONTENT DATA
	// ============================================================================
	
	// Biography content for the general bio tab
	const biography = {
		image: '/img/KJ_Bio.jpg',
		content: `
			Jamaal "Key Jay" Ephriam's journey into the world of music and entertainment began before he could even walk. Born into a family where music wasn't just appreciated but lived and breathed, he was surrounded by the rhythms, melodies, and harmonies that would shape his future. His parents, both accomplished musicians, recognized their son's innate musical ability early on and began nurturing his gift at the tender age of five.

			What started as formal piano lessons quickly evolved into something much greater. Young Jamaal didn't just learn to play notes; he learned to speak the language of music fluently. By his teenage years, he had expanded beyond classical piano to master keyboards, vocals, and guitar, developing a versatility that would become his signature. His musical palette grew to encompass jazz, R&B, hip hop, rock, gospel, and electronic music – each genre adding new colors to his creative canvas.

			But Jamaal's talents weren't confined to just performance. His curiosity led him to the technical side of music, where he discovered a passion for production, composition, and arrangement. College years at Florida International University saw him diving deep into professional audio recording, but also unexpectedly opening doors to the world of technology and programming. This unique combination of artistic creativity and technical expertise would set him apart in an increasingly digital creative landscape.

			The evolution from musician to multi-disciplinary creative was organic. Web development skills acquired during a high school competition – where he became a finalist in a 5-hour live website design challenge – merged with his audio expertise to create innovative digital experiences. He composed music for video games like "Dies Irae," developed websites for creative projects, and even ventured into creating his own intellectual properties with KJC Comix and the audio drama series "FLUR: Blades of the Universe."

			Today, as the force behind KEY JAY ONLINE and a key player at 4 Media Central, LLC, Jamaal continues to push boundaries across multiple creative frontiers. His performances at venues like the Miami Music Festival, Hard Rock, and Transit Lounge showcase his dynamic stage presence, while his work in voice acting, video production, and creative direction demonstrates his range as a complete creative professional.

			What sets Jamaal apart isn't just his technical skill or creative vision – it's his philosophy of authentic expression and genuine connection. Whether he's producing a track, developing a website, voicing a character, or directing a creative project, he brings the same passion and dedication that first drew him to that piano as a five-year-old child. His motto, "Don't think, just play," isn't just about music; it's about approaching all creative endeavors with spontaneity, trust in one's instincts, and joy in the process.
		`
	};

	// Professional journey milestones by category
	const milestones = {
		music: [
			{
				year: '1990s',
				title: 'Classical Foundation',
				description: 'Started formal piano training at age 5, nurtured by parents who were musicians themselves.',
				icon: 'mdi:piano'
			},
			{
				year: '2010',
				title: 'Musical Evolution',
				description: 'Expanded into jazz, R&B, hip hop, and electronic music production.',
				icon: 'mdi:music-note'
			},
			{
				year: '2011',
				title: 'Party-Zon Project',
				description: 'Produced, mixed, composed, and performed on dance/electronic music project.',
				icon: 'mdi:album'
			},
			{
				year: '2018-2019',
				title: 'Project Kingdom XIII',
				description: 'Created comprehensive music compilation as composer, sound designer, and mixing engineer.',
				icon: 'mdi:microphone'
			},
			{
				year: 'Present',
				title: 'Live Performances',
				description: 'Regular performances at Miami Music Festival, Beer Festival, Hard Rock, Transit Lounge.',
				icon: 'mdi:stadium'
			}
		],
		tech: [
			{
				year: '2005-2010',
				title: 'Early Web Development',
				description: 'Became finalist in 5-hour live website design scholarship competition during high school.',
				icon: 'mdi:code-tags'
			},
			{
				year: '2010-2016',
				title: 'Florida International University',
				description: 'Studied professional audio recording and expanded into programming and web technologies.',
				icon: 'mdi:school'
			},
			{
				year: '2016',
				title: 'Game Development',
				description: 'Composed music for "Dies Irae" video game and developed supporting websites.',
				icon: 'mdi:gamepad-variant'
			},
			{
				year: '2020',
				title: 'Audio Tech Integration',
				description: 'Developed custom audio plugins and tools, merging music production with programming.',
				icon: 'mdi:waveform'
			},
			{
				year: 'Present',
				title: '4 Media Central, LLC',
				description: 'Leading technical projects combining web development, audio engineering, and creative production.',
				icon: 'mdi:briefcase'
			}
		],
		creative: [
			{
				year: '2009-2014',
				title: 'FLUR: Blades of the Universe',
				description: 'Created and produced original audio drama series, handling all aspects from writing to voice acting.',
				icon: 'mdi:podcast'
			},
			{
				year: '2015',
				title: 'Voice Acting Career',
				description: 'Began professional voice work for indie games, podcasts, and commercial projects.',
				icon: 'mdi:microphone'
			},
			{
				year: '2018',
				title: 'KJC Comix',
				description: 'Launched original comic series with integrated audio elements and web experiences.',
				icon: 'mdi:book-open-variant'
			},
			{
				year: '2020',
				title: 'Video Production',
				description: 'Expanded into full video production services, from concept to final edit.',
				icon: 'mdi:video'
			},
			{
				year: '2024',
				title: 'KEY JAY ONLINE',
				description: 'Unified all creative endeavors under one platform, offering comprehensive creative services.',
				icon: 'mdi:rocket-launch'
			}
		]
	};

	// Skills and expertise with quantifiable metrics
	const skills = {
		bio: [], // No skills section for bio tab
		music: [
			{ name: 'Music Production', metric: '15+ Years Experience', icon: 'mdi:music-note' },
			{ name: 'Live Performance', metric: '50+ Venues', icon: 'mdi:microphone-variant' },
			{ name: 'Tracks Produced', metric: '100+ Original Works', icon: 'mdi:album' },
			{ name: 'Instruments', metric: 'Piano, Keys, Vocals, Guitar', icon: 'mdi:piano' },
			{ name: 'Genres Mastered', metric: '7 Distinct Styles', icon: 'mdi:playlist-music' },
			{ name: 'Studio Sessions', metric: '500+ Hours', icon: 'mdi:headphones' }
		],
		tech: [
			{ name: 'Web Development', metric: '10+ Years Experience', icon: 'mdi:web' },
			{ name: 'Projects Completed', metric: '50+ Websites & Apps', icon: 'mdi:checkbox-marked-circle' },
			{ name: 'Languages', metric: 'JavaScript, Python, C++', icon: 'mdi:code-braces' },
			{ name: 'Frameworks', metric: 'React, Svelte, Node.js', icon: 'mdi:react' },
			{ name: 'Audio Programming', metric: 'VST Plugins, MIDI Tools', icon: 'mdi:waveform' },
			{ name: 'Database Systems', metric: 'SQL, MongoDB, Firebase', icon: 'mdi:database' }
		],
		creative: [
			{ name: 'Voice Acting', metric: '8+ Years Experience', icon: 'mdi:microphone' },
			{ name: 'Audio Dramas', metric: 'FLUR Series Creator', icon: 'mdi:podcast' },
			{ name: 'Video Production', metric: '100+ Projects', icon: 'mdi:video' },
			{ name: 'Content Creation', metric: 'Gaming, Tech, Music', icon: 'mdi:youtube' },
			{ name: 'Sound Design', metric: 'Games & Media', icon: 'mdi:speaker' },
			{ name: 'Creative Direction', metric: 'Brand Campaigns', icon: 'mdi:palette' }
		]
	};

	// Client testimonials
	const testimonials = [
		{
			name: 'Sarah Mitchell',
			company: 'BrandVoice Studios',
			role: 'Creative Director',
			quote: 'Working with Key Jay has been an absolute pleasure. His versatility across music production and voice work allowed us to create a cohesive brand experience that exceeded our expectations.',
			project: 'Brand Campaign Series',
			rating: 5,
			category: 'creative'
		},
		{
			name: 'Marcus Rodriguez',
			company: 'Indie Studios',
			role: 'Game Director',
			quote: 'Key Jay brought our characters to life with his incredible voice acting range. His understanding of gaming culture made the collaboration seamless and authentic.',
			project: 'RPG Character Voices',
			rating: 5,
			category: 'creative'
		},
		{
			name: 'Emily Chen',
			company: 'TechFlow Media',
			role: 'Content Producer',
			quote: 'The combination of technical expertise and creative vision that Key Jay brings is rare. He delivered both the audio solution and the creative direction we needed.',
			project: 'Podcast Production',
			rating: 5,
			category: 'tech'
		},
		{
			name: 'David Kim',
			company: 'Miami Music Collective',
			role: 'Event Coordinator',
			quote: 'Key Jay\'s live performances always bring incredible energy. His ability to read the crowd and adapt his set makes him a festival favorite.',
			project: 'Miami Music Festival',
			rating: 5,
			category: 'music'
		}
	];

	// Tab content descriptions
	const tabDescriptions = {
		bio: {
			title: 'Biography',
			subtitle: 'The Journey of a Multi-Disciplinary Creative',
			description: ''
		},
		music: {
			title: 'Music & Audio Production',
			subtitle: 'From Classical Foundations to Modern Production',
			description: 'With over 15 years of experience in music production and performance, I bring a unique blend of classical training and modern production techniques. My journey began at age 5 with formal piano training, evolving into a multi-genre approach that spans jazz, R&B, hip hop, rock, gospel, and electronic music.'
		},
		tech: {
			title: 'Technology & Development',
			subtitle: 'Building Digital Experiences',
			description: 'A decade of web development experience combined with audio engineering expertise allows me to create unique digital solutions. From VST plugin development to full-stack web applications, I bridge the gap between creative vision and technical implementation.'
		},
		creative: {
			title: 'Creative & Voice Work',
			subtitle: 'Bringing Stories to Life',
			description: 'As a voice actor, content creator, and multimedia producer, I specialize in crafting immersive experiences. From the FLUR audio drama series to game character voices and brand campaigns, I bring authenticity and passion to every project.'
		}
	};

	// ============================================================================
	// UTILITY FUNCTIONS
	// ============================================================================
	
	function switchTab(tab) {
		const isSameTab = activeTab === tab;
		activeTab = tab;
		
		// Always reset visible elements, but preserve background visibility
		const preserveBackground = visibleElements.has('bio-bg');
		visibleElements = new Set();
		if (preserveBackground) {
			visibleElements.add('bio-bg');
		}
		
		// Scroll and content recovery for both new tabs and same-tab clicks
		if (browser) {
			const contentSection = document.querySelector('#tab-content');
			if (contentSection) {
				contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
				
				// After scroll animation, force visibility of content that should be in viewport
				// Use shorter timeout for same-tab clicks since content is already loaded
				const timeout = isSameTab ? 300 : 600;
				setTimeout(() => {
					// Force visibility for all possible elements that should be in viewport
					let elementsToShow = [];
					
					// Common elements for all tabs
					if (tab !== 'bio') {
						// Add milestone elements (typically 3-5 per tab)
						for (let i = 0; i < 5; i++) {
							elementsToShow.push(`${tab}-milestone-${i}`);
						}
						// Add skill elements (typically 6 per tab)
						for (let i = 0; i < 6; i++) {
							elementsToShow.push(`${tab}-skill-${i}`);
						}
						// Add testimonial elements
						for (let i = 0; i < 3; i++) {
							elementsToShow.push(`${tab}-testimonial-${i}`);
						}
					}
					
					// Bio tab specific elements
					if (tab === 'bio') {
						elementsToShow.push('bio-image');
						// Add all bio paragraphs (there are many)
						for (let i = 0; i < 10; i++) {
							elementsToShow.push(`bio-p-${i}`);
						}
						// Add testimonials for bio tab
						for (let i = 0; i < 4; i++) {
							elementsToShow.push(`bio-testimonial-${i}`);
						}
					}
					
					// Force all elements to be visible
					elementsToShow.forEach(key => {
						visibleElements = new Set([...visibleElements, key]);
					});
					
				}, timeout);
			}
		}
	}

	function getActiveTheme() {
		return tabThemes[activeTab];
	}

	function observeElement(node, key) {
		if (!browser) return;
		return createIntersectionObserver(node, (isVisible) => {
			if (isVisible) {
				// Always add to visible elements when in view, even if already present
				visibleElements = new Set([...visibleElements, key]);
			}
		}, { threshold: 0.1, rootMargin: '80px' });
	}

	// ============================================================================
	// LIFECYCLE & EVENT HANDLERS
	// ============================================================================
	
	onMount(() => {
		if (!browser) return;

		let ticking = false;
		
		function updateParallax() {
			scrollY = window.scrollY;
			
			if (heroRef) {
				const heroHeight = heroRef.offsetHeight;
				const heroRect = heroRef.getBoundingClientRect();
				
				if (heroRect.top < -(heroHeight * 0.7)) {
					if (titleVisible && titleAnimated) {
						titleAnimated = false;
						setTimeout(() => {
							titleVisible = false;
						}, 300);
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
	<title>About - Jamaal "Key Jay" Ephriam</title>
	<meta name="description" content="Multi-disciplinary creative with 15+ years spanning music production, web development, voice acting, and creative content. From classical piano to modern digital production." />
</svelte:head>

<!-- ============================================================================ -->
<!-- MAIN CONTAINER -->
<!-- ============================================================================ -->
<div class="min-h-screen bg-gradient-to-br {getActiveTheme().gradient} transition-all duration-1000 relative">
	
	<!-- ============================================================================ -->
	<!-- HERO SECTION -->
	<!-- ============================================================================ -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden section-triangle z-20">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="/img/J_Header_5k.webp" 
				alt="Jamaal Key Jay Ephriam"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="about-title hero-title-responsive-long font-bold text-white" class:animate={titleAnimated}>
						JAMAAL "KEY JAY" EPHRIAM
					</h1>
					<p class="about-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Multi-disciplinary creative pushing boundaries across music, technology, and digital content
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- ============================================================================ -->
	<!-- CLIP MASK SPACER SECTION -->
	<!-- ============================================================================ -->
	<section class="bg-gray-950/95 z-10" style="margin-top: -179px; height: 179px;"></section>

	<!-- ============================================================================ -->
	<!-- TAB NAVIGATION -->
	<!-- ============================================================================ -->
	<section class="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
		<div class="container mx-auto px-4">
			<div class="flex justify-center">
				<div class="flex gap-1 overflow-x-auto no-scrollbar rounded-lg bg-gray-900/70 p-1 mt-4 mb-4 max-w-full">
					{#each Object.keys(tabThemes) as tab}
						<button
							onclick={() => switchTab(tab)}
							class="flex-shrink-0 px-2 xs:px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-md font-semibold transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap {
								activeTab === tab 
									? `bg-gradient-to-r ${tabThemes[tab].accent} text-white shadow-lg` 
									: 'text-gray-400 hover:text-white'
							}"
						>
							<span class="hidden md:inline">{tab === 'bio' ? 'Biography' : tab === 'music' ? 'Music & Audio' : tab === 'tech' ? 'Technology' : 'Creative & Voice'}</span>
							<span class="md:hidden">{tab === 'bio' ? 'Bio' : tab === 'music' ? 'Music' : tab === 'tech' ? 'Tech' : 'Creative'}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ============================================================================ -->
	<!-- TAB CONTENT -->
	<!-- ============================================================================ -->
	<section id="tab-content" class="pb-20 relative z-10" style="margin-top: -60px; padding-top: 120px;">
		<!-- Background image for bio section - CSS background -->
		<div 
			use:observeElement={'bio-bg'}
			class="absolute inset-0 -z-10 transition-opacity duration-1500 {
				visibleElements.has('bio-bg') ? 'opacity-30' : 'opacity-0'
			}"
			style="background-image: url('/img/keyjayside.webp'); background-size: cover; background-position: center; transition-delay: 600ms;"
		></div>
		
		<!-- Dark overlay for better text readability - scoped to this section -->
		<div class="absolute inset-0 bg-gray-900/60 pointer-events-none"></div>
		
		<div class="container mx-auto px-4 relative z-10">
			<div class="w-full">
				{#key activeTab}
					{#if tabContentVisible}
						<div in:fade={{ duration: 500 }}>
							{#if activeTab === 'bio'}
							<!-- Biography Section -->
							
							<div class="text-center mb-12 relative">
								<h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">{tabDescriptions[activeTab].title}</h2>
								<p class="text-xl {getActiveTheme().text} mb-6">{tabDescriptions[activeTab].subtitle}</p>
							</div>
							
							<div class="flex flex-col lg:flex-row lg:gap-12 mb-20">
								<div class="mb-8 lg:mb-0 lg:w-1/2">
									<div 
										use:observeElement={'bio-image'}
										class="sticky top-[140px] z-20 mx-auto w-full max-w-md transition-all duration-1000 {
											visibleElements.has('bio-image') ? 'opacity-100' : 'opacity-0'
										}"
									>
										<img 
											src={biography.image} 
											alt="Jamaal Key Jay Ephriam"
											class="w-full rounded-2xl shadow-2xl object-cover"
										/>
									</div>
								</div>
								<div class="lg:w-1/2 lg:flex-grow prose prose-xl prose-invert max-w-none">
									<div class="text-gray-100 leading-relaxed space-y-6 text-lg">
										{#each biography.content.trim().split('\n\n') as paragraph, i}
											{#if paragraph.trim()}
												<p 
													use:observeElement={`bio-p-${i}`}
													class="mb-6 transition-all duration-700 transform {
														visibleElements.has(`bio-p-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
													}"
													style="transition-delay: {i * 100}ms"
												>
													{paragraph.trim()}
												</p>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{:else}
							<div class="text-center mb-12">
								<h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">{tabDescriptions[activeTab].title}</h2>
								<p class="text-xl {getActiveTheme().text} mb-6">{tabDescriptions[activeTab].subtitle}</p>
								<p class="text-gray-300 max-w-3xl mx-auto">{tabDescriptions[activeTab].description}</p>
							</div>
						{/if}

						<!-- Journey Timeline -->
						{#if activeTab !== 'bio'}
						<div class="mb-20">
							<h3 class="text-2xl font-semibold text-white mb-8 text-center">Professional Journey</h3>
							<div class="space-y-6">
								{#each milestones[activeTab] || [] as milestone, index}
									<div 
										use:observeElement={`${activeTab}-milestone-${index}`}
										class="flex items-start gap-6 transition-all duration-700 transform {
											visibleElements.has(`${activeTab}-milestone-${index}`) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
										}"
										style="transition-delay: {index * 150}ms"
									>
										<div class="flex-shrink-0">
											<div class="flex items-center justify-center w-14 h-14 bg-gradient-to-br {getActiveTheme().accent} text-white rounded-full">
												<Icon icon={milestone.icon} class="text-2xl" />
											</div>
										</div>
										<div class="flex-1 bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 hover:bg-gray-800/50 transition-all duration-300">
											<div class="flex items-center gap-3 mb-2">
												<span class="{getActiveTheme().text} font-bold text-lg">{milestone.year}</span>
											</div>
											<h4 class="text-xl font-semibold text-white mb-2">{milestone.title}</h4>
											<p class="text-gray-100">{milestone.description}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
						{/if}

						<!-- Skills & Metrics -->
						{#if activeTab !== 'bio' && skills[activeTab] && skills[activeTab].length > 0}
						<div class="mb-20">
							<h3 class="text-2xl font-semibold text-white mb-8 text-center">Skills & Achievements</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{#each skills[activeTab] as skill, index}
									<div 
										use:observeElement={`${activeTab}-skill-${index}`}
										class="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 hover:bg-gray-800/50 transition-all duration-700 transform {
											visibleElements.has(`${activeTab}-skill-${index}`) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
										}"
										style="transition-delay: {index * 100}ms"
									>
										<div class="flex items-center gap-4 mb-3">
											<div class="flex items-center justify-center w-10 h-10 bg-gradient-to-br {getActiveTheme().accent} text-white rounded-lg">
												<Icon icon={skill.icon} class="text-xl" />
											</div>
											<h4 class="text-lg font-semibold text-white">{skill.name}</h4>
										</div>
										<p class="{getActiveTheme().text} font-bold text-xl">{skill.metric}</p>
									</div>
								{/each}
							</div>
						</div>
						{/if}

						<!-- Relevant Testimonials -->
						<div class="mb-20">
							<h3 class="text-2xl font-semibold text-white mb-8 text-center">Client Testimonials</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								{#each testimonials.filter(t => activeTab === 'bio' || t.category === activeTab || (activeTab === 'creative' && t.category === 'creative')) as testimonial, index}
									<div 
										use:observeElement={`${activeTab}-testimonial-${index}`}
										class="bg-gray-900/50 backdrop-blur-sm rounded-lg p-8 hover:bg-gray-800/50 transition-all duration-700 transform {
											visibleElements.has(`${activeTab}-testimonial-${index}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
										}"
										style="transition-delay: {index * 200}ms"
									>
										<div class="flex items-center mb-4">
											{#each Array(testimonial.rating) as _}
												<Icon icon="mdi:star" class="text-yellow-400 text-xl" />
											{/each}
										</div>
										<blockquote class="text-gray-100 mb-6 italic text-lg">
											"{testimonial.quote}"
										</blockquote>
										<div class="border-t border-gray-700 pt-4">
											<div class="text-white font-semibold">{testimonial.name}</div>
											<div class="{getActiveTheme().text} text-sm">{testimonial.role}</div>
											<div class="text-gray-400 text-sm">{testimonial.company}</div>
											<div class="text-gray-400 text-xs mt-1">Project: {testimonial.project}</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
					{/if}
				{/key}
			</div>
		</div>
	</section>

	<!-- Contact CTA -->
	<section class="bg-gray-800 py-20 section-curve-top z-20" style="margin-top: -80px; padding-top: 120px;">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Let's Create Something Amazing Together</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Whether you need music production, web development, voice work, or creative direction, 
				I bring passion and expertise to every project.
			</p>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<a 
					href="/contact"
					class="px-8 py-4 bg-gradient-to-r {getActiveTheme().accent} text-white font-semibold rounded-full hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
				>
					Start a Project
				</a>
				<a 
					href="/productions"
					class="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105"
				>
					View Services
				</a>
			</div>
		</div>
	</section>
	
</div>

<style>
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