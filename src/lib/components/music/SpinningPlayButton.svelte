<script>
	let { onClick = () => {} } = $props();

	let isHovered = $state(false);
	let isPressed = $state(false);
</script>

<div
	class="vinyl-play-button"
	class:hovered={isHovered}
	class:pressed={isPressed}
	role="button"
	tabindex="0"
	onclick={onClick}
	onkeypress={(e) => e.key === 'Enter' && onClick()}
	onmouseenter={() => isHovered = true}
	onmouseleave={() => { isHovered = false; isPressed = false; }}
	onmousedown={() => isPressed = true}
	onmouseup={() => isPressed = false}
>
	<!-- Outer Ring with Spinning Text -->
	<div class="outer-ring">
		<svg class="spinning-text" viewBox="0 0 100 100">
			<defs>
				<path id="text-circle" d="
					M 50, 50
					m -42, 0
					a 42,42 0 1,1 84,0
					a 42,42 0 1,1 -84,0
				"/>
			</defs>
			<text class="ring-text">
				<textPath href="#text-circle">
					PRESS PLAY • PRESS PLAY • PRESS PLAY • PRESS PLAY •
				</textPath>
			</text>
		</svg>
	</div>

	<!-- Vinyl Record Body -->
	<div class="vinyl-body">
		<!-- Vinyl Grooves -->
		<div class="groove groove-1"></div>
		<div class="groove groove-2"></div>
		<div class="groove groove-3"></div>

		<!-- Center Label -->
		<div class="vinyl-label">
			<!-- Inner ring detail -->
			<div class="label-ring"></div>

			<!-- Play Button -->
			<div class="play-button">
				<svg viewBox="0 0 24 24" fill="currentColor" class="play-icon">
					<path d="M8 5v14l11-7z"/>
				</svg>
			</div>
		</div>
	</div>
</div>

<style>
	.vinyl-play-button {
		position: relative;
		width: 180px;
		height: 180px;
		cursor: pointer;
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		/* Ensure consistent sizing regardless of body padding */
		box-sizing: content-box !important;
	}

	.vinyl-play-button *,
	.vinyl-play-button *::before,
	.vinyl-play-button *::after {
		box-sizing: content-box !important;
	}

	.vinyl-play-button:hover {
		transform: scale(1.05);
	}

	.vinyl-play-button.pressed {
		transform: scale(0.98);
	}

	/* Outer Ring with Text - semi-transparent with blur */
	.outer-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: rgba(42, 45, 53, 0.75);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow:
			8px 8px 20px var(--neu-shadow-dark, rgba(18, 20, 24, 0.7)),
			-8px -8px 20px var(--neu-shadow-light, rgba(60, 64, 72, 0.3));
		transition: box-shadow 0.3s ease;
	}

	.vinyl-play-button.pressed .outer-ring {
		background: rgba(42, 45, 53, 0.85);
		box-shadow:
			inset 4px 4px 10px var(--neu-shadow-dark, rgba(18, 20, 24, 0.6)),
			inset -4px -4px 10px var(--neu-shadow-light, rgba(60, 64, 72, 0.2));
	}

	.spinning-text {
		position: absolute;
		width: 100%;
		height: 100%;
		animation: spin 20s linear infinite;
	}

	.vinyl-play-button:hover .spinning-text {
		animation-duration: 8s;
	}

	.ring-text {
		font-size: 6px;
		fill: rgba(255, 255, 255, 0.5);
		font-weight: 600;
		letter-spacing: 2px;
		text-transform: uppercase;
	}

	/* Vinyl Body */
	.vinyl-body {
		position: absolute;
		top: 15px;
		left: 15px;
		right: 15px;
		bottom: 15px;
		border-radius: 50%;
		background: linear-gradient(145deg, #1a1d22, #232730);
		box-shadow:
			inset 2px 2px 6px rgba(0, 0, 0, 0.5),
			inset -2px -2px 6px rgba(60, 64, 72, 0.2);
		animation: vinyl-spin 4s linear infinite paused;
	}

	.vinyl-play-button:hover .vinyl-body {
		animation-play-state: running;
	}

	/* Vinyl Grooves */
	.groove {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.groove-1 {
		top: 15%;
		left: 15%;
		right: 15%;
		bottom: 15%;
	}

	.groove-2 {
		top: 25%;
		left: 25%;
		right: 25%;
		bottom: 25%;
	}

	.groove-3 {
		top: 35%;
		left: 35%;
		right: 35%;
		bottom: 35%;
	}

	/* Center Label */
	.vinyl-label {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 60%;
		height: 60%;
		border-radius: 50%;
		background: linear-gradient(145deg, #3b82f6, #2563eb);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			4px 4px 12px rgba(0, 0, 0, 0.4),
			-2px -2px 8px rgba(96, 165, 250, 0.2),
			inset 0 0 20px rgba(0, 0, 0, 0.2);
	}

	.vinyl-play-button:hover .vinyl-label {
		background: linear-gradient(145deg, #60a5fa, #3b82f6);
	}

	.label-ring {
		position: absolute;
		inset: 8px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.15);
	}

	/* Play Button */
	.play-button {
		width: 50%;
		height: 50%;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}

	.vinyl-play-button:hover .play-button {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.1);
	}

	.play-icon {
		width: 55%;
		height: 55%;
		color: white;
		margin-left: 3px;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	/* Animations */
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes vinyl-spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Focus state for accessibility */
	.vinyl-play-button:focus {
		outline: none;
	}

	.vinyl-play-button:focus-visible .outer-ring {
		box-shadow:
			8px 8px 20px var(--neu-shadow-dark, rgba(18, 20, 24, 0.9)),
			-8px -8px 20px var(--neu-shadow-light, rgba(60, 64, 72, 0.4)),
			0 0 0 3px rgba(59, 130, 246, 0.5);
	}

	@media (max-width: 1024px) {
		.outer-ring {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: rgba(42, 45, 53, 0.9);
		}

		.play-button {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: rgba(255, 255, 255, 0.2);
		}
	}
</style>
