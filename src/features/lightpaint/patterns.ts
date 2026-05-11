// Pure functions: (canvas-ctx, width, height, meshTimeMs, hue, speed, offset) => void.
// Each pattern is a pure function of mesh time so that multiple phones running
// the same (pattern, hue, speed) draw a coherent image when waved during a
// long exposure.

export type PatternId = "stripes" | "gradient" | "dots" | "spiral";
export const PATTERN_IDS: PatternId[] = ["stripes", "gradient", "dots", "spiral"];

export type DrawArgs = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number; // mesh time ms
  hue: number; // 0..359
  speed: number; // 0..3
  offset: number; // 0..1, per-phone offset within the pattern cycle
};

export function drawPattern(id: PatternId, args: DrawArgs): void {
  switch (id) {
    case "stripes":
      return drawStripes(args);
    case "gradient":
      return drawGradient(args);
    case "dots":
      return drawDots(args);
    case "spiral":
      return drawSpiral(args);
  }
}

function drawStripes({ ctx, w, h, t, hue, speed, offset }: DrawArgs): void {
  const stripeW = Math.max(30, w / 6);
  const period = stripeW * 2;
  const scroll = ((t * speed) / 8 + offset * period) % period;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
  for (let x = -period + scroll; x < w + period; x += period) {
    ctx.fillRect(x, 0, stripeW, h);
  }
}

function drawGradient({ ctx, w, h, t, hue, speed, offset }: DrawArgs): void {
  const phase = ((t * speed) / 3000 + offset) % 1;
  const angle = phase * Math.PI * 2;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.hypot(w, h) / 2;
  const x1 = cx + Math.cos(angle) * r;
  const y1 = cy + Math.sin(angle) * r;
  const x2 = cx - Math.cos(angle) * r;
  const y2 = cy - Math.sin(angle) * r;
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
  g.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 100%, 50%)`);
  g.addColorStop(1, `hsl(${(hue + 180) % 360}, 100%, 50%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawDots({ ctx, w, h, t, hue, speed, offset }: DrawArgs): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const cols = 8;
  const rows = Math.max(4, Math.round((cols * h) / w));
  const cellW = w / cols;
  const cellH = h / rows;
  const r = Math.min(cellW, cellH) * 0.45;
  const wave = (t * speed) / 600 + offset * Math.PI * 2;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * cellW + cellW / 2;
      const cy = j * cellH + cellH / 2;
      // distance from center, normalized
      const d = Math.hypot(i - cols / 2, j - rows / 2) / (cols / 2);
      const a = 0.5 + 0.5 * Math.sin(wave - d * 4);
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (0.4 + 0.6 * a), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSpiral({ ctx, w, h, t, hue, speed, offset }: DrawArgs): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(w, h) / 2;
  const phase = ((t * speed) / 1200 + offset) % 1;
  const turns = 3;
  ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
  ctx.lineWidth = Math.max(4, Math.min(w, h) / 36);
  ctx.lineCap = "round";
  ctx.beginPath();
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const r = (u + phase) % 1;
    const ang = u * turns * Math.PI * 2 + phase * Math.PI * 2;
    const x = cx + Math.cos(ang) * r * maxR;
    const y = cy + Math.sin(ang) * r * maxR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
