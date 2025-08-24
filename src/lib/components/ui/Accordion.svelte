<script>
	import { createEventDispatcher } from 'svelte';
	
	/** @type {string} - Unique ID for this accordion */
	export let id;
	
	/** @type {string} - Title text for the accordion header */
	export let title;
	
	/** @type {boolean} - Whether the accordion starts expanded */
	export let expanded = false;
	
	/** @type {string} - Custom CSS classes for styling */
	export let className = '';
	
	const dispatch = createEventDispatcher();
	
	let contentElement;
	let isExpanded = expanded;
	
	function toggleAccordion() {
		if (!contentElement) return;
		
		const wasExpanded = isExpanded;
		isExpanded = !isExpanded;
		
		if (isExpanded) {
			// Expand animation
			contentElement.style.maxHeight = '0px';
			
			// Force reflow to ensure starting state
			contentElement.offsetHeight;
			
			// Start expansion
			const fullHeight = contentElement.scrollHeight;
			contentElement.style.maxHeight = fullHeight + 'px';
			
			// After animation completes, set to auto for dynamic content
			setTimeout(() => {
				if (isExpanded) {
					contentElement.style.maxHeight = 'none';
				}
			}, 350);
		} else {
			// Collapse animation
			const currentHeight = contentElement.scrollHeight;
			contentElement.style.maxHeight = currentHeight + 'px';
			
			// Force reflow
			contentElement.offsetHeight;
			
			// Start collapse
			contentElement.style.maxHeight = '0px';
		}
		
		// Dispatch event for parent components
		dispatch('toggle', { 
			expanded: isExpanded, 
			previouslyExpanded: wasExpanded,
			id 
		});
	}
</script>

<div class="accordion-section {className}">
	<button 
		class="accordion-header" 
		on:click={toggleAccordion}
		aria-expanded={isExpanded}
		aria-controls="accordion-content-{id}"
	>
		<span class="accordion-title">{title}</span>
		<span 
			class="accordion-arrow" 
			class:rotated={isExpanded}
			aria-hidden="true"
		>⌄</span>
	</button>
	<div 
		bind:this={contentElement}
		id="accordion-content-{id}"
		class="accordion-content"
		class:expanded={isExpanded}
		class:collapsed={!isExpanded}
		aria-hidden={!isExpanded}
	>
		<div class="accordion-content-inner">
			<slot />
		</div>
	</div>
</div>

<style>
	.accordion-section {
		margin-bottom: 16px;
	}
	
	.accordion-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		background: rgba(55, 65, 81, 0.3);
		border: none;
		border-radius: 8px;
		color: #ffffff;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		margin-bottom: 8px;
		transition: all 0.3s ease;
	}
	
	.accordion-header:hover {
		background: rgba(55, 65, 81, 0.5);
	}
	
	.accordion-header:focus {
		outline: 2px solid rgba(59, 130, 246, 0.5);
		outline-offset: 2px;
	}
	
	.accordion-title {
		text-align: left;
	}
	
	.accordion-arrow {
		font-size: 1.2em;
		transform: rotate(0deg);
		transition: transform 0.3s ease;
		flex-shrink: 0;
		margin-left: 12px;
	}
	
	.accordion-arrow.rotated {
		transform: rotate(180deg);
	}
	
	.accordion-content {
		transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}
	
	.accordion-content.expanded {
		max-height: none;
	}
	
	.accordion-content.collapsed {
		max-height: 0;
	}
	
	.accordion-content-inner {
		padding: 0 16px 16px;
	}
</style>