<script>
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import RadioPlayer from '$lib/components/radio/RadioPlayer.svelte';
	import NowPlaying from '$lib/components/radio/NowPlaying.svelte';
	import RadioControls from '$lib/components/radio/RadioControls.svelte';
	import QueuePanel from '$lib/components/radio/QueuePanel.svelte';
	import MaintenanceOverlay from '$lib/components/radio/MaintenanceOverlay.svelte';
	import WaveBackground from '$lib/components/radio/WaveBackground.svelte';
	import { radioMode, loadRadioPlaylist, exitRadioMode } from '$lib/stores/musicPlayer.js';
	import { copyShareUrl, generateShareUrl } from '$lib/utils/shareLinks.js';

	let { data } = $props();

	let queueOpen = $state(false);
	let radioPlayer = $state();

	onMount(() => {
		radioMode.set(true);
		if (data.tracks && data.tracks.length > 0) {
			loadRadioPlaylist(data.tracks);
		}
	});

	onDestroy(() => {
		exitRadioMode();
	});

	function handleTogglePlay() {
		radioPlayer?.togglePlayPause();
	}

	function handleSeek(e) {
		radioPlayer?.seekTo(e.detail);
	}

	function handleShare() {
		const url = typeof window !== 'undefined' ? `${window.location.origin}/radio` : '/radio';
		copyShareUrl(url);
	}
</script>

{#if data.maintenance?.active}
	<MaintenanceOverlay message={data.maintenance.message} />
{:else}
	<div class="relative flex flex-col h-full">
		<!-- Wave Background -->
		<WaveBackground />

		<!-- Top Bar -->
		<header class="relative z-10 flex items-center gap-3 px-4 h-14 shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-xl">
			<a href="/" class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors">
				<Icon icon="mdi:arrow-left" width={24} height={24} class="text-[var(--neu-text-secondary)]" />
			</a>
			<h1 class="text-lg font-bold tracking-wider text-[var(--neu-text-primary)]">KEY JAY RADIO</h1>
		</header>

		<!-- Now Playing (scrollable center area) -->
		<div class="relative flex-1 overflow-y-auto flex items-center justify-center">
			{#if data.tracks && data.tracks.length > 0}
				<NowPlaying supportPlatforms={data.supportPlatforms} />
			{:else}
				<div class="flex flex-col items-center justify-center text-center p-6">
					<Icon icon="mdi:radio" width={64} height={64} class="text-[var(--neu-text-muted)] mb-4" />
					<p class="text-[var(--neu-text-secondary)]">No tracks available yet.</p>
					<p class="text-sm text-[var(--neu-text-muted)] mt-1">Check back soon for new music!</p>
				</div>
			{/if}
		</div>

		<!-- Queue Panel (overlay) -->
		<QueuePanel isOpen={queueOpen} onClose={() => queueOpen = false} />

		<!-- Player Controls + Hidden WaveSurfer -->
		<RadioPlayer
			bind:this={radioPlayer}
		/>
		<RadioControls
			onTogglePlay={handleTogglePlay}
			onToggleQueue={() => queueOpen = !queueOpen}
			onShare={handleShare}
			{queueOpen}
			onseek={handleSeek}
		/>
	</div>
{/if}
