<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import MultiStepContactForm from '$lib/components/forms/MultiStepContactForm.svelte';
	import { dev } from '$app/environment';

	let {
		data
	} = $props();

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);


	// FAQs
	const faqs = [
		{
			question: 'What\'s your typical project timeline?',
			answer: 'Project timelines vary based on scope and complexity. Music production typically takes 1-3 weeks, voice-over work 3-7 days, and technical projects 2-8 weeks. I always provide detailed timelines during initial consultations.'
		},
		{
			question: 'Do you work with clients remotely?',
			answer: 'Absolutely! I work with clients worldwide. All my services can be delivered remotely, and I use various collaboration tools to ensure smooth communication throughout the project.'
		},
		{
			question: 'What\'s included in your rates?',
			answer: 'All quotes include initial consultation, project development, revisions (typically 2-3 rounds), and final delivery in your preferred format. Additional revisions and rush orders may incur extra fees.'
		},
		{
			question: 'Can you help with ongoing projects?',
			answer: 'Yes! I offer both one-time project work and ongoing creative partnerships. For recurring work, I can provide retainer agreements with preferential rates.'
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

		// Initial call
		updateParallax();
		
		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

</script>

<svelte:head>
	<title>Contact - KEY JAY ONLINE</title>
	<meta name="description" content="Get in touch for music production, voice-over work, technical consulting, and creative collaboration opportunities" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-teal-900/10 to-gray-900">
	<!-- Hero Section -->
	<section bind:this={heroRef} class="relative h-[70vh] flex items-end justify-start overflow-hidden section-triangle z-20">
		<div 
			class="absolute inset-0 parallax-bg"
			style="transform: translateY({scrollY * 0.3}px)"
		>
			<img 
				src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200" 
				alt="Contact and Communication"
				class="w-full h-[120%] object-cover"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-transparent"></div>
		</div>
		
		<div class="relative z-10 p-8 pb-16">
			{#if titleVisible}
				<div class="hero-text-container">
					<h1 class="contact-title text-7xl sm:text-8xl md:text-9xl font-bold text-white" class:animate={titleAnimated}>
						CONTACT
					</h1>
					<p class="contact-subtitle text-lg text-gray-300 max-w-lg mt-4" class:animate={titleAnimated}>
						Let's start a conversation about your creative project and bring your vision to life
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Contact Form Section - Front and Center -->
	<section class="bg-gray-800/95 backdrop-blur-sm py-20" style="margin-top: -60px; padding-top: 80px;">
		<div class="container mx-auto px-4">
			<!-- Main Heading -->
			<div class="text-center mb-16">
				<h2 class="text-4xl font-bold text-white mb-4">Get In Touch</h2>
				<p class="text-gray-400 max-w-2xl mx-auto text-lg">
					Whether you have a project in mind or just want to say hello, I'd love to hear from you.
				</p>
			</div>

			<!-- Contact Form - Centered and Prominent -->
			<div class="max-w-4xl mx-auto">
				<div class="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
					<MultiStepContactForm {data} />
				</div>
			</div>
		</div>
	</section>


	<!-- FAQ Section -->
	<section class="bg-gray-800/50 py-20" style="margin-top: -80px; padding-top: 160px;">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<h2 class="text-4xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
				
				<div class="grid gap-6">
					{#each faqs as faq}
						<div class="bg-gray-800/50 rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300">
							<h3 class="text-xl font-semibold text-white mb-3">{faq.question}</h3>
							<p class="text-gray-400 leading-relaxed">{faq.answer}</p>
						</div>
					{/each}
				</div>

				<div class="text-center mt-12">
					<p class="text-gray-400 mb-4">Still have questions?</p>
					<p class="text-teal-400 text-lg font-medium">
						Use the contact form above - I'll get back to you soon!
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Development Testing Section -->
	{#if dev}
		<section class="bg-yellow-900/20 py-12 border-t border-yellow-600/30">
			<div class="container mx-auto px-4">
				<div class="max-w-4xl mx-auto">
					<div class="bg-yellow-800/30 rounded-xl p-6 border border-yellow-600/30">
						<h3 class="text-xl font-semibold text-yellow-400 mb-4 flex items-center gap-2">
							<iconify-icon icon="mdi:test-tube" class="text-lg"></iconify-icon>
							Development Testing
						</h3>
						<p class="text-yellow-200 mb-4">
							This section is only visible in development mode. Use these quick tests to validate form functionality.
						</p>
						
						<div class="grid gap-4 md:grid-cols-3">
							<!-- Quick Test: General Message -->
							<form method="POST" action="?/contact" class="bg-gray-800/50 p-4 rounded-lg">
								<h4 class="font-semibold text-white mb-3">Quick Test: General Message</h4>
								<input type="hidden" name="name" value="Test User" />
								<input type="hidden" name="email" value="test@example.com" />
								<input type="hidden" name="inquiryType" value="general" />
								<input type="hidden" name="generalMessage" value="This is a test general message to validate the form submission functionality works correctly." />
								<input type="hidden" name="honeypot" value="" />
								<button 
									type="submit" 
									class="bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded font-medium transition-colors"
								>
									Submit General Test
								</button>
							</form>

							<!-- Quick Test: Service Request -->
							<form method="POST" action="?/contact" class="bg-gray-800/50 p-4 rounded-lg">
								<h4 class="font-semibold text-white mb-3">Quick Test: Service Request</h4>
								<input type="hidden" name="name" value="Test Client" />
								<input type="hidden" name="email" value="client@example.com" />
								<input type="hidden" name="inquiryType" value="service" />
								<input type="hidden" name="serviceNeeded" value="music-production" />
								<input type="hidden" name="budgetRange" value="1000-2500" />
								<input type="hidden" name="timeline" value="within-1-month" />
								<input type="hidden" name="projectDetails" value="This is a test service request with detailed project information to validate the form submission works correctly for service inquiries." />
								<input type="hidden" name="honeypot" value="" />
								<button 
									type="submit" 
									class="bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded font-medium transition-colors"
								>
									Submit Service Test
								</button>
							</form>

							<!-- Quick Test: Validation Error -->
							<form method="POST" action="?/contact" class="bg-gray-800/50 p-4 rounded-lg">
								<h4 class="font-semibold text-white mb-3">Quick Test: Validation Error</h4>
								<input type="hidden" name="name" value="X" />
								<input type="hidden" name="email" value="invalid-email" />
								<input type="hidden" name="inquiryType" value="general" />
								<input type="hidden" name="generalMessage" value="Short" />
								<input type="hidden" name="honeypot" value="" />
								<button 
									type="submit" 
									class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
								>
									Test Validation
								</button>
							</form>
						</div>
						
						<div class="mt-4 p-3 bg-gray-800/30 rounded border border-gray-600/30">
							<p class="text-sm text-gray-300">
								<strong>Check server console</strong> for detailed email and webhook simulation output.
								Form submissions will show success messages and detailed logging.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- SVG Divider -->
	<SvgDivider />
</div>

<style>
	.hero-text-container {
		opacity: 0;
		transform: translateY(100px);
		transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero-text-container .contact-title,
	.hero-text-container .contact-subtitle {
		opacity: 0;
		transform: translateY(50px);
		transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero-text-container .contact-title.animate {
		opacity: 1;
		transform: translateY(0);
		transition-delay: 0.2s;
	}

	.hero-text-container .contact-subtitle.animate {
		opacity: 1;
		transform: translateY(0);
		transition-delay: 0.4s;
	}

	.hero-text-container .contact-title {
		background: linear-gradient(135deg, #ffffff, #94a3b8);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
	}

	.parallax-bg {
		will-change: transform;
	}

	.section-triangle {
		position: relative;
		/* Triangle pointing down from bottom center */
		clip-path: polygon(
			0 0, 100% 0, 100% calc(100% - 60px),
			50% 100%, 0 calc(100% - 60px)
		);
	}
</style>