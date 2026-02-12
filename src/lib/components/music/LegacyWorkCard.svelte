<script>
	import AudioPlayer from './AudioPlayer.svelte';
	import Icon from '@iconify/svelte';

	let { work } = $props();
</script>

<div class="neu-card p-4 scale-100 hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm" style="background: rgba(42, 45, 53, 0.85);">
	<div class="flex items-start justify-between mb-3">
		<div>
			<h4 class="text-lg font-semibold text-white">{work.title}</h4>
			<div class="flex items-center gap-2 mt-1">
				{#if work.genre}
					<span class="text-sm text-blue-400">{work.genre}</span>
				{/if}
				{#if work.duration}
					<span class="text-sm text-gray-500">({work.duration})</span>
				{/if}
			</div>
		</div>
		{#if work.newgroundsUrl}
			<a
				href={work.newgroundsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-gray-400 hover:text-orange-400 transition-colors duration-200"
				title="View on Newgrounds"
			>
				<Icon icon="simple-icons:newgrounds" class="text-xl" />
			</a>
		{/if}
	</div>

	{#if work.description}
		<p class="text-gray-400 text-sm mb-3">{work.description}</p>
	{/if}

	<AudioPlayer
		audioUrl={work.audioUrl}
		trackTitle={work.title}
		waveColor="#60A5FA"
		progressColor="#2563EB"
		height={50}
	/>
</div>
