// Matches the approved Rising sparks preview at intensity 1.5.
// The portrait interior is clipped out of every draw, including the soft glow.
export function createPickSparks(
  canvas,
  { intensity = 1.5, fadeDurationMs = 900 } = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setActive() {}, dispose() {} };
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const padding = 42;
  const seed = (n) => {
    const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  let frame = null;
  let active = false;
  let drawn = false;
  let started = 0;
  let fadeEnd = 0;
  let disposed = false;

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawn = false;
  }
  function draw(time) {
    // clientWidth stays in board coordinates when the studio scales its preview.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const w = width - padding * 2;
    const h = height - padding * 2;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * dpr);
    const pixelsHigh = Math.round(height * dpr);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(padding + 1, padding + 1, w - 2, h - 2);
    ctx.clip("evenodd");
    ctx.globalCompositeOperation = "lighter";
    const scale = w / 144;
    function pointOnEdge(i, outward) {
      const fraction = seed(i * 9.31 + 0.7);
      const ripple = Math.sin(time * 2 + i) * 2;
      switch (i % 4) {
        case 0:
          return [padding - outward - ripple, padding + fraction * h];
        case 1:
          return [padding + w + outward + ripple, padding + fraction * h];
        case 2:
          return [padding + fraction * w, padding - outward - ripple];
        default:
          return [padding + fraction * w, padding + h + outward + ripple];
      }
    }
    function glow(x, y, radius, alpha, color = "87, 204, 255") {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color},${alpha})`);
      gradient.addColorStop(0.38, `rgba(${color},${alpha * 0.32})`);
      gradient.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    for (let i = 0; i < 22; i++) {
      const [x, y] = pointOnEdge(i, 2);
      glow(x, y, (10 + 4 * Math.sin(time * 2 + i)) * scale, intensity * 0.13);
    }
    for (let i = 0; i < 32; i++) {
      const cycle = time * (0.22 + seed(i + 9) * 0.3) + seed(i * 4.3);
      const phase = cycle - Math.floor(cycle);
      const fade = Math.sin(phase * Math.PI);
      const [x0, y0] = pointOnEdge(i, 2);
      const edge = i % 4;
      const drift = (3 + 15 * phase) * scale;
      const x =
        x0 +
        (edge === 0
          ? -drift
          : edge === 1
            ? drift
            : Math.sin(i + phase * 4) * 12 * scale);
      const y = y0 - phase * (23 + seed(i + 7) * 44) * scale;
      glow(x, y, 4 * scale, intensity * fade * 0.4, "126,226,255");
      ctx.beginPath();
      ctx.moveTo(x, y + (2 + seed(i + 23) * 5) * scale);
      ctx.lineTo(x, y);
      // A blue body keeps the small embers legible against the parchment board.
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `rgba(42,153,220,${Math.min(1, intensity * fade * 0.65)})`;
      ctx.lineWidth = (1.2 + seed(i + 1) * 0.9) * scale;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(177,240,255,${intensity * fade * 0.78})`;
      ctx.lineWidth = (0.6 + seed(i + 1) * 0.9) * scale;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
    drawn = true;
  }
  function tick(now) {
    frame = null;
    if (disposed) return;
    if (!active && now >= fadeEnd) {
      clear();
      return;
    }
    draw(motion.matches ? 1.7 : (now - started) / 1000 + 1.7);
    if (!motion.matches) frame = window.requestAnimationFrame(tick);
  }
  function onMotionChange() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    if (motion.matches && !active) {
      clear();
      return;
    }
    if (active || drawn) tick(performance.now());
  }
  motion.addEventListener("change", onMotionChange);
  return {
    setActive(next) {
      next = Boolean(next);
      if (disposed || next === active) return;
      active = next;
      if (active) started = performance.now();
      else fadeEnd = performance.now() + fadeDurationMs;
      if (motion.matches && !active) {
        clear();
        return;
      }
      // Keep the particles moving throughout the CSS fade, then release the RAF.
      if (frame === null) tick(performance.now());
    },
    dispose() {
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotionChange);
      clear();
    },
  };
}
