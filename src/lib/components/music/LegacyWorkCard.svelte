<script>
	import { fly, fade } from 'svelte/transition';
	import AudioPlayer from './AudioPlayer.svelte';
	import Icon from '@iconify/svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';

	let { work } = $props();

	let showInfoModal = $state(false);

	function stripHtml(html) {
		if (!html) return '';
		return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
	}

	const descriptionText = $derived(stripHtml(work.description));
	const sanitizedDescription = $derived(sanitizeHtml(work.description));
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

	{#if work.audioUrl}
		<AudioPlayer
			audioUrl={work.audioUrl}
			waveColor="#60A5FA"
			progressColor="#2563EB"
			height={50}
		/>
	{/if}

	{#if descriptionText}
		<div class="mt-2">
			<button
				onclick={() => showInfoModal = true}
				class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors"
			>
				<Icon icon="mdi:information-outline" width={14} height={14} />
				Track info
			</button>
		</div>
	{/if}
</div>

<!-- Track Info Modal -->
{#if showInfoModal}
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
			<div class="rounded-2xl bg-[#1e2028] border border-white/10 p-5 space-y-4 shadow-2xl">
				<!-- Close button -->
				<button
					onclick={() => showInfoModal = false}
					class="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					aria-label="Close"
				>
					<Icon icon="mdi:close" width={18} height={18} class="text-gray-400" />
				</button>

				<!-- Title & genres -->
				<div class="space-y-1 pt-1 pr-8">
					<h3 class="text-lg font-bold text-white">{work.title}</h3>
					{#if genres.length > 0}
						<div class="flex items-center gap-2 flex-wrap">
							{#each genres as genre}
								<span class="text-sm text-blue-400">{genre}</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Description -->
				<div class="desc-content text-sm text-gray-400 leading-relaxed max-h-[40vh] overflow-y-auto">
					{@html sanitizedDescription}
				</div>

				<!-- External links -->
				{#if externalLinks.length > 0}
					<div class="flex items-center justify-center gap-3 pt-1">
						{#each externalLinks as link}
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-gray-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
								title={link.label}
							>
								<Icon icon={getLinkIcon(link)} width={20} height={20} />
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.desc-content :global(a) {
		color: #60a5fa;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.2s;
	}

	.desc-content :global(a:hover) {
		color: #93c5fd;
	}
</style>
