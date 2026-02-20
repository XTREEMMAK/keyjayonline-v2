<script>
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';

	let {
		isOpen = false,
		title = 'Select',
		actions = [],
		accentColor = 'orange',
		onSelect = (action) => {},
		onClose = () => {}
	} = $props();

	let searchQuery = $state('');

	const showSearch = $derived(actions.length > 10);
	const filteredActions = $derived(
		searchQuery.trim()
			? actions.filter(a => a.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
			: actions
	);

	const accentClasses = $derived(
		accentColor === 'green'
			? { icon: 'text-green-400', hover: 'hover:border-green-500/50', ring: 'ring-green-500/30' }
			: { icon: 'text-orange-400', hover: 'hover:border-orange-500/50', ring: 'ring-orange-500/30' }
	);

	function handleSelect(action) {
		onSelect(action);
		onClose();
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	$effect(() => {
		if (isOpen && browser) {
			searchQuery = '';
			window.addEventListener('keydown', handleKeydown);
			return () => window.removeEventListener('keydown', handleKeydown);
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/70" onclick={onClose}></div>

		<!-- Panel -->
		<div
			class="relative w-full max-w-md max-h-[70vh] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
			transition:fly={{ y: 30, duration: 250 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
				<h3 class="text-lg font-semibold text-white">{title}</h3>
				<button
					onclick={onClose}
					class="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
				>
					<Icon icon="mdi:close" class="text-xl" />
				</button>
			</div>

			<!-- Search (for large lists) -->
			{#if showSearch}
				<div class="px-5 pt-4 flex-shrink-0">
					<div class="relative">
						<Icon icon="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
						<input
							type="text"
							placeholder="Search..."
							bind:value={searchQuery}
							class="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/20 focus:ring-1 {accentClasses.ring}"
						/>
					</div>
				</div>
			{/if}

			<!-- Items list -->
			<div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
				{#if filteredActions.length === 0}
					<div class="text-center py-8 text-gray-500">
						<Icon icon="mdi:folder-open-outline" class="text-4xl mx-auto mb-2" />
						<p class="text-sm">No results found</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-2">
						{#each filteredActions as action, i}
							<button
								onclick={() => handleSelect(action)}
								class="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] {accentClasses.hover} hover:bg-white/5 transition-all text-left group"
							>
								<div class="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
									<Icon icon={action.icon} class="text-xl {accentClasses.icon}" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-white text-sm font-medium truncate">{action.label}</p>
								</div>
								<Icon icon="mdi:chevron-right" class="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
	}
</style>
