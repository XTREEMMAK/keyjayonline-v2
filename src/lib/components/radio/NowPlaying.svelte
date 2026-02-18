<script>
	import { onMount } from 'svelte';
	import { fly, fade, slide } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { currentTrack, currentTrackArtwork, artworkLoading, isPlaying } from '$lib/stores/musicPlayer.js';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';

	let { supportPlatforms = [] } = $props();

	const kofiPlatform = $derived(
		supportPlatforms.find(p => p.name?.toLowerCase().includes('ko-fi') || p.url?.includes('ko-fi'))
	);

	let descriptionExpanded = $state(false);
	let descriptionNotification = $state(false);
	let notificationTimer = $state(null);
	let lastNotifiedTrackId = $state(null);
	let descriptionButtonVisible = $state(false);
	let descButtonTimer = $state(null);
	let isMobile = $state(false);
	let showInfoModal = $state(false);

	onMount(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const handler = (e) => { isMobile = e.matches; };
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	// Show notification when a new track with a description starts
	$effect(() => {
		const track = $currentTrack;
		const hasDesc = track?.description && stripHtml(track.description);
		if (hasDesc && track.id !== lastNotifiedTrackId) {
			lastNotifiedTrackId = track.id;
			descriptionExpanded = false;
			descriptionButtonVisible = false;
			descriptionNotification = true;
			showInfoModal = false;
			if (notificationTimer) clearTimeout(notificationTimer);
			if (descButtonTimer) clearTimeout(descButtonTimer);
			// Delay button appearance so it enters after track info settles
			descButtonTimer = setTimeout(() => { descriptionButtonVisible = true; }, 600);
			notificationTimer = setTimeout(() => { descriptionNotification = false; }, 4000);
		} else if (!hasDesc) {
			// Reset so the button re-appears when this track plays again
			lastNotifiedTrackId = null;
			descriptionNotification = false;
			descriptionExpanded = false;
			descriptionButtonVisible = false;
			showInfoModal = false;
			if (descButtonTimer) clearTimeout(descButtonTimer);
		}
	});

	function toggleDescription() {
		if (isMobile) {
			showInfoModal = !showInfoModal;
		} else {
			descriptionExpanded = !descriptionExpanded;
		}
		descriptionNotification = false;
	}

	/** Strip HTML tags to plain text (for boolean checks) */
	function stripHtml(html) {
		if (!html) return '';
		return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
	}

	const descriptionText = $derived(stripHtml($currentTrack?.description));
	const sanitizedDescription = $derived(sanitizeHtml($currentTrack?.description));
</script>

<div class="flex flex-col items-center justify-center gap-4 px-6 py-4 md:py-8 text-center">
	<!-- Artwork area (rings expand beyond bounds, artwork is clipped) -->
	<div class="relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[400px] md:h-[400px] shrink-0 flex items-center justify-center">
		<!-- Pulsing rings while playing (outside overflow clip so they're visible) -->
		{#if $isPlaying}
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="artwork-ring artwork-ring-1"></div>
				<div class="artwork-ring artwork-ring-2"></div>
				<div class="artwork-ring artwork-ring-3"></div>
			</div>
		{/if}

		<!-- Artwork container with clip + float animation -->
		<div class="relative w-full h-full overflow-hidden rounded-2xl {$isPlaying ? 'artwork-float' : ''}">
			{#key $currentTrack?.id}
				<div class="absolute inset-0" in:fly={{ x: 80, duration: 300, delay: 100 }} out:fly={{ x: -80, duration: 250 }}>
					{#if $artworkLoading}
						<div class="w-full h-full rounded-2xl bg-[var(--neu-bg-dark)] animate-pulse flex items-center justify-center shadow-lg">
							<Icon icon="mdi:music-note" width={64} height={64} class="text-[var(--neu-text-muted)]" />
						</div>
					{:else if $currentTrackArtwork}
						<img
							src={$currentTrackArtwork}
							alt={$currentTrack?.title || 'Now playing'}
							class="w-full h-full rounded-2xl object-cover shadow-lg"
						/>
					{:else if $currentTrack?.thumbnail}
						<img
							src={$currentTrack.thumbnail}
							alt={$currentTrack?.title || 'Now playing'}
							class="w-full h-full rounded-2xl object-cover shadow-lg"
							onerror={(e) => { e.target.style.display = 'none'; }}
						/>
					{:else}
						<div class="w-full h-full rounded-2xl bg-[var(--neu-bg-dark)] flex items-center justify-center shadow-lg">
							<Icon icon="mdi:radio" width={80} height={80} class="text-[var(--neu-text-muted)]" />
						</div>
					{/if}

					<!-- NEW badge -->
					{#if $currentTrack?.isRadioNew}
						<span class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md">
							NEW
						</span>
					{/if}
				</div>
			{/key}
		</div>
	</div>

	<!-- Track Info (fixed-height container prevents layout shift during transitions) -->
	{#if $currentTrack}
		<div class="relative w-full max-w-md min-h-[66px] md:min-h-[82px]">
			{#key $currentTrack.id}
				<div class="absolute inset-x-0 top-0 space-y-1 text-center" in:fly={{ y: 20, duration: 300, delay: 200 }} out:fly={{ y: -20, duration: 200 }}>
					<h2 class="text-xl md:text-2xl font-bold text-[var(--neu-text-primary)] line-clamp-2">
						{$currentTrack.title || 'Unknown Track'}
					</h2>
					<p class="text-base text-[var(--neu-text-secondary)]">
						{$currentTrack.artist || 'Key Jay'}
					</p>
				</div>
			{/key}
		</div>

		<!-- Track Description -->
		{#if descriptionText}
			<div class="relative max-w-md w-full min-h-[36px]">
				<button
					onclick={toggleDescription}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--neu-accent)]/20 text-[var(--neu-accent)] border border-[var(--neu-accent)]/30 hover:bg-[var(--neu-accent)]/30 transition-all duration-300 {descriptionButtonVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}"
				>
					<span class="inline-flex transition-transform duration-300 {descriptionExpanded || showInfoModal ? 'rotate-180' : ''}">
						<Icon icon="mdi:chevron-down" width={14} height={14} />
					</span>
					{descriptionExpanded || showInfoModal ? 'Hide info' : 'Track info available'}
				</button>

				<!-- Inline description (desktop only) -->
				{#if descriptionExpanded && !isMobile}
					<div class="mt-2" transition:slide={{ duration: 250 }}>
						<div class="desc-content text-sm text-[var(--neu-text-secondary)] leading-relaxed">
							{@html sanitizedDescription}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Support CTA (desktop only, shown in modal on mobile) -->
		{#if kofiPlatform}
			<a
				href={kofiPlatform.url}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--neu-accent-soft)] text-[var(--neu-accent)] text-sm font-medium hover:bg-[var(--neu-accent)]/20 transition-colors"
			>
				<Icon icon="mdi:heart" width={16} height={16} />
				Support on {kofiPlatform.name || 'Ko-Fi'}
			</a>
		{/if}
	{:else}
		<div class="space-y-2">
			<h2 class="text-xl font-bold text-[var(--neu-text-muted)]">KEY JAY RADIO</h2>
			<p class="text-sm text-[var(--neu-text-muted)]">Select a track or press play to start</p>
		</div>
	{/if}
</div>

<!-- Track Info Modal (mobile — centered overlay) -->
{#if showInfoModal && isMobile}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Track information">
		<div
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			transition:fade={{ duration: 200 }}
			onclick={() => showInfoModal = false}
			onkeydown={(e) => e.key === 'Escape' && (showInfoModal = false)}
			role="button"
			tabindex="-1"
			aria-label="Close track info"
		></div>

		<div class="relative w-full max-w-sm" transition:fly={{ y: 40, duration: 250 }}>
			<div class="rounded-2xl bg-[var(--neu-bg-dark,#1a1a2e)] border border-white/10 p-5 space-y-4 shadow-2xl">
				<!-- Close button -->
				<button
					onclick={() => showInfoModal = false}
					class="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					aria-label="Close"
				>
					<Icon icon="mdi:close" width={18} height={18} class="text-[var(--neu-text-secondary)]" />
				</button>

				<!-- Track title & artist -->
				<div class="text-center space-y-1 pt-1">
					<h3 class="text-lg font-bold text-[var(--neu-text-primary)]">
						{$currentTrack?.title || 'Unknown Track'}
					</h3>
					<p class="text-sm text-[var(--neu-text-secondary)]">
						{$currentTrack?.artist || 'Key Jay'}
					</p>
				</div>

				<!-- Description -->
				{#if descriptionText}
					<div class="desc-content text-sm text-[var(--neu-text-secondary)] leading-relaxed max-h-[40vh] overflow-y-auto">
						{@html sanitizedDescription}
					</div>
				{/if}

				<!-- Support link -->
				{#if kofiPlatform}
					<div class="flex justify-center">
						<a
							href={kofiPlatform.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--neu-accent-soft)] text-[var(--neu-accent)] text-sm font-medium hover:bg-[var(--neu-accent)]/20 transition-colors"
						>
							<Icon icon="mdi:heart" width={16} height={16} />
							Support on {kofiPlatform.name || 'Ko-Fi'}
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Animated rings emanating from cover art */
	.artwork-ring {
		position: absolute;
		border-radius: 50%;
		border: 1px solid var(--neu-accent, #667eea);
		opacity: 0;
		animation: ring-pulse 3s ease-out infinite;
	}

	.artwork-ring-1 {
		width: 100%;
		height: 100%;
		animation-delay: 0s;
	}

	.artwork-ring-2 {
		width: 100%;
		height: 100%;
		animation-delay: 1s;
	}

	.artwork-ring-3 {
		width: 100%;
		height: 100%;
		animation-delay: 2s;
	}

	@keyframes ring-pulse {
		0% {
			transform: scale(1);
			opacity: 0.4;
		}
		100% {
			transform: scale(1.4);
			opacity: 0;
		}
	}

	/* Gentle floating bob while playing */
	.artwork-float {
		animation: artwork-bob 4s ease-in-out infinite;
	}

	@keyframes artwork-bob {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	/* Links inside description content */
	.desc-content :global(a) {
		color: var(--neu-accent, #667eea);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.2s;
	}

	.desc-content :global(a:hover) {
		color: var(--neu-accent-purple, #9b59b6);
	}
</style>
