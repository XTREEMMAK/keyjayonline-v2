/**
 * Mouse Glow Action
 * Creates a subtle glow effect that follows the mouse cursor within the element
 */

export function mouseGlow(node, options = {}) {
	const {
		color = 'rgba(59, 130, 246, 0.15)',
		size = 400,
		blur = 80
	} = options;

	// Create the glow element
	let glowElement = document.createElement('div');
	glowElement.style.cssText = `
		position: absolute;
		width: ${size}px;
		height: ${size}px;
		background: radial-gradient(circle, ${color} 0%, transparent 70%);
		filter: blur(${blur}px);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.3s ease;
		transform: translate(-50%, -50%);
		z-index: 0;
	`;

	// Ensure parent has positioning context
	const computedStyle = window.getComputedStyle(node);
	if (computedStyle.position === 'static') {
		node.style.position = 'relative';
	}
	// Clip the glow to the node's shape without hiding overflow on the node itself
	glowElement.style.borderRadius = 'inherit';
	glowElement.style.clipPath = 'inset(0 round inherit)';
	node.appendChild(glowElement);

	const handleMouseMove = (e) => {
		const rect = node.getBoundingClientRect();
		glowElement.style.left = `${e.clientX - rect.left}px`;
		glowElement.style.top = `${e.clientY - rect.top}px`;
		glowElement.style.opacity = '1';
	};

	const handleMouseLeave = () => {
		glowElement.style.opacity = '0';
	};

	node.addEventListener('mousemove', handleMouseMove);
	node.addEventListener('mouseleave', handleMouseLeave);

	return {
		destroy() {
			node.removeEventListener('mousemove', handleMouseMove);
			node.removeEventListener('mouseleave', handleMouseLeave);
			if (glowElement && glowElement.parentNode) {
				glowElement.remove();
			}
		},
		update(newOptions) {
			// Allow dynamic updates to glow properties
			const {
				color: newColor = color,
				size: newSize = size,
				blur: newBlur = blur
			} = newOptions;

			glowElement.style.width = `${newSize}px`;
			glowElement.style.height = `${newSize}px`;
			glowElement.style.background = `radial-gradient(circle, ${newColor} 0%, transparent 70%)`;
			glowElement.style.filter = `blur(${newBlur}px)`;
		}
	};
}
