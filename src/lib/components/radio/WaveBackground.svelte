<script>
	import { onDestroy } from 'svelte';

	let canvas = $state();
	let animationId = null;
	let waves = null;

	const PI = Math.PI;
	const PI2 = 2 * Math.PI;

	const OPTIONS = {
		rotation: 45,
		waves: 3,
		width: 200,
		hue: [11, 14],
		amplitude: 0.5,
		speed: [0.004, 0.008]
	};

	function rnd(a, b) {
		return arguments.length === 1 ? Math.random() * a : a + Math.random() * (b - a);
	}

	function rndSign() {
		return Math.random() > 0.5 ? 1 : -1;
	}

	function dtr(deg) {
		return deg * PI / 180;
	}

	class Line {
		constructor(wave, color) {
			const angle = wave.angle;
			const speed = wave.speed;
			this.angle = [
				Math.sin(angle[0] += speed[0]),
				Math.sin(angle[1] += speed[1]),
				Math.sin(angle[2] += speed[2]),
				Math.sin(angle[3] += speed[3])
			];
			this.color = color;
		}
	}

	class Wave {
		constructor() {
			this.lines = [];
			this.angle = [rnd(PI2), rnd(PI2), rnd(PI2), rnd(PI2)];
			this.speed = [
				rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign(),
				rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign(),
				rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign(),
				rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign()
			];
		}

		update(color) {
			this.lines.push(new Line(this, color));
			if (this.lines.length > OPTIONS.width) this.lines.shift();
		}

		draw(ctx, centerX, centerY, radius) {
			const radius3 = radius / 3;
			const rotation = dtr(OPTIONS.rotation);
			const amplitude = OPTIONS.amplitude;

			for (const line of this.lines) {
				const a = line.angle;
				const x1 = centerX - radius * Math.cos(a[0] * amplitude + rotation);
				const y1 = centerY - radius * Math.sin(a[0] * amplitude + rotation);
				const x2 = centerX + radius * Math.cos(a[3] * amplitude + rotation);
				const y2 = centerY + radius * Math.sin(a[3] * amplitude + rotation);
				const cpx1 = centerX - radius3 * Math.cos(a[1] * amplitude * 2);
				const cpy1 = centerY - radius3 * Math.sin(a[1] * amplitude * 2);
				const cpx2 = centerX + radius3 * Math.cos(a[2] * amplitude * 2);
				const cpy2 = centerY + radius3 * Math.sin(a[2] * amplitude * 2);

				ctx.strokeStyle = line.color;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
				ctx.stroke();
			}
		}
	}

	function initWaves() {
		const waveArr = [];
		for (let i = 0; i < OPTIONS.waves; i++) {
			waveArr.push(new Wave());
		}
		return waveArr;
	}

	$effect(() => {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		let hue = OPTIONS.hue[0];
		let hueFw = true;
		let width, height, centerX, centerY, radius;

		waves = initWaves();

		function resize() {
			const scale = window.devicePixelRatio || 1;
			width = canvas.parentElement.offsetWidth * scale;
			height = canvas.parentElement.offsetHeight * scale;
			canvas.width = width;
			canvas.height = height;
			canvas.style.width = canvas.parentElement.offsetWidth + 'px';
			canvas.style.height = canvas.parentElement.offsetHeight + 'px';
			centerX = width / 2;
			centerY = height / 2;
			radius = Math.sqrt(width * width + height * height) / 2;
		}

		function updateColor() {
			hue += hueFw ? 0.01 : -0.01;
			if (hue > OPTIONS.hue[1] && hueFw) {
				hue = OPTIONS.hue[1];
				hueFw = false;
			} else if (hue < OPTIONS.hue[0] && !hueFw) {
				hue = OPTIONS.hue[0];
				hueFw = true;
			}
			const a = Math.floor(127 * Math.sin(0.3 * hue + 0) + 128);
			const b = Math.floor(127 * Math.sin(0.3 * hue + 2) + 128);
			const c = Math.floor(127 * Math.sin(0.3 * hue + 4) + 128);
			return `rgba(${a},${b},${c}, 0.1)`;
		}

		resize();

		// Preload wave lines
		for (let i = 0; i < OPTIONS.waves; i++) {
			const color = updateColor();
			for (let j = 0; j < OPTIONS.width; j++) {
				waves[i].update(color);
			}
		}

		function animate() {
			const color = updateColor();
			ctx.clearRect(0, 0, width, height);

			// Background gradient
			const gradient = ctx.createLinearGradient(0, 0, 0, height);
			gradient.addColorStop(0, '#000');
			gradient.addColorStop(1, color);
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);

			for (const wave of waves) {
				wave.update(color);
				wave.draw(ctx, centerX, centerY, radius);
			}

			animationId = requestAnimationFrame(animate);
		}

		animate();
		window.addEventListener('resize', resize);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('resize', resize);
		};
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
	});
</script>

<div class="absolute inset-0 overflow-hidden">
	<canvas bind:this={canvas} class="block w-full h-full"></canvas>
</div>
