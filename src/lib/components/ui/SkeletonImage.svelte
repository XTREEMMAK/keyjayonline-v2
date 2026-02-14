<script>
	import { markImageLoaded } from '$lib/utils/imageCache.js';

	let { src, alt = '', class: className = '' } = $props();
	let loaded = $state(false);

	// Svelte action: detect memory-cached images synchronously on mount
	// If the browser already has the image (memory cache), img.complete is true
	// immediately — skip the skeleton with no flash
	function checkComplete(node) {
		if (node.complete && node.naturalWidth > 0) {
			loaded = true;
			markImageLoaded(src);
		}
	}
</script>

<div class="skeleton-image relative overflow-hidden {className}">
	{#if !loaded}
		<div class="absolute inset-0 skeleton-placeholder flex flex-col items-center justify-center gap-3">
			<!-- Shimmer overlay -->
			<div class="absolute inset-0 skeleton-shimmer"></div>
			<!-- KJ Logo -->
			<svg class="skeleton-logo relative" width="40" height="40" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
				<g fill="white">
					<path d="M 21.15 170.22 C 68.37 170.21 115.59 170.22 162.81 170.22 C 162.62 212.00 162.48 253.78 162.33 295.56 C 232.18 254.01 302.00 212.41 371.85 170.87 C 373.04 170.06 374.52 170.24 375.90 170.19 C 442.87 170.30 509.85 170.12 576.83 170.28 C 482.44 219.28 388.12 268.39 293.81 317.54 C 336.47 341.25 379.23 364.79 421.96 388.39 C 355.39 388.30 288.82 388.04 222.26 387.59 C 202.82 374.82 183.58 361.66 164.34 348.57 C 164.37 392.98 164.33 437.40 164.35 481.81 C 116.62 481.80 68.88 481.81 21.15 481.80 C 21.18 377.94 21.18 274.08 21.15 170.22 Z" />
					<path d="M 644.94 170.27 C 689.89 170.16 734.83 170.24 779.77 170.23 C 779.44 198.89 779.69 227.55 779.39 256.20 C 733.96 256.20 688.53 256.20 643.10 256.20 C 643.54 227.55 644.46 198.92 644.94 170.27 Z" />
					<path d="M 642.85 262.23 C 688.37 262.12 733.89 262.21 779.42 262.18 C 779.19 290.46 778.78 318.73 778.16 347.01 C 777.78 353.69 777.82 360.42 776.73 367.04 C 773.55 389.04 763.75 410.24 748.13 426.16 C 736.98 437.74 723.07 446.46 708.18 452.39 C 691.66 458.84 675.01 465.05 657.86 469.63 C 640.19 474.42 622.07 477.36 603.89 479.46 C 602.34 479.49 600.61 480.06 599.22 479.13 C 555.15 454.70 511.11 430.21 467.02 405.81 C 497.89 405.36 528.78 405.18 559.65 404.49 C 575.25 401.98 590.64 397.62 605.02 391.02 C 616.44 385.61 627.67 378.50 634.77 367.78 C 638.41 362.23 640.71 355.69 640.77 349.02 C 641.59 320.09 642.23 291.16 642.85 262.23 Z" />
					<path d="M 255.23 408.66 C 320.16 407.76 385.09 406.83 450.03 406.11 C 452.01 406.06 454.13 405.95 455.84 407.16 C 500.06 431.85 544.51 456.16 588.64 481.01 C 534.18 485.03 479.54 484.15 424.99 483.11 C 410.80 482.34 396.53 482.80 382.38 481.54 C 339.93 457.38 297.62 432.94 255.23 408.66 Z" />
				</g>
			</svg>
			<!-- Loading dots -->
			<div class="relative flex gap-1.5">
				<div class="loading-dot"></div>
				<div class="loading-dot" style="animation-delay: 0.15s"></div>
				<div class="loading-dot" style="animation-delay: 0.3s"></div>
			</div>
		</div>
	{/if}
	<img
		{src}
		{alt}
		class="w-full h-full object-cover transition-opacity duration-500 {loaded ? 'opacity-100' : 'opacity-0'}"
		onload={() => { loaded = true; markImageLoaded(src); }}
		use:checkComplete
	/>
</div>

<style>
	.skeleton-placeholder {
		background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0f172a 100%);
	}

	.skeleton-shimmer {
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(75, 85, 99, 0.15) 50%,
			transparent 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.skeleton-logo {
		opacity: 0.15;
		animation: logo-pulse 2s ease-in-out infinite;
	}

	@keyframes logo-pulse {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.25; }
	}

	.loading-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: rgba(6, 182, 212, 0.4);
		animation: dot-bounce 1s ease-in-out infinite;
	}

	@keyframes dot-bounce {
		0%, 100% { transform: translateY(0); opacity: 0.4; }
		50% { transform: translateY(-4px); opacity: 0.8; }
	}
</style>
