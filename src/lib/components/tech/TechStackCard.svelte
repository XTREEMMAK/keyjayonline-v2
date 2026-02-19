<script>
	import Icon from '@iconify/svelte';

	let { item, compact = false, categoryIcon = 'mdi:code-tags' } = $props();
</script>

<div class="neu-card {compact ? 'p-3' : 'p-4 sm:p-5'} flex items-start gap-{compact ? '3' : '4'} hover:scale-[1.02] transition-transform duration-300">
	<!-- Icon -->
	<div class="flex-shrink-0 {compact ? 'w-9 h-9 rounded-lg' : 'w-10 h-10 sm:w-12 sm:h-12 rounded-xl'} bg-gradient-to-br from-cyan-600/20 to-blue-600/20 flex items-center justify-center">
		{#if item.icon}
			<Icon icon={item.icon} class="text-cyan-400 {compact ? 'text-lg' : 'text-2xl'}" />
		{:else}
			<Icon icon={categoryIcon} class="text-cyan-400/60 {compact ? 'text-lg' : 'text-2xl'}" />
		{/if}
	</div>

	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 mb-1">
			{#if item.url}
				<a href={item.url} target="_blank" rel="noopener noreferrer" class="text-white font-semibold hover:text-cyan-400 transition-colors truncate {compact ? 'text-sm' : ''}">
					{item.name}
				</a>
				<Icon icon="mdi:open-in-new" class="text-gray-500 text-xs flex-shrink-0" />
			{:else}
				<span class="text-white font-semibold truncate {compact ? 'text-sm' : ''}">{item.name}</span>
			{/if}
		</div>

		{#if !compact && item.description}
			<p class="text-gray-400 text-sm line-clamp-2 mb-2">{item.description}</p>
		{/if}

		<!-- Proficiency Dots -->
		{#if item.proficiency > 0}
			<div class="flex gap-1">
				{#each Array(5) as _, idx}
					<div class="w-2 h-2 rounded-full {idx < item.proficiency ? 'bg-cyan-400' : 'bg-gray-700'}"></div>
				{/each}
			</div>
		{/if}
	</div>
</div>
