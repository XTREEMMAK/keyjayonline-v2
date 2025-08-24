<script>
	import Icon from '@iconify/svelte';
	
	let {
		layout = 'horizontal',
		size = 24,
		gap = 'gap-4',
		className = '',
		socialLinks = []
	} = $props();
	
	// Use provided socialLinks or empty array
	const linksToUse = socialLinks || [];
</script>

<div class="flex {layout === 'horizontal' ? 'flex-row' : 'flex-col'} {gap} {className}">
	{#each linksToUse as social}
		<a 
			href={social.url}
			target="_blank"
			rel="noopener noreferrer"
			title={social.name}
			class="transition-all duration-200 hover:scale-110 hover:rotate-12 {className ? className : social.color}"
		>
			<Icon icon={social.icon} width={size} height={size} />
		</a>
	{/each}
</div>