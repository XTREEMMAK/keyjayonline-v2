<script>
	import Icon from '@iconify/svelte';
	import { formatTime } from '$lib/utils/time.js';
	import {
		isPlaying,
		playerPosition,
		playerDuration,
		shuffleMode,
		volume,
		nextTrack,
		previousTrack
	} from '$lib/stores/musicPlayer.js';

	let {
		onTogglePlay = () => {},
		onToggleQueue = () => {},
		onShare = () => {},
		onseek = () => {},
		queueOpen = false
	} = $props();

	let isSeeking = $state(false);
	let seekValue = $state(0);

	const currentTimeFormatted = $derived(formatTime($playerPosition));
	const durationFormatted = $derived(formatTime($playerDuration));
	const progress = $derived($playerDuration > 0 ? ($playerPosition / $playerDuration) * 100 : 0);

	function handleSeekStart() {
		isSeeking = true;
		seekValue = progress;
	}

	function handleSeekInput(e) {
		seekValue = parseFloat(e.target.value);
	}

	function handleSeekEnd() {
		if (!isSeeking) return; // Guard against double-fire (touchend + pointerup)
		const fraction = seekValue / 100;
		isSeeking = false;
		onseek({ detail: fraction });
	}

	function toggleShuffle() {
		shuffleMode.update(v => !v);
	}

	let previousVolume = $state(1);
	let shareFeedback = $state(false);
	let shareFeedbackTimer = $state(null);

	function handleVolumeChange(e) {
		volume.set(parseFloat(e.target.value));
	}

	function toggleMute() {
		if ($volume > 0) {
			previousVolume = $volume;
			volume.set(0);
		} else {
			volume.set(previousVolume || 1);
		}
	}

	const volumeIcon = $derived(
		$volume === 0 ? 'mdi:volume-off' :
		$volume < 0.5 ? 'mdi:volume-medium' : 'mdi:volume-high'
	);

	async function handleShareClick() {
		await onShare();
		shareFeedback = true;
		if (shareFeedbackTimer) clearTimeout(shareFeedbackTimer);
		shareFeedbackTimer = setTimeout(() => { shareFeedback = false; }, 2000);
	}
</script>

<div class="radio-controls relative z-10 shrink-0 border-t border-white/10 bg-white/5 backdrop-blur-xl">
	<!-- Progress Bar -->
	<div class="px-4 pt-3">
		<input
			type="range"
			min="0"
			max="100"
			step="0.1"
			value={isSeeking ? seekValue : progress}
			oninput={handleSeekInput}
			onpointerdown={handleSeekStart}
			onpointerup={handleSeekEnd}
			ontouchend={handleSeekEnd}
			class="progress-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
			style="--progress: {isSeeking ? seekValue : progress}%"
		/>
		<div class="flex justify-between mt-1 text-xs text-[var(--neu-text-muted)]">
			<span>{currentTimeFormatted}</span>
			<span>{durationFormatted}</span>
		</div>
	</div>

	<!-- Primary Controls -->
	<div class="flex items-center justify-center gap-6 py-2">
		<button
			onclick={() => previousTrack()}
			class="flex items-center justify-center w-12 h-12 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
			aria-label="Previous track"
		>
			<Icon icon="mdi:skip-previous" width={28} height={28} class="text-[var(--neu-text-primary)]" />
		</button>

		<button
			onclick={onTogglePlay}
			class="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[var(--neu-accent)] to-[var(--neu-accent-purple)] shadow-lg hover:shadow-xl active:scale-95 transition-all"
			aria-label={$isPlaying ? 'Pause' : 'Play'}
		>
			<Icon icon={$isPlaying ? 'mdi:pause' : 'mdi:play'} width={32} height={32} class="text-white" />
		</button>

		<button
			onclick={() => nextTrack()}
			class="flex items-center justify-center w-12 h-12 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
			aria-label="Next track"
		>
			<Icon icon="mdi:skip-next" width={28} height={28} class="text-[var(--neu-text-primary)]" />
		</button>
	</div>

	<!-- Secondary Controls -->
	<div class="flex items-center justify-center gap-4 pb-4 pb-safe">
		<button
			onclick={toggleShuffle}
			class="flex items-center justify-center w-10 h-10 rounded-full transition-colors {$shuffleMode ? 'text-[var(--neu-accent)] bg-[var(--neu-accent-soft)]' : 'text-[var(--neu-text-muted)] hover:bg-white/5'}"
			aria-label={$shuffleMode ? 'Disable shuffle' : 'Enable shuffle'}
		>
			<Icon icon="mdi:shuffle-variant" width={20} height={20} />
		</button>

		<button
			onclick={onToggleQueue}
			class="flex items-center justify-center w-10 h-10 rounded-full transition-colors {queueOpen ? 'text-[var(--neu-accent)] bg-[var(--neu-accent-soft)]' : 'text-[var(--neu-text-muted)] hover:bg-white/5'}"
			aria-label={queueOpen ? 'Close queue' : 'Open queue'}
		>
			<Icon icon="mdi:playlist-music" width={20} height={20} />
		</button>

		<div class="relative">
			<button
				onclick={handleShareClick}
				class="flex items-center justify-center w-10 h-10 rounded-full transition-colors {shareFeedback ? 'text-[var(--neu-accent)] bg-[var(--neu-accent-soft)]' : 'text-[var(--neu-text-muted)] hover:bg-white/5'}"
				aria-label="Share"
			>
				<Icon icon={shareFeedback ? 'mdi:check' : 'mdi:share-variant'} width={20} height={20} />
			</button>
			{#if shareFeedback}
				<span class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded bg-[var(--neu-accent)] text-white whitespace-nowrap share-toast">
					Link copied!
				</span>
			{/if}
		</div>

		<!-- Volume (desktop only) -->
		<div class="hidden md:flex items-center gap-2">
			<button
				onclick={toggleMute}
				class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-colors"
				aria-label={$volume === 0 ? 'Unmute' : 'Mute'}
			>
				<Icon icon={volumeIcon} width={18} height={18} class="text-[var(--neu-text-muted)]" />
			</button>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={$volume}
				oninput={handleVolumeChange}
				class="volume-slider w-20 h-1 rounded-full appearance-none cursor-pointer"
				style="--volume: {$volume * 100}%"
			/>
		</div>
	</div>
</div>

<style>
	/* Progress slider styling */
	.progress-slider {
		background: linear-gradient(to right,
			var(--neu-accent, #667eea) 0%,
			var(--neu-accent, #667eea) var(--progress),
			rgba(255, 255, 255, 0.1) var(--progress),
			rgba(255, 255, 255, 0.1) 100%
		);
	}

	.progress-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}

	.progress-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		cursor: pointer;
		border: none;
	}

	/* Share toast animation */
	.share-toast {
		animation: toast-pop 0.2s ease-out;
	}

	@keyframes toast-pop {
		from { opacity: 0; transform: translate(-50%, 4px); }
		to { opacity: 1; transform: translate(-50%, 0); }
	}

	/* Volume slider styling */
	.volume-slider {
		background: linear-gradient(to right,
			var(--neu-text-muted, #6b7280) 0%,
			var(--neu-text-muted, #6b7280) var(--volume, 100%),
			rgba(255, 255, 255, 0.1) var(--volume, 100%),
			rgba(255, 255, 255, 0.1) 100%
		);
	}

	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
	}

	.volume-slider::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		border: none;
	}

	/* Safe area padding for bottom controls on iOS */
	.pb-safe {
		padding-bottom: max(1rem, env(safe-area-inset-bottom));
	}
</style>
