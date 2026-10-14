// Blue flame from the approved parchment preview, at the requested low strength.
export const PICK_FLAME_STRENGTH = 0.6;
const PADDING = 48;
const CARD_WIDTH = 112;
const CARD_HEIGHT = 189;
const FRAME_MS = 1000 / 30;
const seed = (n) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (n) => n * n * (3 - 2 * n);
function noise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const hash = (a, b) => seed(a * 7.13 + b * 23.61);
  return mix(
    mix(hash(ix, iy), hash(ix + 1, iy), fx),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx),
    fy,
  );
}
function fbm(x, y) {
  return (
    noise(x, y) * 0.57 +
    noise(x * 2.1 + 7, y * 2.1 + 3) * 0.28 +
    noise(x * 4.2, y * 4.2) * 0.15
  );
}

// Overlapping picks share one small flame texture instead of generating it per card.
let sharedField = null;
function flameField(time, strength) {
  const frame = Math.floor(time * 30);
  if (!sharedField) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((CARD_WIDTH + 76) / 3);
    canvas.height = Math.ceil((CARD_HEIGHT + 96) / 3);
    sharedField = { canvas, ctx: canvas.getContext("2d"), frame: -1 };
  }
  const field = sharedField;
  if (!field.ctx) return null;
  if (field.frame === frame && field.strength === strength) return field.canvas;
  const image = field.ctx.createImageData(
    field.canvas.width,
    field.canvas.height,
  );
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const xx = x * 3 - 38;
      const yy = y * 3 - 58;
      const dx = Math.max(-xx, xx - CARD_WIDTH, 0);
      const dy = Math.max(-yy, yy - CARD_HEIGHT, 0);
      const distance = Math.hypot(dx, dy);
      if (distance <= 0 || distance > 38) continue;
      const warp = noise(xx * 0.045 + 13, yy * 0.025 + time * 0.75) * 9;
      const n = fbm(xx * 0.15 + warp * 0.12, yy * 0.045 + time * 1.9);
      const reach = (10 + Math.pow(n, 1.7) * 38) * strength;
      const density = Math.max(0, 1 - distance / reach);
      const heat = Math.min(1, density * (0.55 + n));
      if (heat <= 0) continue;
      const index = (y * image.width + x) * 4;
      image.data[index] = 17 + 175 * Math.pow(heat, 3);
      image.data[index + 1] = 105 + 143 * Math.pow(heat, 0.8);
      image.data[index + 2] = 252;
      image.data[index + 3] = Math.min(220, Math.pow(heat, 1.1) * 230);
    }
  }
  field.ctx.putImageData(image, 0, 0);
  field.frame = frame;
  field.strength = strength;
  return field.canvas;
}
function edge(i, time) {
  const q = seed(i * 9.31 + 0.7);
  switch (i % 4) {
    case 0:
      return [-2, q * CARD_HEIGHT, -1];
    case 1:
      return [CARD_WIDTH + 2, q * CARD_HEIGHT, 1];
    case 2:
      return [q * CARD_WIDTH, -2, Math.sin(i + time)];
    default:
      return [q * CARD_WIDTH, CARD_HEIGHT + 2, Math.sin(i + time)];
  }
}
function glow(ctx, x, y, radius, alpha, deep = false) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(
    0,
    `rgba(${deep ? "11,106,214" : "37,175,245"},${alpha})`,
  );
  gradient.addColorStop(0.4, `rgba(36,169,239,${alpha * 0.5})`);
  gradient.addColorStop(1, "rgba(37,175,245,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function sparks(ctx, time, strength) {
  for (let i = 0; i < 14; i++) {
    const [x, y] = edge(i, time);
    glow(ctx, x, y, 7 + seed(i + 5) * 5, 0.28 * strength, true);
  }
  for (let i = 0; i < 18; i++) {
    const cycle = time * (0.28 + seed(i + 9) * 0.4) + seed(i * 4.3);
    const phase = cycle - Math.floor(cycle);
    const alpha = Math.pow(Math.sin(phase * Math.PI), 0.65) * strength;
    const [x0, y0, direction] = edge(i, time);
    const x = x0 + direction * (4 + phase * 14) + Math.sin(i + time * 2) * 2;
    const y = y0 - phase * (25 + seed(i + 7) * 45);
    glow(ctx, x, y, 4 + seed(i) * 2, 0.35 * alpha);
    const length = 4 + seed(i + 2) * 7;
    const dx = Math.sin(i) * 2;
    const size = 1.8 + seed(i + 1) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - dx, y + length);
    ctx.quadraticCurveTo(x + dx * 0.5, y + length * 0.4, x, y);
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(7,99,193,${Math.min(1, alpha * 0.9)})`;
    ctx.lineWidth = size + 1;
    ctx.stroke();
    ctx.strokeStyle = `rgba(54,194,255,${Math.min(1, alpha)})`;
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.strokeStyle = `rgba(203,249,255,${Math.min(1, alpha)})`;
    ctx.lineWidth = Math.max(0.8, size * 0.36);
    ctx.stroke();
  }
}

export function createPickFlame(
  canvas,
  { strength = PICK_FLAME_STRENGTH, fadeDurationMs = 900 } = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setActive() {}, dispose() {} };
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;
  let active = false;
  let drawn = false;
  let fadeEnd = 0;
  let disposed = false;
  let lastDraw = -Infinity;
  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawn = false;
  }
  function draw(time) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const w = width - PADDING * 2;
    const h = height - PADDING * 2;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    // Match the preview's masks: flame and glow cannot paint over any hero artwork.
    const bounds = canvas.getBoundingClientRect();
    const scaleX = bounds.width / width;
    const scaleY = bounds.height / height;
    const board = canvas.closest(".draft-canvas") || canvas.parentElement;
    const portraits = board.querySelectorAll(".hero-slot .hero-portrait-frame");
    if (scaleX > 0 && scaleY > 0 && portraits.length) {
      portraits.forEach((portrait) => {
        const rect = portrait.getBoundingClientRect();
        if (rect.width && rect.height) {
          ctx.rect(
            (rect.left - bounds.left) / scaleX,
            (rect.top - bounds.top) / scaleY,
            rect.width / scaleX,
            rect.height / scaleY,
          );
        }
      });
    } else ctx.rect(PADDING, PADDING, w, h);
    ctx.clip("evenodd");
    // Render in the preview's coordinates, including the shorter lower-third cards.
    ctx.translate(PADDING, PADDING);
    ctx.scale(w / CARD_WIDTH, h / CARD_HEIGHT);
    for (let i = 0; i < 12; i++) {
      const [x, y] = edge(i, time);
      glow(ctx, x, y, 17, 0.22 * strength);
    }
    const field = flameField(time, strength);
    if (field) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(field, -38, -58, field.width * 3, field.height * 3);
    }
    sparks(ctx, time, strength * 0.7);
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
    if (motion.matches || now - lastDraw >= FRAME_MS) {
      draw(motion.matches ? 2.9 : now / 1000 + 1.7);
      lastDraw = now;
    }
    if (!motion.matches) frame = window.requestAnimationFrame(tick);
  }
  function onMotionChange() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastDraw = -Infinity;
    if (motion.matches && !active) clear();
    else if (active || drawn) tick(performance.now());
  }
  motion.addEventListener("change", onMotionChange);
  return {
    setActive(next) {
      next = Boolean(next);
      if (disposed || next === active) return;
      active = next;
      if (!active) fadeEnd = performance.now() + fadeDurationMs;
      if (motion.matches && !active) {
        clear();
        return;
      }
      lastDraw = -Infinity;
      // The flame keeps moving until the CSS fade has finished.
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
