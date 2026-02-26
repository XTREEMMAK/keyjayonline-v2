<script>
	import { hasNewContent } from '$lib/stores/newContent.js';
</script>

{#if $hasNewContent}
	<span class="new-content-dot" aria-label="New content available">
		<span class="new-content-dot-ping"></span>
		<span class="new-content-dot-core"></span>
	</span>
{/if}

<style>
	.new-content-dot {
		position: absolute;
		top: -2px;
		right: -2px;
		width: 10px;
		height: 10px;
		pointer-events: none;
		z-index: 10;
	}

	.new-content-dot-core {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: #fbbf24;
		box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
	}

	.new-content-dot-ping {
		position: absolute;
		inset: -2px;
		border-radius: 50%;
		background: rgba(251, 191, 36, 0.6);
		animation: content-ping 2s ease-out infinite;
	}

	@keyframes content-ping {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(2.5);
			opacity: 0;
		}
	}
</style>
