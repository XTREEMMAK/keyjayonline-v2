<script>
	let { onClick = () => {} } = $props();
</script>

<div class="spinning-play-button-wrapper relative" role="button" tabindex="0" onclick={onClick} onkeypress={(e) => e.key === 'Enter' && onClick()}>
	<!-- Spinning Text Circle -->
	<div class="play-circle-text-wrapper absolute inset-0 flex items-center justify-center">
		<svg class="play-circle-text rotating w-full h-full" viewBox="0 0 100 100" width="180" height="180">
			<defs>
				<path id="circle" d="
					M 50, 50
					m -37, 0
					a 37,37 0 1,1 74,0
					a 37,37 0 1,1 -74,0"/>
			</defs>
			<text font-size="7.7" fill="white" opacity="0.8">
				<textPath href="#circle">
					Don't think just play! Don't think just play! Don't think just PLAY!
				</textPath>
			</text>
		</svg>
	</div>
	
	<!-- Play Icon -->
	<div class="play-icon relative flex items-center justify-center w-full h-full">
		<div class="w-24 h-24 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer shadow-lg shadow-blue-500/25">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-12 h-12 ml-1">
				<path d="M8 5v14l11-7z"/>
			</svg>
		</div>
	</div>
</div>

<style>
	.spinning-play-button-wrapper {
		width: 180px;
		height: 180px;
	}
	
	.play-circle-text {
		width: 100%;
		height: 100%;
	}
	
	.spinning-play-button-wrapper:hover .play-icon > div {
		transform: scale(1.1);
	}
	
	.spinning-play-button-wrapper:active .play-icon > div {
		transform: scale(0.95);
	}
</style>