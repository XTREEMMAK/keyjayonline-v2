<script>
	import { slide, fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { currentTrackIndex, playTrack, getUpcomingQueue } from '$lib/stores/musicPlayer.js';

	let { isOpen = false, onClose = () => {} } = $props();

	// Re-derive queue when track index changes
	const queue = $derived.by(() => {
		// Access $currentTrackIndex to trigger reactivity
		void $currentTrackIndex;
		return getUpcomingQueue(15);
	});
</script>

{#if isOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40 bg-black/40"
		onclick={onClose}
		aria-label="Close queue"
		transition:fade={{ duration: 250 }}
	></button>

	<!-- Queue Panel -->
	<div
		class="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] bg-[var(--neu-bg)] border-t border-[var(--neu-border)] rounded-t-2xl shadow-2xl flex flex-col"
		transition:slide={{ duration: 300 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-[var(--neu-border)] shrink-0">
			<h3 class="text-sm font-bold uppercase tracking-wider text-[var(--neu-text-secondary)]">Up Next</h3>
			<button
				onclick={onClose}
				class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-colors"
				aria-label="Close queue"
			>
				<Icon icon="mdi:close" width={20} height={20} class="text-[var(--neu-text-muted)]" />
			</button>
		</div>

		<!-- Track List -->
		<div class="flex-1 overflow-y-auto neu-scrollbar">
			{#if queue.length > 0}
				<ul class="py-2">
					{#each queue as track, i}
						<li>
							<button
								class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
								onclick={() => playTrack(track.queueIndex)}
							>
								<span class="text-xs text-[var(--neu-text-muted)] w-5 text-right shrink-0">{i + 1}</span>
								{#if track.thumbnail}
									<img src={track.thumbnail} alt="" class="w-10 h-10 rounded-lg object-cover shrink-0" />
								{:else}
									<div class="w-10 h-10 rounded-lg bg-[var(--neu-bg-dark)] flex items-center justify-center shrink-0">
										<Icon icon="mdi:music-note" width={18} height={18} class="text-[var(--neu-text-muted)]" />
									</div>
								{/if}
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-[var(--neu-text-primary)] truncate">{track.title}</p>
									<p class="text-xs text-[var(--neu-text-secondary)] truncate">{track.artist}</p>
								</div>
								{#if track.isRadioNew}
									<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r from-green-500 to-emerald-500 text-white">
										NEW
									</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<Icon icon="mdi:playlist-music" width={40} height={40} class="text-[var(--neu-text-muted)] mb-2" />
					<p class="text-sm text-[var(--neu-text-muted)]">No upcoming tracks</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
