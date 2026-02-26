/**
 * Wave Background — ported from WaveBackground.svelte
 * Canvas 2D animated bezier wave effect, zero dependencies.
 */

(function () {
  'use strict';

  var canvas = document.getElementById('wave-bg');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var animationId = null;

  var PI = Math.PI;
  var PI2 = 2 * PI;

  var OPTIONS = {
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

  function Line(wave, color) {
    var angle = wave.angle;
    var speed = wave.speed;
    this.angle = [
      Math.sin(angle[0] += speed[0]),
      Math.sin(angle[1] += speed[1]),
      Math.sin(angle[2] += speed[2]),
      Math.sin(angle[3] += speed[3])
    ];
    this.color = color;
  }

  function Wave() {
    this.lines = [];
    this.angle = [rnd(PI2), rnd(PI2), rnd(PI2), rnd(PI2)];
    this.speed = [
      rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign(),
      rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign(),
      rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign(),
      rnd(OPTIONS.speed[0], OPTIONS.speed[1]) * rndSign()
    ];
  }

  Wave.prototype.update = function (color) {
    this.lines.push(new Line(this, color));
    if (this.lines.length > OPTIONS.width) this.lines.shift();
  };

  Wave.prototype.draw = function (ctx, centerX, centerY, radius) {
    var radius3 = radius / 3;
    var rotation = dtr(OPTIONS.rotation);
    var amplitude = OPTIONS.amplitude;

    for (var i = 0; i < this.lines.length; i++) {
      var a = this.lines[i].angle;
      var x1 = centerX - radius * Math.cos(a[0] * amplitude + rotation);
      var y1 = centerY - radius * Math.sin(a[0] * amplitude + rotation);
      var x2 = centerX + radius * Math.cos(a[3] * amplitude + rotation);
      var y2 = centerY + radius * Math.sin(a[3] * amplitude + rotation);
      var cpx1 = centerX - radius3 * Math.cos(a[1] * amplitude * 2);
      var cpy1 = centerY - radius3 * Math.sin(a[1] * amplitude * 2);
      var cpx2 = centerX + radius3 * Math.cos(a[2] * amplitude * 2);
      var cpy2 = centerY + radius3 * Math.sin(a[2] * amplitude * 2);

      ctx.strokeStyle = this.lines[i].color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
      ctx.stroke();
    }
  };

  // State
  var waves = [];
  var hue = OPTIONS.hue[0];
  var hueFw = true;
  var width, height, centerX, centerY, radius;

  for (var i = 0; i < OPTIONS.waves; i++) {
    waves.push(new Wave());
  }

  function resize() {
    var scale = window.devicePixelRatio || 1;
    width = window.innerWidth * scale;
    height = window.innerHeight * scale;
    canvas.width = width;
    canvas.height = height;
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
    var a = Math.floor(127 * Math.sin(0.3 * hue + 0) + 128);
    var b = Math.floor(127 * Math.sin(0.3 * hue + 2) + 128);
    var c = Math.floor(127 * Math.sin(0.3 * hue + 4) + 128);
    return 'rgba(' + a + ',' + b + ',' + c + ', 0.1)';
  }

  resize();

  // Preload wave lines
  for (var w = 0; w < OPTIONS.waves; w++) {
    var color = updateColor();
    for (var j = 0; j < OPTIONS.width; j++) {
      waves[w].update(color);
    }
  }

  function animate() {
    var color = updateColor();
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    var gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (var i = 0; i < waves.length; i++) {
      waves[i].update(color);
      waves[i].draw(ctx, centerX, centerY, radius);
    }

    animationId = requestAnimationFrame(animate);
  }

  animate();
  window.addEventListener('resize', resize);
})();
