<script>
	/**
	 * Native Neumorphic Modal Component
	 * Replaces SweetAlert2 for new modals with better Svelte integration
	 */

	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { pushModalState, popModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';

	let {
		isOpen = $bindable(false),
		title = '',
		size = 'lg', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
		closeable = true,
		showHeader = true,
		showFooter = false,
		children,
		footer
	} = $props();

	const dispatch = createEventDispatcher();

	const sizeClasses = {
		sm: 'neu-modal-sm',
		md: 'neu-modal-md',
		lg: 'neu-modal-lg',
		xl: 'neu-modal-xl',
		full: 'neu-modal-full'
	};

	function close() {
		if (closeable) {
			popModalState(); // Go back in history if we pushed a state
			isOpen = false;
			dispatch('close');
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape' && closeable && isOpen) {
			close();
		}
	}

	// Manage body scroll lock with scrollbar compensation and back button handling
	$effect(() => {
		if (browser) {
			if (isOpen) {
				// Push history state for back button handling
				pushModalState('native-modal');

				// Setup popstate listener for back button
				const cleanupPopstate = setupPopstateHandler(() => {
					isOpen = false;
					dispatch('close');
				});

				// Calculate scrollbar width for compensation
				const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
				document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
				document.body.classList.add('modal-open');

				return () => {
					cleanupPopstate();
					document.body.classList.remove('modal-open');
					document.documentElement.style.removeProperty('--scrollbar-width');
				};
			} else {
				document.body.classList.remove('modal-open');
				document.documentElement.style.removeProperty('--scrollbar-width');
			}
		}
	});

	onMount(() => {
		return () => {
			if (browser) {
				document.body.classList.remove('modal-open');
				document.documentElement.style.removeProperty('--scrollbar-width');
			}
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="neu-modal-backdrop"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		transition:fade={{ duration: 200 }}
	>
		<div
			class="neu-modal {sizeClasses[size]}"
			transition:scale={{ duration: 300, easing: cubicOut, start: 0.95 }}
		>
			<!-- Header -->
			{#if showHeader && (title || closeable)}
				<div class="neu-modal-header">
					{#if title}
						<h2 id="modal-title" class="text-2xl font-bold text-white">{title}</h2>
					{/if}
					{#if closeable}
						<button
							class="neu-button neu-button-icon ml-auto"
							onclick={close}
							aria-label="Close modal"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<!-- Body -->
			<div class="neu-modal-body neu-scrollbar">
				{@render children()}
			</div>

			<!-- Footer -->
			{#if showFooter && footer}
				<div class="neu-modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
