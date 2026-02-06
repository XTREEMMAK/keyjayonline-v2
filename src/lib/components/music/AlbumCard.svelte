<script>
	import { fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	
	let {
		album,
		onclick = () => {},
		index = 0
	} = $props();
	
	let isHovered = $state(false);
</script>

<div 
	class="album-card relative group cursor-pointer transform transition-transform duration-300 hover:scale-105"
	onclick={() => onclick(album)}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(album); }}}
	onmouseenter={() => isHovered = true}
	onmouseleave={() => isHovered = false}
	role="button"
	tabindex="0"
	aria-label={`View ${album.title} album details`}
	in:fly={{ y: 50, duration: 400, delay: index * 100 }}
>
	<div class="relative overflow-hidden rounded-xl bg-gray-900/80">
		<div class="aspect-square">
			<img
				src={album.cover_art || 'https://placehold.co/400x400/1a1a1a/3B82F6?text=Album+Cover'}
				alt={album.title}
				class="w-full h-full object-cover"
				loading="lazy"
				width="400"
				height="400"
			/>
			
			<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
				<div class="absolute inset-0 flex flex-col items-center justify-center">
					<Icon icon="mdi:information-outline" width={48} height={48} class="text-white/90 mb-2" />
					<span class="text-white/90 text-sm font-medium">More Info</span>
				</div>
				{#if album.track_count}
					<div class="absolute bottom-4 right-4">
						<span class="text-white/80 text-xs bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">{album.track_count} tracks</span>
					</div>
				{/if}
			</div>
		</div>
		
		<div class="p-4">
			<h3 class="font-semibold text-white mb-1 line-clamp-2 min-h-[3.5rem]" style="font-size: 0.9rem;">{album.title}</h3>
			{#if album.artist}
				<p class="text-gray-400 text-sm mb-2">{album.artist}</p>
			{/if}
			<div class="flex items-center justify-between">
				<span class="text-gray-500 text-xs">{album.release_date || 'Coming Soon'}</span>
				{#if album.access_type}
					<span class="px-2 py-1 text-xs rounded-full {
						album.access_type === 'free' ? 'bg-green-600/20 text-green-400' :
						album.access_type === 'paid' ? 'bg-blue-600/20 text-blue-400' :
						'bg-purple-600/20 text-purple-400'
					}">
						{album.access_type === 'free' ? 'Free' :
						 album.access_type === 'paid' ? 'Purchase' :
						 'Subscriber'}
					</span>
				{/if}
			</div>
		</div>
	</div>
	
	{#if isHovered}
		<div 
			class="absolute -inset-0.5 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-xl blur-lg"
			transition:fly={{ scale: 0.95, duration: 200 }}
		></div>
	{/if}
</div>

<style>
	.album-card {
		view-transition-name: album-cover;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Mobile: Disable expensive effects to fix render issues */
	@media (max-width: 768px) {
		.album-card {
			transform: none !important;
		}

		.album-card:hover {
			transform: none !important;
		}

		/* Disable backdrop-blur */
		:global(.backdrop-blur-sm) {
			backdrop-filter: none !important;
			-webkit-backdrop-filter: none !important;
			background-color: rgba(0, 0, 0, 0.7) !important;
		}

		/* Disable blur on hover glow */
		:global(.blur-lg) {
			filter: none !important;
		}
	}
</style>