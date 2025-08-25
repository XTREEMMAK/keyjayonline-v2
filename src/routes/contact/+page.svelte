<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SvgDivider from '$lib/components/ui/SvgDivider.svelte';
	import { PUBLIC_HELLO_EMAIL } from '$env/static/public';

	let {
		data
	} = $props();

	let scrollY = $state(0);
	let heroRef = $state();
	let titleVisible = $state(true);
	let titleAnimated = $state(false);

	// Form state
	let form = $state({
		name: '',
		email: '',
		subject: '',
		service: '',
		budget: '',
		timeline: '',
		message: '',
		newsletter: false
	});

	let isSubmitting = $state(false);
	let submitStatus = $state(''); // 'success', 'error', or ''

	// Service options
	const services = [
		'Music Production',
		'Voice-Over Work',
		'Audio Plugin Development',
		'Video Production',
		'Podcast Production',
		'Gaming Content',
		'Technical Consulting',
		'Creative Direction',
		'Other'
	];

	// Budget ranges
	const budgetRanges = [
		'Under $500',
		'$500 - $1,000',
		'$1,000 - $2,500',
		'$2,500 - $5,000',
		'$5,000 - $10,000',
		'$10,000+',
		'Let\'s discuss'
	];

	// Timeline options
	const timelines = [
		'ASAP',
		'Within 1 week',
		'Within 2 weeks',
		'Within 1 month',
		'Within 3 months',
		'No rush',
		'Flexible'
	];

	// Contact methods
	const contactMethods = [
		{
			title: 'Email',
			value: PUBLIC_HELLO_EMAIL,
			icon: 'mdi:email',
			description: 'Best for detailed project inquiries'
		},
		{
			title: 'Response Time',
			value: '24-48 hours',
			icon: 'mdi:clock',
			description: 'Typical response time for inquiries'
		},
		{
			title: 'Time Zone',
			value: 'EST (UTC-5)',
			icon: 'mdi:earth',
			description: 'Eastern Standard Time'
		},
		{
			title: 'Availability',
			value: 'Mon-Fri, 9AM-6PM',
			icon: 'mdi:calendar',
			description: 'Primary business hours'
		}
	];

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

		setTimeout(() => {
			titleAnimated = true;
		}, 500);

		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	async function handleSubmit(event) {
		event.preventDefault();
		isSubmitting = true;
		submitStatus = '';

		try {
			// Simulate form submission
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// In a real application, you would send the form data to your backend
			console.log('Form submission:', form);
			
			submitStatus = 'success';
			// Reset form
			form = {
				name: '',
				email: '',
				subject: '',
				service: '',
				budget: '',
				timeline: '',
				message: '',
				newsletter: false
			};
		} catch (error) {
			console.error('Form submission error:', error);
			submitStatus = 'error';
		} finally {
			isSubmitting = false;
		}
	}
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

	<!-- Contact Form Section -->
	<section class="bg-gray-900/95 backdrop-blur-sm py-20 z-10" style="margin-top: -60px; padding-top: 80px;">
		<div class="container mx-auto px-4">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
				<!-- Contact Form -->
				<div>
					<h2 class="text-3xl font-bold text-white mb-6">Start Your Project</h2>
					<p class="text-gray-400 mb-8">
						Fill out the form below with details about your project, and I'll get back to you within 24-48 hours with a personalized response.
					</p>

					{#if submitStatus === 'success'}
						<div class="bg-green-600/20 border border-green-600/30 text-green-400 rounded-xl p-6 mb-8">
							<div class="flex items-center gap-3">
								<iconify-icon icon="mdi:check-circle" class="text-2xl"></iconify-icon>
								<div>
									<h3 class="font-semibold">Message Sent Successfully!</h3>
									<p class="text-sm text-green-300">Thanks for reaching out. I'll respond within 24-48 hours.</p>
								</div>
							</div>
						</div>
					{/if}

					{#if submitStatus === 'error'}
						<div class="bg-red-600/20 border border-red-600/30 text-red-400 rounded-xl p-6 mb-8">
							<div class="flex items-center gap-3">
								<iconify-icon icon="mdi:alert-circle" class="text-2xl"></iconify-icon>
								<div>
									<h3 class="font-semibold">Message Failed to Send</h3>
									<p class="text-sm text-red-300">Please try again or contact me directly via email.</p>
								</div>
							</div>
						</div>
					{/if}

					<form onsubmit={handleSubmit} class="space-y-6">
						<!-- Basic Information -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label for="name" class="block text-white font-medium mb-2">Name *</label>
								<input 
									type="text" 
									id="name"
									bind:value={form.name}
									required
									class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
									placeholder="Your full name"
								/>
							</div>
							<div>
								<label for="email" class="block text-white font-medium mb-2">Email *</label>
								<input 
									type="email" 
									id="email"
									bind:value={form.email}
									required
									class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
									placeholder="your@email.com"
								/>
							</div>
						</div>

						<!-- Subject -->
						<div>
							<label for="subject" class="block text-white font-medium mb-2">Subject *</label>
							<input 
								type="text" 
								id="subject"
								bind:value={form.subject}
								required
								class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
								placeholder="Brief description of your project"
							/>
						</div>

						<!-- Project Details -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label for="service" class="block text-white font-medium mb-2">Service Needed</label>
								<select 
									id="service"
									bind:value={form.service}
									class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
								>
									<option value="">Select a service</option>
									{#each services as service}
										<option value={service}>{service}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="budget" class="block text-white font-medium mb-2">Budget Range</label>
								<select 
									id="budget"
									bind:value={form.budget}
									class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
								>
									<option value="">Select budget</option>
									{#each budgetRanges as budget}
										<option value={budget}>{budget}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="timeline" class="block text-white font-medium mb-2">Timeline</label>
								<select 
									id="timeline"
									bind:value={form.timeline}
									class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
								>
									<option value="">Select timeline</option>
									{#each timelines as timeline}
										<option value={timeline}>{timeline}</option>
									{/each}
								</select>
							</div>
						</div>

						<!-- Message -->
						<div>
							<label for="message" class="block text-white font-medium mb-2">Project Details *</label>
							<textarea 
								id="message"
								bind:value={form.message}
								required
								rows="6"
								class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 resize-vertical"
								placeholder="Tell me about your project, goals, and any specific requirements..."
							></textarea>
						</div>

						<!-- Newsletter Signup -->
						<div class="flex items-center gap-3">
							<input 
								type="checkbox" 
								id="newsletter"
								bind:checked={form.newsletter}
								class="w-5 h-5 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-teal-500/20 text-teal-600"
							/>
							<label for="newsletter" class="text-gray-300 text-sm">
								Subscribe to my newsletter for updates and creative insights
							</label>
						</div>

						<!-- Submit Button -->
						<button 
							type="submit"
							disabled={isSubmitting}
							class="w-full px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
						>
							{#if isSubmitting}
								<iconify-icon icon="mdi:loading" class="text-xl animate-spin"></iconify-icon>
								Sending Message...
							{:else}
								<iconify-icon icon="mdi:send" class="text-xl"></iconify-icon>
								Send Message
							{/if}
						</button>
					</form>
				</div>

				<!-- Contact Information -->
				<div>
					<h2 class="text-3xl font-bold text-white mb-6">Get In Touch</h2>
					<p class="text-gray-400 mb-8">
						Prefer a different way to connect? Here are alternative ways to reach me and what you can expect.
					</p>

					<!-- Contact Methods -->
					<div class="space-y-6 mb-8">
						{#each contactMethods as method}
							<div class="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl">
								<div class="flex items-center justify-center w-12 h-12 bg-teal-600/20 rounded-full">
									<iconify-icon icon={method.icon} class="text-teal-400 text-xl"></iconify-icon>
								</div>
								<div>
									<h3 class="text-white font-semibold mb-1">{method.title}</h3>
									<p class="text-teal-400 mb-1">{method.value}</p>
									<p class="text-gray-400 text-sm">{method.description}</p>
								</div>
							</div>
						{/each}
					</div>

					<!-- Social Links -->
					<div class="bg-gray-800/50 rounded-xl p-6">
						<h3 class="text-white font-semibold mb-4">Connect on Social Media</h3>
						<div class="flex gap-4">
							{#each data.socialLinks as social}
								<a href={social.url} target="_blank" aria-label="{social.name || social.platform || 'Social Media'}" class="w-12 h-12 bg-gray-600/20 hover:bg-gray-600/30 rounded-full flex items-center justify-center transition-colors duration-300 {social.color}">
									<iconify-icon icon={social.icon} class="text-xl"></iconify-icon>
								</a>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="bg-gray-800 py-20 section-wave-top z-0">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<div class="text-center mb-12">
					<h2 class="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
					<p class="text-gray-400">
						Common questions about working together and my creative process
					</p>
				</div>

				<div class="space-y-6">
					{#each faqs as faq}
						<div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6">
							<h3 class="text-xl font-semibold text-white mb-3">{faq.question}</h3>
							<p class="text-gray-400 leading-relaxed">{faq.answer}</p>
						</div>
					{/each}
				</div>

				<div class="text-center mt-12">
					<p class="text-gray-400 mb-4">Don't see your question answered?</p>
					<button 
						onclick={() => {
							const messageField = document.getElementById('message');
							if (messageField) {
								messageField.scrollIntoView({ behavior: 'smooth' });
								messageField.focus();
							}
						}}
						class="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors duration-300"
					>
						Ask Me Directly
					</button>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.contact-title {
		opacity: 0;
		transform: translateY(50px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	
	.contact-title.animate {
		opacity: 1;
		transform: translateY(0);
	}
	
	.contact-subtitle {
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
	}
	
	.contact-subtitle.animate {
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