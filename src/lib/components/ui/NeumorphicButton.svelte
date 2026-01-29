<script>
	/**
	 * Neumorphic Button Component
	 * A soft-UI styled button with variants
	 */

	let {
		variant = 'default', // 'default' | 'accent' | 'round' | 'icon'
		type = 'button',
		disabled = false,
		active = false,
		class: className = '',
		onclick = () => {},
		children
	} = $props();

	const baseClass = 'neu-button neu-interactive';

	const variantClasses = {
		default: '',
		accent: 'neu-button-accent',
		round: 'neu-button-round',
		icon: 'neu-button-icon'
	};
</script>

<button
	{type}
	{disabled}
	class="{baseClass} {variantClasses[variant]} {className}"
	class:active
	{onclick}
>
	{@render children()}
</button>
