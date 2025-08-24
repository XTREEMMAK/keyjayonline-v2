<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { createScrollObserver } from '$lib/utils/scrollObserver.js';
	import { getYouTubeThumbnail } from '$lib/utils/youtube.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import VideoModalSwal from '$lib/components/media/VideoModalSwal.svelte';
	
	let {
		/** @type {Array<{id: number, title: string, description: string, backgroundImageUrl: string, leftContent: {type: string, videoId: string | null, src: string | null}, video_url?: string, video_type?: string, link?: string}>} */
		featuredWorks = []
	} = $props();
	
	let sectionElement = $state();
	let visible = $state(false);
	let currentProjectIndex = $state(0);
	let isTransitioning = $state(false);
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let touchStartY = $state(0);
	let touchEndY = $state(0);
	let scrollY = $state(0);
	let leftContainerHeight = $state(350);
	let rightContainerHeight = $state(350);
	let rightContainerWidth = $state(400);
	let measurementContainer = $state();
	let isMobile = $state(false);
	let videoModal = $state();
	
	// Use featured works from props or fallback to static data
	const projects = $derived(featuredWorks.length > 0 ? featuredWorks : [
		{
			id: 1,
			title: '"Ephemeral Echoes" - Album Release',
			description: 'A deep dive into the creative process behind my latest album, "Ephemeral Echoes." This project explores the interplay of organic and synthetic sounds, creating a sonic landscape that is both nostalgic and futuristic.',
			backgroundImageUrl: 'https://images.squarespace-cdn.com/content/v1/6411d47133e5e02e0a1ebe07/1700140172111-0UTV428JELSPYOW2S8NX/DJI_0649-Pano.jpg?format=750w',
			leftContent: {
				type: 'image',
				src: 'https://placehold.co/800x600/1a1a1a/ffffff?text=Album+Cover',
				videoId: null
			},
			link: '#'
		},
		{
			id: 2,
			title: 'Gaming Livestream Setup',
			description: 'Check out the details of my latest gaming rig and livestream setup, optimized for performance and audience engagement. Learn about the gear and software I use to deliver a seamless streaming experience.',
			backgroundImageUrl: 'https://images.squarespace-cdn.com/content/v1/6411d47133e5e02e0a1ebe07/1700140172111-0UTV428JELSPYOW2S8NX/DJI_0649-Pano.jpg?format=750w',
			leftContent: {
				type: 'youtube',
				videoId: 'dQw4w9WgXcQ',
				src: null
			},
			link: '#'
		},
		{
			id: 3,
			title: 'Interactive Art Installation',
			description: 'An exploration of my interactive art piece, "Nexus," which uses real-time sound analysis to create a responsive visual spectacle. This project was a collaboration with digital artists and developers.',
			backgroundImageUrl: 'https://images.unsplash.com/photo-1729575846511-f499d2e17d79?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFzaWMlMjBiYWNrZ3JvdW5kfGVufDB8fDB8fHww',
			leftContent: {
				type: 'image',
				src: 'https://placehold.co/800x600/2a2a2a/ffffff?text=Art+Installation',
				videoId: null
			},
			link: '#'
		}
	]);

	onMount(() => {
		createScrollObserver(sectionElement, (isVisible) => {
			visible = isVisible;
		}, 0.6);

		// Add scroll listener for parallax effect
		const handleScroll = () => {
			scrollY = window.scrollY;
		};

		// Add resize listener to detect mobile
		const handleResize = () => {
			isMobile = window.innerWidth < 768;
		};

		window.addEventListener('scroll', handleScroll);
		window.addEventListener('resize', handleResize);
		
		// Initial setup
		handleResize();
		
		// Calculate initial dimensions after DOM is ready
		setTimeout(() => {
			calculateOptimalDimensions();
		}, 100);
		
		// Recalculate when window resizes
		const handleOptimalResize = () => {
			setTimeout(() => {
				calculateOptimalDimensions();
			}, 150);
		};
		
		window.addEventListener('resize', handleOptimalResize);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('resize', handleOptimalResize);
		};
	});

	function prevProject() {
		if (isTransitioning) return;
		const newIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
		isTransitioning = true;
		currentProjectIndex = newIndex;
		setTimeout(() => {
			isTransitioning = false;
		}, 600);
	}

	function nextProject() {
		if (isTransitioning) return;
		const newIndex = (currentProjectIndex + 1) % projects.length;
		isTransitioning = true;
		currentProjectIndex = newIndex;
		setTimeout(() => {
			isTransitioning = false;
		}, 600);
	}

	function goToProject(index) {
		if (isTransitioning || index === currentProjectIndex) return;
		isTransitioning = true;
		currentProjectIndex = index;
		setTimeout(() => {
			isTransitioning = false;
		}, 600);
	}

	// Function to show video modal
	async function showVideoModal(project) {
		if (videoModal && (project.leftContent.type === 'youtube' || project.video_url)) {
			await videoModal.showModal();
		}
	}

	// Function to handle click on left content (image or video)
	function handleLeftContentClick(project) {
		if (project.leftContent.type === 'youtube' && project.leftContent.videoId) {
			showVideoModal(project);
		} else if (project.video_url) {
			showVideoModal(project);
		}
	}

	function handleTouchStart(event) {
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event) {
		touchEndX = event.changedTouches[0].clientX;
		touchEndY = event.changedTouches[0].clientY;
		handleSwipe();
	}

	function handleSwipe() {
		const swipeThreshold = 80; // Increased threshold
		const verticalThreshold = 60; // Maximum vertical movement allowed
		
		const horizontalDiff = touchStartX - touchEndX;
		const verticalDiff = Math.abs(touchStartY - touchEndY);

		// Only trigger swipe if horizontal movement is significant AND vertical movement is minimal
		if (Math.abs(horizontalDiff) > swipeThreshold && 
			verticalDiff < verticalThreshold && 
			!isTransitioning &&
			Math.abs(horizontalDiff) > verticalDiff * 1.5) { // Horizontal movement must be 1.5x more than vertical
			
			if (horizontalDiff > 0) {
				// Swiped left - go to next project
				nextProject();
			} else {
				// Swiped right - go to previous project
				prevProject();
			}
		}
	}

	const currentProject = $derived(projects[currentProjectIndex]);
	
	// Calculate optimal dimensions to prevent expansion/shifting but show all content
	function calculateOptimalDimensions() {
		if (!measurementContainer) {
			// Fallback to reasonable defaults
			rightContainerHeight = 450;
			rightContainerWidth = 400;
			return;
		}
		
		let maxHeight = 0;
		let maxWidth = 0;
		
		// Measure each project's content dimensions
		projects.forEach(project => {
			const tempContainer = document.createElement('div');
			tempContainer.style.position = 'absolute';
			tempContainer.style.visibility = 'hidden';
			tempContainer.style.width = 'max-content';
			tempContainer.style.maxWidth = window.innerWidth >= 1024 ? '28rem' : '100%';
			tempContainer.style.padding = window.innerWidth >= 1024 ? '3rem' : 
										 window.innerWidth >= 768 ? '2rem' : 
										 window.innerWidth >= 640 ? '1.5rem' : '1rem';
			tempContainer.className = 'bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl';
			
			const titleSize = window.innerWidth >= 1024 ? 'text-4xl' : 
							  window.innerWidth >= 768 ? 'text-3xl' : 
							  window.innerWidth >= 640 ? 'text-2xl' : 'text-2xl';
			const textSize = window.innerWidth >= 768 ? 'text-xl' : 'text-lg';
			
			tempContainer.innerHTML = `
				<h3 class="${titleSize} font-bold text-white mb-4 leading-tight">${project.title}</h3>
				<p class="${textSize} text-gray-200 mb-6 leading-relaxed">${project.description}</p>
				<div class="flex flex-col sm:flex-row gap-4 items-start">
					<a href="#" class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full">View Project</a>
				</div>
			`;
			
			measurementContainer.appendChild(tempContainer);
			const height = tempContainer.offsetHeight;
			const width = tempContainer.offsetWidth;
			maxHeight = Math.max(maxHeight, height);
			maxWidth = Math.max(maxWidth, width);
			measurementContainer.removeChild(tempContainer);
		});
		
		// Set dimensions with buffer - use calculated height for both mobile and desktop
		const minHeight = isMobile ? 350 : 400;
		const minWidth = isMobile ? 300 : 400;
		
		// Add generous buffer to prevent any collapse during transitions
		rightContainerHeight = Math.max(minHeight, maxHeight + 60);
		rightContainerWidth = Math.max(minWidth, maxWidth + 20);
		
		console.log('Calculated optimal dimensions:', { height: maxHeight, width: maxWidth }, '-> Set to:', { height: rightContainerHeight, width: rightContainerWidth });
	}
	
	// Calculate parallax transform with easing
	const parallaxTransform = $derived(() => {
		if (!sectionElement) return 'translateY(0px)';
		const rect = sectionElement.getBoundingClientRect();
		const sectionTop = rect.top + window.scrollY;
		const sectionHeight = rect.height;
		const windowHeight = window.innerHeight;
		
		// Calculate progress through the section (0 to 1)
		const progress = Math.max(0, Math.min(1, (scrollY + windowHeight - sectionTop) / (sectionHeight + windowHeight)));
		
		// Reduce parallax effect for better coverage and responsiveness
		const parallaxOffset = (progress - 0.5) * 30; // Range: -15px to +15px
		
		return `translateY(${parallaxOffset}px)`;
	});
</script>

<!-- Featured Work Section - Full width with background -->
<section 
	id="featured" 
	class="relative w-full overflow-hidden min-h-screen"
	style="margin-top: -120px; z-index: 5;"
	bind:this={sectionElement}>
	
	<!-- Background with fade transition and parallax -->
	{#key currentProjectIndex}
		<div 
			class="absolute bg-cover bg-center transition-all duration-1000 {visible ? '' : 'blur-sm'}"
			style="top: -20px; left: 0; right: 0; bottom: -20px; background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('{currentProject.backgroundImageUrl}'); transform: {parallaxTransform()}; background-attachment: scroll;"
			transition:fade={{ duration: 800 }}>
		</div>
	{/key}
	
	{#if visible}
		<div class="relative z-10 min-h-screen flex flex-col"
			 ontouchstart={handleTouchStart}
			 ontouchend={handleTouchEnd}>
			
			<!-- Section Heading -->
			<div class="flex-shrink-0 text-center pt-32 sm:pt-24 lg:pt-32 xl:pt-[188px] pb-8 px-4 sm:px-8" transition:fade={{ duration: 800 }}>
				<h2 class="font-light text-white uppercase tracking-widest text-3xl sm:text-4xl md:text-5xl lg:text-6xl" style="line-height: 1;">Featured Work</h2>
			</div>
			
			<!-- Content Container -->
			<div class="flex-1 flex items-center justify-center px-4 sm:px-8 pb-20">
				<div class="container mx-auto max-w-7xl">
					<div class="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch justify-center">
				
						<!-- Left Column - Image or YouTube Video -->
						<div class="flex-1 flex justify-center items-center w-full">
							<!-- Stable container for media content -->
							<div class="w-full aspect-video rounded-2xl overflow-hidden relative cursor-pointer group" onclick={() => handleLeftContentClick(currentProject)}>
								{#key currentProjectIndex}
									<div class="w-full h-full absolute inset-0" 
										 in:fly={{ x: -100, duration: 600, delay: 200 }}
										 out:fly={{ x: -100, duration: 300 }}>
									{#if currentProject.leftContent.type === 'youtube' && currentProject.leftContent.videoId}
										<div class="w-full h-full overflow-hidden shadow-2xl rounded-2xl relative">
											<!-- YouTube Thumbnail -->
											<img 
												src={getYouTubeThumbnail(currentProject.leftContent.videoId, 'maxresdefault')} 
												alt={currentProject.title}
												class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
											<!-- Play button overlay -->
											<div class="absolute inset-0 flex items-center justify-center">
												<div class="bg-black/60 backdrop-blur-sm rounded-full p-4 group-hover:bg-black/80 group-hover:scale-110 transition-all duration-300">
													<svg width="32" height="32" viewBox="0 0 24 24" fill="white">
														<path d="M8 5v14l11-7z"/>
													</svg>
												</div>
											</div>
										</div>
									{:else if currentProject.leftContent.type === 'image'}
										<img 
											src={currentProject.leftContent.src} 
											alt={currentProject.title}
											class="w-full h-full shadow-2xl object-cover transition-transform duration-300 group-hover:scale-105 rounded-2xl">
									{/if}
									</div>
								{/key}
							</div>
						</div>
						
						<!-- Right Column - Content -->
						<div class="flex-1 flex justify-center items-center lg:max-w-lg w-full relative">
							<!-- Stable container that maintains dimensions during transitions -->
							<div class="w-full relative" style="height: {rightContainerHeight}px; transition: height 0.3s ease;">
								{#key currentProjectIndex}
									<!-- Animated content container - absolutely positioned to prevent structural collapse -->
									<div class="absolute inset-0 w-full bg-black/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 border border-white/10 shadow-2xl flex flex-col justify-center" 
										 in:fly={{ x: 100, duration: 600, delay: 200 }}
										 out:fly={{ x: 100, duration: 300 }}>
										
										<div class="w-full flex flex-col justify-center">
											<h3 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
												{currentProject.title}
											</h3>
											
											<div class="text-base sm:text-lg md:text-xl text-gray-200 mb-3 sm:mb-4 md:mb-6 leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0">
												{@html sanitizeHtml(currentProject.description)}
											</div>
											
											<div class="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
												<a 
													href={currentProject.link} 
													class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
													View Project
												</a>
											</div>
										</div>
									</div>
								{/key}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Dot Navigation - Fixed positioned to prevent overlap -->
	{#if visible}
		<div class="absolute bottom-8 sm:bottom-12 lg:bottom-16 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3" transition:fade={{ duration: 800, delay: 400 }}>
			{#each projects as project, index}
				<button
					class="w-4 h-4 rounded-full transition-all duration-300 border-2 {index === currentProjectIndex ? 'bg-white border-white scale-125 shadow-lg shadow-white/30' : 'bg-white/30 border-white/50 hover:bg-yellow-400/80 hover:border-yellow-400 hover:scale-110 hover:shadow-lg hover:shadow-yellow-400/50'} {isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}"
					onclick={() => goToProject(index)}
					disabled={isTransitioning}
					aria-label="Go to project {index + 1}"
				></button>
			{/each}
		</div>
	{/if}
</section>

<!-- Hidden measurement container -->
<div bind:this={measurementContainer} class="fixed top-0 left-0 w-full max-w-7xl mx-auto" style="pointer-events: none; z-index: -1;"></div>

<!-- Video Modal -->
<VideoModalSwal bind:this={videoModal} featuredWork={currentProject} />

