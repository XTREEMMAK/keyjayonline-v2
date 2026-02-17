<script>
	import AudioPlayer from './AudioPlayer.svelte';
	import Icon from '@iconify/svelte';

	let { work } = $props();

	const genres = $derived(Array.isArray(work.genre) ? work.genre : work.genre ? [work.genre] : []);
	const externalLinks = $derived(
		(work.externalLinks || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
	);

	const platformIcons = {
		'spotify': 'simple-icons:spotify',
		'apple music': 'simple-icons:applemusic',
		'applemusic': 'simple-icons:applemusic',
		'youtube': 'simple-icons:youtube',
		'youtube music': 'simple-icons:youtubemusic',
		'bandcamp': 'simple-icons:bandcamp',
		'soundcloud': 'simple-icons:soundcloud',
		'tidal': 'simple-icons:tidal',
		'amazon music': 'simple-icons:amazonmusic',
		'deezer': 'simple-icons:deezer',
		'pandora': 'simple-icons:pandora',
		'newgrounds': 'simple-icons:newgrounds'
	};

	function getLinkIcon(link) {
		if ((link.icon_type === 'custom' || link.icon_type === 'iconify') && link.icon_value) {
			return link.icon_value;
		}
		const platform = (link.label || '').toLowerCase();
		return platformIcons[platform] || 'mdi:link';
	}
</script>

<div class="neu-card p-4 scale-100 hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm" style="background: rgba(42, 45, 53, 0.85);">
	<div class="flex items-start justify-between mb-3">
		<div>
			<h4 class="text-lg font-semibold text-white">{work.title}</h4>
			{#if genres.length > 0}
				<div class="flex items-center gap-2 mt-1 flex-wrap">
					{#each genres as genre}
						<span class="text-sm text-blue-400">{genre}</span>
					{/each}
				</div>
			{/if}
		</div>
		{#if externalLinks.length > 0}
			<div class="flex items-center gap-2 flex-shrink-0">
				{#each externalLinks as link}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-gray-400 hover:text-blue-400 transition-colors duration-200"
						title={link.label}
					>
						<Icon icon={getLinkIcon(link)} class="text-xl" />
					</a>
				{/each}
			</div>
		{/if}
	</div>

	{#if work.description}
		<p class="text-gray-400 text-sm mb-3">{work.description}</p>
	{/if}

	{#if work.audioUrl}
		<AudioPlayer
			audioUrl={work.audioUrl}
			trackTitle={work.title}
			waveColor="#60A5FA"
			progressColor="#2563EB"
			height={50}
		/>
	{/if}
</div>
