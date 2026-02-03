<script>
	import Icon from '@iconify/svelte';
	import { copyShareUrl } from '$lib/utils/shareLinks.js';

	/**
	 * @type {string} url - The URL to share
	 */
	export let url = '';

	/**
	 * @type {string} title - Button title/tooltip
	 */
	export let title = 'Share';

	/**
	 * @type {boolean} compact - Use compact icon-only style
	 */
	export let compact = false;

	let showCopied = $state(false);
	let isSharing = $state(false);

	async function handleShare() {
		if (isSharing) return;

		isSharing = true;
		const success = await copyShareUrl(url);

		if (success) {
			showCopied = true;
			setTimeout(() => {
				showCopied = false;
			}, 2000);
		}

		isSharing = false;
	}
</script>

{#if compact}
	<!-- Compact icon-only button -->
	<button
		onclick={handleShare}
		class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
		{title}
		disabled={isSharing}
	>
		<Icon
			icon={showCopied ? 'mdi:check' : 'mdi:share-variant'}
			width={20}
			height={20}
			class={showCopied ? 'text-green-400' : ''}
		/>
	</button>
{:else}
	<!-- Full button with text -->
	<button
		onclick={handleShare}
		class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		{title}
		disabled={isSharing}
	>
		<Icon
			icon={showCopied ? 'mdi:check' : 'mdi:share-variant'}
			width={20}
			height={20}
		/>
		<span>{showCopied ? 'Link Copied!' : 'Share'}</span>
	</button>
{/if}
