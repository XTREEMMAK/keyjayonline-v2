<script>
	import { fade, fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { radioModalOpen } from '$lib/stores/musicPlayer.js';

	function close() {
		radioModalOpen.set(false);
	}

	function launch() {
		radioModalOpen.set(false);
		window.open('/radio', '_blank');
	}
</script>

{#if $radioModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="KEY JAY RADIO">
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			transition:fade={{ duration: 200 }}
			onclick={close}
			onkeydown={(e) => e.key === 'Escape' && close()}
			role="button"
			tabindex="-1"
			aria-label="Close radio modal"
		></div>

		<!-- Modal Card -->
		<div class="relative w-full max-w-md" transition:fly={{ y: 40, duration: 300 }}>
			<div class="neu-card p-8 space-y-6 text-center relative overflow-hidden">
				<!-- Decorative gradient background -->
				<div class="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-red-900/20 pointer-events-none"></div>

				<!-- Close button -->
				<button
					onclick={close}
					class="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					aria-label="Close"
				>
					<Icon icon="mdi:close" class="text-gray-300 text-lg" />
				</button>

				<!-- Radio branding -->
				<div class="relative space-y-3">
					<div class="flex justify-center">
						<div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-lg">
							<Icon icon="mdi:radio-tower" class="text-white text-4xl" />
						</div>
					</div>
					<h2 class="text-3xl font-bold text-white tracking-wide">KEY JAY RADIO</h2>
					<p class="text-gray-400 text-sm max-w-xs mx-auto">
						Continuous music from Key Jay's catalog — beats, productions, and exclusive tracks in one stream.
					</p>
				</div>

				<!-- Features list -->
				<div class="relative flex flex-col gap-2 text-left max-w-xs mx-auto">
					<div class="flex items-center gap-3 text-sm text-gray-300">
						<Icon icon="mdi:shuffle-variant" class="text-orange-400 text-lg flex-shrink-0" />
						<span>Shuffle through the full catalog</span>
					</div>
					<div class="flex items-center gap-3 text-sm text-gray-300">
						<Icon icon="mdi:playlist-music" class="text-orange-400 text-lg flex-shrink-0" />
						<span>Curated playlists & queue control</span>
					</div>
					<div class="flex items-center gap-3 text-sm text-gray-300">
						<Icon icon="mdi:cellphone" class="text-orange-400 text-lg flex-shrink-0" />
						<span>Works on car displays & lock screens</span>
					</div>
				</div>

				<!-- Launch button -->
				<div class="relative">
					<button
						onclick={launch}
						class="w-full px-6 py-3 rounded-full font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2"
					>
						<Icon icon="mdi:play-circle" class="text-xl" />
						Launch Radio
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
