<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { createIntersectionObserver } from '$lib/utils/intersectionObserver.js';
	import { navigateTo, navbarVisible } from '$lib/stores/navigation.js';
	import { showStickyNav, hideStickyNav, aboutActiveTab } from '$lib/stores/stickyNav.js';
	import { get } from 'svelte/store';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';

	// ============================================================================
	// DYNAMIC CALCULATIONS
	// ============================================================================
	// Born December 13, 1986, started playing at age 5 (December 13, 1991)
	const musicStartYear = 1991;
	const yearsOfMusicExperience = new Date().getFullYear() - musicStartYear;

	// ============================================================================
	// STATE VARIABLES
	// ============================================================================
	let activeTab = $state('bio');
	let visibleElements = $state(new Set());
	let tabContentVisible = $state(true);

	// Reference to the inline tab nav for scroll detection
	let inlineNavRef = $state(null);
	let stickyNavActive = $state(false);

	// Bio image sticky refs and state
	let bioImageRef = $state(null);
	let bioWrapperRef = $state(null);
	let bioImageOffset = $state(0);

	// Sync with store when tab changes externally (from portal)
	$effect(() => {
		const storeTab = $aboutActiveTab;
		if (storeTab !== activeTab) {
			activeTab = storeTab;
			// Trigger content update
			handleTabChange(storeTab, true);
		}
	});

	// Fetch milestones and testimonials from API
	async function fetchAboutData() {
		try {
			const response = await fetch('/api/sections/about');
			if (!response.ok) {
				throw new Error('Failed to fetch about data');
			}
			const data = await response.json();
			if (data.milestones) {
				milestones = data.milestones;
			}
			if (data.testimonials && data.testimonials.length > 0) {
				testimonials = data.testimonials;
			}
		} catch (error) {
			console.error('Error fetching about data:', error);
			// Keep fallback data if fetch fails
		}
	}

	// Scroll detection for sticky nav portal and bio image sticky
	onMount(() => {
		if (!browser) return;

		// Fetch about data on mount (milestones, testimonials)
		fetchAboutData();

		function handleScroll() {
			if (!inlineNavRef) return;

			const rect = inlineNavRef.getBoundingClientRect();
			const navbarOffset = get(navbarVisible) ? 88 : 0;

			// When inline nav top goes above the navbar, show sticky portal
			if (rect.top <= navbarOffset) {
				if (!stickyNavActive) {
					stickyNavActive = true;
					showStickyNav(navbarOffset);
				}
			} else {
				if (stickyNavActive) {
					stickyNavActive = false;
					hideStickyNav();
				}
			}

			// Bio image sticky behavior (only on large screens)
			if (bioImageRef && bioWrapperRef && window.innerWidth >= 1024) {
				const stickyTop = 80; // Below sticky nav
				const wrapperRect = bioWrapperRef.getBoundingClientRect();
				const imageRect = bioImageRef.getBoundingClientRect();
				const imageHeight = imageRect.height;

				// Calculate the bottom boundary (wrapper bottom minus image height)
				const maxOffset = wrapperRect.height - imageHeight;

				if (wrapperRect.top <= stickyTop) {
					// Image should start sticking
					const rawOffset = stickyTop - wrapperRect.top;
					// Clamp to not go past the wrapper bottom
					bioImageOffset = Math.min(Math.max(0, rawOffset), maxOffset);
				} else {
					bioImageOffset = 0;
				}
			} else {
				bioImageOffset = 0;
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', handleScroll, { passive: true });

		// Subscribe to navbar visibility changes
		const unsubscribe = navbarVisible.subscribe(() => {
			handleScroll();
		});

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleScroll);
			unsubscribe();
			hideStickyNav();
		};
	});

	// Export switchTab for external calls (from portal)
	export function switchTab(tab) {
		activeTab = tab;
		aboutActiveTab.set(tab);
		handleTabChange(tab, false);
	}


	// ============================================================================
	// CONFIGURATION DATA
	// ============================================================================

	// Tab color themes - adapted for neumorphic design
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
			gradient: 'from-purple-900 via-pink-900/20 to-gray-900',
			accent: 'from-purple-600 to-pink-600',
			border: 'border-purple-600',
			text: 'text-purple-400',
			bg: 'bg-purple-600/20'
		},
		productions: {
			gradient: 'from-orange-900 via-amber-900/20 to-gray-900',
			accent: 'from-orange-600 to-amber-600',
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

	// Professional journey milestones by category - fetched from API
	let milestones = $state({
		music: [],
		tech: [],
		creative: [],
		productions: []
	});

	// Skills and expertise with quantifiable metrics
	const skills = {
		bio: [], // No skills section for bio tab
		music: [
			{ name: 'Music Production', metric: `${yearsOfMusicExperience}+ Years Experience`, icon: 'mdi:music-note' },
			{ name: 'Live Performance', metric: '10+ Venues', icon: 'mdi:microphone-variant' },
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
			{ name: 'Voice Acting', metric: '15+ Years Experience', icon: 'mdi:microphone' },
			{ name: 'Character Range', metric: 'Heroes to Villains', icon: 'mdi:drama-masks' },
			{ name: 'Video Games', metric: 'Multiple Titles', icon: 'mdi:gamepad-variant' },
			{ name: 'Animations', metric: 'Indie & Fan Projects', icon: 'mdi:movie' },
			{ name: 'Commercial VO', metric: 'IVR & Prompts', icon: 'mdi:phone-voip' },
			{ name: 'Radio Dramas', metric: 'Online & Fan Projects', icon: 'mdi:radio' }
		],
		productions: [
			{ name: 'Webcomics', metric: 'DRIFT Series', icon: 'mdi:book-open-page-variant' },
			{ name: 'Audio Dramas', metric: 'FLUR Series Creator', icon: 'mdi:podcast' },
			{ name: 'Music Videos', metric: 'Project Kingdom XIII', icon: 'mdi:video' },
			{ name: 'Writing', metric: 'Scripts & Stories', icon: 'mdi:script-text' },
			{ name: 'Direction', metric: 'Cast & Production', icon: 'mdi:movie-open' },
			{ name: 'Collaboration', metric: 'Artists & Talent', icon: 'mdi:account-group' }
		]
	};

	// Client testimonials (fallback data, updated from API if available)
	let testimonials = $state([
		{
			name: 'Sandra Espinoza',
			date: '05/2013',
			quote: "Working with Jamaal has been the most fluid and easy going experience I've ever had with a director. Jamaal's highly motivated about his work and is delightfully thorough in both his marketing efforts and the acting direction provided for the project! He goes the extra mile to provide talents with the opportunity to have access to things they might not have otherwise, and it makes the project feel all the more like a community effort. I'm happy to work with him and hope to see him produce more great works in the future!",
			rating: 5,
			categories: ['creative', 'productions']
		},
		{
			name: 'Jeremiah Caudle',
			date: '05/2012',
			quote: "This guy has got to be one of the most talented person I have ever met. A worthy rival in writing and producing/mixing. A genius musician, and to top it all off; a freakin' amazing voice. Not only can he sing like nobodies business, but both his voices for protagonists as well as antagonists are nothing short of genius. Not to mention his evil laugh is one that will give you shivers!",
			rating: 5,
			categories: ['music', 'creative']
		},
		{
			name: 'Nina M.',
			date: '05/2016',
			quote: "I worked with Jamaal for the first time in 2011 when I was cast to play Lida Garuzo in his radio play F.L.U.R. I was a fledgling when it came to voice acting at the time, and even though I was still rough around the edges, Jamaal made sure to not only provide guidance when required, but also support and words of encouragement. It was easy to work with him because he made it clear how he wanted his characters to be portrayed and what was expected from us, making the entire production smooth sailing. The thing I like most about Jamaal is how he empowers his peers, but also gives it his all. It never feels like you're doing a job, it feels like you're part of a family, maybe something bigger. He is driven, organized, and someone I would gladly work for again.",
			rating: 5,
			categories: ['creative', 'productions']
		}
	]);

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
			description: `With over ${yearsOfMusicExperience} years of experience in music production and performance, I bring a unique blend of classical training and modern production techniques. My journey began at age 5 with formal piano training, evolving into a multi-genre approach that spans jazz, R&B, hip hop, rock, gospel, and electronic music.`
		},
		tech: {
			title: 'Technology & Development',
			subtitle: 'Building Digital Experiences',
			description: 'A decade of web development experience combined with audio engineering expertise allows me to create unique digital solutions. From VST plugin development to full-stack web applications, I bridge the gap between creative vision and technical implementation.'
		},
		creative: {
			title: 'Voice Acting',
			subtitle: 'Bringing Characters to Life',
			description: 'As a voice actor with credits spanning video games, animations, radio dramas, and commercial work, I bring authenticity and range to every character. From heroic protagonists to sinister villains, I deliver performances that connect with audiences.'
		},
		productions: {
			title: 'Productions',
			subtitle: 'Creating Original Content',
			description: 'From webcomics to radio dramas to music videos, I bring creative visions to life. As a writer, producer, and director, I lead projects from concept to completion, collaborating with talented artists and voice actors along the way.'
		}
	};

	// ============================================================================
	// UTILITY FUNCTIONS
	// ============================================================================

	// Internal tab change handler (fromStoreSync=true skips scroll when syncing from portal)
	function handleTabChange(tab, fromStoreSync = false) {
		const isSameTab = activeTab === tab;
		if (!fromStoreSync) {
			activeTab = tab;
		}

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
				// Calculate proper scroll position accounting for both navbars
				const mainNavOffset = $navbarVisible ? 88 : 0;
				const stickyTabNavHeight = 72; // Height of sticky tab nav with padding
				const totalOffset = mainNavOffset + stickyTabNavHeight;

				const targetY = contentSection.getBoundingClientRect().top + window.scrollY - totalOffset;
				window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });

				// After scroll animation, force visibility of content that should be in viewport
				const timeout = isSameTab ? 300 : 600;
				setTimeout(() => {
					let elementsToShow = [];

					// Common elements for all tabs
					if (tab !== 'bio') {
						for (let i = 0; i < 5; i++) {
							elementsToShow.push(`${tab}-milestone-${i}`);
						}
						for (let i = 0; i < 6; i++) {
							elementsToShow.push(`${tab}-skill-${i}`);
						}
						for (let i = 0; i < 3; i++) {
							elementsToShow.push(`${tab}-testimonial-${i}`);
						}
					}

					// Bio tab specific elements
					if (tab === 'bio') {
						elementsToShow.push('bio-image');
						for (let i = 0; i < 10; i++) {
							elementsToShow.push(`bio-p-${i}`);
						}
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

	// Called by inline tab buttons
	function onInlineTabClick(tab) {
		activeTab = tab;
		aboutActiveTab.set(tab);
		handleTabChange(tab, false);
	}

	function getActiveTheme() {
		return tabThemes[activeTab];
	}

	function observeElement(node, key) {
		if (!browser) return;
		return createIntersectionObserver(node, (isVisible) => {
			if (isVisible) {
				visibleElements = new Set([...visibleElements, key]);
			}
		}, { threshold: 0.1, rootMargin: '80px' });
	}

	// Handle navigation to other sections via hash
	function handleNavClick(section) {
		navigateTo(section);
	}
</script>

<!-- ============================================================================ -->
<!-- ABOUT SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="about-section min-h-screen bg-gradient-to-br {getActiveTheme().gradient} transition-all duration-1000 relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="about" opacity={0.1} />

	<!-- Section Header -->
	<div class="section-header pt-28 pb-8 text-center">
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3">About</h1>
		<p class="text-lg text-gray-400">Jamaal "Key Jay" Ephriam</p>
	</div>

	<!-- ============================================================================ -->
	<!-- TAB NAVIGATION (inline version - portal takes over when sticky) -->
	<!-- ============================================================================ -->
	<div
		bind:this={inlineNavRef}
		class="bg-[var(--neu-bg)]/95 backdrop-blur-sm border-b border-gray-800 z-40 transition-opacity duration-200"
		class:opacity-0={stickyNavActive}
		class:pointer-events-none={stickyNavActive}
	>
		<div class="container mx-auto px-4">
			<div class="flex justify-center">
				<div class="flex gap-1 overflow-x-auto no-scrollbar neu-card-inset p-1 my-4 max-w-full">
					{#each Object.keys(tabThemes) as tab}
						<button
							onclick={() => onInlineTabClick(tab)}
							class="flex-shrink-0 px-2 xs:px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-md font-semibold transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap {
								activeTab === tab
									? `bg-gradient-to-r ${tabThemes[tab].accent} text-white shadow-lg`
									: 'text-gray-400 hover:text-white'
							}"
						>
							<span class="hidden md:inline">{tab === 'bio' ? 'Biography' : tab === 'music' ? 'Music & Audio' : tab === 'tech' ? 'Technology' : tab === 'creative' ? 'Voice Acting' : 'Productions'}</span>
							<span class="md:hidden">{tab === 'bio' ? 'Bio' : tab === 'music' ? 'Music' : tab === 'tech' ? 'Tech' : tab === 'creative' ? 'Voice' : 'Prods'}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- ============================================================================ -->
	<!-- TAB CONTENT -->
	<!-- ============================================================================ -->
	<section id="tab-content" class="pb-20 relative z-10 pt-8">
		<!-- Background image for bio section -->
		<div
			use:observeElement={'bio-bg'}
			class="absolute inset-0 -z-10 transition-opacity duration-1500 {
				visibleElements.has('bio-bg') ? 'opacity-20' : 'opacity-0'
			}"
			style="background-image: url('/img/keyjayside.webp'); background-size: cover; background-position: center; transition-delay: 600ms;"
		></div>

		<!-- Dark overlay for better text readability -->
		<div class="absolute inset-0 bg-[var(--neu-bg)]/70 pointer-events-none"></div>

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

							<div bind:this={bioWrapperRef} class="bio-content-wrapper flex flex-col lg:flex-row lg:gap-12 mb-20 lg:items-start">
								<div class="mb-8 lg:mb-0 lg:w-1/2">
									<div
										bind:this={bioImageRef}
										use:observeElement={'bio-image'}
										class="bio-image-container z-20 mx-auto w-full max-w-md transition-opacity duration-1000 {
											visibleElements.has('bio-image') ? 'opacity-100' : 'opacity-0'
										}"
										style="transform: translateY({bioImageOffset}px);"
									>
										<img
											src={biography.image}
											alt="Jamaal Key Jay Ephriam"
											class="w-full rounded-2xl shadow-2xl object-cover neu-card"
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
											<div class="flex items-center justify-center w-14 h-14 bg-gradient-to-br {getActiveTheme().accent} text-white rounded-full neu-raised">
												<Icon icon={milestone.icon} class="text-2xl" />
											</div>
										</div>
										<div class="flex-1 neu-card p-6 hover:scale-[1.02] transition-all duration-300">
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
										class="neu-card p-6 hover:scale-[1.02] transition-all duration-700 transform {
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
								{#each testimonials.filter(t => activeTab === 'bio' || (t.serviceTypes && t.serviceTypes.includes(activeTab)) || (t.categories && t.categories.includes(activeTab))) as testimonial, index}
									<div
										use:observeElement={`${activeTab}-testimonial-${index}`}
										class="neu-card p-8 hover:scale-[1.02] transition-all duration-700 transform {
											visibleElements.has(`${activeTab}-testimonial-${index}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
										}"
										style="transition-delay: {index * 200}ms"
									>
										<div class="flex items-center mb-4">
											{#each Array(testimonial.rating) as _}
												<Icon icon="mdi:star" class="text-yellow-400 text-xl" />
											{/each}
										</div>
										<blockquote class="text-gray-100 mb-6 italic text-lg testimonial-content">
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
												<div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
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
														<span class="text-purple-400">Re: {testimonial.projectName}</span>
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
					</div>
					{/if}
				{/key}
			</div>
		</div>
	</section>

	<!-- Contact CTA -->
	<section class="bg-[var(--neu-bg-dark)] py-20 relative z-20">
		<div class="container mx-auto px-4 text-center">
			<h2 class="text-3xl font-bold text-white mb-4">Let's Create Something Amazing Together</h2>
			<p class="text-gray-400 mb-8 max-w-2xl mx-auto">
				Whether you need music production, web development, voice work, or creative direction,
				I bring passion and expertise to every project.
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<button
					onclick={() => handleNavClick('contact')}
					class="neu-button-primary px-8 py-4 bg-gradient-to-r {getActiveTheme().accent} text-white font-semibold rounded-full hover:scale-105 transform transition-all duration-300"
				>
					Start a Project
				</button>
				<button
					onclick={() => handleNavClick('productions')}
					class="neu-button px-8 py-4 text-white font-semibold rounded-full transition-all duration-300 hover:scale-105"
				>
					View Services
				</button>
			</div>
		</div>
	</section>

</div>

<style>
	.about-section {
		overflow: visible;
	}

	/* Bio image positioning for large screens */
	.bio-image-container {
		position: relative;
		will-change: transform;
	}

	@media (min-width: 1024px) {
		.bio-content-wrapper {
			align-items: flex-start;
		}

		/* JS-based sticky - transform applied via style attribute */
		.bio-image-container {
			position: relative;
		}
	}

	/* Section header spacing to account for main navbar */
	.section-header {
		scroll-margin-top: 100px;
	}

	/* Scroll margin for tab content to account for both navbars */
	:global(#tab-content) {
		scroll-margin-top: 160px;
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

	.neu-raised {
		box-shadow:
			4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			-4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
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

	.neu-button:active {
		box-shadow:
			inset 4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			inset -4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
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
