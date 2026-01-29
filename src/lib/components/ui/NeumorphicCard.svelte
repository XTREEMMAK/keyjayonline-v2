<script>
	/**
	 * Neumorphic Card Component
	 * A soft-UI styled card container
	 */

	let {
		variant = 'default', // 'default' | 'small' | 'flat'
		hover = true,
		class: className = '',
		children
	} = $props();

	const variantClasses = {
		default: 'neu-card',
		small: 'neu-card-sm',
		flat: 'neu-card-flat'
	};
</script>

<div
	class="{variantClasses[variant]} {className}"
	class:hover:scale-[1.02]={hover}
	class:transition-transform={hover}
	class:duration-300={hover}
>
	{@render children()}
</div>
