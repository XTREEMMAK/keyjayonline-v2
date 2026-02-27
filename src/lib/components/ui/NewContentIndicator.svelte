<script>
	import { hasNewContent, clearNewContent } from '$lib/stores/newContent.js';

	let { interactive = false } = $props();
</script>

{#if $hasNewContent}
	{#if interactive}
		<a
			href="/now"
			class="new-content-dot interactive"
			title="New updates available"
			onclick={() => clearNewContent()}
		>
			<span class="new-content-dot-ping"></span>
			<span class="new-content-dot-core"></span>
		</a>
	{:else}
		<span class="new-content-dot" aria-label="New content available">
			<span class="new-content-dot-ping"></span>
			<span class="new-content-dot-core"></span>
		</span>
	{/if}
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

	.new-content-dot.interactive {
		pointer-events: auto;
		cursor: pointer;
		width: 14px;
		height: 14px;
		top: -4px;
		right: -4px;
		text-decoration: none;
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
