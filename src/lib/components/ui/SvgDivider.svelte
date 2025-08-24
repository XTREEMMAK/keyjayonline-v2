<script>
	let {
		type = 'wave',
		flipX = false,
		flipY = false,
		className = ''
	} = $props();
</script>

<div class="svg-divider {className}" class:flip-x={flipX} class:flip-y={flipY}>
	{#if type === 'wave'}
		<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-full">
			<path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" class="fill-current text-gray-900"></path>
		</svg>
	{:else if type === 'curve'}
		<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-full">
			<path d="M600,112.77C268.63,112.77,0,65.52,0,7.23V120H1200V7.23C1200,65.52,931.37,112.77,600,112.77Z" class="fill-current text-gray-900"></path>
		</svg>
	{:else if type === 'triangle'}
		<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-full">
			<polygon points="0,0 1200,0 600,120" class="fill-current text-gray-900"></polygon>
		</svg>
	{:else if type === 'slant'}
		<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-full">
			<polygon points="0,120 1200,0 1200,120" class="fill-current text-gray-900"></polygon>
		</svg>
	{/if}
</div>

<style>
	.svg-divider {
		height: 80px;
		width: 100%;
		position: relative;
		z-index: 10;
	}
	
	.flip-x {
		transform: scaleX(-1);
	}
	
	.flip-y {
		transform: scaleY(-1);
	}
	
	.flip-x.flip-y {
		transform: scaleX(-1) scaleY(-1);
	}
</style>