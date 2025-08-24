<script>
	let {
		videoId = '',
		url = '',
		title = '',
		type = 'youtube',
		className = ''
	} = $props();
	
	function getEmbedUrl() {
		if (url) {
			if (url.includes('youtube.com') || url.includes('youtu.be')) {
				const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
				if (match) {
					return `https://www.youtube.com/embed/${match[1]}`;
				}
			} else if (url.includes('vimeo.com')) {
				const match = url.match(/vimeo\.com\/(\d+)/);
				if (match) {
					return `https://player.vimeo.com/video/${match[1]}`;
				}
			}
		}
		
		if (videoId && type === 'youtube') {
			return `https://www.youtube.com/embed/${videoId}`;
		}
		
		if (videoId && type === 'vimeo') {
			return `https://player.vimeo.com/video/${videoId}`;
		}
		
		return '';
	}
	
	const embedUrl = getEmbedUrl();
</script>

{#if embedUrl}
	<div class="video-embed {className}">
		{#if title}
			<h4 class="text-white font-medium mb-2">{title}</h4>
		{/if}
		<div class="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
			<iframe 
				src={embedUrl}
				title={title || 'Video'}
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
				class="absolute inset-0 w-full h-full"
			></iframe>
		</div>
	</div>
{/if}