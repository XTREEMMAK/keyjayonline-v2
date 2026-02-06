<script>
	import { browser } from '$app/environment';
	import MultiStepContactForm from '$lib/components/forms/MultiStepContactForm.svelte';
	import { navigateTo } from '$lib/stores/navigation.js';
	import SectionBackground from '$lib/components/ui/SectionBackground.svelte';

	// Accept data as prop from parent (passed via SPA container)
	let { data = {} } = $props();

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
</script>

<!-- ============================================================================ -->
<!-- CONTACT SECTION CONTAINER -->
<!-- ============================================================================ -->
<div class="contact-section min-h-screen bg-gradient-to-br from-[var(--neu-bg)] via-teal-900/10 to-[var(--neu-bg)] relative">
	<!-- Blurred Background Image -->
	<SectionBackground section="contact" opacity={0.12} />

	<!-- Section Header -->
	<div class="pt-16 md:pt-28 pb-8 text-center">
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-3">Contact</h1>
		<p class="text-lg text-gray-400">Let's start a conversation</p>
	</div>

	<!-- Contact Form Section - Front and Center -->
	<section class="bg-[var(--neu-bg-dark)]/95 backdrop-blur-sm py-20">
		<div class="container mx-auto px-4">
			<!-- Main Heading -->
			<div class="text-center mb-16">
				<h2 class="text-3xl font-bold text-white mb-4">Get In Touch</h2>
				<p class="text-gray-400 max-w-2xl mx-auto text-lg">
					Whether you have a project in mind or just want to say hello, I'd love to hear from you.
				</p>
			</div>

			<!-- Contact Form - Centered and Prominent -->
			<div class="max-w-4xl mx-auto">
				<div class="neu-card p-8">
					<MultiStepContactForm {data} />
				</div>
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="bg-[var(--neu-bg)]/50 py-20">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<h2 class="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>

				<div class="grid gap-6">
					{#each faqs as faq}
						<div class="neu-card p-6 hover:scale-[1.01] transition-all duration-300">
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
</div>

<style>
	.contact-section {
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
</style>
