<script>
	import { fly } from 'svelte/transition';
	import { stickyNavVisible, aboutActiveTab } from '$lib/stores/stickyNav.js';

	// Tab themes for styling (must match AboutSection)
	const tabThemes = {
		bio: { accent: 'from-emerald-600 to-blue-600' },
		music: { accent: 'from-blue-600 to-purple-600' },
		tech: { accent: 'from-cyan-600 to-green-600' },
		creative: { accent: 'from-purple-600 to-pink-600' },
		productions: { accent: 'from-orange-600 to-amber-600' }
	};

	// Export switchTab so parent can pass it
	let { onTabSwitch = () => {} } = $props();

	function handleTabClick(tab) {
		aboutActiveTab.set(tab);
		onTabSwitch(tab);
	}
</script>

{#if $stickyNavVisible}
	<div
		class="fixed left-0 right-0 z-50 bg-[var(--neu-bg)]/95 backdrop-blur-sm border-b border-gray-800"
		style="top: 0"
		transition:fly={{ y: -60, duration: 250 }}
	>
		<div class="container mx-auto px-4">
			<div class="flex items-center justify-center py-2">
				<!-- Tab Navigation (full width) -->
				<div class="flex gap-1 overflow-x-auto no-scrollbar neu-card-inset p-1 max-w-full">
					{#each Object.keys(tabThemes) as tab}
						<button
							onclick={() => handleTabClick(tab)}
							class="flex-shrink-0 px-2 xs:px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-md font-semibold transition-all duration-300 text-xs sm:text-sm whitespace-nowrap {
								$aboutActiveTab === tab
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
{/if}

<style>
	.neu-card-inset {
		background: var(--neu-bg, #2a2d35);
		border-radius: 12px;
		box-shadow:
			inset 4px 4px 8px var(--neu-shadow-dark, rgba(18, 20, 24, 0.8)),
			inset -4px -4px 8px var(--neu-shadow-light, rgba(60, 64, 72, 0.5));
	}
</style>
