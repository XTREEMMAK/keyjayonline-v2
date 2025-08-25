<script>
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { createScrollObserver } from '$lib/utils/scrollObserver.js';
	
	let sectionElement = $state();
	let visible = $state(false);

	onMount(() => {
		createScrollObserver(sectionElement, (isVisible) => {
			visible = isVisible;
		});
	});
</script>

<!-- About Me Section (Full-width) -->
<section id="about" class="relative py-12 sm:py-24 px-4 sm:px-8 bg-[#0f1114] mt-16 sm:mt-0" bind:this={sectionElement}>
	{#if visible}
		<div class="container mx-auto" transition:fade={{ duration: 800 }}>
			<h2 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-center mb-8 sm:mb-12 uppercase tracking-widest text-white">About Me</h2>
			<div class="flex flex-col lg:flex-row items-center gap-12 bg-gray-900 rounded-3xl p-8 shadow-2xl" transition:slide={{ duration: 600, delay: 200 }}>
				<div class="w-full lg:w-1/2 flex justify-center">
					<!-- Use a new image with a circular mask effect -->
					<img src="https://placehold.co/1200x800/1a1a1a/ffffff?text=REA+Speaker+Stage" alt="REA Speaker Stage" class="rounded-3xl object-cover w-full h-auto shadow-xl transition-transform duration-300 ease-in-out hover:scale-105 circle-mask">
				</div>
				<div class="w-full lg:w-1/2 text-center lg:text-left">
					<p class="text-lg sm:text-xl mb-6 leading-relaxed text-gray-300">
						I'm Jamaal "Key Jay" Ephriam - a multi-disciplinary creative with over 15 years of experience 
						spanning music production, web development, and creative content. From my classical piano foundations 
						starting at age 5 to modern digital production and technology, I bring both technical expertise and 
						artistic vision to every project. Whether it's producing music, developing web experiences, or 
						creating compelling voice work, I'm passionate about pushing creative boundaries.
					</p>
					<a href="/about" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-300">
						Read My Full Story
					</a>
				</div>
			</div>
		</div>
	{/if}
</section>