<script>
	import Icon from '@iconify/svelte';

	let { message = '' } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--neu-bg)]">
	<div class="neu-card-glass p-8 rounded-2xl text-center max-w-md w-full">
		<Icon icon="mdi:wrench" width={48} height={48} class="text-[var(--neu-accent)] mx-auto mb-4" />
		<h2 class="text-xl font-bold text-[var(--neu-text-primary)] mb-3">Radio Maintenance</h2>
		<p class="text-[var(--neu-text-secondary)] mb-6">
			{message || 'Key Jay Radio is currently undergoing maintenance. Check back soon!'}
		</p>
		<a
			href="/"
			class="neu-button-accent inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium"
		>
			<Icon icon="mdi:home" width={20} height={20} />
			Back to Main Site
		</a>
	</div>
</div>
